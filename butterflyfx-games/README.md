# ButterflyFX Games

Immersive 3D games built on MINDS/LENS. No storage, pure derivation, dimensional gameplay.

**Flagship**: Breakout 3D — a first-person 3D arena game with physics, dynamic camera, and procedural generation.

## Quick Start (Local)

```bash
git clone https://github.com/kenbin64/butterflyfx-games.git
cd butterflyfx-games
python -m http.server 8000
# Open http://127.0.0.1:8000/breakout3d.html
```

## VPS Deployment

See [DEPLOY.md](docs/DEPLOY.md) for complete VPS deployment instructions.

## Features

- **Breakout 3D**: Immersive first-person 3D breakout game
  - High-quality graphics (Three.js, WebGL)
  - Dynamic camera (auto-follow ball, manual control)
  - Physics-based gameplay (gravity, energy, collisions)
  - Colorful crystal bricks, reflective paddle, shiny steel ball
  - Space backdrop with procedural stars
  - Scoring system and level progression

- **No Storage**: Game state derived on demand from Core service
- **Deterministic**: Same inputs = same game always (verifiable)
- **Scalable**: Thousands of concurrent games, zero database overhead

## Controls

- **Mouse**: Move paddle
- **Space**: Launch ball
- **C**: Toggle camera mode (Auto ↔ Manual)
- **Arrow Keys**: Manual camera rotation

## Architecture

- **Frontend**: HTML5 + Three.js (3D rendering)
- **Backend**: Python Flask (optional, for Core integration)
- **Deployment**: Docker + systemd (VPS)

## Documentation

- [BREAKOUT3D_DESIGN.md](docs/BREAKOUT3D_DESIGN.md) — Design specification
- [GAME_DESIGN.md](docs/GAME_DESIGN.md) — Dimensional game design principles
- [PHYSICS_MODEL.md](docs/PHYSICS_MODEL.md) — Physics equations and energy system
- [DEPLOY.md](docs/DEPLOY.md) — VPS deployment guide

## License

MIT License. See [LICENSE](LICENSE) for details.

## Author

Kenneth Bingham — ButterflyFX
