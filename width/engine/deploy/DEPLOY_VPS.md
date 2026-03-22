# Schwarz Diamond — VPS Deployment Guide

> **For: VPS AI / automated deploy agents**
> **Architecture:** Single-file Node.js artifact (no Docker, no build tools needed on server)
> **Principle:** `z = xy` — everything collapses to one point.
> **Source:** https://github.com/kenbin64/butterfly-platform.git

---

## Target Environment

| Property | Value |
|---|---|
| **VPS IP** | `172.81.62.217` (Tailscale: `100.70.142.122`) |
| **SSH User** | `butterfly` |
| **Domain** | `kensgames.com` |
| **Repo** | `https://github.com/kenbin64/butterfly-platform.git` |
| **Artifact** | `schwarz-diamond.point.js` (~14MB) |
| **App Dir** | `/var/www/kensgames/` |
| **Node Port** | `3000` (proxied by nginx) |
| **Service** | `kensgames` (systemd) |
| **OS** | Ubuntu 24.04 LTS |

---

## First-Time Setup (from scratch)

```bash
# 1. Clone the repo
git clone https://github.com/kenbin64/butterfly-platform.git /opt/butterfly-platform
cd /opt/butterfly-platform

# 2. Build the artifact
node width/engine/deploy/build.js

# 3. Run the provisioning script (does EVERYTHING)
sudo bash width/engine/deploy/provision-kensgames.sh
```

The provisioning script handles:
- ✅ Node.js 20.x installation
- ✅ nginx installation & reverse proxy config
- ✅ certbot installation & SSL certificate
- ✅ Artifact deployment to `/var/www/kensgames/`
- ✅ systemd service creation (auto-restart on crash/reboot)
- ✅ HTTP → HTTPS redirect

**That's it.** After this, `https://kensgames.com` is live.

---

## Subsequent Deploys (update to latest)

```bash
cd /opt/butterfly-platform
git pull origin main
node width/engine/deploy/build.js
sudo cp width/engine/deploy/artifacts/schwarz-diamond.point.js /var/www/kensgames/
sudo systemctl restart kensgames
```

---

## Developer Workflow

```
┌─────────────────────────────────────────────────────┐
│  Dev Machine (Windows)                              │
│                                                     │
│  1. Edit source in games/, width/engine/, etc.      │
│  2. Build: node width/engine/deploy/build.js        │
│  3. Test:  node width/engine/deploy/artifacts/      │
│            schwarz-diamond.point.js                 │
│            → http://localhost:3000                   │
│  4. Commit & push: git push origin main             │
└──────────────────────┬──────────────────────────────┘
                       │ git push
                       ▼
              ┌─────────────────┐
              │  GitHub          │
              │  butterfly-      │
              │  platform.git    │
              └────────┬────────┘
                       │ git pull
                       ▼
┌─────────────────────────────────────────────────────┐
│  VPS (Ubuntu)                                       │
│                                                     │
│  1. git pull origin main                            │
│  2. node width/engine/deploy/build.js               │
│  3. cp artifact → /var/www/kensgames/               │
│  4. systemctl restart kensgames                     │
│                                                     │
│  nginx (443/SSL) → node (3000) → schwarz-diamond    │
└─────────────────────────────────────────────────────┘
```

---

## Build System — Point Collapse

```bash
node width/engine/deploy/build.js
```

The build script:
1. Reads engine modules from `width/engine/` (OSI layers, substrates, drivers)
2. Ingests all games from `games/` (auto-discovers directories)
3. Ingests shared libraries from `width/lib/` (Three.js, jQuery, Bootstrap, fonts)
4. Collapses everything into a single IIFE with an embedded HTTP server

**Output:** `width/engine/deploy/artifacts/schwarz-diamond.point.js`

**Verify:** Look for `POINT COLLAPSE CLEAN -- all dimensions present` in build output.

---

## Service Management

```bash
# Status
sudo systemctl status kensgames

# Restart (after redeploy)
sudo systemctl restart kensgames

# Live logs
journalctl -u kensgames -f

# Recent logs
journalctl -u kensgames --since "5 min ago"
```

---

## Apps on the Manifold

| App | URL | Notes |
|---|---|---|
| FastTrack | `https://kensgames.com/fasttrack/board_3d.html` | 6-player hex board game, AI opponents |
| BrickBreaker3D | `https://kensgames.com/brickbreaker3d/` | Physics-based arcade |

**Adding a new game:** Create `games/<name>/` with an `index.html`, rebuild, redeploy. The build script auto-discovers it.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `EADDRINUSE` | `sudo lsof -i :3000` and kill, or `sudo systemctl stop kensgames` |
| Browser shows old version | Hard refresh: **Ctrl+Shift+R** |
| `Not on the surface` (404) | File not in artifact — rebuild |
| Service won't start | `journalctl -u kensgames -n 30` |
| SSL cert expired | `sudo certbot renew` |
| `Cannot find module` | Node.js too old — must be v18+ |

---

## Architecture

- **One file ships.** The artifact contains engine + all games + all libraries + HTTP server.
- **No source code on the VPS.** Only the collapsed artifact runs. The repo is just the delivery mechanism.
- **No `node_modules`.** No `npm install`. No `package.json`. Just `node artifact.js`.
- **Source of truth is GitHub.** All edits happen on dev machine, push to GitHub, pull on VPS.

