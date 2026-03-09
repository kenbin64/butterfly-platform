from __future__ import annotations
"""
CLI driver to render TPMS image via stateless sphere tracing.
Outputs a PNG under output/tpms_*.png.

Usage:
  set PYTHONPATH=C:\universe&& py tools\render_tpms.py schwarz_d 2.0 1920 1080
"""
import os
import sys
import math
import numpy as np
from PIL import Image

from root.engine_core.visual.pixel import PixelGrid
from root.engine_core.visual.camera import CameraManifold, look_at
from root.engine_core.visual.tpms_render import render_ray
from root.engine_core.math.tpms import TPMSField

OUTPUT = os.path.join(os.getcwd(), 'output')


def main():
    family = sys.argv[1] if len(sys.argv) > 1 else 'schwarz_d'
    period = float(sys.argv[2]) if len(sys.argv) > 2 else 2.0
    W = int(sys.argv[3]) if len(sys.argv) > 3 else 1280
    H = int(sys.argv[4]) if len(sys.argv) > 4 else 720

    os.makedirs(OUTPUT, exist_ok=True)
    grid = PixelGrid(W, H)
    field = TPMSField(family=family, period=period)

    cam = CameraManifold(
        fov_y=50.0,
        aspect=grid.aspect,
        cam_to_world=look_at((0.0, 0.0, 4.0), (0.0, 0.0, 0.0)),
    )

    arr = np.zeros((H, W, 3), dtype=np.uint8)
    for y in range(H):
        for x in range(W):
            u, v = grid.uv(x, y)
            o, d, _ = cam.ray_for(u, v)
            r, g, b = render_ray(field, o, d, exposure=1.1)
            arr[y, x, 0] = int(max(0, min(255, r*255)))
            arr[y, x, 1] = int(max(0, min(255, g*255)))
            arr[y, x, 2] = int(max(0, min(255, b*255)))
    out = os.path.join(OUTPUT, f'tpms_{family}_{W}x{H}.png')
    Image.fromarray(arr, mode='RGB').save(out, 'PNG')
    print('Wrote', out)


if __name__ == '__main__':
    main()
