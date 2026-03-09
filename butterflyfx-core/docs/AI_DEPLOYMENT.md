# ButterflyFX Core — AI/Agent Deployment Guide

Objective: Deploy the live Core service on a VPS, run legitimate benchmarks, and produce signed receipts.

Follow steps exactly. Abort on any non-zero exit status.

## 1) Install prerequisites
```
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git ca-certificates curl
sudo usermod -aG docker $USER
newgrp docker
```

## 2) Clone and configure
```
git clone https://github.com/kenbin64/butterflyfx_core.git
cd butterflyfx_core/deploy
cp .env.example .env
# Generate signing seed for receipts
KEY_HEX=$(openssl rand -hex 32)
echo KEY_SEED=$KEY_HEX >> .env
echo CORE_PORT=8081 >> .env
echo DEV_CAPABILITY=allow >> .env
```

## 3) Launch service
```
docker compose up -d
docker compose ps
```

## 4) Health check
```
curl -s http://127.0.0.1:8081/health
```

## 5) Run benchmarks (real, no simulation)
```
cd ..
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python butterflyfx_core/benchmarks/runner.py --target http://127.0.0.1:8081 --scenario pi --concurrency 100 --duration 60
python butterflyfx_core/benchmarks/runner.py --target http://127.0.0.1:8081 --scenario primes --concurrency 100 --duration 60
```

Artifacts:
- `benchmarks/reports/<ts>/run.json` — KPIs
- `benchmarks/reports/<ts>/receipts/*.json` — signed receipts (Merkle-chained)

## 6) Shutdown / upgrade
```
cd deploy
docker compose down
# Update to latest
cd ..
git pull
cd deploy
docker compose up -d
```

Safety: do not expose the service publicly without TLS and capability enforcement. For production, disable `DEV_CAPABILITY`, add a reverse proxy with TLS, and configure rate limits.
