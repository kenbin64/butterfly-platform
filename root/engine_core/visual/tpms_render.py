"""
Stateless TPMS renderer using conservative sphere tracing.
Integrates with camera/projection and exposure. No storage besides the current pixel.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Callable
import math

from root.engine_core.math.tpms import TPMSField
from root.engine_core.visual.exposure import tone_map_reinhard, linear_to_srgb

Vec3 = Tuple[float, float, float]
Color = Tuple[float, float, float]


def _add(a: Vec3, b: Vec3) -> Vec3:
    return (a[0]+b[0], a[1]+b[1], a[2]+b[2])


def _mul(v: Vec3, s: float) -> Vec3:
    return (v[0]*s, v[1]*s, v[2]*s)


def _dot(a: Vec3, b: Vec3) -> float:
    return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]


def _norm(v: Vec3) -> float:
    return math.sqrt(_dot(v, v))


def _normalize(v: Vec3) -> Vec3:
    n = _norm(v)
    if n == 0:
        return (0.0, 0.0, 0.0)
    return (v[0]/n, v[1]/n, v[2]/n)


@dataclass(frozen=True)
class SphereTraceSpec:
    max_steps: int = 256
    eps: float = 1e-4
    max_dist: float = 100.0


def intersect(field: TPMSField, ro: Vec3, rd: Vec3, spec: SphereTraceSpec = SphereTraceSpec()) -> Tuple[bool, float, Vec3, Vec3]:
    t = 0.0
    p = ro
    for _ in range(spec.max_steps):
        f = field.value(p)
        if abs(f) < spec.eps:
            n = _normalize(field.grad(p))
            return True, t, p, n
        step = max(1e-4, field.conservative_step(p))
        t += step
        if t > spec.max_dist:
            break
        p = _add(ro, _mul(rd, t))
    return False, t, p, (0.0, 0.0, 0.0)


def shade_simple(p: Vec3, n: Vec3, light_dir: Vec3 = (0.4, 0.8, -0.4), albedo: Color = (0.85, 0.85, 0.88)) -> Color:
    l = _normalize(light_dir)
    ndl = max(0.0, _dot(n, l))
    h = _normalize(_add(l, (0.0, 0.0, 1.0)))
    ndh = max(0.0, _dot(n, h))
    spec = pow(ndh, 64.0) * 0.15
    ambient = 0.2
    return (albedo[0]*(ambient+ndl)+spec, albedo[1]*(ambient+ndl)+spec, albedo[2]*(ambient+ndl)+spec)


def render_ray(field: TPMSField, ro: Vec3, rd: Vec3, exposure: float = 1.0) -> Color:
    hit, t, p, n = intersect(field, ro, rd)
    if not hit:
        return (0.8, 0.9, 1.0)  # sky fallback
    col = shade_simple(p, n)
    col = tone_map_reinhard(col, exposure=exposure)
    return linear_to_srgb(col)
