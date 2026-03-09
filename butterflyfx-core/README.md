# ButterflyFX Core

Single secure interface (Core) to the pristine ButterflyFX kernel. The Core exposes constant-time state transitions via a narrow API, enforces capabilities and policy, and emits signed, Merkle-chained receipts for provenance. Real derivation endpoints (LENS examples: pi digits, primality) are included to exercise end-to-end, legitimate workloads.

Status: Dev-ready scaffold (Core + lenses + runner + deploy)

## Core principles
- Kernel purity: The kernel is an immutable, side‑effect‑free transition function with strict invariants. It is never called directly by apps or lenses.
- Single gate: The Core is the only interface to the kernel.
- Security-by-design: Default‑deny capabilities (dev mode allows "allow"), signed receipts, code‑hash verification, and clear boundaries.
- No storage: Values are derived on demand from rules (LENS) and manifolds (MINDS), not retrieved from databases.

## Repository layout
- butterflyfx_core/core_service
  - app.py — HTTP API for /core/* and /derive/*
  - security.py — Ed25519 signing, Merkle receipts
  - models.py — Schemas (requests/responses/capabilities/receipts)
  - config.py — Environment and code-hash verification
- butterflyfx_core/lenses
  - pi.py — BBP hex digit blocks (deterministic)
  - primes.py — Miller–Rabin primality checks
- butterflyfx_core/benchmarks
  - runner.py — Async load generator (concurrency, duration)
  - scenarios/ — Scenario configs (pi.yaml, primes.yaml)
- deploy
  - Dockerfile — Uvicorn/FastAPI service
  - docker-compose.yaml — Core (+ optional TLS proxy)
  - .env.example — Service config
  - systemd/butterflyfx-core.service — Optional systemd unit
- docs
  - API.md — Endpoint specs with curl examples
  - DEPLOYMENT.md — VPS deployment steps (Docker + systemd)
  - AI_DEPLOYMENT.md — AI/agent-friendly deployment guide
  - BENCHMARKS.md — Running the runner, expected KPIs
  - RECEIPTS.md — Receipt schema and verification

## Quick start (local)
Requirements: Python 3.11+

```
pip install -r requirements.txt
uvicorn butterflyfx_core.core_service.app:app --host 0.0.0.0 --port 8081
```

Health:
```
curl http://127.0.0.1:8081/health
```

## Endpoints (real)
- POST /core/invoke {state:{spiral,level}, k}
- POST /core/spiral_up {state}
- POST /core/spiral_down {state}
- POST /core/collapse {state}
- POST /derive/pi {start, count}
- POST /derive/primes {start, count, rounds?}
- GET /health

## VPS deployment (Docker)
See docs/DEPLOYMENT.md for exact commands:
- Install Docker/Compose, clone repo, configure deploy/.env, `docker compose up -d`
- Health at `http://YOUR_VPS_IP:8081/health`
- Optional TLS via Caddy with DOMAIN/EMAIL

## Benchmarks
```
python butterflyfx_core/benchmarks/runner.py --target http://YOUR_VPS_IP:8081 --scenario pi --concurrency 100 --duration 60
python butterflyfx_core/benchmarks/runner.py --target http://YOUR_VPS_IP:8081 --scenario primes --concurrency 100 --duration 60
```
Outputs: `benchmarks/reports/<timestamp>/run.json`, `receipts/*.json`

## License
- Core code in this repository is licensed under MIT (see LICENSE).
- The underlying ButterflyFX kernel and associated IP remain © 2024–2026 Kenneth Bingham. See butterflyfx-kernel repository for its license and notices.
