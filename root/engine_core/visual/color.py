from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple

from root.engine_core.contracts import EPSILON, is_close


@dataclass(frozen=True)
class RGB:
    r: float  # 0..1
    g: float  # 0..1
    b: float  # 0..1

    def __post_init__(self):
        for v in (self.r, self.g, self.b):
            if v < 0.0 - EPSILON or v > 1.0 + EPSILON:
                raise ValueError("RGB components must be in [0,1]")


@dataclass(frozen=True)
class RGBA:
    r: float
    g: float
    b: float
    a: float  # 0..1

    def __post_init__(self):
        for v in (self.r, self.g, self.b, self.a):
            if v < 0.0 - EPSILON or v > 1.0 + EPSILON:
                raise ValueError("RGBA components must be in [0,1]")


@dataclass(frozen=True)
class HSL:
    h: float  # 0..360
    s: float  # 0..1
    l: float  # 0..1

    def __post_init__(self):
        if self.h < -EPSILON or self.h > 360.0 + EPSILON:
            raise ValueError("Hue must be in [0,360]")
        for v in (self.s, self.l):
            if v < 0.0 - EPSILON or v > 1.0 + EPSILON:
                raise ValueError("Saturation and lightness must be in [0,1]")


def rgb_to_hsl(rgb: RGB) -> HSL:
    r, g, b = rgb.r, rgb.g, rgb.b
    mx = max(r, g, b)
    mn = min(r, g, b)
    l = (mx + mn) / 2.0
    if is_close(mx, mn):
        h = 0.0
        s = 0.0
    else:
        d = mx - mn
        s = d / (2.0 - mx - mn) if l > 0.5 else d / (mx + mn)
        if is_close(mx, r):
            h = (g - b) / d + (6.0 if g < b else 0.0)
        elif is_close(mx, g):
            h = (b - r) / d + 2.0
        else:
            h = (r - g) / d + 4.0
        h /= 6.0
        h *= 360.0
    return HSL(h=h, s=s, l=l)


def _hue_to_rgb(p: float, q: float, t: float) -> float:
    if t < 0.0:
        t += 1.0
    if t > 1.0:
        t -= 1.0
    if t < 1/6:
        return p + (q - p) * 6.0 * t
    if t < 1/2:
        return q
    if t < 2/3:
        return p + (q - p) * (2/3 - t) * 6.0
    return p


def hsl_to_rgb(hsl: HSL) -> RGB:
    h = (hsl.h % 360.0) / 360.0
    s = max(0.0, min(1.0, hsl.s))
    l = max(0.0, min(1.0, hsl.l))
    if is_close(s, 0.0):
        return RGB(l, l, l)
    q = l * (1 + s) if l < 0.5 else l + s - l * s
    p = 2 * l - q
    r = _hue_to_rgb(p, q, h + 1/3)
    g = _hue_to_rgb(p, q, h)
    b = _hue_to_rgb(p, q, h - 1/3)
    return RGB(r, g, b)


def composite_over_white(rgba: RGBA) -> RGB:
    # Porter-Duff over white background
    a = rgba.a
    r = rgba.r * a + 1.0 * (1 - a)
    g = rgba.g * a + 1.0 * (1 - a)
    b = rgba.b * a + 1.0 * (1 - a)
    return RGB(r, g, b)


def luminance(rgb: RGB) -> float:
    # sRGB luminance approximation
    return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b


def to_grayscale(rgb: RGB) -> RGB:
    y = luminance(rgb)
    return RGB(y, y, y)


__all__ = [
    'RGB', 'RGBA', 'HSL',
    'rgb_to_hsl', 'hsl_to_rgb', 'composite_over_white',
    'luminance', 'to_grayscale',
]