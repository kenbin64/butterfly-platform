# dimension.py
# Dimension 1 – Axial emergence example aligned with engine_core contracts.

from dataclasses import dataclass
from typing import Dict, Iterable, Mapping, Tuple

from root.engine_core.contracts import DimensionAxis, Manifold, Substrate


# Define the first axis (line) with ordinal 0 (lowest dimension in this slice)
D1_AXIS = DimensionAxis(name="length", ordinal=0)


@dataclass(frozen=True)
class D1Manifold:
    """A pure 1D manifold over the 'length' axis. It declares axes only."""
    def axes(self) -> Tuple[DimensionAxis, ...]:
        return (D1_AXIS,)

    def bind(self, bindings: Mapping[str, int]) -> 'D1Manifold':
        # No-op binding for 1D; returns self as it has no higher axes.
        return self


@dataclass(frozen=True)
class D1Packet:
    kind: str
    payload: Dict[str, int]


class D1Substrate:
    """A pure interpreter mapping 1D coordinates to packets (no state)."""
    def interpret(self, manifold: Manifold, coords: Mapping[str, int]) -> Iterable[D1Packet]:
        # Translate coordinate to a minimal packet form
        x = int(coords.get(D1_AXIS.name, 0))
        yield D1Packet(kind='d1', payload={'length': x, 'magnitude': abs(x)})


class Dimension1:
    """Compatibility facade preserving the run API while using pure contracts."""
    def __init__(self):
        self.manifold = D1Manifold()
        self.substrate = D1Substrate()

    def run(self, steps: int = 5):
        print("[D1] Dimension 1 (Length Axis) activated.")
        for tick in range(1, steps + 1):
            coords = {D1_AXIS.name: tick}
            packets = list(self.substrate.interpret(self.manifold, coords))
            for p in packets:
                print(f"[D1] Step {tick}: {p.kind} -> {p.payload}")