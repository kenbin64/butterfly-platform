"""
Pure, stateless pixel and viewport utilities for addressing, coordinate mapping,
and screen geometry. No storage or IO.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Literal
import math

FitMode = Literal["contain", "cover", "fill"]
ScreenType = Literal["flat", "cylindrical", "spherical"]


@dataclass(frozen=True)
class PixelGrid:
    width: int
    height: int

    @property
    def aspect(self) -> float:
        return self.width / self.height if self.height else 0.0

    def index(self, x: int, y: int) -> int:
        """Row-major linear address for pixel (x,y)."""
        if x < 0 or y < 0 or x >= self.width or y >= self.height:
            raise IndexError("pixel out of bounds")
        return y * self.width + x

    def xy(self, index: int) -> Tuple[int, int]:
        if index < 0 or index >= self.width * self.height:
            raise IndexError("index out of bounds")
        y, x = divmod(index, self.width)
        return x, y

    def uv(self, x: int, y: int) -> Tuple[float, float]:
        """Map pixel center to [0,1]^2. Uses pixel-center convention."""
        return ((x + 0.5) / self.width, (y + 0.5) / self.height)

    def ndc(self, x: int, y: int) -> Tuple[float, float]:
        """Map to Normalized Device Coordinates [-1,1]^2 with origin at center,
        y up (OpenGL-style)."""
        u, v = self.uv(x, y)
        return (2.0 * u - 1.0, 1.0 - 2.0 * v)


@dataclass(frozen=True)
class Viewport:
    width: int
    height: int
    target_aspect: float | None = None
    fit: FitMode = "contain"

    @property
    def aspect(self) -> float:
        return self.width / self.height if self.height else 0.0

    def scale_offset(self) -> Tuple[Tuple[float, float], Tuple[float, float]]:
        """Return ((sx, sy), (ox, oy)) such that uv' = uv * (sx, sy) + (ox, oy)
        mapping a logical unit square to the viewport respecting fit and target_aspect.
        """
        if not self.target_aspect or self.target_aspect <= 0:
            return (1.0, 1.0), (0.0, 0.0)
        vp_aspect = self.aspect
        sx = sy = 1.0
        ox = oy = 0.0
        if self.fit == "contain":
            if vp_aspect >= self.target_aspect:
                # letterbox horizontally (bars left/right)
                sx = self.target_aspect / vp_aspect
                ox = (1.0 - sx) * 0.5
            else:
                # letterbox vertically (bars top/bottom)
                sy = vp_aspect / self.target_aspect
                oy = (1.0 - sy) * 0.5
        elif self.fit == "cover":
            if vp_aspect >= self.target_aspect:
                # crop top/bottom
                sy = vp_aspect / self.target_aspect
                oy = (1.0 - sy) * 0.5
            else:
                # crop left/right
                sx = self.target_aspect / vp_aspect
                ox = (1.0 - sx) * 0.5
        elif self.fit == "fill":
            sx = sy = 1.0
            ox = oy = 0.0
        else:
            raise ValueError("invalid fit mode")
        return (sx, sy), (ox, oy)

    def apply(self, u: float, v: float) -> Tuple[float, float]:
        (sx, sy), (ox, oy) = self.scale_offset()
        return (u * sx + ox, v * sy + oy)


@dataclass(frozen=True)
class ScreenGeometry:
    kind: ScreenType = "flat"
    radius: float = 1.0  # for cylindrical/spherical

    def map_uv_to_dir(self, u: float, v: float) -> Tuple[float, float, float]:
        """Map UV in [0,1]^2 to a unit direction on the screen surface.
        - flat: maps to plane at z=-1 with origin at center; returns normalized dir from origin
        - cylindrical: u wraps horizontally around cylinder; v maps vertically
        - spherical: equirectangular mapping to a unit sphere
        """
        if self.kind == "flat":
            # map to NDC -> direction (assuming pinhole at origin, screen at z=-1)
            x = 2.0 * u - 1.0
            y = 1.0 - 2.0 * v
            z = -1.0
            inv_len = 1.0 / math.sqrt(x*x + y*y + z*z)
            return x * inv_len, y * inv_len, z * inv_len
        elif self.kind == "cylindrical":
            theta = (u - 0.5) * 2.0 * math.pi  # wrap around
            x = math.sin(theta)
            z = -math.cos(theta)
            y = (1.0 - 2.0 * v) * (self.radius)
            inv_len = 1.0 / math.sqrt(x*x + y*y + z*z)
            return x * inv_len, y * inv_len, z * inv_len
        elif self.kind == "spherical":
            lon = (u - 0.5) * 2.0 * math.pi
            lat = (0.5 - v) * math.pi
            x = math.cos(lat) * math.sin(lon)
            y = math.sin(lat)
            z = -math.cos(lat) * math.cos(lon)
            return x, y, z
        else:
            raise ValueError("unsupported screen geometry kind")
