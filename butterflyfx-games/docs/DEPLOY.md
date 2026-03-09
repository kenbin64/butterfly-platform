# ButterflyFX Games — VPS Deployment Guide

Complete instructions to deploy Breakout 3D to your VPS with AI automation support.

---

## Prerequisites

- VPS: Ubuntu LTS (20.04+ or 22.04+), 2 vCPU, 4 GB RAM
- Git access to https://github.com/kenbin64/butterflyfx-games.git
- SSH access to VPS
- Docker and Docker Compose installed on VPS

---

## Deployment Flow

```
Local Machine
    ↓
    git push → GitHub (butterflyfx-games)
    ↓
VPS
    ↓
    git clone → /opt/butterflyfx-games
    ↓
    docker compose up -d
    ↓
    http://YOUR_VPS_IP:8080
```

---

## Step 1: Local Setup and Push to GitHub

### 1.1) Initialize local repository
```bash
cd c:\universe\butterflyfx-games
git init
git add .
git commit -m "Initial commit: Breakout 3D prototype with deployment infrastructure"
git branch -M main
git remote add origin https://github.com/kenbin64/butterflyfx-games.git
git push -u origin main
```

### 1.2) Verify on GitHub
- Open https://github.com/kenbin64/butterflyfx-games
- Confirm files are present: breakout3d.html, README.md, docs/, deploy/

---

## Step 2: VPS Preparation

### 2.1) SSH to VPS
```bash
ssh user@YOUR_VPS_IP
```

### 2.2) Install Docker and Compose
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git ca-certificates curl
sudo usermod -aG docker $USER
newgrp docker
```

### 2.3) Verify Docker installation
```bash
docker --version
docker compose version
```

---

## Step 3: Clone and Deploy

### 3.1) Clone repository
```bash
git clone https://github.com/kenbin64/butterflyfx-games.git /opt/butterflyfx-games
cd /opt/butterflyfx-games
```

### 3.2) Configure environment
```bash
cd deploy
cp .env.example .env

# Edit .env if needed (port, domain, etc.)
cat .env
```

### 3.3) Launch with Docker Compose
```bash
docker compose up -d
```

### 3.4) Verify containers are running
```bash
docker compose ps
```

### 3.5) Health check
```bash
curl -s http://127.0.0.1:8080/breakout3d.html | head -20
```

---

## Step 4: Access the Game

### 4.1) From your local machine
```
http://YOUR_VPS_IP:8080/breakout3d.html
```

### 4.2) Optional: Set up reverse proxy (TLS)
See [REVERSE_PROXY.md](REVERSE_PROXY.md) for Caddy/nginx setup.

---

## Step 5: Systemd Integration (Optional)

### 5.1) Copy systemd unit
```bash
sudo cp /opt/butterflyfx-games/deploy/systemd/butterflyfx-games.service /etc/systemd/system/
```

### 5.2) Enable and start
```bash
sudo systemctl daemon-reload
sudo systemctl enable butterflyfx-games
sudo systemctl start butterflyfx-games
```

### 5.3) Check status
```bash
sudo systemctl status butterflyfx-games
```

### 5.4) View logs
```bash
sudo journalctl -u butterflyfx-games -f
```

---

## Step 6: Updates and Maintenance

### 6.1) Pull latest from GitHub
```bash
cd /opt/butterflyfx-games
git pull origin main
```

### 6.2) Rebuild and restart
```bash
cd deploy
docker compose down
docker compose up -d
```

### 6.3) View logs
```bash
docker compose logs -f web
```

---

## Troubleshooting

### Port 8080 already in use
```bash
# Change port in deploy/.env
echo PORT=8081 >> .env
docker compose down
docker compose up -d
```

### Docker build fails
```bash
# Check Docker logs
docker compose logs web

# Rebuild from scratch
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
# Verify SSH key or HTTPS credentials
git clone https://github.com/kenbin64/butterflyfx-games.git

# Or use SSH (if key is configured)
git clone git@github.com:kenbin64/butterflyfx-games.git
```

---

## AI/Agent Deployment Script

For automated VPS deployment by an AI agent, use this single command block:

```bash
#!/bin/bash
set -e

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
sleep 5
curl -s http://127.0.0.1:8080/breakout3d.html | head -20

# Optional: systemd
sudo cp /opt/butterflyfx-games/deploy/systemd/butterflyfx-games.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable butterflyfx-games
sudo systemctl start butterflyfx-games

echo "✓ Deployment complete. Access at http://YOUR_VPS_IP:8080/breakout3d.html"
```

Save as `deploy.sh` and run:
```bash
bash deploy.sh
```

---

## Monitoring

### Check service status
```bash
docker compose ps
sudo systemctl status butterflyfx-games
```

### View real-time logs
```bash
docker compose logs -f web
```

### Resource usage
```bash
docker stats
```

---

## Cleanup

### Stop service
```bash
docker compose down
```

### Remove systemd service
```bash
sudo systemctl stop butterflyfx-games
sudo systemctl disable butterflyfx-games
sudo rm /etc/systemd/system/butterflyfx-games.service
sudo systemctl daemon-reload
```

### Remove repository
```bash
rm -rf /opt/butterflyfx-games
```

---

## Next Steps

1. **Core Integration**: Connect to butterflyfx_core service for game state derivation
2. **Level Progression**: Add 5 more levels with different arena shapes and themes
3. **Multiplayer**: Support multiple concurrent players
4. **Leaderboards**: Store scores with replay hashes (no game data)
5. **Mobile**: Add touch controls for mobile devices

---

## Support

For issues or questions:
- Check Docker logs: `docker compose logs web`
- Check systemd logs: `sudo journalctl -u butterflyfx-games`
- Review [BREAKOUT3D_DESIGN.md](../docs/BREAKOUT3D_DESIGN.md) for game design
- Open an issue on GitHub: https://github.com/kenbin64/butterflyfx-games/issues
