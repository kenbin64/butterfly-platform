# ButterflyFX Games — Dimensional Game Design Principles

How to design games using MINDS/LENS: no storage, pure derivation, immersive 3D.

---

## Core Principles

### 1. No Storage
- Game state is never written to disk or database
- State is derived on demand from:
  - Manifold definition (geometry, rules)
  - Lenses (derivation rules)
  - Address (coordinates: level, time, player input sequence)
- Consequence: Infinite concurrent games, zero storage overhead

### 2. Dimensional Progression
- Each level/state is a dimension
- Invocation (INVOKE kernel op) reveals the dimension
- Dimensions are nested: level 1 contains all sub-states as potential
- Consequence: O(1) state transitions, no iteration

### 3. Deterministic Replay
- Same Address + input sequence = identical game state always
- Enables: replay sharing, competitive verification, analysis
- Consequence: Games are verifiable and auditable

### 4. Immersive 3D First-Person
- Player is inside the game world, not observing from outside
- Physics-based: gravity, collisions, energy transfer
- Visual polish: materials (ivory, steel, crystal, glass), lighting, particle effects
- Consequence: Engaging, visceral gameplay

### 5. Procedural Generation
- Levels, obstacles, and challenges are derived from seeds
- No pre-authored level data stored
- Consequence: Infinite variety, no level database

### 6. Physics as Lenses
- Game physics (gravity, collisions, energy) are lenses
- Lenses map manifold coordinates to physical quantities
- Consequence: Physics is verifiable and reproducible

---

## Address Schema (Generic)

Every game state is identified by an Address:

```
Address = {
  manifold_id: str,           # e.g., "breakout3d_v1", "chess3d_v1"
  level: int,                 # 1..N (game progression)
  time: float,                # seconds elapsed
  player_input_sequence: [],  # list of input events
  state_digests: {            # compact representations of state
    ball: sha256(...),
    paddle: sha256(...),
    bricks: sha256(...),
    debris: sha256(...),
    ...
  },
  lens_id: str,               # "physics" | "collision" | "render" | "scoring"
  version: str                # "1.0"
}
```

---

## Lens Catalog (Generic)

Every game implements a set of lenses:

- `arena_geometry`: derives arena shape, walls, boundaries
- `object_layout`: derives positions and sizes of game objects (bricks, obstacles, etc.)
- `physics`: derives positions, velocities, accelerations from time and forces
- `collision_detection`: derives collisions between objects
- `energy_transfer`: derives energy changes from collisions
- `scoring`: derives score from game events
- `render`: derives 3D mesh, materials, lighting, camera view

---

## Design Checklist for New Games

1. **Define the manifold**
   - What is the core geometry? (arena, board, field)
   - What are the rules? (physics, movement, interaction)
   - How is state derived? (from time, input, seed)

2. **Define lenses**
   - What views of the manifold are needed? (physics, render, scoring)
   - How does each lens map coordinates to values?
   - What are the inputs and outputs?

3. **Define the address schema**
   - What coordinates uniquely identify a game state?
   - What digests are needed for compact representation?
   - What input sequence captures player actions?

4. **Implement physics**
   - What forces act on objects? (gravity, friction, collisions)
   - How is energy transferred? (paddle hit, wall bounce, etc.)
   - What are the constraints? (minimum energy, maximum speed, etc.)

5. **Implement collision detection**
   - What objects can collide? (ball-paddle, ball-brick, etc.)
   - How are collisions detected? (AABB, sphere, mesh)
   - What happens on collision? (trajectory change, energy transfer, etc.)

6. **Implement rendering**
   - What materials are used? (ivory, steel, crystal, glass)
   - What lighting model? (Phong, PBR, etc.)
   - What camera view? (first-person, third-person, etc.)

7. **Implement scoring**
   - What events award points? (brick destroyed, level cleared, etc.)
   - What multipliers apply? (combo, time bonus, etc.)
   - What is the maximum score?

8. **Test determinism**
   - Replay same game with same inputs → identical state?
   - Verify receipts from Core match expected state?
   - Test edge cases (collisions, energy limits, etc.)

---

## Example: Breakout 3D

### Manifold
- **Geometry**: Cubic/spherical/cylindrical/toroidal/fractal arena
- **Rules**: Gravity pulls bricks down; ball bounces off walls/paddle/bricks; paddle deflects ball based on angle
- **State derivation**: From time, input sequence, and level seed

### Lenses
- `arena_geometry`: derives arena shape and wall positions from level
- `brick_layout`: derives brick positions, sizes, colors from level seed
- `gravity_field`: derives gravitational acceleration (always 9.8 m/s² downward)
- `ball_physics`: derives ball position, velocity, energy from time and input
- `paddle_physics`: derives paddle position, angle, size from input and collisions
- `collision_detection`: derives collisions between ball, paddle, bricks, walls, debris
- `debris_physics`: derives falling debris positions and velocities
- `energy_transfer`: derives energy changes from collisions
- `scoring`: derives score from bricks destroyed and level
- `render`: derives 3D mesh, materials, lighting, camera view

### Address Schema
```
{
  manifold_id: "breakout3d_v1",
  level: 1,
  arena_shape: "cubic",
  time: 42.5,
  player_input_sequence: [
    {type: "paddle_move", x: 0.5, y: 0.0, t: 0.1},
    {type: "paddle_move", x: 0.6, y: 0.0, t: 0.2},
    ...
  ],
  state_digests: {
    ball: "abc123...",
    paddle: "def456...",
    bricks: "ghi789...",
    debris: "jkl012..."
  },
  lens_id: "render",
  version: "1.0"
}
```

### Replay
```
# Provide same address + input sequence to Core
# Core derives identical game state
# Player sees exact same game play out
```

---

## Performance Considerations

### Throughput
- **Target**: 1000+ concurrent games on a single Core instance
- **Bottleneck**: Rendering (3D mesh generation), not physics
- **Optimization**: Cache derived meshes; only recompute on state change

### Latency
- **Target**: <16ms per frame (60 FPS)
- **Breakdown**:
  - Physics derivation: ~2ms
  - Collision detection: ~3ms
  - Rendering: ~8ms
  - Network (Core call): ~3ms

### Scaling
- **Horizontal**: Deploy multiple Core instances behind load balancer
- **Vertical**: Optimize physics and collision detection algorithms
- **Caching**: Cache frequently-accessed lenses (arena geometry, brick layout)

---

## Security and Verification

### Receipts
- Every Core call returns a signed receipt
- Receipt includes: state digest, code hash, timestamp, signature
- Verify receipt to confirm game state authenticity

### Determinism
- Replay same game with same inputs → identical state
- Verify determinism by comparing receipts across replays
- Useful for: competitive play, cheat detection, analysis

### Cheating Prevention
- Input sequence is signed by Core
- Modifying input sequence invalidates signature
- Leaderboards store only score + replay hash, not game data
- Verify leaderboard entries by replaying games

---

## Future Directions

### Multiplayer
- Multiple players query same Core for shared game state
- Input sequences are merged and ordered by timestamp
- Consequence: Distributed, verifiable multiplayer games

### AI Opponents
- AI input is derived from game state (no stored AI model)
- AI lenses compute optimal moves based on current state
- Consequence: Deterministic, verifiable AI

### Procedural Content
- Levels, obstacles, and challenges are procedurally generated
- Generation is deterministic from seed
- Consequence: Infinite variety, no content database

### Cross-Game Mechanics
- Shared physics engine across all games
- Shared rendering pipeline (Three.js)
- Shared replay protocol
- Consequence: Consistent gameplay experience, code reuse

---

## References

- MINDS/LENS paradigm: See butterflyfx-kernel and butterflyfx_core documentation
- Three.js: https://threejs.org/
- Physics: See PHYSICS_MODEL.md
- Replay protocol: See REPLAY_PROTOCOL.md
