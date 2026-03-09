# ButterflyFX Games — 3D Immersive Game Suite

Dimensional, no-storage 3D games built on MINDS/LENS. First-person immersive experiences where game state is derived on demand, not stored.

---

## Vision

Classic arcade games reimagined as fully immersive 3D first-person experiences. Every game element—physics, procedural generation, collision detection, scoring—is derived from manifold coordinates and lenses. No game databases. No save files. Pure computation.

---

## Flagship: Breakout 3D

### Core Concept

A first-person 3D arena where the player controls a reflective ivory paddle to keep a steel ball in play, destroying crystal bricks arranged in a 3D matrix. Gravity pulls bricks downward; falling debris damages the paddle and ball; arena morphs per level; backdrop themes shift (space, underwater, fractal, Mars, arid planet).

### Arena and Geometry

- **Shape progression** (per level):
  - Level 1: Cubic arena (90° angles, predictable)
  - Level 2: Spherical arena (curved walls, ball rolls)
  - Level 3: Cylindrical arena (vertical walls, horizontal top/bottom)
  - Level 4: Toroidal arena (donut-shaped, wrapping edges)
  - Level 5: Fractal arena (self-similar recursive chambers)
  - Level 6: Morphing arena (transitions between shapes mid-level)

- **Arena material**: Shiny glass, reflective, semi-transparent. Outward backdrop is a space theme (planets, sun, Jupiter, Saturn, stars) or alternate theme per level.

- **Paddle**:
  - Pure white, reflective like ivory
  - Semi-circular in cross-section (curved surface for angle-dependent deflection)
  - Position: bottom-center of arena, player-controlled via mouse/gamepad
  - Size: starts at 1.0 unit; reduced by falling debris; restored incrementally by hitting ball
  - Angle determines ball trajectory (shallow angle = shallow deflection; steep angle = steep deflection)

- **Ball**:
  - Shiny steel appearance
  - Bounces off walls, paddle, and bricks
  - Trajectory affected by speed and angle of impact
  - Energy system: starts with base energy; gains energy from paddle hits (more energetic paddle = more energy transfer); loses energy on wall bounces (walls absorb energy); minimum energy floor prevents getting stuck
  - Size: starts at 1.0 unit; reduced on collision with falling debris; recovers over time or via paddle hits

### Brick System

- **Arrangement**: 3D matrix of bricks, stacked vertically
  - Levels 1–3: 5 layers high, 4×4 grid per layer (80 bricks total)
  - Levels 4–6: 7 layers high, 5×5 grid per layer (175 bricks total)

- **Brick sizing** (golden ratio progression):
  - Bottom layer (closest to paddle): largest bricks (1.0 unit)
  - Each layer up: size = previous × φ^(-1) ≈ 0.618 (golden ratio inverse)
  - Top layer: smallest bricks (~0.09 units)
  - Reason: visual hierarchy, difficulty progression, physics realism

- **Brick colors** (per level, gradient + crystal transparency):
  - Level 1 (Space): Deep blue → cyan gradient, crystal-like, semi-transparent
  - Level 2 (Underwater): Teal → green gradient, glassy, bioluminescent glow
  - Level 3 (Fractal): Purple → gold gradient, recursive pattern texture, highly transparent
  - Level 4 (Mars): Red → orange gradient, dusty crystal, opaque
  - Level 5 (Arid Planet): Yellow → brown gradient, sand-like crystal, semi-opaque
  - Level 6 (Dark Sky): Black → violet gradient, obsidian-like, reflective

- **Brick physics**:
  - Gravity pulls bricks downward at 9.8 m/s² (or game-scaled equivalent)
  - Bricks fall when destroyed or when level progresses
  - Falling bricks collide with paddle and ball
  - Collision with falling brick:
    - Brick: trajectory changes, size reduced (simulating damage)
    - Ball: trajectory changes, size reduced (simulating damage)
    - Paddle: size reduced temporarily; size restored incrementally by hitting ball

### Physics Engine

- **Gravity**: 9.8 m/s² downward (or scaled for game feel)
- **Ball energy**:
  - Base energy: 100 units
  - Paddle hit: +20 to +50 units (depending on paddle speed and angle)
  - Wall bounce: -10 to -30 units (depending on wall material; glass absorbs less than metal)
  - Brick hit: -5 to -15 units (depending on brick material)
  - Minimum floor: 20 units (prevents ball from getting stuck or moving too slowly)
  - Energy decay: -1 unit per second (natural energy loss over time)

- **Trajectory**:
  - Ball velocity = energy × direction_vector
  - Paddle angle affects deflection: shallow angle (0°) = shallow deflection; steep angle (90°) = steep deflection
  - Brick collision: ball trajectory reflects based on brick surface normal and ball speed
  - Wall collision: ball reflects; energy absorbed by wall material

- **Falling debris**:
  - Destroyed bricks fall as debris
  - Debris has mass and velocity
  - Collision with paddle: paddle size reduced by 10–20% per hit; size restored at +5% per ball hit
  - Collision with ball: ball size reduced by 5–10% per hit; ball size restored at +2% per paddle hit or +1% per second

### Procedural Generation and Lenses

- **Address schema**:
  ```
  Address = (
    manifold_id: "breakout3d_v1",
    level: int (1..6),
    arena_shape: enum (cubic, spherical, cylindrical, toroidal, fractal, morphing),
    time: float (seconds elapsed),
    ball_state_digest: sha256(ball_pos, ball_vel, ball_energy, ball_size),
    paddle_state_digest: sha256(paddle_pos, paddle_angle, paddle_size),
    brick_state_digest: sha256(brick_positions, brick_sizes, brick_colors),
    debris_state_digest: sha256(falling_debris_positions, velocities),
    player_input_sequence: [input_events],
    lens_id: "render" | "physics" | "collision" | "scoring",
    version: "1.0"
  )
  ```

- **LENS catalog**:
  - `arena_geometry`: derives arena shape, walls, and collision boundaries from level and time
  - `brick_layout`: derives brick positions, sizes, and colors from level (procedural, deterministic)
  - `gravity_field`: derives gravitational acceleration and direction (always downward, magnitude 9.8)
  - `ball_physics`: derives ball position, velocity, energy, and size from time and input sequence
  - `paddle_physics`: derives paddle position, angle, and size from player input and collision history
  - `collision_detection`: derives collisions between ball, paddle, bricks, walls, and debris
  - `debris_physics`: derives falling debris positions, velocities, and sizes
  - `energy_transfer`: derives energy changes from collisions (paddle hit, wall bounce, brick hit)
  - `scoring`: derives score from bricks destroyed, level, and time
  - `render`: derives 3D mesh, materials, lighting, and camera view for rendering

### Level Progression

- **Level 1 (Space Theme)**:
  - Arena: Cubic
  - Backdrop: Deep space with stars, sun, distant planets
  - Brick count: 80 (5 layers, 4×4 grid)
  - Brick color: Deep blue → cyan gradient
  - Difficulty: Baseline; no moving obstacles
  - New mechanic: Gravity (bricks fall when destroyed)

- **Level 2 (Underwater Theme)**:
  - Arena: Spherical
  - Backdrop: Ocean floor with coral, fish, bioluminescent creatures
  - Brick count: 80 (5 layers, 4×4 grid)
  - Brick color: Teal → green gradient, glowing
  - Difficulty: Increased; curved walls change ball trajectory
  - New mechanic: Moving barriers (slow-moving coral formations that deflect ball)

- **Level 3 (Fractal Theme)**:
  - Arena: Cylindrical
  - Backdrop: Infinite fractal patterns, Mandelbrot set, recursive geometry
  - Brick count: 80 (5 layers, 4×4 grid)
  - Brick color: Purple → gold gradient, recursive texture
  - Difficulty: High; intermittent moving barriers (fractal-shaped obstacles)
  - New mechanic: Mines (destructible obstacles that explode on contact, damaging nearby bricks and ball)

- **Level 4 (Mars Theme)**:
  - Arena: Toroidal (wrapping edges)
  - Backdrop: Martian landscape, red dust storms, giant planet in sky
  - Brick count: 175 (7 layers, 5×5 grid)
  - Brick color: Red → orange gradient, dusty crystal
  - Difficulty: Very high; wrapping edges confuse trajectory
  - New mechanic: Cyclops eye platform (large moving obstacle that can deflect ball back to bricks or absorb it)

- **Level 5 (Arid Planet Theme)**:
  - Arena: Morphing (transitions between shapes mid-level)
  - Backdrop: Arid desert, giant planet dominating sky, sand dunes
  - Brick count: 175 (7 layers, 5×5 grid)
  - Brick color: Yellow → brown gradient, sand-like crystal
  - Difficulty: Extreme; arena shape changes unpredictably
  - New mechanic: Multiple cyclops eye platforms; arena morphing

- **Level 6 (Dark Sky Theme)**:
  - Arena: Fractal (self-similar recursive chambers)
  - Backdrop: Dark sky, black holes, neutron stars, cosmic radiation
  - Brick count: 175 (7 layers, 5×5 grid)
  - Brick color: Black → violet gradient, obsidian-like, reflective
  - Difficulty: Nightmare; fractal arena is disorienting
  - New mechanic: All previous mechanics combined; time pressure (level must be cleared in 5 minutes)

### Scoring System

- **Points per brick destroyed**: 10 × (level × brick_layer_height)
  - Bottom layer bricks: 10 points
  - Middle layer bricks: 20–50 points
  - Top layer bricks: 100+ points

- **Combo multiplier**: Destroy N bricks without missing = 1.5x multiplier
- **Time bonus**: Clear level in under 2 minutes = +500 points
- **Energy bonus**: Finish level with >80% ball energy = +250 points
- **Perfect level**: Destroy all bricks without paddle size reduction = +1000 points

### Game Over Conditions

- Ball falls below paddle (out of play)
- Paddle size reduced to 0 (too much debris damage)
- Ball size reduced to 0 (too much debris damage)
- Time limit exceeded (Level 6 only)

### Replay and Determinism

- **Replay protocol**: Provide (level, arena_shape, player_input_sequence) to Core
  - Core derives entire game state deterministically
  - No storage needed; game is replayed from inputs
  - Useful for: sharing replays, analyzing gameplay, competitive verification

- **Deterministic generation**: Same level + same inputs = identical game always
  - Brick positions: derived from level seed (deterministic)
  - Debris spawning: derived from brick destruction order (deterministic)
  - Obstacle movement: derived from time and level (deterministic)

---

## Architecture

### Repository: butterflyfx-games

```
butterflyfx-games/
├── games/
│   ├── breakout3d/
│   │   ├── breakout3d_lens.py (all lenses: arena, brick, physics, collision, scoring)
│   │   ├── breakout3d_manifold.py (manifold definition, procedural generation)
│   │   ├── breakout3d_physics.py (gravity, energy, trajectory, collision)
│   │   ├── breakout3d_ui.py (3D rendering, camera, input handling)
│   │   └── breakout3d_tests.py (unit tests, physics validation)
│   ├── chess3d/, tetris3d/, pacman3d/, snake3d/, pong3d/
│   │   └── (same structure as breakout3d)
│   └── shared/
│       ├── game_engine.py (generic game loop using Core + LENS)
│       ├── address_builder.py (construct game addresses)
│       ├── replay_engine.py (replay games from input sequences)
│       ├── physics_engine.py (shared physics utilities)
│       └── manifold_utils.py (shared manifold utilities)
├── web/
│   ├── index.html (game selector, level chooser)
│   ├── game_player.html (3D game viewport, HUD, controls)
│   ├── static/
│   │   ├── css/ (styling)
│   │   ├── js/ (Three.js rendering, input handling, Core API calls)
│   │   └── shaders/ (GLSL for materials: ivory paddle, steel ball, crystal bricks, glass arena)
│   └── api.py (Flask/FastAPI backend to call Core service)
├── docs/
│   ├── GAME_DESIGN.md (design principles, dimensional game theory)
│   ├─��� BREAKOUT3D_SPEC.md (detailed Breakout 3D specification)
│   ├── PHYSICS_MODEL.md (physics equations, energy system, collision math)
│   ├── LENS_CATALOG.md (all game lenses, address schemas)
│   ├── REPLAY_PROTOCOL.md (how to replay games, determinism guarantees)
│   └── RENDERING.md (3D rendering pipeline, materials, lighting)
├── benchmarks/
│   ├── physics_bench.py (benchmark physics calculations)
│   ├── collision_bench.py (benchmark collision detection)
│   └── rendering_bench.py (benchmark 3D rendering throughput)
├── requirements.txt (Three.js, Flask, httpx, numpy, etc.)
├── pyproject.toml
├── LICENSE (MIT)
├── README.md
└── BUILD_AND_DEPLOY.md (build and deployment guide)
```

### Tech Stack

- **Backend**: Python (Flask/FastAPI) to call Core service
- **Frontend**: Three.js (3D rendering), WebGL (shaders)
- **Physics**: NumPy for vector math; custom physics engine for game-specific logic
- **Core integration**: httpx to call Core API endpoints
- **Deployment**: Docker (containerized web app + Core service)

### Data Flow

1. **Player input** (mouse/gamepad) → Web UI
2. **Web UI** constructs Address (level, time, input_sequence, lens_id)
3. **Web UI** calls Core API: POST /derive/breakout3d with Address
4. **Core** calls appropriate LENS (physics, collision, rendering)
5. **Core** returns derived game state + receipt
6. **Web UI** renders 3D scene using returned state
7. **Repeat** every frame (~60 FPS)

### No-Storage Guarantee

- Game state is never persisted to disk
- Each frame is derived on demand from Address + input sequence
- Replay: provide same Address + input sequence → identical game state
- Scaling: thousands of concurrent games, no storage overhead

---

## Implementation Roadmap

### Phase 1: MVP (Breakout 3D, Cubic Arena)
- Implement core physics (gravity, ball energy, paddle deflection)
- Implement collision detection (ball-paddle, ball-brick, ball-wall)
- Implement basic 3D rendering (Three.js)
- Implement scoring system
- Deploy to web

### Phase 2: Level Progression
- Add 5 more arena shapes (spherical, cylindrical, toroidal, fractal, morphing)
- Add 5 more backdrop themes (space, underwater, fractal, Mars, arid planet)
- Add falling debris mechanics
- Add moving obstacles (cyclops eye platform, barriers)

### Phase 3: Advanced Physics
- Add energy transfer system (paddle energizes ball, walls absorb energy)
- Add debris damage to paddle and ball
- Add size reduction/restoration mechanics
- Add mines and explosions

### Phase 4: Multiplayer and Replay
- Implement replay protocol (save/load input sequences)
- Implement competitive verification (replay with Core receipts)
- Add leaderboards (store only scores + replay hashes, not game data)

### Phase 5: Additional Games
- Implement Chess 3D, Tetris 3D, Pac-Man 3D, Snake 3D, Pong 3D
- Each game follows same MINDS/LENS architecture

---

## Key Design Principles

1. **No storage**: Game state is derived, never persisted
2. **Dimensional**: Each level/state is a dimension; invocation reveals it
3. **Deterministic**: Same inputs → same game always (verifiable)
4. **Immersive**: First-person 3D with physics and visual polish
5. **Scalable**: Thousands of concurrent games, no database overhead
6. **Verifiable**: Receipts prove each game state and action

---

## Next Steps

1. Create butterflyfx-games repository
2. Implement Breakout 3D MVP (cubic arena, basic physics, rendering)
3. Publish game design docs and physics model
4. Build web UI with Three.js
5. Integrate with Core service (call /derive/breakout3d endpoints)
6. Run benchmarks and optimize rendering
7. Add level progression and additional games

---

## References

- Three.js documentation: https://threejs.org/docs/
- Physics equations: See PHYSICS_MODEL.md
- Golden ratio: φ = (1 + √5) / 2 ≈ 1.618; φ^(-1) ≈ 0.618
- MINDS/LENS paradigm: See butterflyfx-kernel and butterflyfx_core documentation
