from __future__ import annotations
from dataclasses import dataclass
from types import MappingProxyType
from typing import Dict, Mapping, Optional, Tuple

from root.engine_core.contracts import DimensionAxis
from root.engine_core.rules import load_rules


@dataclass(frozen=True)
class AxisRegistry:
    """
    Immutable registry of declared axes in sequential emergence order.
    Axes come from foundation-1/source/universe_rules.json under dimensions.order.
    Ordinals are assigned 0..N-1 in that order.
    """

    _axes: Tuple[DimensionAxis, ...]
    _by_name: Mapping[str, DimensionAxis]

    @classmethod
    def from_rules(cls, src_dir: Optional[str] = None) -> AxisRegistry:
        fr = load_rules(src_dir)
        data = fr.get()
        order = data['dimensions']['order']
        axes = tuple(DimensionAxis(name=n, ordinal=i) for i, n in enumerate(order))
        by_name: Dict[str, DimensionAxis] = {ax.name: ax for ax in axes}
        return cls(_axes=axes, _by_name=MappingProxyType(by_name))

    def axes(self) -> Tuple[DimensionAxis, ...]:
        return self._axes

    def get(self, name: str) -> DimensionAxis:
        ax = self._by_name.get(name)
        if ax is None:
            raise KeyError(f"unknown axis: {name}")
        return ax

    def has(self, name: str) -> bool:
        return name in self._by_name

    def highest(self) -> DimensionAxis:
        # Highest is the last in the emergence order
        return self._axes[-1]


# Default immutable registry constructed from repository rules at import time
REGISTRY: AxisRegistry = AxisRegistry.from_rules()

__all__ = [
    'AxisRegistry',
    'REGISTRY',
]