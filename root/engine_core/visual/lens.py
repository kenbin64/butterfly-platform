"""
Lens and exposure-related utilities: depth of field approximation, distortion,
vignetting. Pure functions returning small closures for composition.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Callable
import math

Vec3 = Tuple[float, float, float]


def apply_radial_distortion(u: float, v: float, k1: float = 0.0, k2: float = 0.0, p1: float = 0.0, p2: float = 0.0) -> Tuple[float, float]:
    x = 2.0 * u - 1.0
    y = 1.0 - 2.0 * v
    r2 = x*x + y*y
    radial = 1.0 + k1 * r2 + k2 * r2 * r2
    x_d = x * radial + 2.0*p1*x*y + p2*(r2 + 2.0*x*x)
    y_d = y * radial + p1*(r2 + 2.0*y*y) + 2.0*p2*x*y
    u_d = (x_d + 1.0) * 0.5
    v_d = (1.0 - y_d) * 0.5
    return u_d, v_d


def circle_of_confusion(depth: float, focus_dist: float, aperture: float, focal_length: float) -> float:
    """Thin lens CoC radius in pixel units (relative)."""
    if depth <= 0 or focus_dist <= 0 or focal_length <= 0:
        return 0.0
    # Simplified CoC: c = A * |(d - f) / d|
    return aperture * abs((depth - focus_dist) / max(depth, 1e-6))


def vignetting(u: float, v: float, strength: float = 1.5) -> float:
    x = 2.0 * u - 1.0
    y = 1.0 - 2.0 * v
    r = math.sqrt(x*x + y*y)
    return max(0.0, min(1.0, 1.0 - (r ** strength)))
