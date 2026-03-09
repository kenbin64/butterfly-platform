from __future__ import annotations
from dataclasses import dataclass
from types import MappingProxyType
from typing import Any, Dict, Mapping

from root.engine_core.contracts import Manifold, DimensionAxis


class EntityValidationError(Exception):
    pass


def _axes_to_names(axes: tuple[DimensionAxis, ...]) -> tuple[str, ...]:
    return tuple(ax.name for ax in axes)


@dataclass(frozen=True)
class Entity:
    """
    Immutable entity that references a manifold and holds only coordinates keyed by
    the manifold's declared axes. No redundant/derived values are stored.

    Setters are functional and return a new Entity with updated coordinates.
    """
    manifold: Manifold
    _coords: Mapping[str, Any]

    def __post_init__(self):
        # Enforce closed-world coordinates: keys exactly match manifold axes
        axis_names = set(_axes_to_names(self.manifold.axes()))
        keys = set(self._coords.keys())
        if keys != axis_names:
            missing = axis_names - keys
            extra = keys - axis_names
            msg = []
            if missing:
                msg.append(f"missing: {sorted(missing)}")
            if extra:
                msg.append(f"extra: {sorted(extra)}")
            raise EntityValidationError("coordinate keys must match manifold axes: " + ", ".join(msg))
        # Defensive freeze of coords mapping
        object.__setattr__(self, "_coords", MappingProxyType(dict(self._coords)))

    def coords(self) -> Mapping[str, Any]:
        return self._coords

    def get(self, axis_name: str) -> Any:
        if axis_name not in self._coords:
            raise KeyError(axis_name)
        return self._coords[axis_name]

    def set(self, axis_name: str, value: Any) -> Entity:
        if axis_name not in self._coords:
            raise KeyError(axis_name)
        new_coords: Dict[str, Any] = dict(self._coords)
        new_coords[axis_name] = value
        return Entity(self.manifold, new_coords)


__all__ = [
    'Entity',
    'EntityValidationError',
]