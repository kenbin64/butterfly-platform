from __future__ import annotations
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from hashlib import sha256
from typing import Any

from .models import (
    State, CoreRequest, CoreResponse,
    PiRequest, PiResponse,
    PrimesRequest, PrimesResponse, PrimeResult,
    HealthResponse,
)
from .config import CORE_PORT, DEV_CAPABILITY, compute_code_hashes
from .security import ReceiptSigner

# Import the real kernel. Expect butterflyfx_kernel to be installed (PyPI or vendor).
try:
    from butterflyfx_kernel.butterflyfx import kernel_pure as kcore  # type: ignore
except Exception as e:  # pragma: no cover
    raise RuntimeError("butterflyfx_kernel not available. Install or vendor kernel_pure.py") from e

from butterflyfx_core.lenses.pi import bbp_hex_digits
from butterflyfx_core.lenses.primes import scan_primes

app = FastAPI(title="ButterflyFX Core", version="0.1.0")
_signer = ReceiptSigner(seed_hex=DEV_CAPABILITY if DEV_CAPABILITY and DEV_CAPABILITY != "allow" else "00112233aabbccddeeff00112233aabb")
_code_hashes = compute_code_hashes()


def _check_capability(token: str | None) -> None:
    # Dev mode: simple allow token. Production should verify JWS/JWT with scope checks.
    if DEV_CAPABILITY == "allow":
        return
    if not token or token.strip() == "":
        raise HTTPException(status_code=403, detail="capability required")
    # TODO: verify signed token


def _state_digest(s: State) -> str:
    return sha256(f"{s.spiral}:{s.level}".encode()).hexdigest()


@app.get("/health", response_model=HealthResponse)
async def health() -> Any:
    return HealthResponse(core_hash=_code_hashes.get("core_hash_combined", "unknown"), kernel_hash=_code_hashes.get("kernel_pure.py", "unknown"))


@app.post("/core/invoke", response_model=CoreResponse)
async def core_invoke(req: CoreRequest) -> Any:
    _check_capability(req.capability)
    try:
        prev = kcore.HelixState(req.state.spiral, req.state.level)
        nxt = kcore.invoke(prev, int(req.k))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    payload = {
        "op": "INVOKE",
        "prev": _state_digest(req.state),
        "args": {"k": req.k},
        "next": _state_digest(State(spiral=nxt.spiral, level=nxt.level)),
        "code_hashes": _code_hashes,
    }
    receipt = _signer.sign_receipt(payload)
    return CoreResponse(state=State(spiral=nxt.spiral, level=nxt.level), receipt=receipt)


@app.post("/core/spiral_up", response_model=CoreResponse)
async def core_spiral_up(req: CoreRequest) -> Any:
    _check_capability(req.capability)
    try:
        prev = kcore.HelixState(req.state.spiral, req.state.level)
        nxt = kcore.spiral_up(prev)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    payload = {
        "op": "SPIRAL_UP",
        "prev": _state_digest(req.state),
        "args": {},
        "next": _state_digest(State(spiral=nxt.spiral, level=nxt.level)),
        "code_hashes": _code_hashes,
    }
    receipt = _signer.sign_receipt(payload)
    return CoreResponse(state=State(spiral=nxt.spiral, level=nxt.level), receipt=receipt)


@app.post("/core/spiral_down", response_model=CoreResponse)
async def core_spiral_down(req: CoreRequest) -> Any:
    _check_capability(req.capability)
    try:
        prev = kcore.HelixState(req.state.spiral, req.state.level)
        nxt = kcore.spiral_down(prev)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    payload = {
        "op": "SPIRAL_DOWN",
        "prev": _state_digest(req.state),
        "args": {},
        "next": _state_digest(State(spiral=nxt.spiral, level=nxt.level)),
        "code_hashes": _code_hashes,
    }
    receipt = _signer.sign_receipt(payload)
    return CoreResponse(state=State(spiral=nxt.spiral, level=nxt.level), receipt=receipt)


@app.post("/core/collapse", response_model=CoreResponse)
async def core_collapse(req: CoreRequest) -> Any:
    _check_capability(req.capability)
    try:
        prev = kcore.HelixState(req.state.spiral, req.state.level)
        nxt = kcore.collapse(prev)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    payload = {
        "op": "COLLAPSE",
        "prev": _state_digest(req.state),
        "args": {},
        "next": _state_digest(State(spiral=nxt.spiral, level=nxt.level)),
        "code_hashes": _code_hashes,
    }
    receipt = _signer.sign_receipt(payload)
    return CoreResponse(state=State(spiral=nxt.spiral, level=nxt.level), receipt=receipt)


@app.post("/derive/pi", response_model=PiResponse)
async def derive_pi(req: PiRequest) -> Any:
    _check_capability(req.capability)
    try:
        out = bbp_hex_digits(req.start, req.count)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    payload = {
        "op": "DERIVE_PI",
        "args": {"start": req.start, "count": req.count},
        "out_digest": sha256(out.encode()).hexdigest(),
        "code_hashes": _code_hashes,
    }
    receipt = _signer.sign_receipt(payload)
    # Lens manifest hash placeholder (could be a real manifest file hash)
    return PiResponse(hex_digits=out, lens_manifest_hash=sha256(b"lens_pi_v1").hexdigest(), receipt=receipt)


@app.post("/derive/primes", response_model=PrimesResponse)
async def derive_primes(req: PrimesRequest) -> Any:
    _check_capability(req.capability)
    try:
        results_tuples = scan_primes(req.start, req.count, rounds=req.rounds)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    results = [PrimeResult(n=n, probable_prime=is_p, witnesses=w) for (n, is_p, w) in results_tuples]

    payload = {
        "op": "DERIVE_PRIMES",
        "args": {"start": req.start, "count": req.count, "rounds": req.rounds},
        "out_digest": sha256("|".join(str(int(r.probable_prime)) for r in results).encode()).hexdigest(),
        "code_hashes": _code_hashes,
    }
    receipt = _signer.sign_receipt(payload)
    return PrimesResponse(results=results, lens_manifest_hash=sha256(b"lens_primes_v1").hexdigest(), receipt=receipt)


# Note: The service is launched by uvicorn in Docker or CLI
