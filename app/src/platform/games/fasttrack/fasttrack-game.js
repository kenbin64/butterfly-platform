// FastTrack Game - Diamond Drill Manifold Implementation
// ═══════════════════════════════════════════════════════════════════════════
//
// TWISTED RIBBON GEOMETRY:
// The game state lives on a twisted ribbon waveform with 7 sections.
// Information is encoded in geometric attributes: inflections, coordinates,
// angles, wavelengths, frequencies, bandwidths, and phase.
//
// DINING PHILOSOPHERS SYNCHRONIZATION:
// Each section is a "philosopher" that can only access data when holding
// both adjacent "forks" (coupling points). This provides lock-free thread
// synchronization through geometry itself.
//
// 7 SECTIONS (fat→pinch→fat geometry):
//   1: Players    (identity, turns)
//   2: Board      (TurnKey - couples players to positions)
//   3: Deck       (cards, draw pile)
//   4: Turn       (TurnKey - couples deck to movement)
//   5: Movement   (valid moves, collision)
//   6: SafeZone   (TurnKey - couples movement to scoring)
//   7: Meta       (seed, winner, log)
//
// TurnKey sections (2, 4, 6) are coupling points that transfer
// waveform energy between adjacent sections.
//
// ═══════════════════════════════════════════════════════════════════════════

class GameDrill {
  constructor(seed) {
    this.seed = seed ?? Math.floor(Math.random() * 0xFFFFFFFF);
    this.rotation = 0;

    // 7 sections with twisted ribbon geometry
    this.sections = [
      { name: 'Players',  amplitude: 0, wavelength: 1, frequency: 1, angle: 0 * Math.PI/7, phase: 0, data: {} },
      { name: 'Board',    amplitude: 0, wavelength: 1, frequency: 1, angle: 1 * Math.PI/7, phase: 0, data: {} },
      { name: 'Deck',     amplitude: 0, wavelength: 1, frequency: 1, angle: 2 * Math.PI/7, phase: 0, data: {} },
      { name: 'Turn',     amplitude: 0, wavelength: 1, frequency: 1, angle: 3 * Math.PI/7, phase: 0, data: {} },
      { name: 'Movement', amplitude: 0, wavelength: 1, frequency: 1, angle: 4 * Math.PI/7, phase: 0, data: {} },
      { name: 'SafeZone', amplitude: 0, wavelength: 1, frequency: 1, angle: 5 * Math.PI/7, phase: 0, data: {} },
      { name: 'Meta',     amplitude: 0, wavelength: 1, frequency: 1, angle: 6 * Math.PI/7, phase: 0, data: {} }
    ];

    // Dining Philosophers: 7 forks between 7 philosophers (circular table)
    this.forks = [false, false, false, false, false, false, false];
    this.eating = [false, false, false, false, false, false, false];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DINING PHILOSOPHERS - Thread synchronization through geometry
  // ═══════════════════════════════════════════════════════════════════════════

  // Try to acquire access to a section (philosopher tries to eat)
  tryAcquire(section) {
    const idx = section - 1;
    const leftFork = idx;
    const rightFork = (idx + 1) % 7;

    if (!this.forks[leftFork] && !this.forks[rightFork]) {
      this.forks[leftFork] = true;
      this.forks[rightFork] = true;
      this.eating[idx] = true;
      return true;
    }
    return false;
  }

  // Release access to a section (philosopher stops eating)
  release(section) {
    const idx = section - 1;
    const leftFork = idx;
    const rightFork = (idx + 1) % 7;

    this.forks[leftFork] = false;
    this.forks[rightFork] = false;
    this.eating[idx] = false;
  }

  // Execute with exclusive access (safe data access)
  withSection(section, fn) {
    if (!this.tryAcquire(section)) return null;
    try {
      return fn(this.sections[section - 1]);
    } finally {
      this.release(section);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // O(1) DRILLING - Direct coordinate access, no iteration
  // ═══════════════════════════════════════════════════════════════════════════

  // O(1) read from any coordinate
  drill(section, key) {
    if (section < 1 || section > 7) throw new Error(`Invalid section: ${section}`);
    const sec = this.sections[section - 1];
    return sec.data[key];
  }

  // O(1) write to any coordinate
  carve(section, key, value) {
    const sec = this.sections[section - 1];
    sec.data[key] = value;
    // Amplitude reflects data density (saddle geometry z = xy)
    sec.amplitude = Object.keys(sec.data).length;
  }

  // Is this section a TurnKey (coupling point)?
  isTurnKey(section) {
    return section === 2 || section === 4 || section === 6;
  }

  // Sample the twisted ribbon waveform at this section
  sample(section, x = 0.5, y = 0.5) {
    const sec = this.sections[section - 1];
    const sx = (x - 0.5) * 2 * sec.wavelength;

    // Apply ribbon twist to coordinates
    const angle = sec.angle;
    const twisted_x = sx * Math.cos(angle) - sy * Math.sin(angle);
    const twisted_y = sx * Math.sin(angle) + sy * Math.cos(angle);

    // z = xy on twisted ribbon surface
    const z = sec.amplitude * twisted_x * twisted_y;

    // TurnKey sections have stronger coupling (energy transfer points)
    return this.isTurnKey(section) ? z * 1.2 : z;
  }

  // Get inflection data (information at the pinch between sections)
  getInflection(section, side = 'right') {
    const sec = this.sections[section - 1];
    const nextSec = this.sections[section % 7];
    return {
      position: side === 'left' ? 0 : 1,
      angle: sec.angle,
      coupling: this.isTurnKey(section) ? 1.2 : 1.0,
      nextAngle: nextSec.angle
    };
  }

  // Rotate the drill (propagates phase through twisted ribbon)
  rotate(delta) {
    this.rotation = (this.rotation + delta) % 360;
    const deltaRad = delta * Math.PI / 180;
    // Propagate rotation through all sections
    for (const sec of this.sections) {
      sec.phase = (sec.phase + deltaRad * 0.1) % (Math.PI * 2);
      sec.angle = (sec.angle + deltaRad * 0.05) % (Math.PI * 2);
    }
  }

  // Get the geometric equation for storage/transmission
  getEquation() {
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
}

// ═══════════════════════════════════════════════════════════════════════════
// BOARD CONSTANTS (from FASTTRACK_RULES.md)
// ═══════════════════════════════════════════════════════════════════════════
const BOARD = {
  OUTER_TRACK: 36,      // Outer ring = 36 holes (hexagonal)
  FAST_TRACK: 6,        // Inner shortcut = 6 holes (one per player entry)
  SAFE_ZONE: 4,         // Safe zone = 4 holes per player
  PEGS_PER_PLAYER: 5,
  MAX_PLAYERS: 6
};

const COLORS = ['#ff4444', '#4488ff', '#44cc44', '#ffcc00', '#cc44cc', '#ff8844'];
const COLOR_NAMES = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange'];

// Card definitions - rules as data
const CARDS = {
  'A':  { value: 1,  canEnter: true,  canExitBullseye: false, extraTurn: true,  direction: 1 },
  '2':  { value: 2,  canEnter: false, canExitBullseye: false, extraTurn: false, direction: 1 },
  '3':  { value: 3,  canEnter: false, canExitBullseye: false, extraTurn: false, direction: 1 },
  '4':  { value: 4,  canEnter: false, canExitBullseye: false, extraTurn: false, direction: -1 }, // Backward!
  '5':  { value: 5,  canEnter: false, canExitBullseye: false, extraTurn: false, direction: 1 },
  '6':  { value: 6,  canEnter: true,  canExitBullseye: false, extraTurn: true,  direction: 1 },
  '7':  { value: 7,  canEnter: false, canExitBullseye: false, extraTurn: false, direction: 1, canSplit: true },
  '8':  { value: 8,  canEnter: false, canExitBullseye: false, extraTurn: false, direction: 1 },
  '9':  { value: 9,  canEnter: false, canExitBullseye: false, extraTurn: false, direction: 1 },
  '10': { value: 10, canEnter: false, canExitBullseye: false, extraTurn: false, direction: 1 },
  'J':  { value: 1,  canEnter: false, canExitBullseye: true,  extraTurn: true,  direction: 1 },
  'Q':  { value: 1,  canEnter: false, canExitBullseye: true,  extraTurn: true,  direction: 1 },
  'K':  { value: 1,  canEnter: false, canExitBullseye: true,  extraTurn: true,  direction: 1 },
  'JOKER': { value: 1, canEnter: true, canExitBullseye: false, extraTurn: true, direction: 1 }
};

// ═══════════════════════════════════════════════════════════════════════════
// GAME STATE - Powered by Diamond Drill
// ═══════════════════════════════════════════════════════════════════════════
let drill = null;  // The manifold

// Convenience accessors that drill into the manifold
const gameState = {
  // Section 1: Players - drill(1, 'players'), drill(1, 'currentPlayer')
  get players() { return drill?.drill(1, 'players') || []; },
  set players(v) { drill?.carve(1, 'players', v); },
  get currentPlayer() { return drill?.drill(1, 'currentPlayer') || 0; },
  set currentPlayer(v) { drill?.carve(1, 'currentPlayer', v); },

  // Section 2: Board - TurnKey (couples players to positions)
  // Drill coordinates: outer.{0-35}, ft.{0-5}, bullseye, holding.{player}, safeZone.{player}.{slot}
  get board() {
    return {
      // O(1) access to any board position
      getOuter: (pos) => drill?.drill(2, `outer.${pos}`),
      setOuter: (pos, v) => drill?.carve(2, `outer.${pos}`, v),
      getFastTrack: (pos) => drill?.drill(2, `ft.${pos}`),
      setFastTrack: (pos, v) => drill?.carve(2, `ft.${pos}`, v),
      getBullseye: () => drill?.drill(2, 'bullseye'),
      setBullseye: (v) => drill?.carve(2, 'bullseye', v),
      getHolding: (player) => drill?.drill(2, `holding.${player}`) || [],
      setHolding: (player, v) => drill?.carve(2, `holding.${player}`, v),
      getSafeZone: (player, slot) => drill?.drill(2, `safe.${player}.${slot}`),
      setSafeZone: (player, slot, v) => drill?.carve(2, `safe.${player}.${slot}`, v),
      getHome: (player) => drill?.drill(2, `home.${player}`),
      setHome: (player, v) => drill?.carve(2, `home.${player}`, v),
      // Legacy array accessors for backwards compatibility
      outer: new Proxy([], {
        get: (_, prop) => typeof prop === 'string' && !isNaN(prop) ? drill?.drill(2, `outer.${prop}`) : undefined,
        set: (_, prop, v) => { drill?.carve(2, `outer.${prop}`, v); return true; }
      }),
      fastTrack: new Proxy([], {
        get: (_, prop) => typeof prop === 'string' && !isNaN(prop) ? drill?.drill(2, `ft.${prop}`) : undefined,
        set: (_, prop, v) => { drill?.carve(2, `ft.${prop}`, v); return true; }
      }),
      get bullseye() { return drill?.drill(2, 'bullseye'); },
      set bullseye(v) { drill?.carve(2, 'bullseye', v); },
      holding: [],  // Will be populated in initGame
      safeZone: [], // Will be populated in initGame
      home: []      // Will be populated in initGame
    };
  },

  // Section 3: Deck
  get deck() { return drill?.drill(3, 'deck') || []; },
  set deck(v) { drill?.carve(3, 'deck', v); },
  get discard() { return drill?.drill(3, 'discard') || []; },
  set discard(v) { drill?.carve(3, 'discard', v); },
  get currentCard() { return drill?.drill(3, 'currentCard'); },
  set currentCard(v) { drill?.carve(3, 'currentCard', v); },

  // Section 4: Turn - TurnKey (couples deck to movement)
  get phase() { return drill?.drill(4, 'phase') || 'draw'; },
  set phase(v) { drill?.carve(4, 'phase', v); },
  get selectedPeg() { return drill?.drill(4, 'selectedPeg'); },
  set selectedPeg(v) { drill?.carve(4, 'selectedPeg', v); },
  get validMoves() { return drill?.drill(4, 'validMoves') || []; },
  set validMoves(v) { drill?.carve(4, 'validMoves', v); },

  // Section 5: Rules (immutable)
  rules: { ...CARDS },

  // Section 6: SafeZone - TurnKey (couples movement to scoring)
  get log() { return drill?.drill(6, 'log') || []; },
  set log(v) { drill?.carve(6, 'log', v); },

  // Section 7: Meta
  get seed() { return drill?.seed || 0; },
  get winner() { return drill?.drill(7, 'winner'); },
  set winner(v) { drill?.carve(7, 'winner', v); }
};

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION - Drill the manifold into shape
// ═══════════════════════════════════════════════════════════════════════════
function initGame(playerCount = 2) {
  // Create new drill (game manifold)
  drill = new GameDrill();

  // Section 1: Initialize players
  drill.carve(1, 'players', []);
  drill.carve(1, 'currentPlayer', 0);

  // Section 2: Clear board (O(1) carving)
  for (let i = 0; i < 36; i++) drill.carve(2, `outer.${i}`, null);
  for (let i = 0; i < 6; i++) drill.carve(2, `ft.${i}`, null);
  drill.carve(2, 'bullseye', null);

  // Section 3: Reset deck
  drill.carve(3, 'deck', createDeck());
  drill.carve(3, 'discard', []);
  drill.carve(3, 'currentCard', null);

  // Section 4: Reset turn
  drill.carve(4, 'phase', 'draw');
  drill.carve(4, 'selectedPeg', null);
  drill.carve(4, 'validMoves', []);

  // Section 6: Clear log
  drill.carve(6, 'log', []);

  // Section 7: Clear winner
  drill.carve(7, 'winner', null);

  // Create players - carve into Section 1
  const players = [];
  for (let i = 0; i < playerCount; i++) {
    const player = {
      id: i,
      name: i === 0 ? 'You' : `🤖 Bot ${i}`,
      color: COLORS[i],
      colorName: COLOR_NAMES[i],
      isBot: i > 0,
      pegs: Array.from({ length: 5 }, (_, p) => ({
        id: `${i}-${p}`,
        inHolding: p < 4,
        onBoard: p === 4,
        position: p === 4 ? i * 6 : -1,
        inFastTrack: false,
        inBullseye: false,
        inSafeZone: false,
        safeZoneSlot: -1,
        completedCircuit: false
      }))
    };
    players.push(player);

    // Place starting peg on home hole - drill into Section 2 (Board)
    const homePos = i * 6;
    drill.carve(2, `outer.${homePos}`, { player: i, peg: 4 });
    drill.carve(2, `holding.${i}`, [0, 1, 2, 3]);
    for (let s = 0; s < 4; s++) drill.carve(2, `safe.${i}.${s}`, null);
    drill.carve(2, `home.${i}`, null);
  }
  drill.carve(1, 'players', players);

  // Shuffle the deck (already created in Section 3)
  shuffleDeck();

  log('Game started with ' + playerCount + ' players');
  log(`Manifold seed: 0x${drill.seed.toString(16).toUpperCase()}`);
  updateUI();
  renderBoard();
}

function createDeck() {
  const cards = [];
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  
  for (const suit of suits) {
    for (const value of values) {
      cards.push({ value, suit, display: value + suit });
    }
  }
  cards.push({ value: 'JOKER', suit: '★', display: '🃏' });
  cards.push({ value: 'JOKER', suit: '★', display: '🃏' });
  
  return cards;
}

function shuffleDeck() {
  // Fisher-Yates using seed
  for (let i = gameState.deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [gameState.deck[i], gameState.deck[j]] = [gameState.deck[j], gameState.deck[i]];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CARD DRAWING
// ═══════════════════════════════════════════════════════════════════════════
function drawCard() {
  if (gameState.phase !== 'draw') return;
  if (gameState.deck.length === 0) {
    gameState.deck = [...gameState.discard];
    gameState.discard = [];
    shuffleDeck();
    log('Deck reshuffled');
  }

  gameState.currentCard = gameState.deck.pop();
  gameState.phase = 'move';

  const card = gameState.currentCard;
  const rules = CARDS[card.value];

  document.getElementById('current-card').textContent = card.display;
  document.getElementById('card-info').textContent = getCardDescription(card.value);

  log(`${getCurrentPlayerName()} drew ${card.display}`);

  // Calculate valid moves
  calculateValidMoves();
  updateUI();
}

function getCardDescription(value) {
  const desc = {
    'A': 'Move 1 or enter board',
    '2': 'Move 2 forward',
    '3': 'Move 3 forward',
    '4': 'Move 4 BACKWARD',
    '5': 'Move 5 forward',
    '6': 'Move 6 or enter board',
    '7': 'Split 7 between two pegs',
    '8': 'Move 8 forward',
    '9': 'Move 9 forward',
    '10': 'Move 10 forward',
    'J': 'Move 1, exit bullseye',
    'Q': 'Move 1, exit bullseye',
    'K': 'Move 1, exit bullseye',
    'JOKER': 'Wild! Enter or move 1'
  };
  return desc[value] || '';
}

// ═══════════════════════════════════════════════════════════════════════════
// MOVE CALCULATION - O(1) drilling, no iteration over board
// Uses TurnKey Section 4 (Turn) to couple deck to movement
// ═══════════════════════════════════════════════════════════════════════════
function calculateValidMoves() {
  const moves = [];
  const player = gameState.players[gameState.currentPlayer];
  const card = gameState.currentCard;
  if (!card) { drill.carve(4, 'validMoves', []); return; }

  const rules = CARDS[card.value];

  // Check each peg (max 5 - bounded, not infinite)
  for (let pegIdx = 0; pegIdx < player.pegs.length; pegIdx++) {
    const peg = player.pegs[pegIdx];

    // Can enter from holding? Drill Section 2 for position
    if (peg.inHolding && rules.canEnter) {
      const homePos = gameState.currentPlayer * 6;
      const occupant = drill.drill(2, `outer.${homePos}`);
      if (!occupant || canBump(homePos)) {
        moves.push({ type: 'enter', pegIdx, targetPos: homePos });
      }
    }

    // Can exit bullseye?
    if (peg.inBullseye && rules.canExitBullseye) {
      moves.push({ type: 'exitBullseye', pegIdx, targetPos: -1 });
    }

    // Can move on outer track?
    if (peg.onBoard && !peg.inFastTrack && !peg.inBullseye && !peg.inSafeZone) {
      const steps = rules.value * rules.direction;
      const newPos = (peg.position + steps + 36) % 36;

      // O(1) drill to check destination
      const occupant = drill.drill(2, `outer.${newPos}`);
      if (!occupant || canBump(newPos)) {
        moves.push({ type: 'move', pegIdx, from: peg.position, to: newPos, steps });
      }

      // FastTrack shortcut entry (at positions 0, 6, 12, 18, 24, 30)
      if (peg.position % 6 === 0 && rules.value >= 1) {
        const ftEntry = peg.position / 6;
        const ftOccupant = drill.drill(2, `ft.${ftEntry}`);
        if (!ftOccupant) {
          moves.push({ type: 'enterFastTrack', pegIdx, ftPos: ftEntry });
        }
      }
    }

    // Can move in FastTrack?
    if (peg.inFastTrack) {
      const bullseye = drill.drill(2, 'bullseye');
      if (!bullseye) {
        moves.push({ type: 'enterBullseye', pegIdx });
      }
    }
  }

  // Carve moves into TurnKey Section 4
  drill.carve(4, 'validMoves', moves);
  showMoveHints();
}

function canBump(pos) {
  // O(1) drill to Section 2 (Board)
  const occupant = drill.drill(2, `outer.${pos}`);
  if (!occupant) return true;
  return occupant.player !== gameState.currentPlayer;
}

function showMoveHints() {
  const hintsDiv = document.getElementById('move-hints');
  if (gameState.validMoves.length === 0) {
    hintsDiv.innerHTML = '<div class="hint" style="opacity:0.5;">No valid moves - pass turn</div>';
    setTimeout(endTurn, 1500);
    return;
  }

  hintsDiv.innerHTML = gameState.validMoves.map((move, i) => {
    let text = '';
    switch (move.type) {
      case 'enter': text = `Enter peg at home position`; break;
      case 'move': text = `Move peg ${move.steps > 0 ? 'forward' : 'backward'} ${Math.abs(move.steps)}`; break;
      case 'enterFastTrack': text = `Take FastTrack shortcut!`; break;
      case 'enterBullseye': text = `Enter Bullseye (center)`; break;
      case 'exitBullseye': text = `Exit Bullseye to track`; break;
    }
    return `<div class="hint" onclick="executeMove(${i})">${text}</div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// MOVE EXECUTION - Carve into Section 2 (Board) via drill
// ═══════════════════════════════════════════════════════════════════════════
function executeMove(moveIdx) {
  const move = gameState.validMoves[moveIdx];
  if (!move) return;

  const players = drill.drill(1, 'players');
  const player = players[gameState.currentPlayer];
  const peg = player.pegs[move.pegIdx];

  switch (move.type) {
    case 'enter':
      // Remove from holding
      peg.inHolding = false;
      peg.onBoard = true;
      peg.position = move.targetPos;

      // Bump any opponent
      bumpOccupant(move.targetPos);
      // Carve new position into Section 2 (Board TurnKey)
      drill.carve(2, `outer.${move.targetPos}`, { player: gameState.currentPlayer, peg: move.pegIdx });

      // Remove from holding array
      const holding = drill.drill(2, `holding.${gameState.currentPlayer}`) || [];
      const holdIdx = holding.indexOf(move.pegIdx);
      if (holdIdx > -1) holding.splice(holdIdx, 1);
      drill.carve(2, `holding.${gameState.currentPlayer}`, holding);

      log(`${getCurrentPlayerName()} entered a peg`);
      break;

    case 'move':
      // Clear old position
      drill.carve(2, `outer.${move.from}`, null);

      // Bump any opponent at new position
      bumpOccupant(move.to);

      // Update position
      peg.position = move.to;
      drill.carve(2, `outer.${move.to}`, { player: gameState.currentPlayer, peg: move.pegIdx });

      log(`${getCurrentPlayerName()} moved ${Math.abs(move.steps)} spaces`);
      break;

    case 'enterFastTrack':
      drill.carve(2, `outer.${peg.position}`, null);
      peg.inFastTrack = true;
      peg.position = move.ftPos;
      drill.carve(2, `ft.${move.ftPos}`, { player: gameState.currentPlayer, peg: move.pegIdx });
      log(`${getCurrentPlayerName()} entered the FastTrack!`);
      break;

    case 'enterBullseye':
      drill.carve(2, `ft.${peg.position}`, null);
      peg.inFastTrack = false;
      peg.inBullseye = true;
      drill.carve(2, 'bullseye', { player: gameState.currentPlayer, peg: move.pegIdx });
      log(`${getCurrentPlayerName()} reached the Bullseye!`);
      break;
  }

  // Update player state
  drill.carve(1, 'players', players);

  // Move card to discard
  const discard = drill.drill(3, 'discard') || [];
  discard.push(gameState.currentCard);
  drill.carve(3, 'discard', discard);

  // Rotate the drill (propagate phase through manifold)
  drill.rotate(15);

  renderBoard();

  // Check for extra turn (A, 6, J, Q, K, JOKER)
  const rules = CARDS[gameState.currentCard.value];
  if (rules.extraTurn) {
    log(`${getCurrentPlayerName()} gets another turn!`);
    drill.carve(3, 'currentCard', null);
    drill.carve(4, 'phase', 'draw');
    updateUI();
  } else {
    endTurn();
  }
}

function bumpOccupant(pos) {
  const occupant = drill.drill(2, `outer.${pos}`);
  if (occupant && occupant.player !== gameState.currentPlayer) {
    const players = drill.drill(1, 'players');
    const bumpedPlayer = players[occupant.player];
    const bumpedPeg = bumpedPlayer.pegs[occupant.peg];
    bumpedPeg.onBoard = false;
    bumpedPeg.inHolding = true;
    bumpedPeg.position = -1;

    const holding = drill.drill(2, `holding.${occupant.player}`) || [];
    holding.push(occupant.peg);
    drill.carve(2, `holding.${occupant.player}`, holding);
    drill.carve(1, 'players', players);
    log(`${bumpedPlayer.name}'s peg was bumped back!`);
  }
}

function endTurn() {
  gameState.currentCard = null;
  gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
  gameState.phase = 'draw';
  gameState.validMoves = [];

  document.getElementById('current-card').textContent = '—';
  document.getElementById('card-info').textContent = 'Draw a card';
  document.getElementById('move-hints').innerHTML = '';

  updateUI();

  // Bot turn
  const player = gameState.players[gameState.currentPlayer];
  if (player.isBot) {
    document.getElementById('draw-btn').disabled = true;
    setTimeout(botTurn, 800);
  }
}

function getCurrentPlayerName() {
  return gameState.players[gameState.currentPlayer].name;
}

// ═══════════════════════════════════════════════════════════════════════════
// BOT AI (Simple random selection - uses manifold coordinates)
// ═══════════════════════════════════════════════════════════════════════════
function botTurn() {
  log(`${getCurrentPlayerName()} is thinking...`);

  setTimeout(() => {
    drawCard();

    setTimeout(() => {
      if (gameState.validMoves.length > 0) {
        // Prioritize: FastTrack > Enter > Move
        let moveIdx = 0;
        const ftMove = gameState.validMoves.findIndex(m => m.type === 'enterFastTrack');
        const enterMove = gameState.validMoves.findIndex(m => m.type === 'enter');

        if (ftMove >= 0) moveIdx = ftMove;
        else if (enterMove >= 0) moveIdx = enterMove;
        else moveIdx = Math.floor(Math.random() * gameState.validMoves.length);

        executeMove(moveIdx);
      }
    }, 600);
  }, 500);
}

// ═══════════════════════════════════════════════════════════════════════════
// BOARD RENDERING (Canvas)
// ═══════════════════════════════════════════════════════════════════════════
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const CX = canvas.width / 2;
const CY = canvas.height / 2;
const OUTER_R = 320;
const FT_R = 180;
const BULLSEYE_R = 40;

function renderBoard() {
  ctx.fillStyle = '#0a0a10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw outer track (36 holes)
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2 - Math.PI / 2;
    const x = CX + Math.cos(angle) * OUTER_R;
    const y = CY + Math.sin(angle) * OUTER_R;

    // Home positions glow
    const isHome = i % 6 === 0;

    ctx.beginPath();
    ctx.arc(x, y, isHome ? 18 : 14, 0, Math.PI * 2);
    ctx.fillStyle = isHome ? 'rgba(255,215,0,0.2)' : 'rgba(50,50,80,0.6)';
    ctx.fill();
    ctx.strokeStyle = isHome ? '#ffd700' : 'rgba(0,180,255,0.3)';
    ctx.lineWidth = isHome ? 2 : 1;
    ctx.stroke();

    // Draw peg if present
    const occupant = gameState.board.outer[i];
    if (occupant) {
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fillStyle = gameState.players[occupant.player].color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Draw FastTrack (6 holes)
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const x = CX + Math.cos(angle) * FT_R;
    const y = CY + Math.sin(angle) * FT_R;

    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,255,180,0.15)';
    ctx.fill();
    ctx.strokeStyle = '#00ffb4';
    ctx.lineWidth = 2;
    ctx.stroke();

    const occupant = gameState.board.fastTrack[i];
    if (occupant) {
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fillStyle = gameState.players[occupant.player].color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Draw Bullseye (center)
  ctx.beginPath();
  ctx.arc(CX, CY, BULLSEYE_R, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,45,149,0.2)';
  ctx.fill();
  ctx.strokeStyle = '#ff2d95';
  ctx.lineWidth = 3;
  ctx.stroke();

  if (gameState.board.bullseye) {
    ctx.beginPath();
    ctx.arc(CX, CY, 20, 0, Math.PI * 2);
    ctx.fillStyle = gameState.players[gameState.board.bullseye.player].color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Draw center text
  ctx.fillStyle = '#ff2d95';
  ctx.font = '12px Orbitron';
  ctx.textAlign = 'center';
  ctx.fillText('BULLSEYE', CX, CY + 60);

  // Draw connecting lines (z=xy geometry hint)
  ctx.strokeStyle = 'rgba(0,180,255,0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const ox = CX + Math.cos(angle) * OUTER_R;
    const oy = CY + Math.sin(angle) * OUTER_R;
    const fx = CX + Math.cos(angle) * FT_R;
    const fy = CY + Math.sin(angle) * FT_R;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(fx, fy);
    ctx.lineTo(CX, CY);
    ctx.stroke();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UI UPDATES
// ═══════════════════════════════════════════════════════════════════════════
function updateUI() {
  // Update player list
  const playerListDiv = document.getElementById('player-list');
  playerListDiv.innerHTML = gameState.players.map((p, i) => {
    const pegsOnBoard = p.pegs.filter(peg => peg.onBoard || peg.inFastTrack || peg.inBullseye).length;
    const isActive = i === gameState.currentPlayer;
    return `
      <div class="player-row ${isActive ? 'active' : ''}">
        <div class="player-color" style="background: ${p.color};"></div>
        <span class="player-name">${p.name}</span>
        <span class="player-pegs">${pegsOnBoard}/5</span>
      </div>
    `;
  }).join('');

  // Update draw button
  const drawBtn = document.getElementById('draw-btn');
  const currentPlayer = gameState.players[gameState.currentPlayer];
  drawBtn.disabled = gameState.phase !== 'draw' || currentPlayer.isBot;

  // Update game status
  document.getElementById('game-status').textContent =
    currentPlayer.isBot ? `${currentPlayer.name}'s turn` : 'Your turn';
}

function log(message) {
  gameState.log.push({ time: Date.now(), message });
  const logDiv = document.getElementById('game-log');
  logDiv.innerHTML = gameState.log.slice(-10).map(l =>
    `<div class="log-entry">${l.message}</div>`
  ).join('');
  logDiv.scrollTop = logDiv.scrollHeight;
}

// ═══════════════════════════════════════════════════════════════════════════
// START GAME
// ═══════════════════════════════════════════════════════════════════════════
initGame(2);

