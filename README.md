# Manifold

> **Substrate-as-Seed Architecture** — Store geometry, extract infinite data

## Overview

Manifold is a dimensional programming framework where data lives on geometric surfaces. Instead of storing data traditionally, we store only the **substrate seed** (~500 bytes) and deterministically extract any data from the `z = xy` saddle manifold.

```
Traditional:  1M floats = 7.63 MB
Manifold:     1M floats = ~500 bytes (seed only)
Savings:      99.99%
```

## Core Concepts

### Diamond Drill Geometry (7 Sections)
```
╭─╮   ╭─╮   ╭─╮   ╭─╮   ╭─╮   ╭─╮   ╭─╮
│1│───│2│───│3│───│4│───│5│───│6│───│7│  ← 7 saddle surfaces
╰─╯   ╰─╯   ╰─╯   ╰─╯   ╰─╯   ╰─╯   ╰─╯
      [K]       [K]       [K]            ← TurnKeys at 2, 4, 6
```

- **X axis**: Substrate length along helix spine
- **Y axis**: Amplitude (data magnitude)
- **Z axis**: Oscillation (90° twist = new dimension)

### Dining Philosophers Synchronization
Lock-free thread sync through geometry. Each section is a philosopher — access requires both adjacent forks.

## KensGames Platform

Live at **kensgames.com**

### Games
- **FastTrack** 🎲 — Strategic racing board game
- **BrickBreaker 3D** 🧱 — 3D brick smashing via saddle physics

### Features
- Manifold-based state management
- AI opponents (autonomous game players)
- Lobby with matchmaking, private rooms, AI fill
- Username/avatar persistence

## Project Structure

```
manifold/
├── core/               # Dimensional programming core
│   ├── dimensional/    # Dimension class, drilling
│   ├── substrate/      # Base substrate, flow, diamond drill
│   ├── manifold/       # Field, interpolation
│   └── geometry/       # Saddle surface math
├── app/src/
│   ├── platform/       # KensGames platform
│   │   ├── games/      # FastTrack, BrickBreaker3D
│   │   └── lobby/      # Lobby manifold
│   └── engine/         # Game, physics, audio substrates
├── tests/              # Jest test suites
└── examples/           # Benchmarks, demos
```

## Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run benchmarks
npx ts-node examples/substrate-seed-benchmark.ts
```

## Deployment

### Domains
- **kensgames.com** — Games platform
- **butterflyfx.us** — Apps and tools

### Deploy to VPS
```bash
./deploy/deploy.sh
```

## License

MIT License — See [LICENSE](LICENSE)

