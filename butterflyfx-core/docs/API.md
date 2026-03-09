# ButterflyFX Core API

All endpoints return JSON. HTTP 4xx on invalid input, 5xx on server errors.

## Health
GET /health

Response:
```
{ "status":"ok", "core_hash":"<hex>", "kernel_hash":"<hex|unknown>" }
```

## Core transitions
- POST /core/invoke
- POST /core/spiral_up
- POST /core/spiral_down
- POST /core/collapse

Request (invoke):
```
{
  "state": {"spiral": 0, "level": 0},
  "k": 6,
  "capability": "allow"
}
```

Response:
```
{
  "state": {"spiral": 0, "level": 6},
  "receipt": {"ts_ms":..., "digest":"...", "merkle_root":"...", "sig":"...", "pub":"..."}
}
```

## Derive endpoints (real LENS examples)
### POST /derive/pi
Body:
```
{ "start": 0, "count": 64, "capability": "allow" }
```
Response:
```
{ "hex_digits": "...", "lens_manifest_hash":"<hex>", "receipt": {...} }
```

### POST /derive/primes
Body:
```
{ "start": 1000000, "count": 128, "rounds": 8, "capability": "allow" }
```
Response:
```
{ "results": [{"n":1000000,"probable_prime":false,"witnesses":[...]}, ...],
  "lens_manifest_hash":"<hex>",
  "receipt": {...} }
```

Notes
- `capability` is `allow` in dev mode. In production, replace with signed tokens carrying scopes and expirations.
- Receipts are Ed25519-signed and Merkle-chained per process lifetime; include digests over input/output and code hashes.
