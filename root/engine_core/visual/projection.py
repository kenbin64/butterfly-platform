"""
Projection models and screen mapping for perspective, fisheye, and equirectangular.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Literal
import math

ProjectionKind = Literal["perspective", "fisheye", "equirect"]


@dataclass(frozen=True)
class Projection:
    kind: ProjectionKind = "perspective"
    fov_y: float = 60.0

    def dir_from_uv(self, u: float, v: float, aspect: float) -> Tuple[float, float, float]:
        if self.kind == "perspective":
            ndc_x = 2.0 * u - 1.0
            ndc_y = 1.0 - 2.0 * v
            f = math.tan(math.radians(self.fov_y) * 0.5)
            x = ndc_x * f * aspect
            y = ndc_y * f
            z = -1.0
            inv = 1.0 / math.sqrt(x*x + y*y + z*z)
            return x*inv, y*inv, z*inv
        elif self.kind == "fisheye":
            ndc_x = 2.0 * u - 1.0
            ndc_y = 1.0 - 2.0 * v
            r = math.sqrt(ndc_x*ndc_x + ndc_y*ndc_y)
            if r == 0:
                return 0.0, 0.0, -1.0
            theta = r * math.radians(self.fov_y*0.5)
            phi = math.atan2(ndc_y, ndc_x)
            x = math.sin(theta) * math.cos(phi)
            y = math.sin(theta) * math.sin(phi)
            z = -math.cos(theta)
            return x, y, z
        elif self.kind == "equirect":
            lon = (u - 0.5) * 2.0 * math.pi
            lat = (0.5 - v) * math.pi
            x = math.cos(lat) * math.sin(lon)
            y = math.sin(lat)
            z = -math.cos(lat) * math.cos(lon)
            return x, y, z
        else:
            raise ValueError("unsupported projection kind")
