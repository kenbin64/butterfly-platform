"""
Analytic motion curves, paths, and time remapping.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Callable, Tuple
import math

Vec3 = Tuple[float, float, float]


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def smoothstep(e0: float, e1: float, x: float) -> float:
    if e0 == e1:
        return 0.0
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3.0 - 2.0 * t)


def ease_in_out_cubic(t: float) -> float:
    return 4*t*t*t if t < 0.5 else 1 - pow(-2*t + 2, 3) / 2


def circle_path(center: Vec3, radius: float, axis: str = 'y') -> Callable[[float], Vec3]:
    cx, cy, cz = center
    def f(t: float) -> Vec3:
        ang = 2.0 * math.pi * t
        if axis == 'y':
            return (cx + radius * math.cos(ang), cy, cz + radius * math.sin(ang))
        elif axis == 'x':
            return (cx, cy + radius * math.cos(ang), cz + radius * math.sin(ang))
        else:
            return (cx + radius * math.cos(ang), cy + radius * math.sin(ang), cz)
    return f


def time_remap(t: float, tempo: Callable[[float], float] | None = None, curve: Callable[[float], float] = ease_in_out_cubic) -> float:
    """Remap time via optional tempo(bpm) and easing curve in [0,1]."""
    x = curve(max(0.0, min(1.0, t)))
    if tempo:
        bpm = max(1e-3, tempo(t))
        # map beats per minute to scale factor (arbitrary normalization)
        x *= bpm / 60.0
    return x
