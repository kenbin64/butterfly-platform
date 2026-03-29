/**
 * ═══════════════════════════════════════════════════════════════════════════
 * KENSGAMES GAME MANIFOLD SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * SUBSTRATE AS SEED:
 *   All game state, assets, rules, animations, pieces, boards = Substrate seeds
 *   The manifold IS the infinite data space (z = xy surface)
 *   Store ONLY seeds (~500 bytes) → Extract ANY data deterministically
 *
 * DIAMOND DRILL GEOMETRY (7 Sections):
 *   1. Identity   - Players, avatars, usernames, sessions
 *   2. Lobby      - TurnKey: couples identity to matchmaking
 *   3. Matchmaker - Game queues, AI pool, room codes
 *   4. Rules      - TurnKey: couples matchmaking to game logic
 *   5. GameState  - Boards, pieces, positions, animations
 *   6. Scoring    - TurnKey: couples game state to results
 *   7. Meta       - Persistence, sockets, sync
 *
 * DINING PHILOSOPHERS:
 *   Each section is a philosopher - can only access with both forks
 *   Thread-safe by geometry, not by locks
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

class GameManifold {
  constructor(seed) {
    this.seed = seed ?? Math.floor(Math.random() * 0xFFFFFFFF);
    this.rotation = 0;
    
    // 7 Diamond Drill sections
    this.sections = [
      { name: 'Identity',   amplitude: 0, wavelength: 1, frequency: 1, angle: 0, phase: 0, data: {} },
      { name: 'Lobby',      amplitude: 0, wavelength: 1, frequency: 1, angle: Math.PI/2, phase: 0, data: {} },
      { name: 'Matchmaker', amplitude: 0, wavelength: 1, frequency: 1, angle: Math.PI, phase: 0, data: {} },
      { name: 'Rules',      amplitude: 0, wavelength: 1, frequency: 1, angle: 3*Math.PI/2, phase: 0, data: {} },
      { name: 'GameState',  amplitude: 0, wavelength: 1, frequency: 1, angle: 2*Math.PI, phase: 0, data: {} },
      { name: 'Scoring',    amplitude: 0, wavelength: 1, frequency: 1, angle: 5*Math.PI/2, phase: 0, data: {} },
      { name: 'Meta',       amplitude: 0, wavelength: 1, frequency: 1, angle: 3*Math.PI, phase: 0, data: {} }
    ];
    
    // Dining Philosophers sync
    this.forks = new Array(7).fill(false);
    this.eating = new Array(7).fill(false);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // O(1) DRILLING - Direct coordinate access
  // ═══════════════════════════════════════════════════════════════════════
  drill(section, key) {
    if (section < 1 || section > 7) return undefined;
    return this.sections[section - 1].data[key];
  }

  carve(section, key, value) {
    if (section < 1 || section > 7) return;
    const sec = this.sections[section - 1];
    sec.data[key] = value;
    sec.amplitude = Object.keys(sec.data).length; // z=xy amplitude
  }

  // TurnKey sections (coupling points)
  isTurnKey(section) {
    return section === 2 || section === 4 || section === 6;
  }

  // Dining Philosophers - thread sync
  tryAcquire(section) {
    const idx = section - 1;
    const left = idx, right = (idx + 1) % 7;
    if (!this.forks[left] && !this.forks[right]) {
      this.forks[left] = this.forks[right] = true;
      this.eating[idx] = true;
      return true;
    }
    return false;
  }

  release(section) {
    const idx = section - 1;
    this.forks[idx] = this.forks[(idx + 1) % 7] = false;
    this.eating[idx] = false;
  }

  withSection(section, fn) {
    if (!this.tryAcquire(section)) return null;
    try { return fn(this.sections[section - 1]); }
    finally { this.release(section); }
  }

  // Extract z from twisted ribbon surface (deterministic)
  extract(x, y) {
    const sectionIdx = Math.floor(x * 7) % 7;
    const sec = this.sections[sectionIdx];
    const localX = (x * 7) % 1;
    const twisted_x = localX * Math.cos(sec.angle) - y * Math.sin(sec.angle);
    const twisted_y = localX * Math.sin(sec.angle) + y * Math.cos(sec.angle);
    return sec.amplitude * twisted_x * twisted_y * (this.isTurnKey(sectionIdx+1) ? 1.2 : 1);
  }

  // Get seed (this is ALL that needs to be stored)
  getSeed() {
    return {
      seed: this.seed,
      rotation: this.rotation,
      sections: this.sections.map(s => ({
        amplitude: s.amplitude,
        wavelength: s.wavelength,
        frequency: s.frequency,
        angle: s.angle,
        phase: s.phase
      }))
    };
  }

  // Restore from seed
  static fromSeed(seedData) {
    const m = new GameManifold(seedData.seed);
    m.rotation = seedData.rotation;
    seedData.sections.forEach((s, i) => Object.assign(m.sections[i], s));
    return m;
  }

  // Rotate drill (propagate phase)
  rotate(delta) {
    this.rotation = (this.rotation + delta) % 360;
    const rad = delta * Math.PI / 180;
    this.sections.forEach(s => {
      s.phase = (s.phase + rad * 0.1) % (Math.PI * 2);
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME REGISTRY - All games in the manifold
// ═══════════════════════════════════════════════════════════════════════════
const GameRegistry = {
  games: new Map(),
  
  register(id, config) {
    this.games.set(id, {
      id,
      ...config,
      manifold: new GameManifold()
    });
  },
  
  get(id) { return this.games.get(id); },
  
  list() { return Array.from(this.games.values()); }
};

// Register KensGames
GameRegistry.register('fasttrack', {
  name: 'FastTrack',
  icon: '🎲',
  desc: 'Strategic racing board game',
  minPlayers: 2, maxPlayers: 6,
  aiSupport: true,
  url: 'games/fasttrack/index.html'
});

GameRegistry.register('brickbreaker3d', {
  name: 'BrickBreaker 3D',
  icon: '🧱',
  desc: '3D brick smashing via saddle physics',
  minPlayers: 1, maxPlayers: 2,
  aiSupport: false,
  url: 'games/brickbreaker3d/index.html'
});

// Export for browser
if (typeof window !== 'undefined') {
  window.GameManifold = GameManifold;
  window.GameRegistry = GameRegistry;
}

