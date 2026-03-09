from __future__ import annotations
import math
from typing import Iterable, List, Sequence, Tuple, Optional

from root.engine_core.contracts import EPSILON, is_close as _is_close


# Scalars and comparisons

def is_close(a: float, b: float, eps: float = EPSILON) -> bool:
    return _is_close(a, b, eps)


def clamp(x: float, lo: float, hi: float) -> float:
    if lo > hi:
        raise ValueError("lo must be <= hi")
    return max(lo, min(hi, x))


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


# Vectors (nD) using tuples for immutability
Vector = Tuple[float, ...]


def add(a: Vector, b: Vector) -> Vector:
    if len(a) != len(b):
        raise ValueError("dimension mismatch")
    return tuple(x + y for x, y in zip(a, b))


def sub(a: Vector, b: Vector) -> Vector:
    if len(a) != len(b):
        raise ValueError("dimension mismatch")
    return tuple(x - y for x, y in zip(a, b))


def mul_scalar(a: Vector, k: float) -> Vector:
    return tuple(k * x for x in a)


def div_scalar(a: Vector, k: float) -> Vector:
    if is_close(k, 0.0):
        raise ValueError("division by near-zero scalar")
    return tuple(x / k for x in a)


def dot(a: Vector, b: Vector) -> float:
    if len(a) != len(b):
        raise ValueError("dimension mismatch")
    return float(sum(x * y for x, y in zip(a, b)))


def norm_sq(a: Vector) -> float:
    return dot(a, a)


def norm(a: Vector) -> float:
    return math.sqrt(norm_sq(a))


def normalize(a: Vector, eps: float = EPSILON) -> Vector:
    n = norm(a)
    if n <= eps:
        raise ValueError("cannot normalize near-zero vector")
    return div_scalar(a, n)


def distance(a: Vector, b: Vector) -> float:
    return norm(sub(a, b))


def distance_sq(a: Vector, b: Vector) -> float:
    return norm_sq(sub(a, b))


def project(v: Vector, onto: Vector, eps: float = EPSILON) -> Vector:
    d = dot(onto, onto)
    if d <= eps:
        raise ValueError("cannot project onto near-zero vector")
    k = dot(v, onto) / d
    return mul_scalar(onto, k)


def reject(v: Vector, onto: Vector, eps: float = EPSILON) -> Vector:
    return sub(v, project(v, onto, eps))


def angle_between(a: Vector, b: Vector, eps: float = EPSILON) -> float:
    na = norm(a)
    nb = norm(b)
    if na <= eps or nb <= eps:
        raise ValueError("angle undefined for near-zero vector")
    c = dot(a, b) / (na * nb)
    c = clamp(c, -1.0, 1.0)
    return math.acos(c)


def perpendicular_2d(v: Tuple[float, float]) -> Tuple[float, float]:
    x, y = v
    return (-y, x)


def cross_3d(a: Tuple[float, float, float], b: Tuple[float, float, float]) -> Tuple[float, float, float]:
    ax, ay, az = a
    bx, by, bz = b
    return (
        ay * bz - az * by,
        az * bx - ax * bz,
        ax * by - ay * bx,
    )


# Affine geometry

def barycentric_triangle(p: Tuple[float, float],
                         a: Tuple[float, float],
                         b: Tuple[float, float],
                         c: Tuple[float, float],
                         eps: float = EPSILON) -> Tuple[float, float, float]:
    # Using area coordinates
    v0 = (b[0] - a[0], b[1] - a[1])
    v1 = (c[0] - a[0], c[1] - a[1])
    v2 = (p[0] - a[0], p[1] - a[1])
    d00 = v0[0] * v0[0] + v0[1] * v0[1]
    d01 = v0[0] * v1[0] + v0[1] * v1[1]
    d11 = v1[0] * v1[0] + v1[1] * v1[1]
    d20 = v2[0] * v0[0] + v2[1] * v0[1]
    d21 = v2[0] * v1[0] + v2[1] * v1[1]
    denom = d00 * d11 - d01 * d01
    if abs(denom) <= eps:
        raise ValueError("degenerate triangle")
    v = (d11 * d20 - d01 * d21) / denom
    w = (d00 * d21 - d01 * d20) / denom
    u = 1.0 - v - w
    return (u, v, w)


# Lines and segments 2D

def orientation2d(p: Tuple[float, float], q: Tuple[float, float], r: Tuple[float, float], eps: float = EPSILON) -> float:
    # Cross product z-component of (q - p) x (r - p)
    val = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    if abs(val) <= eps:
        return 0.0
    return val


def _on_segment(p: Tuple[float, float], q: Tuple[float, float], r: Tuple[float, float], eps: float = EPSILON) -> bool:
    # q is on segment pr when collinear and within bounding box
    return (
        min(p[0], r[0]) - eps <= q[0] <= max(p[0], r[0]) + eps and
        min(p[1], r[1]) - eps <= q[1] <= max(p[1], r[1]) + eps
    )


def segments_intersect_2d(p1: Tuple[float, float], p2: Tuple[float, float],
                           q1: Tuple[float, float], q2: Tuple[float, float],
                           eps: float = EPSILON) -> bool:
    o1 = orientation2d(p1, p2, q1, eps)
    o2 = orientation2d(p1, p2, q2, eps)
    o3 = orientation2d(q1, q2, p1, eps)
    o4 = orientation2d(q1, q2, p2, eps)

    # General case
    if (o1 > 0 and o2 < 0 or o1 < 0 and o2 > 0) and (o3 > 0 and o4 < 0 or o3 < 0 and o4 > 0):
        return True

    # Collinear/special cases
    if o1 == 0.0 and _on_segment(p1, q1, p2, eps):
        return True
    if o2 == 0.0 and _on_segment(p1, q2, p2, eps):
        return True
    if o3 == 0.0 and _on_segment(q1, p1, q2, eps):
        return True
    if o4 == 0.0 and _on_segment(q1, p2, q2, eps):
        return True

    return False


def point_in_triangle_2d(p: Tuple[float, float],
                         a: Tuple[float, float],
                         b: Tuple[float, float],
                         c: Tuple[float, float],
                         eps: float = EPSILON) -> bool:
    try:
        u, v, w = barycentric_triangle(p, a, b, c, eps)
    except ValueError:
        return False
    # Allow points on edges within epsilon
    return (
        u >= -eps and v >= -eps and w >= -eps and
        u <= 1.0 + eps and v <= 1.0 + eps and w <= 1.0 + eps and
        is_close(u + v + w, 1.0, eps)
    )


__all__ = [
    'EPSILON',
    'is_close',
    'clamp',
    'lerp',
    'Vector',
    'add', 'sub', 'mul_scalar', 'div_scalar',
    'dot', 'norm', 'norm_sq', 'normalize',
    'distance', 'distance_sq',
    'project', 'reject', 'angle_between',
    'perpendicular_2d', 'cross_3d',
    'barycentric_triangle',
    'orientation2d', 'segments_intersect_2d', 'point_in_triangle_2d',
]