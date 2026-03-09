from __future__ import annotations
from dataclasses import dataclass
from typing import Protocol, Tuple, Mapping, Iterable, Any, runtime_checkable

# Centralized numeric policy
EPSILON: float = 1e-9


@dataclass(frozen=True)
class DimensionAxis:
    name: str
    ordinal: int  # emergence order index; 0-based for lowest dimension


@runtime_checkable
class Manifold(Protocol):
    def axes(self) -> Tuple[DimensionAxis, ...]:
        """Declare the axes that define this space. Pure, no state."""
        ...

    def bind(self, bindings: Mapping[str, Any]) -> Manifold:
        """Return a new pure manifold with the specified higher-axis coordinates fixed."""
        ...


@runtime_checkable
class Substrate(Protocol):
    def interpret(self, manifold: Manifold, coords: Mapping[str, Any]) -> Iterable[Any]:
        """Interpret coordinates from a manifold and return minimal final packets."""
        ...


@dataclass(frozen=True)
class Context:
    viewport: Any | None = None
    delta: Any | None = None


# Minimal pure vector helpers (immutable tuples)
def dot(a: Tuple[float, ...], b: Tuple[float, ...]) -> float:
    if len(a) != len(b):
        raise ValueError("dimension mismatch")
    return float(sum(x * y for x, y in zip(a, b)))


def norm_sq(a: Tuple[float, ...]) -> float:
    return dot(a, a)


def is_close(a: float, b: float, eps: float = EPSILON) -> bool:
    return abs(a - b) <= eps


__all__ = [
    'EPSILON',
    'DimensionAxis',
    'Manifold',
    'Substrate',
    'Context',
    'dot',
    'norm_sq',
    'is_close',
]