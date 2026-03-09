from __future__ import annotations
import itertools
from dataclasses import dataclass
from typing import Iterable, Mapping, Tuple, Dict, Any, Sequence

from root.engine_core.contracts import DimensionAxis, Manifold, Substrate
from root.engine_core.visual.color import RGB


# Axes for image manifold
X_AXIS = DimensionAxis(name='x', ordinal=0)
Y_AXIS = DimensionAxis(name='y', ordinal=1)


@dataclass(frozen=True)
class ImageManifold(Manifold):
    width: int
    height: int

    def axes(self) -> Tuple[DimensionAxis, ...]:
        return (X_AXIS, Y_AXIS)

    def bind(self, bindings: Mapping[str, int]) -> 'ImageManifold':
        # For image, binding is a no-op (no higher axes here)
        return self


@dataclass(frozen=True)
class PixelPacket:
    kind: str
    payload: Dict[str, Any]


class PixelSubstrate(Substrate):
    def __init__(self, sampler: Mapping[Tuple[int, int], RGB]):
        # sampler maps (x,y)->RGB
        self._sampler = dict(sampler)

    def interpret(self, manifold: Manifold, coords: Mapping[str, int]) -> Iterable[PixelPacket]:
        x = int(coords['x']); y = int(coords['y'])
        rgb = self._sampler.get((x, y), RGB(0.0, 0.0, 0.0))
        yield PixelPacket(kind='pixel', payload={'x': x, 'y': y, 'r': rgb.r, 'g': rgb.g, 'b': rgb.b})


# Edge detection kernels (Sobel) on small neighborhoods provided as pure functions
SOBEL_GX = ((-1, 0, 1), (-2, 0, 2), (-1, 0, 1))
SOBEL_GY = ((-1, -2, -1), (0, 0, 0), (1, 2, 1))


def convolve3x3(window: Tuple[Tuple[float, float, float], ...], kernel: Tuple[Tuple[int, int, int], ...]) -> float:
    total = 0.0
    for j in range(3):
        for i in range(3):
            total += window[j][i] * kernel[j][i]
    return total


def sobel_edge_magnitude(gray_window: Tuple[Tuple[float, float, float], ...]) -> float:
    gx = convolve3x3(gray_window, SOBEL_GX)
    gy = convolve3x3(gray_window, SOBEL_GY)
    return (gx * gx + gy * gy) ** 0.5


__all__ = [
    'X_AXIS', 'Y_AXIS',
    'ImageManifold', 'PixelPacket', 'PixelSubstrate',
    'SOBEL_GX', 'SOBEL_GY', 'convolve3x3', 'sobel_edge_magnitude',
]