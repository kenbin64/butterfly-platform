# Manifold — Butterfly Platform

> **Substrate-as-Seed Architecture** — Store geometry, extract infinite data

**Version:** `0.1.0-dev`
**Status:** 🚧 Development
**Live URL:** [kensgames.com](https://kensgames.com)

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

Live at **[kensgames.com](https://kensgames.com)**

### Games

- **FastTrack** 🎲 — High-fidelity 3D board game with AI opponents, animated pegs, camera director, and full FastTrack / bullseye protocol
- **BrickBreaker 3D** 🧱 — 3D brick smashing via saddle physics
- **Zenxy** — Synth, particle, and calculator demos

### Features

- Manifold-based state management (RepresentationTable substrates)
- AI opponents with weighted heuristic decision-making
- 3D billiard room environment (Three.js) with atmospheric lighting
- Camera director with auto-follow, peg tracking, and orbital framing
- Dynamic peg identity system (funny nicknames, techy bot names)
- Lobby with matchmaking, private rooms, AI fill
- Username/avatar persistence

## Project Structure

```
manifold/
├── core/                       # Dimensional programming core
│   ├── substrate/              # Base substrate, primitives, path expressions
│   ├── manifold/               # 7-segment state, field, interpolation
│   ├── facade/                 # Manifold facade API
│   └── engine/                 # Core engine interfaces
├── app/src/
│   ├── platform/               # KensGames platform
│   │   ├── games/fasttrack/    # FastTrack 3D board game
│   │   ├── games/brickbreaker3d/
│   │   ├── games/zenxy/        # Zenxy demos
│   │   └── lobby/              # Lobby manifold
│   └── engine/                 # Game, physics, audio, image engines
├── tests/                      # Jest test suites
├── examples/                   # Benchmarks, demos
└── docs/                       # API docs, AI directives
```

## Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run benchmarks
npx ts-node examples/substrate-seed-benchmark.ts

# Local dev — serve the platform
# Any static HTTP server works; files are plain HTML/JS (no build step)
npx http-server app/src/platform -p 8080
```

Then open `http://localhost:8080/kensgames.html`

## Deployment to VPS (kensgames.com)

The platform is hosted on a **Dynu VPS** accessed via **Tailscale**.

### Prerequisites

- Tailscale connected to the VPS mesh network
- SSH access: `ssh butterfly@100.70.142.122`
- Domain **kensgames.com** pointing to the VPS public IP
- Nginx installed on the VPS
- Certbot (Let's Encrypt) for SSL

### 1. SSH into the VPS

```bash
ssh butterfly@100.70.142.122
```

### 2. Clone / pull the repo

```bash
cd /var/www
git clone https://github.com/kenbin64/butterfly-platform.git kensgames
# Or if already cloned:
cd /var/www/kensgames && git pull origin master
```

### 3. Install dependencies (if running tests on server)

```bash
cd /var/www/kensgames
npm install --production
```

### 4. Nginx configuration

Create `/etc/nginx/sites-available/kensgames.com`:

```nginx
server {
    listen 80;
    server_name kensgames.com www.kensgames.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name kensgames.com www.kensgames.com;

    ssl_certificate     /etc/letsencrypt/live/kensgames.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kensgames.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    root /var/www/kensgames/app/src/platform;
    index kensgames.html;

    location / {
        try_files $uri $uri/ /kensgames.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:

```bash
sudo ln -sf /etc/nginx/sites-available/kensgames.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 5. SSL with Let's Encrypt

```bash
sudo certbot --nginx -d kensgames.com -d www.kensgames.com
# Auto-renewal is set up by certbot automatically
sudo certbot renew --dry-run   # verify
```

### 6. Verify

```bash
curl -I https://kensgames.com
```

### Quick redeploy

```bash
ssh butterfly@100.70.142.122 "cd /var/www/kensgames && git pull origin master"
```

## Domains

- **kensgames.com** — Games platform (primary)
- **butterflyfx.us** — Apps and tools

## License

MIT License — See [LICENSE](LICENSE)
