from __future__ import annotations
import asyncio
import time
import json
from dataclasses import dataclass
from pathlib import Path
import httpx
import argparse


@dataclass
class Stats:
    ok: int = 0
    err: int = 0
    latencies: list[float] = None

    def __post_init__(self):
        if self.latencies is None:
            self.latencies = []


async def worker(client: httpx.AsyncClient, target: str, scenario: str, stop_at: float, stats: Stats):
    while time.time() < stop_at:
        try:
            t0 = time.perf_counter()
            if scenario == "pi":
                payload = {"start": 0, "count": 64, "capability": "allow"}
                r = await client.post(f"{target}/derive/pi", json=payload, timeout=10)
            elif scenario == "primes":
                payload = {"start": 1_000_000, "count": 128, "rounds": 8, "capability": "allow"}
                r = await client.post(f"{target}/derive/primes", json=payload, timeout=10)
            else:
                raise ValueError("unknown scenario")
            r.raise_for_status()
            dt = (time.perf_counter() - t0) * 1000.0
            stats.ok += 1
            stats.latencies.append(dt)
        except Exception:
            stats.err += 1


def percentiles(xs: list[float], ps=(50, 95, 99)):
    if not xs:
        return {p: None for p in ps}
    xs2 = sorted(xs)
    out = {}
    for p in ps:
        k = int((p / 100.0) * (len(xs2) - 1))
        out[p] = xs2[k]
    return out


async def run(target: str, scenario: str, concurrency: int, duration: int):
    stats = Stats()
    stop_at = time.time() + duration
    async with httpx.AsyncClient() as client:
        tasks = [asyncio.create_task(worker(client, target, scenario, stop_at, stats)) for _ in range(concurrency)]
        await asyncio.gather(*tasks)
    p = percentiles(stats.latencies)
    total = stats.ok + stats.err
    rps = stats.ok / duration if duration > 0 else 0
    ts = time.strftime("%Y%m%d-%H%M%S")
    outdir = Path("benchmarks") / "reports" / ts
    outdir.mkdir(parents=True, exist_ok=True)
    run_json = {
        "target": target,
        "scenario": scenario,
        "concurrency": concurrency,
        "duration_s": duration,
        "ok": stats.ok,
        "err": stats.err,
        "rps": rps,
        "latency_ms": {
            "p50": p[50],
            "p95": p[95],
            "p99": p[99],
        },
        "timestamp": ts,
    }
    (outdir / "run.json").write_text(json.dumps(run_json, indent=2))
    print(json.dumps(run_json, indent=2))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", required=True)
    ap.add_argument("--scenario", choices=["pi", "primes"], required=True)
    ap.add_argument("--concurrency", type=int, default=50)
    ap.add_argument("--duration", type=int, default=30)
    args = ap.parse_args()
    asyncio.run(run(args.target, args.scenario, args.concurrency, args.duration))
