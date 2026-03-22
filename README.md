# Butterfly Platform

**A multi-app/game platform built on the Schwarz Diamond engine.**

Live at: [kensgames.com](https://kensgames.com)

---

## Dimensional Architecture

The Butterfly Platform is organized as a **dimensional manifold** — layers that nest like Russian dolls, each adding a higher-order capability. Everything derives from a single mathematical primitive: **z = xy** (the hyperbolic paraboloid / saddle surface).

### Directory Structure = Dimensions

```
butterfly-platform/
│
├── point/          # 0D — The collapsed singularity (entry points, compilers)
├── line/           # 1D — Core libraries (butterflyfx-core, butterflyfx-ip)
├── plane/          # 2D — Platform services
├── volume/         # 3D — Application source (game files, server code)
├── whole/          # 4D — Documentation, wholistic views
├── width/          # Engine dimension
│   ├── engine/         # Schwarz Diamond engine
│   │   ├── schwarz.js          # The mathematical surface (z=xy)
│   │   ├── osi/                # 8-layer helix (L0 Void → L7 Application)
│   │   ├── substrate/          # Shared substrates (audio, camera, physics, etc.)
│   │   ├── drivers/            # Output drivers (video, auteng)
│   │   ├── index.js            # Engine entry point
│   │   └── deploy/             # Build system & deployment
│   └── lib/            # Shared libraries (Three.js, jQuery, Bootstrap)
│
└── games/          # Application apex — where divergence is allowed
    ├── fasttrack/       # FastTrack board game (6-player hex, AI opponents)
    └── brickbreaker3d/  # BrickBreaker3D (physics-based arcade)
```

### The OSI Helix — 8 Layers × 45° = 360°

The engine's core is an 8-layer helix mapped to the OSI model. Each layer rotates the saddle surface by 45°:

| Layer | Angle | File | Role |
|-------|-------|------|------|
| L0 | 0° | `osi/0_void.js` | Void — pre-existence, pure potential |
| L1 | 45° | `osi/1_physical.js` | Physical — signals, raw substrate |
| L2 | 90° | `osi/2_datalink.js` | DataLink — local binding, adjacency |
| L3 | 135° | `osi/3_network.js` | Network — routing, addressing |
| L4 | 180° | `osi/4_transport.js` | Transport — reliability, flow |
| L5 | 225° | `osi/5_session.js` | Session — continuity, boundaries |
| L6 | 270° | `osi/6_presentation.js` | Presentation — encoding, transformation |
| L7 | 315° | `osi/7_application.js` | Application — intent boundary |

### Substrates — Shared Capabilities

Substrates are cross-cutting concerns shared by all applications:

| Substrate | Purpose |
|-----------|---------|
| `audio_substrate.js` | Sound effects & music |
| `camera_substrate.js` | 3D camera control |
| `physics_substrate.js` | Physics simulation |
| `render_substrate.js` | WebGL rendering |
| `settings_substrate.js` | User preferences |
| `joystick_substrate.js` | Input handling |
| `ui_settings_substrate.js` | UI configuration |

### The Rule

**Applications are thin observers, not universes.** They may define their own goals, scenes, logic, and assets — but they must not redefine geometry, physics, communication, or engine primitives. Everything below Layer 7 is shared and immutable.

---

## Build System — Point Collapse

The build system collapses all dimensions into a single self-contained Node.js artifact:

```bash
node width/engine/deploy/build.js
```

**Output:** `width/engine/deploy/artifacts/schwarz-diamond.point.js` (~14MB)

This single file contains:
- The Schwarz Diamond engine (all 8 OSI layers + substrates)
- All games (FastTrack, BrickBreaker3D)
- All shared libraries (Three.js, jQuery, Bootstrap, fonts)
- An embedded HTTP server

**Test locally:**
```bash
node width/engine/deploy/artifacts/schwarz-diamond.point.js
# → http://localhost:3000
```

---

## Deployment

**Source code stays on GitHub. Only the built artifact runs on the server.**

### Deploy to VPS (kensgames.com)

**First time:**
```bash
# On VPS (Ubuntu)
git clone https://github.com/kenbin64/butterfly-platform.git /opt/butterfly-platform
cd /opt/butterfly-platform
node width/engine/deploy/build.js
sudo bash width/engine/deploy/provision-kensgames.sh
```

**Subsequent deploys:**
```bash
cd /opt/butterfly-platform
git pull origin main
node width/engine/deploy/build.js
sudo cp width/engine/deploy/artifacts/schwarz-diamond.point.js /var/www/kensgames/
sudo systemctl restart kensgames
```

The provisioning script handles: Node.js install, nginx reverse proxy, systemd service, SSL via Let's Encrypt.

See `width/engine/deploy/DEPLOY_VPS.md` for full details.

---

## Apps

| App | URL | Description |
|-----|-----|-------------|
| FastTrack | `/fasttrack/board_3d.html` | 6-player hex board game with AI opponents, 3D rendered |
| BrickBreaker3D | `/brickbreaker3d/` | Physics-based arcade game |

---

## Key Files

| File | Purpose |
|------|---------|
| `width/engine/schwarz.js` | The mathematical surface — 617 lines, 52 methods |
| `width/engine/schwarz.test.js` | 212 proofs + 16 benchmarks |
| `width/engine/deploy/build.js` | Point Collapse build engine |
| `width/engine/deploy/provision-kensgames.sh` | VPS provisioning (nginx + SSL + systemd) |
| `UNIVERSAL_AI_DIRECTIVE.md` | Architectural principles |

---

## Mathematical Foundation

See `width/engine/SCHWARZ_DIAMOND_PROOF.md` for the full mathematical proof that every property — gradients, normals, curvature, logic gates, reflections, coordinates — derives from **z = xy**.

Run the proof suite:
```bash
node width/engine/schwarz.test.js
```

---

**Author:** Kenneth Bingham
**License:** CC BY 4.0

