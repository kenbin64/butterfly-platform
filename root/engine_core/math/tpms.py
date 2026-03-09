"""
Triply Periodic Minimal Surface (TPMS) fields and derivatives.
Provides Schwarz-D, Schwarz-P, and Gyroid implicit functions with analytic gradients,
and utilities for conservative distance stepping used by sphere tracing.
All functions are pure and stateless.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, Literal
import math

Vec3 = Tuple[float, float, float]
Family = Literal['schwarz_d', 'schwarz_p', 'gyroid']


def _ax(L: float) -> float:
    return 2.0 * math.pi / max(L, 1e-6)


def schwarz_p(p: Vec3, L: float) -> float:
    x, y, z = p
    a = _ax(L)
    return math.cos(a*x) + math.cos(a*y) + math.cos(a*z)


def grad_schwarz_p(p: Vec3, L: float) -> Vec3:
    x, y, z = p
    a = _ax(L)
    return (-a*math.sin(a*x), -a*math.sin(a*y), -a*math.sin(a*z))


def schwarz_d(p: Vec3, L: float) -> float:
    # One trigonometric form of the D surface
    x, y, z = p
    a = _ax(L)
    ax, ay, az = a*x, a*y, a*z
    sx, sy, sz = math.sin(ax), math.sin(ay), math.sin(az)
    cx, cy, cz = math.cos(ax), math.cos(ay), math.cos(az)
    return sx*sy*sz + sx*cy*cz + cx*sy*cz + cx*cy*sz


def grad_schwarz_d(p: Vec3, L: float) -> Vec3:
    x, y, z = p
    a = _ax(L)
    ax, ay, az = a*x, a*y, a*z
    sx, sy, sz = math.sin(ax), math.sin(ay), math.sin(az)
    cx, cy, cz = math.cos(ax), math.cos(ay), math.cos(az)
    # Partial derivatives (chain rule * a)
    dfx = a * (cx*sy*sz + cx*cy*cz - sx*sy*cz - sx*cy*sz)
    dfy = a * (sx*cy*sz - sx*sy*cz + cx*cy*cz - cx*sy*sz)
    dfz = a * (sx*sy*cz + sx*cy*sz + cx*sy*sz - cx*cy*cz)
    return (dfx, dfy, dfz)


def gyroid(p: Vec3, L: float) -> float:
    x, y, z = p
    a = _ax(L)
    ax, ay, az = a*x, a*y, a*z
    return math.sin(ax)*math.cos(ay) + math.sin(ay)*math.cos(az) + math.sin(az)*math.cos(ax)


def grad_gyroid(p: Vec3, L: float) -> Vec3:
    x, y, z = p
    a = _ax(L)
    ax, ay, az = a*x, a*y, a*z
    # d/dx: a*cos(ax)*cos(ay) - a*sin(az)*sin(ax)
    dfx = a * (math.cos(ax)*math.cos(ay) - math.sin(az)*math.sin(ax))
    dfy = a * (math.cos(ay)*math.cos(az) - math.sin(ax)*math.sin(ay))
    dfz = a * (math.cos(az)*math.cos(ax) - math.sin(ay)*math.sin(az))
    return (dfx, dfy, dfz)


@dataclass(frozen=True)
class TPMSField:
    family: Family = 'schwarz_d'
    period: float = 1.0  # lattice period L

    def value(self, p: Vec3) -> float:
        if self.family == 'schwarz_d':
            return schwarz_d(p, self.period)
        if self.family == 'schwarz_p':
            return schwarz_p(p, self.period)
        if self.family == 'gyroid':
            return gyroid(p, self.period)
        raise ValueError('unsupported TPMS family')

    def grad(self, p: Vec3) -> Vec3:
        if self.family == 'schwarz_d':
            return grad_schwarz_d(p, self.period)
        if self.family == 'schwarz_p':
            return grad_schwarz_p(p, self.period)
        if self.family == 'gyroid':
            return grad_gyroid(p, self.period)
        raise ValueError('unsupported TPMS family')

    def conservative_step(self, p: Vec3) -> float:
        """Conservative sphere-trace step estimate using |f|/||grad f||."""
        f = self.value(p)
        gx, gy, gz = self.grad(p)
        g = math.sqrt(gx*gx + gy*gy + gz*gz) + 1e-9
        return abs(f) / g
