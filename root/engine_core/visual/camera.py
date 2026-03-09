"""
Camera manifolds: pinhole perspective, equirectangular, stereo, and simple rigs.
All pure functions; no storage. Integrates with PixelGrid/Viewport.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Literal, Callable
import math

Vec3 = Tuple[float, float, float]
Mat4 = Tuple[Tuple[float, float, float, float],
             Tuple[float, float, float, float],
             Tuple[float, float, float, float],
             Tuple[float, float, float, float]]

ProjectionKind = Literal["perspective", "equirect"]


def _normalize(v: Vec3) -> Vec3:
    x, y, z = v
    l = math.sqrt(x*x + y*y + z*z)
    if l == 0:
        return 0.0, 0.0, 0.0
    return x / l, y / l, z / l


def _mat4_mul_vec3(m: Mat4, v: Vec3, w: float = 1.0) -> Vec3:
    x, y, z = v
    rx = m[0][0]*x + m[0][1]*y + m[0][2]*z + m[0][3]*w
    ry = m[1][0]*x + m[1][1]*y + m[1][2]*z + m[1][3]*w
    rz = m[2][0]*x + m[2][1]*y + m[2][2]*z + m[2][3]*w
    return (rx, ry, rz)


@dataclass(frozen=True)
class CameraManifold:
    fov_y: float  # in degrees
    aspect: float
    cam_to_world: Mat4  # column-major or row-major agnostic for affine mul in _mat4_mul_vec3
    shutter_time: float = 0.0  # duration; used for motion blur if desired
    projection: ProjectionKind = "perspective"

    def ray_for(self, u: float, v: float, t: float = 0.0) -> Tuple[Vec3, Vec3, float]:
        """Return (origin, direction, time). u,v in [0,1]."""
        if self.projection == "perspective":
            # NDC to camera space ray
            ndc_x = 2.0 * u - 1.0
            ndc_y = 1.0 - 2.0 * v
            f = math.tan(math.radians(self.fov_y) * 0.5)
            x = ndc_x * f * self.aspect
            y = ndc_y * f
            z = -1.0
            dir_cam = _normalize((x, y, z))
        elif self.projection == "equirect":
            lon = (u - 0.5) * 2.0 * math.pi
            lat = (0.5 - v) * math.pi
            x = math.cos(lat) * math.sin(lon)
            y = math.sin(lat)
            z = -math.cos(lat) * math.cos(lon)
            dir_cam = (x, y, z)
        else:
            raise ValueError("unsupported projection kind")
        origin_world = _mat4_mul_vec3(self.cam_to_world, (0.0, 0.0, 0.0), 1.0)
        dir_world = _normalize(_mat4_mul_vec3(self.cam_to_world, dir_cam, 0.0))
        # time t is passed through for sync; shutter_time defines window but not used here
        return origin_world, dir_world, t

    def with_transform(self, cam_to_world: Mat4) -> "CameraManifold":
        return CameraManifold(
            fov_y=self.fov_y,
            aspect=self.aspect,
            cam_to_world=cam_to_world,
            shutter_time=self.shutter_time,
            projection=self.projection,
        )


@dataclass(frozen=True)
class StereoManifold:
    base: CameraManifold
    ipd: float = 0.064  # meters
    converge: float | None = None  # convergence distance; if None, parallel

    def eye(self, which: Literal["L", "R"]) -> CameraManifold:
        offset = -self.ipd * 0.5 if which == "L" else self.ipd * 0.5
        m = self.base.cam_to_world
        # assume right-vector is first row (m[0][0..2]) for simplicity
        right = (m[0][0], m[1][0], m[2][0])
        ox = m[0][3] + right[0] * offset
        oy = m[1][3] + right[1] * offset
        oz = m[2][3] + right[2] * offset
        cam_to_world = (
            (m[0][0], m[0][1], m[0][2], ox),
            (m[1][0], m[1][1], m[1][2], oy),
            (m[2][0], m[2][1], m[2][2], oz),
            (m[3][0], m[3][1], m[3][2], m[3][3]),
        )
        return self.base.with_transform(cam_to_world)


# Simple rig helpers
Vec3Fn = Callable[[float], Vec3]


def look_at(eye: Vec3, center: Vec3, up: Vec3 = (0.0, 1.0, 0.0)) -> Mat4:
    ex, ey, ez = eye
    cx, cy, cz = center
    ux, uy, uz = up
    # forward (z-)
    fx, fy, fz = (cx - ex, cy - ey, cz - ez)
    fl = math.sqrt(fx*fx + fy*fy + fz*fz) or 1.0
    fx, fy, fz = (fx/fl, fy/fl, fz/fl)
    # right = normalize(cross(f, up))
    rx = fy * uz - fz * uy
    ry = fz * ux - fx * uz
    rz = fx * uy - fy * ux
    rl = math.sqrt(rx*rx + ry*ry + rz*rz) or 1.0
    rx, ry, rz = (rx/rl, ry/rl, rz/rl)
    # true up = cross(right, f)
    tx = ry * fz - rz * fy
    ty = rz * fx - rx * fz
    tz = rx * fy - ry * fx
    # build matrix with rotation and translation
    return (
        (rx, tx, -fx, ex),
        (ry, ty, -fy, ey),
        (rz, tz, -fz, ez),
        (0.0, 0.0, 0.0, 1.0),
    )


@dataclass(frozen=True)
class RigManifold:
    path: Callable[[float], Vec3]  # eye position over time
    target: Callable[[float], Vec3]  # look-at target over time
    up: Vec3 = (0.0, 1.0, 0.0)

    def transform(self, t: float) -> Mat4:
        return look_at(self.path(t), self.target(t), self.up)
