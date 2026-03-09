from __future__ import annotations
import json
from dataclasses import dataclass
from typing import Iterable, Mapping, Sequence, Tuple, Dict, Any, Optional, List

from root.engine_core.contracts import Manifold, Substrate, Context
from root.engine_core.entities import Entity
from root.engine_core.kernel import run_step, KernelResult
from root.engine_core.processes import canonical_aggregate


def stable_coords_id(manifold: Manifold, coords: Mapping[str, Any]) -> str:
    axes = tuple(ax.name for ax in manifold.axes())
    items = sorted(((k, coords[k]) for k in coords.keys()), key=lambda kv: kv[0])
    return canonical_aggregate([axes, items])


def build_entities(manifold: Manifold, coords_seq: Iterable[Mapping[str, Any]]) -> List[Entity]:
    return [Entity(manifold, dict(c)) for c in coords_seq]


def run_manifold(
    manifold: Manifold,
    coords_seq: Sequence[Mapping[str, Any]],
    substrate: Substrate,
    context: Optional[Context] = None,
    delta_coords_ids: Optional[Sequence[str]] = None,
) -> KernelResult:
    entities = build_entities(manifold, coords_seq)

    def resolver(_: Entity) -> Substrate:
        return substrate

    if delta_coords_ids is None:
        # Default: treat all as delta
        delta_coords_ids = [stable_coords_id(manifold, c) for c in coords_seq]
    return run_step(entities, delta_coords_ids, resolver, context)


__all__ = [
    'stable_coords_id',
    'build_entities',
    'run_manifold',
]