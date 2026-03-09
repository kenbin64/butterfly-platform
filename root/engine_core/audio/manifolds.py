from __future__ import annotations
from dataclasses import dataclass
from typing import Mapping, Tuple

from root.engine_core.contracts import DimensionAxis, Manifold

# Timeline axes for music
SECTION_AXIS = DimensionAxis(name='section', ordinal=0)
BAR_AXIS = DimensionAxis(name='bar', ordinal=1)
SUB_AXIS = DimensionAxis(name='sub', ordinal=2)


@dataclass(frozen=True)
class MusicManifold(Manifold):
    """
    Pure music manifold declaring timeline axes and structural parameters used by
    audio substrates. Coordinates specify (section, bar, sub) within this structure.
    """
    subdivisions_per_bar: int
    key_pc: int  # 0..11
    mode: str    # per audio.theory.MODES keys
    bpm: float = 120.0

    def axes(self) -> Tuple[DimensionAxis, ...]:
        return (SECTION_AXIS, BAR_AXIS, SUB_AXIS)

    def bind(self, bindings: Mapping[str, int]) -> 'MusicManifold':
        # No higher axes to bind here
        return self


__all__ = [
    'SECTION_AXIS', 'BAR_AXIS', 'SUB_AXIS',
    'MusicManifold',
]