from __future__ import annotations
import json
import hashlib
from dataclasses import dataclass
from typing import Iterable, Any, Mapping, Callable, Optional, Protocol, Dict

from root.engine_core.contracts import Manifold, Substrate, Context
from root.engine_core.entities import Entity


# -----------------------------
# Canonical aggregation and stable IDs
# -----------------------------

def _canonicalize(x: Any) -> Any:
    if isinstance(x, dict):
        return {k: _canonicalize(x[k]) for k in sorted(x.keys())}
    elif isinstance(x, (list, tuple)):
        vals = [_canonicalize(v) for v in x]
        vals_sorted = sorted(vals, key=lambda v: json.dumps(v, separators=(",", ":"), sort_keys=True))
        return vals_sorted
    else:
        return x


def canonical_aggregate(items: Iterable[Any]) -> str:
    canonical = _canonicalize(list(items))
    blob = json.dumps(canonical, separators=(",", ":"), sort_keys=True)
    return hashlib.sha256(blob.encode('utf-8')).hexdigest()


def stable_entity_id(entity: Entity) -> str:
    # Use manifold axes names and coords mapping to form a canonical identity
    axes = tuple(ax.name for ax in entity.manifold.axes())
    coords_items = sorted(entity.coords().items())
    return canonical_aggregate([axes, coords_items])


# -----------------------------
# Process contracts
# -----------------------------

@dataclass(frozen=True)
class ProcessSpec:
    name: str
    description: str = ""


class Process(Protocol):
    def run(self, delta: Iterable[Entity], context: Context) -> Iterable[Any]:
        """
        Execute a stateless, deterministic operation over the provided delta of entities
        within the provided context (viewport, etc). Must not access or require any
        global or hidden state. Must return outputs deterministically derived from inputs.
        """
        ...


# -----------------------------
# Viewport- and delta-only interpreter
# -----------------------------

class ViewportDeltaInterpreter:
    """
    A stateless process that:
    - Filters entities to those present in the viewport (if provided)
    - Interprets only the provided delta (no access to any global set)
    - Returns deterministic outputs by normalizing packet-like results
    """

    def __init__(self, substrate: Substrate):
        self._substrate = substrate

    def _in_viewport(self, entity: Entity, viewport: Optional[Any]) -> bool:
        if viewport is None:
            return True
        # Support viewport as callable(Entity) -> bool
        if callable(viewport):
            return bool(viewport(entity))
        # Or viewport as a set of stable IDs
        if isinstance(viewport, set):
            return stable_entity_id(entity) in viewport
        # Or viewport as a mapping of allowed IDs
        if isinstance(viewport, dict):
            return viewport.get(stable_entity_id(entity), False)
        # Fallback: not recognized => deny
        return False

    def _normalize_packet(self, pkt: Any) -> Dict[str, Any]:
        # Convert packet-like objects to plain dicts deterministically
        if isinstance(pkt, dict):
            return pkt
        kind = getattr(pkt, 'kind', type(pkt).__name__)
        payload = getattr(pkt, 'payload', None)
        if isinstance(payload, dict):
            return {'kind': kind, 'payload': {k: payload[k] for k in sorted(payload.keys())}}
        return {'kind': kind, 'value': repr(pkt)}

    def run(self, delta: Iterable[Entity], context: Context) -> Iterable[Dict[str, Any]]:
        viewport = context.viewport
        outputs: list[Dict[str, Any]] = []
        for e in delta:
            if not self._in_viewport(e, viewport):
                continue
            for pkt in self._substrate.interpret(e.manifold, e.coords()):
                outputs.append(self._normalize_packet(pkt))
        # Canonical deterministic order: sort by entity ID then packet content
        outputs.sort(key=lambda d: json.dumps(d, separators=(",", ":"), sort_keys=True))
        return outputs


__all__ = [
    'ProcessSpec',
    'Process',
    'ViewportDeltaInterpreter',
    'stable_entity_id',
    'canonical_aggregate',
]