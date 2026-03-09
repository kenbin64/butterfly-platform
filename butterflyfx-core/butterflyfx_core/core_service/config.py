from __future__ import annotations
import os
import hashlib
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

CORE_PORT = int(os.getenv("CORE_PORT", "8081"))
DEV_CAPABILITY = os.getenv("DEV_CAPABILITY", "allow")
KEY_SEED = os.getenv("KEY_SEED", "dev-seed-change-me")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def compute_code_hashes() -> dict:
    # Hash core files
    here = Path(__file__).parent
    core_files = [
        here / "app.py",
        here / "models.py",
        here / "security.py",
        here / "config.py",
    ]
    core_hash = hashlib.sha256()
    hashes = {}
    for p in core_files:
        if p.exists():
            hp = sha256_file(p)
            hashes[str(p.name)] = hp
            core_hash.update(bytes.fromhex(hp))
    # Hash kernel file if vendored or importable path known
    kernel_hash_hex = "unknown"
    try:
        import inspect
        from butterflyfx_kernel.butterflyfx import kernel_pure  # type: ignore
        kpath = Path(inspect.getfile(kernel_pure))
        kernel_hash_hex = sha256_file(kpath)
        hashes["kernel_pure.py"] = kernel_hash_hex
        core_hash.update(bytes.fromhex(kernel_hash_hex))
    except Exception:
        pass
    hashes["core_hash_combined"] = core_hash.hexdigest()
    return hashes
