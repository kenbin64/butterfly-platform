"""
Deterministic codex: canonicalize objects and compute stable hashes for universal IDs.
"""
from __future__ import annotations
import hashlib
import json
from typing import Any, Dict


def canonical(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: canonical(obj[k]) for k in sorted(obj.keys())}
    if isinstance(obj, (list, tuple)):
        vals = [canonical(v) for v in obj]
        try:
            return sorted(vals, key=lambda v: json.dumps(v, separators=(",", ":"), sort_keys=True))
        except Exception:
            return vals
    if isinstance(obj, float):
        # round to stabilize minor FP noise
        return round(obj, 9)
    return obj


def hash_obj(obj: Any) -> str:
    data = json.dumps(canonical(obj), separators=(",", ":"), sort_keys=True)
    return hashlib.sha256(data.encode('utf-8')).hexdigest()


def encode(payload: Dict[str, Any]) -> Dict[str, Any]:
    cid = hash_obj(payload)
    return {"id": cid, "payload": canonical(payload)}


def join_ids(*ids: str) -> str:
    return hash_obj(["join"] + list(ids))
