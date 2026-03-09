from __future__ import annotations
"""
Chat-adoptable AI script for butterflyfx kernel.
Parses simple natural-language recipes and executes them via the universal kernel.
This stays storage-free: computes on demand and streams outputs.

Usage example (Windows):
  set PYTHONPATH=C:\universe&& py tools\ai_chat_adopt.py "render tpms gyroid period 2.0 size 1280x720 save output/tpms.png"

Supported intents (minimal to start):
- render tpms <family> period <L> size <WxH> save <path>
- render tpms <family> period <L> equirect size <WxH> save <path>
- audio tpms <family> period <L> duration <seconds> save <wavpath>

Extend this parser as you grow recipes.
"""
import os
import sys
from typing import Tuple
import numpy as np
from PIL import Image

from root.engine_core.visual.pixel import PixelGrid
from root.engine_core.visual.camera import CameraManifold, look_at
from root.engine_core.visual.tpms_render import render_ray
from root.engine_core.math.tpms import TPMSField


def parse_size(tok: str) -> Tuple[int, int]:
    w, h = tok.lower().split('x')
    return int(w), int(h)


def cmd_render_tpms(args: list[str]) -> None:
    # render tpms <family> period <L> [equirect] size <WxH> save <path>
    family = args[0]
    period = float(args[2]) if args[1] == 'period' else 2.0
    eq = False
    idx = 3
    if idx < len(args) and args[idx] == 'equirect':
        eq = True
        idx += 1
    assert args[idx] == 'size'
    W, H = parse_size(args[idx+1]); idx += 2
    assert args[idx] == 'save'
    out_path = args[idx+1]

    os.makedirs(os.path.dirname(out_path) or '.', exist_ok=True)

    grid = PixelGrid(W, H)
    field = TPMSField(family=family, period=period)

    if not eq:
        cam = CameraManifold(
            fov_y=50.0, aspect=grid.aspect, cam_to_world=look_at((0.0, 0.0, 4.0), (0.0, 0.0, 0.0))
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
        Image.fromarray(arr, mode='RGB').save(out_path, 'PNG')
        print('Wrote', out_path)
    else:
        # Simple equirectangular sweep: ray from longitude/latitude
        import math
        arr = np.zeros((H, W, 3), dtype=np.uint8)
        for y in range(H):
            v = (y + 0.5)/H
            lat = (0.5 - v) * math.pi
            for x in range(W):
                u = (x + 0.5)/W
                lon = (u - 0.5) * 2.0 * math.pi
                # ray from origin in (lon,lat)
                dx = math.cos(lat) * math.sin(lon)
                dy = math.sin(lat)
                dz = -math.cos(lat) * math.cos(lon)
                r, g, b = render_ray(field, (0.0,0.0,0.0), (dx,dy,dz), exposure=1.1)
                arr[y, x, 0] = int(max(0, min(255, r*255)))
                arr[y, x, 1] = int(max(0, min(255, g*255)))
                arr[y, x, 2] = int(max(0, min(255, b*255)))
        Image.fromarray(arr, mode='RGB').save(out_path, 'PNG')
        print('Wrote', out_path)


def main():
    if len(sys.argv) < 2:
        print('Provide a chat command, e.g.: "render tpms gyroid period 2.0 size 1280x720 save output/tpms.png"')
        sys.exit(1)
    # Simple tokenization
    text = ' '.join(sys.argv[1:]).strip()
    toks = text.split()
    if toks[0] == 'render' and toks[1] == 'tpms':
        cmd_render_tpms(toks[2:])
    else:
        print('Unsupported command.')
        sys.exit(2)


if __name__ == '__main__':
    main()
