from __future__ import annotations
import json
from dataclasses import dataclass
from typing import Callable, Iterable, Mapping, Sequence, Tuple, Dict, Any, Optional

from root.engine_core.contracts import Context, Substrate
from root.engine_core.entities import Entity
from root.engine_core.processes import stable_entity_id, canonical_aggregate


def _normalize_packet(pkt: Any) -> Dict[str, Any]:
    if isinstance(pkt, dict):
        # Ensure deterministic key order downstream by leaving sorting to JSON dumps
        return pkt
    kind = getattr(pkt, 'kind', type(pkt).__name__)
    payload = getattr(pkt, 'payload', None)
    if isinstance(payload, dict):
        return {'kind': kind, 'payload': {k: payload[k] for k in sorted(payload.keys())}}
    return {'kind': kind, 'value': repr(pkt)}


def _in_viewport(entity_id: str, entity: Entity, viewport: Optional[Any]) -> bool:
    if viewport is None:
        return True
    if callable(viewport):
        return bool(viewport(entity))
    if isinstance(viewport, set):
        return entity_id in viewport
    if isinstance(viewport, dict):
        return viewport.get(entity_id, False)
    return False


@dataclass(frozen=True)
class KernelResult:
    outputs: Tuple[Dict[str, Any], ...]
    trace: str
    stats: Tuple[Tuple[str, int], ...]  # e.g., (("outputs", N), ("entities", M))


def run_step(
    entities: Sequence[Entity],
    delta_ids: Sequence[str],
    substrate_resolver: Callable[[Entity], Substrate],
    context: Optional[Context] = None,
) -> KernelResult:
    """
    Stateless, deterministic kernel step:
    - Filters to provided delta_ids only (delta-only processing)
    - Applies viewport constraints if present in context
    - Uses substrate_resolver(entity) to obtain a pure substrate per entity
    - Produces normalized outputs in deterministic canonical order
    - Returns immutable outputs with a stable trace hash
    """
    ctx = context or Context()

    # Build ID -> entity map deterministically
    id_entity: Dict[str, Entity] = {stable_entity_id(e): e for e in entities}
    # Resolve delta entities present in this set
    delta_entities: list[Tuple[str, Entity]] = []
    for did in delta_ids:
        e = id_entity.get(did)
        if e is not None:
            delta_entities.append((did, e))

    # Interpret packets
    outputs: list[Dict[str, Any]] = []
    for eid, ent in delta_entities:
        if not _in_viewport(eid, ent, ctx.viewport):
            continue
        substrate = substrate_resolver(ent)
        for pkt in substrate.interpret(ent.manifold, ent.coords()):
            # Attach minimal provenance: entity ID for deterministic sorting and traceability
            normalized = _normalize_packet(pkt)
            outputs.append({'entity': eid, **normalized})

    # Deterministic order: sort by serialized form
    outputs.sort(key=lambda d: json.dumps(d, separators=(",", ":"), sort_keys=True))
    immutable_outputs = tuple(outputs)

    # Stable trace over inputs and outputs
    trace = canonical_aggregate([
        sorted(id_entity.keys()),
        sorted(delta_ids),
        [json.dumps(o, separators=(",", ":"), sort_keys=True) for o in immutable_outputs],
    ])
    stats = (('entities', len(entities)), ('delta', len(delta_entities)), ('outputs', len(immutable_outputs)))
    return KernelResult(outputs=immutable_outputs, trace=trace, stats=tuple(stats))


__all__ = [
    'KernelResult',
    'run_step',
]