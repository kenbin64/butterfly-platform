# ButterflyFX Core — Build and Deployment Guide

Complete, step-by-step guide to build, test, and deploy the Core service to a VPS with protection (Docker, systemd, health checks, benchmarks).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Build and Test](#local-build-and-test)
3. [VPS Deployment](#vps-deployment)
4. [Systemd Protection](#systemd-protection)
5. [Benchmarks and Verification](#benchmarks-and-verification)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Local Machine
- Python 3.11+
- Git
- Docker (optional, for local image build)
- pip and venv

### VPS
- Ubuntu LTS (20.04+ or 22.04+)
- sudo access
- Inbound TCP to port 8081 (or behind reverse proxy)
- ~2 vCPU, 4 GB RAM minimum

---

## Local Build and Test

### 1) Clone the repository
```bash
git clone https://github.com/kenbin64/butterflyfx_core.git
cd butterflyfx_core
```

### 2) Create virtual environment and install dependencies
```bash
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
```

### 3) Run Core service locally
```bash
# Set environment variables (dev mode)
export CORE_PORT=8081
export DEV_CAPABILITY=allow
export KEY_SEED=00112233aabbccddeeff00112233aabb

# Start the service
uvicorn butterflyfx_core.core_service.app:app --host 0.0.0.0 --port 8081
```

### 4) Health check (in another terminal)
```bash
curl -s http://127.0.0.1:8081/health | python -m json.tool
```

Expected output:
```json
{
  "status": "ok",
  "core_hash": "<hex>",
  "kernel_hash": "<hex|unknown>"
}
```

### 5) Test endpoints (curl examples)
```bash
# Invoke level
curl -X POST http://127.0.0.1:8081/core/invoke \
  -H 'Content-Type: application/json' \
  -d '{"state":{"spiral":0,"level":0},"k":6,"capability":"allow"}'

# Pi digits
curl -X POST http://127.0.0.1:8081/derive/pi \
  -H 'Content-Type: application/json' \
  -d '{"start":0,"count":64,"capability":"allow"}'

# Primes
curl -X POST http://127.0.0.1:8081/derive/primes \
  -H 'Content-Type: application/json' \
  -d '{"start":1000000,"count":128,"rounds":8,"capability":"allow"}'
```

---

## Local Build and Test (Docker)

### 1) Build Docker image
```bash
cd deploy
docker build -t butterflyfx/core:dev ..
```

### 2) Run container
```bash
docker run -d \
  -e CORE_PORT=8081 \
  -e DEV_CAPABILITY=allow \
  -e KEY_SEED=00112233aabbccddeeff00112233aabb \
  -p 8081:8081 \
  --name butterflyfx-core-dev \
  butterflyfx/core:dev
```

### 3) Health check
```bash
curl -s http://127.0.0.1:8081/health
```

### 4) Stop container
```bash
docker stop butterflyfx-core-dev
docker rm butterflyfx-core-dev
```

---

## VPS Deployment

### 1) SSH to VPS
```bash
ssh user@YOUR_VPS_IP
```

### 2) Install Docker and Compose
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git ca-certificates curl
sudo usermod -aG docker $USER
newgrp docker
```

### 3) Clone repository
```bash
git clone https://github.com/kenbin64/butterflyfx_core.git /opt/butterflyfx-core
cd /opt/butterflyfx-core/deploy
```

### 4) Configure environment
```bash
cp .env.example .env

# Generate a random signing seed
KEY_HEX=$(openssl rand -hex 32)
echo KEY_SEED=$KEY_HEX >> .env

# Set port and dev capability
echo CORE_PORT=8081 >> .env
echo DEV_CAPABILITY=allow >> .env

# Verify .env
cat .env
```

### 5) Launch service with Docker Compose
```bash
docker compose up -d
```

### 6) Verify containers are running
```bash
docker compose ps
```

### 7) Health check
```bash
curl -s http://127.0.0.1:8081/health
```

Expected output:
```json
{
  "status": "ok",
  "core_hash": "<hex>",
  "kernel_hash": "<hex|unknown>"
}
```

### 8) View logs
```bash
docker compose logs -f core
```

---

## Systemd Protection

### 1) Copy systemd unit to system
```bash
sudo cp /opt/butterflyfx-core/deploy/systemd/butterflyfx-core.service /etc/systemd/system/
```

### 2) Reload systemd daemon
```bash
sudo systemctl daemon-reload
```

### 3) Enable and start service
```bash
sudo systemctl enable butterflyfx-core
sudo systemctl start butterflyfx-core
```

### 4) Check status
```bash
sudo systemctl status butterflyfx-core
```

### 5) View systemd logs
```bash
sudo journalctl -u butterflyfx-core -f
```

### 6) Restart service (if needed)
```bash
sudo systemctl restart butterflyfx-core
```

### 7) Stop service
```bash
sudo systemctl stop butterflyfx-core
```

---

## Benchmarks and Verification

### 1) Install benchmark dependencies (on VPS or local machine)
```bash
cd /opt/butterflyfx-core
python3 -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### 2) Run Pi digits benchmark
```bash
python butterflyfx_core/benchmarks/runner.py \
  --target http://127.0.0.1:8081 \
  --scenario pi \
  --concurrency 100 \
  --duration 60
```

### 3) Run Primes benchmark
```bash
python butterflyfx_core/benchmarks/runner.py \
  --target http://127.0.0.1:8081 \
  --scenario primes \
  --concurrency 100 \
  --duration 60
```

### 4) Benchmark artifacts
Results are saved under:
- `benchmarks/reports/<timestamp>/run.json` — KPIs (ok, err, rps, p50/p95/p99)
- `benchmarks/reports/<timestamp>/receipts/*.json` — signed, Merkle-chained receipts

### 5) Verify receipts
Each receipt contains:
- `ts_ms`: timestamp (milliseconds)
- `digest`: SHA-256 of the payload
- `merkle_root`: Merkle-chained root
- `sig`: Ed25519 signature
- `pub`: public key (hex)

Verify using docs/RECEIPTS.md for signature validation and Merkle chain integrity.

### 6) Compare code hashes
- Get hashes from `/health` endpoint
- Compare with GitHub commit hashes in the repository
- Confirm kernel_pure.py hash matches published kernel release

---

## Troubleshooting

### Docker build fails: "butterflyfx-kernel not found"
**Cause**: butterflyfx-kernel not published to PyPI.

**Solution A** (temporary): Vendor kernel_pure.py
```bash
# In deploy/Dockerfile, replace:
# RUN pip install --no-cache-dir butterflyfx-kernel || true
# With:
COPY ../butterflyfx_kernel/butterflyfx/kernel_pure.py /app/vendor/kernel_pure.py
```

**Solution B** (permanent): Publish kernel to PyPI
```bash
cd ../butterflyfx-kernel
python -m pip install --upgrade build twine
python -m build
python -m twine upload dist/*
```

### Port 8081 already in use
**Solution**: Change CORE_PORT in .env
```bash
echo CORE_PORT=8082 >> .env
docker compose down
docker compose up -d
curl -s http://127.0.0.1:8082/health
```

### Health check returns "kernel_hash: unknown"
**Cause**: Kernel not found at import time.

**Solution**: Ensure butterflyfx-kernel is installed or vendored (see above).

### Benchmarks timeout or fail
**Cause**: Core service not responding or network issue.

**Solution**:
```bash
# Verify service is running
docker compose ps
# Check logs
docker compose logs -f core
# Test health endpoint
curl -v http://127.0.0.1:8081/health
# Reduce concurrency and duration
python butterflyfx_core/benchmarks/runner.py \
  --target http://127.0.0.1:8081 \
  --scenario pi \
  --concurrency 10 \
  --duration 10
```

### Systemd service fails to start
**Cause**: Docker not running or permissions issue.

**Solution**:
```bash
# Ensure Docker is running
sudo systemctl start docker
# Check systemd logs
sudo journalctl -u butterflyfx-core -n 50
# Verify file permissions
ls -la /etc/systemd/system/butterflyfx-core.service
# Reload and retry
sudo systemctl daemon-reload
sudo systemctl restart butterflyfx-core
```

### Cannot push to GitHub
**Cause**: Local branch behind remote.

**Solution**:
```bash
git fetch origin
git merge origin/main
git push -u origin main
```

---

## Security Hardening (Post-Deployment)

### 1) Disable dev capability
Edit deploy/.env:
```bash
DEV_CAPABILITY=
```
Restart:
```bash
docker compose restart core
```

### 2) Add TLS reverse proxy (Caddy)
Add to deploy/docker-compose.yaml:
```yaml
caddy:
  image: caddy:latest
  ports:
    - "443:443"
    - "80:80"
  volumes:
    - ./Caddyfile:/etc/caddy/Caddyfile
    - caddy_data:/data
    - caddy_config:/config
  environment:
    - DOMAIN=core.yourdomain.com
```

### 3) Rate limiting and resource caps
In deploy/docker-compose.yaml, add to core service:
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '1'
      memory: 1G
```

### 4) Firewall rules
```bash
sudo ufw allow 22/tcp
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp
sudo ufw enable
```

---

## Monitoring and Logs

### View real-time logs
```bash
docker compose logs -f core
```

### View systemd logs
```bash
sudo journalctl -u butterflyfx-core -f
```

### Check resource usage
```bash
docker stats butterflyfx-core
```

### Backup receipts and reports
```bash
tar -czf butterflyfx-core-reports-$(date +%Y%m%d).tar.gz benchmarks/reports/
```

---

## Cleanup

### Stop and remove containers
```bash
docker compose down
```

### Remove systemd service
```bash
sudo systemctl stop butterflyfx-core
sudo systemctl disable butterflyfx-core
sudo rm /etc/systemd/system/butterflyfx-core.service
sudo systemctl daemon-reload
```

### Remove repository
```bash
rm -rf /opt/butterflyfx-core
```

---

## Next Steps

1. **Security**: Replace DEV_CAPABILITY with signed capability tokens (see docs/API.md).
2. **TLS**: Add reverse proxy (Caddy/nginx) for HTTPS.
3. **Scaling**: Deploy multiple Core replicas behind a load balancer.
4. **Sandboxing**: Wrap LENS in WASM/micro-VM for isolation.
5. **Monitoring**: Integrate with Prometheus/Grafana for metrics.

---

## Support

For issues or questions:
- Check docs/API.md for endpoint specs
- Review docs/RECEIPTS.md for receipt verification
- See docs/DEPLOYMENT.md for VPS-specific guidance
- Open an issue on GitHub: https://github.com/kenbin64/butterflyfx_core/issues
