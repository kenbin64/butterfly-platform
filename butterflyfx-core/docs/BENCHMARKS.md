# Benchmarks

Run legitimate, end-to-end workloads against the live Core service.

## Setup
```
python -m pip install -r requirements.txt
```

## Scenarios
- Pi digits (BBP):
```
python butterflyfx_core/benchmarks/runner.py --target http://HOST:PORT --scenario pi --concurrency 100 --duration 60
```
- Primes (Miller–Rabin):
```
python butterflyfx_core/benchmarks/runner.py --target http://HOST:PORT --scenario primes --concurrency 100 --duration 60
```

## Outputs
- `benchmarks/reports/<timestamp>/run.json` — KPIs (ok, err, rps, p50/p95/p99)
- `benchmarks/reports/<timestamp>/receipts/*.json` — signed receipts (if enabled in runner; core signs each call)

## Notes
- All results are real: the runner calls the HTTP API, which calls the real kernel.
- Use higher concurrency and longer durations for meaningful p95/p99 measurements.
- Pin CPU frequency (performance mode) for consistent comparisons across runs.
