"""
Exposure response and tone mapping utilities.
"""
from __future__ import annotations
from typing import Tuple

Color = Tuple[float, float, float]


def clamp01(x: float) -> float:
    return 0.0 if x < 0.0 else 1.0 if x > 1.0 else x


def linear_to_srgb(c: Color) -> Color:
    def f(u: float) -> float:
        if u <= 0.0031308:
            return 12.92 * u
        return 1.055 * (u ** (1.0 / 2.4)) - 0.055
    return (f(c[0]), f(c[1]), f(c[2]))


def srgb_to_linear(c: Color) -> Color:
    def f(u: float) -> float:
        if u <= 0.04045:
            return u / 12.92
        return ((u + 0.055) / 1.055) ** 2.4
    return (f(c[0]), f(c[1]), f(c[2]))


def tone_map_reinhard(c: Color, exposure: float = 1.0) -> Color:
    r = 1.0 - 2.0 ** (-exposure * c[0])
    g = 1.0 - 2.0 ** (-exposure * c[1])
    b = 1.0 - 2.0 ** (-exposure * c[2])
    return (clamp01(r), clamp01(g), clamp01(b))
