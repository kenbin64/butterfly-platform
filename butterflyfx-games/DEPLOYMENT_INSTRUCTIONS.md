# ButterflyFX Games — Complete Deployment Instructions

## Overview

This guide covers the complete workflow:
1. Local development and testing
2. Push to GitHub
3. Deploy to VPS via AI agent or manual commands

---

## Part 1: Local Setup and Testing

### 1.1) Clone and run locally

```bash
cd c:\universe\butterflyfx-games
git init
git add .
git commit -m "Initial commit: Breakout 3D with deployment infrastructure"
git branch -M main
git remote add origin https://github.com/kenbin64/butterflyfx-games.git
git push -u origin main
```

### 1.2) Test locally (Python HTTP server)

```bash
cd c:\universe\butterflyfx-games
python -m http.server 8000
# Open http://127.0.0.1:8000/breakout3d.html
```

### 1.3) Verify on GitHub

- Open https://github.com/kenbin64/butterflyfx-games
- Confirm all files are present:
  - breakout3d.html
  - README.md
  - docs/ (DEPLOY.md, BREAKOUT3D_DESIGN.md, GAME_DESIGN.md, PHYSICS_MODEL.md)
  - deploy/ (docker-compose.yaml, nginx.conf, .env.example, systemd/, deploy.sh)
  - LICENSE, .gitignore

---

## Part 2: VPS Deployment (Manual)

### 2.1) SSH to VPS

```bash
ssh user@YOUR_VPS_IP
```

### 2.2) Run deployment script (automated)

```bash
bash <(curl -s https://raw.githubusercontent.com/kenbin64/butterflyfx-games/main/deploy/deploy.sh)
```

Or download and run locally:

```bash
curl -O https://raw.githubusercontent.com/kenbin64/butterflyfx-games/main/deploy/deploy.sh
bash deploy.sh
```

### 2.3) Manual deployment (step-by-step)

```bash
# Install Docker
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git ca-certificates curl
sudo usermod -aG docker $USER
newgrp docker

# Clone repository
git clone https://github.com/kenbin64/butterflyfx-games.git /opt/butterflyfx-games
cd /opt/butterflyfx-games/deploy

# Configure
cp .env.example .env
echo PORT=8080 >> .env

# Deploy
docker compose up -d

# Verify
curl -s http://127.0.0.1:8080/breakout3d.html | head -20
```

### 2.4) Access the game

```
http://YOUR_VPS_IP:8080/breakout3d.html
```

---

## Part 3: VPS Deployment (AI Agent Automation)

For an AI agent to deploy automatically, provide this single command:

```bash
#!/bin/bash
set -e
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git ca-certificates curl
sudo usermod -aG docker $USER && newgrp docker
git clone https://github.com/kenbin64/butterflyfx-games.git /opt/butterflyfx-games
cd /opt/butterflyfx-games/deploy
cp .env.example .env && echo PORT=8080 >> .env
docker compose up -d
sleep 5
curl -s http://127.0.0.1:8080/breakout3d.html | grep -q "ButterflyFX" && echo "✓ Deployment successful" || echo "✗ Deployment failed"
```

Save as `deploy_auto.sh` and execute:

```bash
bash deploy_auto.sh
```

---

## Part 4: Systemd Integration (Optional)

### 4.1) Enable auto-start on VPS reboot

```bash
sudo cp /opt/butterflyfx-games/deploy/systemd/butterflyfx-games.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable butterflyfx-games
sudo systemctl start butterflyfx-games
```

### 4.2) Check status

```bash
sudo systemctl status butterflyfx-games
sudo journalctl -u butterflyfx-games -f
```

---

## Part 5: Updates and Maintenance

### 5.1) Pull latest from GitHub

```bash
cd /opt/butterflyfx-games
git pull origin main
```

### 5.2) Rebuild and restart

```bash
cd deploy
docker compose down
docker compose up -d
```

### 5.3) View logs

```bash
docker compose logs -f web
```

---

## Part 6: Troubleshooting

### Port 8080 already in use

```bash
# Change port in deploy/.env
echo PORT=8081 >> .env
docker compose down
docker compose up -d
```

### Docker build fails

```bash
docker compose logs web
docker compose down
docker system prune -a
docker compose up -d --build
```

### Cannot access from external IP

```bash
# Check firewall
sudo ufw allow 8080/tcp
sudo ufw status

# Verify service is listening
netstat -tlnp | grep 8080
```

### Git clone fails

```bash
# Verify credentials or SSH key
git clone https://github.com/kenbin64/butterflyfx-games.git
```

---

## File Structure

```
butterflyfx-games/
├── breakout3d.html                 # Main game (Three.js)
├── README.md                        # Project overview
├── LICENSE                          # MIT License
├── .gitignore                       # Git ignore rules
├── docs/
│   ├── DEPLOY.md                   # Deployment guide
│   ├── BREAKOUT3D_DESIGN.md        # Game design spec
│   ├── GAME_DESIGN.md              # Design principles
│   └── PHYSICS_MODEL.md            # Physics equations
└── deploy/
    ├── docker-compose.yaml         # Docker Compose config
    ├── nginx.conf                  # Nginx config
    ├── .env.example                # Environment template
    ├── deploy.sh                   # Automated deployment script
    └── systemd/
        └── butterflyfx-games.service  # Systemd unit
```

---

## Quick Reference

### Local testing
```bash
python -m http.server 8000
# http://127.0.0.1:8000/breakout3d.html
```

### VPS deployment (automated)
```bash
bash <(curl -s https://raw.githubusercontent.com/kenbin64/butterflyfx-games/main/deploy/deploy.sh)
```

### VPS deployment (manual)
```bash
git clone https://github.com/kenbin64/butterflyfx-games.git /opt/butterflyfx-games
cd /opt/butterflyfx-games/deploy
cp .env.example .env
docker compose up -d
```

### Access game
```
http://YOUR_VPS_IP:8080/breakout3d.html
```

### View logs
```bash
docker compose logs -f web
```

### Stop service
```bash
docker compose down
```

---

## Next Steps

1. **Core Integration**: Connect to butterflyfx_core for game state derivation
2. **Level Progression**: Add 5 more levels with different arena shapes
3. **Multiplayer**: Support concurrent players
4. **Leaderboards**: Store scores with replay hashes
5. **Mobile**: Add touch controls

---

## Support

- GitHub Issues: https://github.com/kenbin64/butterflyfx-games/issues
- Docker Logs: `docker compose logs web`
- Systemd Logs: `sudo journalctl -u butterflyfx-games`
