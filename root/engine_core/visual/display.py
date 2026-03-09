from __future__ import annotations
"""
Display manifold: evaluates a ColorField over the pixel-context manifold in a single batched call.
This emulates smart-pixel behavior on current hardware via NumPy vectorization.
"""
from dataclasses import dataclass
from typing import Tuple, Callable
import numpy as np

from root.engine_core.visual.pixel import PixelGrid
from root.engine_core.visual.camera import CameraManifold

ColorArray = np.ndarray  # (H,W,3) float32 or uint8


@dataclass(frozen=True)
class Display:
    width: int
    height: int

    @property
    def grid(self) -> PixelGrid:
        return PixelGrid(self.width, self.height)

    def uv_grid(self) -> Tuple[np.ndarray, np.ndarray]:
        H, W = self.height, self.width
        xs = (np.arange(W, dtype=np.float32) + 0.5) / float(W)
        ys = (np.arange(H, dtype=np.float32) + 0.5) / float(H)
        U, V = np.meshgrid(xs, ys)  # shape (H,W)
        return U, V

    def eval_color(self, color_field: Callable[[np.ndarray, np.ndarray, float], ColorArray], t: float) -> ColorArray:
        U, V = self.uv_grid()
        return color_field(U, V, t)

    def eval_camera_color(self, camera: CameraManifold, ray_color_field: Callable[[np.ndarray, np.ndarray, float, CameraManifold], ColorArray], t: float) -> ColorArray:
        U, V = self.uv_grid()
        return ray_color_field(U, V, t, camera)
