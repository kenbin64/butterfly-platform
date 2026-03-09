from __future__ import annotations
"""
Procedural renderer for a tropical beach scene with a bird taking off, plus audio.
Outputs:
- c:/universe/output/beach_bird_4k.png
- c:/universe/output/beach_bird_5s.mp4 (30fps, AAC)

Dependencies to run (install once):
    py -m pip install pillow numpy
Requires ffmpeg on PATH for video encoding.
"""
import os
import math
import subprocess
from dataclasses import dataclass
from typing import Tuple, Callable

import numpy as np
from PIL import Image

from root.engine_core.visual.pixel import PixelGrid, Viewport
from root.engine_core.visual.camera import CameraManifold, look_at, RigManifold
from root.engine_core.visual.exposure import tone_map_reinhard, linear_to_srgb
from root.engine_core.visual.motion import ease_in_out_cubic

ASSETS = os.path.join(os.getcwd(), 'assets')
OUTPUT = os.path.join(os.getcwd(), 'output')
SEED_PATH = os.path.join(ASSETS, 'seed_beach_bird.jpg')

# Optional explicit ffmpeg path provided by user
FFMPEG_PATH = r"C:\\Tools\\ffmpeg\\bin\\ffmpeg.exe"

WIDTH, HEIGHT = 3840, 2160
FPS = 30
DURATION = 5.0
FRAMES = int(FPS * DURATION)

Color = Tuple[float, float, float]


def clamp01(x: float) -> float:
    return 0.0 if x < 0.0 else 1.0 if x > 1.0 else x


def mix(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def mix3(a: Color, b: Color, t: float) -> Color:
    return (mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t))


def sky(u: float, v: float) -> Color:
    top = (0.10, 0.45, 0.95)
    bottom = (0.80, 0.90, 1.0)
    t = v
    return mix3(bottom, top, t)


def sun_glow(u: float, v: float, cx: float = 0.75, cy: float = 0.25) -> Color:
    r2 = (u - cx)*(u - cx) + (v - cy)*(v - cy)
    glow = math.exp(-r2 * 200.0)
    return (glow*1.2, glow*1.0, glow*0.6)


def sand(u: float, v: float) -> Color:
    # Simple sand gradient near bottom
    t = clamp01((v - 0.7) / 0.3)
    a = (0.85, 0.75, 0.55)
    b = (0.95, 0.85, 0.65)
    return mix3(a, b, t)


def water(u: float, v: float, t: float) -> Color:
    # shallow water color with animated dark/light bands to suggest waves
    base = (0.0, 0.45, 0.65)
    shallow = (0.2, 0.8, 0.85)
    d = math.sin(20*u + 8*t) * math.cos(15*v + 6*t)
    k = 0.5 + 0.5 * d
    return mix3(base, shallow, k)


def foam_mask(u: float, v: float, t: float) -> float:
    w = 0.5 + 0.5 * math.sin(30*u + 12*t) * math.cos(40*v + 10*t)
    shore = 1.0 - clamp01((v - 0.72) / 0.02)
    return clamp01(0.2 * w + 0.8 * shore)


def palms_mask(u: float, v: float, t: float) -> float:
    # silhouettes on the right side with gentle sway
    sway = 0.02 * math.sin(2*math.pi*(0.1*t))
    x = u - 0.8 - sway
    y = v - 0.35
    trunk = math.exp(-(x*x*800 + max(0.0, y)*y*200))
    frond = math.exp(-((x + 0.05*math.sin(50*y))**2 * 2000 + (y-0.05)**2 * 400))
    return clamp01(trunk + 0.7*frond)


def bird_pos(t: float) -> Tuple[float, float, float]:
    # Parametric bird flight: starts near left-bottom, arcs up and away to top-right
    t01 = clamp01(t / DURATION)
    e = ease_in_out_cubic(t01)
    x = mix(0.25, 0.85, e)
    y = mix(0.55, 0.15, e*0.6) + 0.10*math.sin(6.0*math.pi*e)
    z = mix(0.3, 1.0, e)  # depth proxy for size attenuation
    return x, y, z


def bird_wing_phase(t: float) -> float:
    return (t * 4.0) % 1.0  # 4 flaps per second


def bird_color() -> Color:
    # approximate macaw palette sampled from seed image notionally
    return (0.9, 0.1, 0.1)


def bird_mask(u: float, v: float, t: float) -> float:
    bx, by, bz = bird_pos(t)
    # project size by depth proxy
    size = 0.08 / (bz + 0.1)
    dx = (u - bx) / size
    dy = (v - by) / size
    r2 = dx*dx + dy*dy
    # wing shape via sinusoidal lobes modulated by flap phase
    ph = bird_wing_phase(t)
    wing = math.exp(-((dy-0.2*math.sin(2*math.pi*ph))**2) * 6) * math.exp(-(abs(dx)-0.6)**2 * 4)
    body = math.exp(-r2 * 3.0)
    tail = math.exp(-((dy+0.4)**2 * 10 + (dx*dx)*2)) * 0.8
    return clamp01(0.7*body + 0.6*wing + 0.6*tail)


def compose_pixel(u: float, v: float, t: float) -> Color:
    col = sky(u, v)
    sg = sun_glow(u, v)
    col = (col[0] + sg[0], col[1] + sg[1], col[2] + sg[2])
    # water and sand split near horizon/shoreline at v~0.72
    wcol = water(u, v, t)
    scol = sand(u, v)
    mshore = clamp01((v - 0.70) / 0.02)
    base = mix3(wcol, scol, mshore)
    # foam overlay
    fm = foam_mask(u, v, t)
    base = mix3(base, (1.0, 1.0, 1.0), 0.5*fm)
    # palms silhouettes on right
    pm = palms_mask(u, v, t)
    base = mix3(base, (0.05, 0.08, 0.05), 0.8*pm)
    # bird overlay
    bm = bird_mask(u, v, t)
    bcol = bird_color()
    base = mix3(base, bcol, 0.8*bm)
    # tone map
    mapped = tone_map_reinhard(base, exposure=1.1)
    # sRGB
    srgb = linear_to_srgb(mapped)
    return (clamp01(srgb[0]), clamp01(srgb[1]), clamp01(srgb[2]))


def render_frame(width: int, height: int, t: float) -> Image.Image:
    grid = PixelGrid(width, height)
    arr = np.zeros((height, width, 3), dtype=np.float32)
    for y in range(height):
        for x in range(width):
            u, v = grid.uv(x, y)
            r, g, b = compose_pixel(u, v, t)
            arr[y, x, 0] = r
            arr[y, x, 1] = g
            arr[y, x, 2] = b
    img = Image.fromarray((arr * 255.0).clip(0, 255).astype(np.uint8), mode='RGB')
    return img


def ensure_dirs():
    os.makedirs(OUTPUT, exist_ok=True)


def write_png():
    ensure_dirs()
    img = render_frame(WIDTH, HEIGHT, t=0.0)
    out = os.path.join(OUTPUT, 'beach_bird_4k.png')
    img.save(out, format='PNG')
    print('Wrote', out)


def write_video():
    ensure_dirs()
    # Prepare ffmpeg process for video + audio via separate runs to keep it simple
    # First stream raw video frames to an intermediate file using pipe
    out_video = os.path.join(OUTPUT, 'beach_bird_5s.mp4')
    # Use a named pipe alternative: write frames to a temp folder and encode
    tmp_dir = os.path.join(OUTPUT, 'tmp_frames')
    os.makedirs(tmp_dir, exist_ok=True)
    for i in range(FRAMES):
        t = i / FPS
        img = render_frame(WIDTH, HEIGHT, t)
        img.save(os.path.join(tmp_dir, f'frame_{i:05d}.png'))
    # Generate a simple audio WAV via numpy (ocean noise + wing flaps pulses)
    sr = 48000
    t_axis = np.linspace(0, DURATION, int(sr*DURATION), endpoint=False)
    # ocean: pink-ish noise filtered by slow envelope (wave crests at ~0.6 Hz)
    rng = np.random.default_rng(42)
    noise = rng.standard_normal(t_axis.shape).astype(np.float32)
    # crude pinking: cumulative sum lowpass
    pink = np.cumsum(noise)
    pink = pink / np.max(np.abs(pink) + 1e-6)
    crest = 0.5 + 0.5*np.sin(2*math.pi*0.6*t_axis)
    ocean = 0.2 * pink * crest
    # wing flaps: bursts at 4Hz synced with bird_wing_phase
    flaps = np.zeros_like(t_axis)
    for n in range(int(DURATION*4)):
        tc = n/4.0
        idx = int(tc*sr)
        w = int(0.05*sr)
        if idx < len(flaps):
            flaps[idx:idx+w] += np.hanning(min(w, len(flaps)-idx)) * 0.2
    audio = (ocean + flaps).astype(np.float32)
    # Normalize
    mx = float(np.max(np.abs(audio)) + 1e-6)
    audio = (audio / mx * 0.9).astype(np.float32)
    # Write audio to wav
    wav_path = os.path.join(OUTPUT, 'beach_bird_5s.wav')
    import wave, struct
    with wave.open(wav_path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        # convert to int16
        i16 = (audio * 32767.0).astype(np.int16)
        w.writeframes(i16.tobytes())
    # Encode with ffmpeg reading png sequence and wav
    ff = FFMPEG_PATH if os.path.exists(FFMPEG_PATH) else 'ffmpeg'
    cmd = [
        ff, '-y', '-framerate', str(FPS), '-i', os.path.join(tmp_dir, 'frame_%05d.png'),
        '-i', wav_path,
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18',
        '-c:a', 'aac', '-b:a', '192k',
        out_video
    ]
    print('Running:', ' '.join(cmd))
    subprocess.run(cmd, check=True)
    print('Wrote', out_video)


if __name__ == '__main__':
    write_png()
    write_video()
