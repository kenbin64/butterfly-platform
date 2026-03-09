#!/bin/bash
# ButterflyFX Games — Automated VPS Deployment Script
# For AI agents: run this script to deploy Breakout 3D to your VPS
# Usage: bash deploy.sh

set -e

echo "=========================================="
echo "ButterflyFX Games — VPS Deployment"
echo "=========================================="

# Step 1: Install Docker
echo "[1/6] Installing Docker and Docker Compose..."
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git ca-certificates curl
sudo usermod -aG docker $USER
newgrp docker

# Step 2: Verify Docker
echo "[2/6] Verifying Docker installation..."
docker --version
docker compose version

# Step 3: Clone repository
echo "[3/6] Cloning repository from GitHub..."
git clone https://github.com/kenbin64/butterflyfx-games.git /opt/butterflyfx-games
cd /opt/butterflyfx-games/deploy

# Step 4: Configure environment
echo "[4/6] Configuring environment..."
cp .env.example .env
echo "PORT=8080" >> .env

# Step 5: Deploy with Docker Compose
echo "[5/6] Deploying with Docker Compose..."
docker compose up -d

# Step 6: Verify deployment
echo "[6/6] Verifying deployment..."
sleep 5

if curl -s http://127.0.0.1:8080/breakout3d.html | grep -q "ButterflyFX Breakout 3D"; then
    echo "✓ Deployment successful!"
    echo ""
    echo "=========================================="
    echo "Access the game at:"
    echo "http://YOUR_VPS_IP:8080/breakout3d.html"
    echo "=========================================="
else
    echo "✗ Deployment verification failed"
    echo "Check logs: docker compose logs web"
    exit 1
fi

# Optional: systemd integration
echo ""
read -p "Enable systemd auto-start? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Setting up systemd..."
    sudo cp /opt/butterflyfx-games/deploy/systemd/butterflyfx-games.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable butterflyfx-games
    sudo systemctl start butterflyfx-games
    echo "✓ Systemd enabled"
fi

echo ""
echo "Deployment complete!"
