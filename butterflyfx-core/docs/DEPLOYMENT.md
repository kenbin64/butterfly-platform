# ButterflyFX Core — VPS Deployment Guide

This guide deploys the Core service to a VPS with Docker and docker compose. The service exposes the real kernel transitions and real derive endpoints (pi/primes). No simulations.

## Prerequisites
- Ubuntu LTS (20.04+ or 22.04+)
- sudo user
- Inbound TCP to CORE_PORT (default 8081) or behind a reverse proxy

## Install Docker + Compose
```
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git ca-certificates curl
sudo usermod -aG docker $USER
newgrp docker
```

## Clone and configure
```
git clone https://github.com/kenbin64/butterflyfx_core.git
cd butterflyfx_core/deploy
cp .env.example .env
# Edit .env values; to start quickly:
echo KEY_SEED=$(openssl rand -hex 32) >> .env
```

## Launch
```
docker compose up -d
```

## Health check
```
curl -s http://127.0.0.1:${CORE_PORT:-8081}/health
```

## Optional systemd integration
```
sudo mkdir -p /opt/butterflyfx-core
sudo rsync -a ~/butterflyfx_core/ /opt/butterflyfx-core/
sudo cp /opt/butterflyfx-core/deploy/systemd/butterflyfx-core.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now butterflyfx-core
```

## Benchmarks (from your laptop or on the VPS)
```
python -m pip install -r requirements.txt
python butterflyfx_core/benchmarks/runner.py --target http://YOUR_VPS_IP:${CORE_PORT:-8081} --scenario pi --concurrency 100 --duration 60
python butterflyfx_core/benchmarks/runner.py --target http://YOUR_VPS_IP:${CORE_PORT:-8081} --scenario primes --concurrency 100 --duration 60
```

Outputs:
- `benchmarks/reports/<timestamp>/run.json` — KPIs
- `benchmarks/reports/<timestamp>/receipts/*.json` — signed receipts (Merkle-chained)

## Next steps (production hardening)
- Disable DEV_CAPABILITY and switch to signed capability tokens
- Add TLS reverse proxy (Caddy/nginx) and restrict HTTP to localhost
- Configure CPU/memory limits and rate budgets in compose
- Add sandboxing for LENS (WASM/micro‑VM)
