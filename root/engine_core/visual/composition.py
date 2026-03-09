"""
Cinematic composition guides and simple scoring functions.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import List, Tuple
import math

Point = Tuple[float, float]  # in normalized [0,1]^2


@dataclass(frozen=True)
class Guides:
    thirds: bool = True
    golden: bool = False

    def lines(self) -> List[Tuple[Point, Point]]:
        ls: List[Tuple[Point, Point]] = []
        if self.thirds:
            t = 1.0 / 3.0
            ls += [((t, 0.0), (t, 1.0)), ((1.0 - t, 0.0), (1.0 - t, 1.0)),
                   ((0.0, t), (1.0, t)), ((0.0, 1.0 - t), (1.0, 1.0 - t))]
        if self.golden:
            phi = (1.0 + 5 ** 0.5) / 2.0
            g = 1.0 / phi
            ls += [((g, 0.0), (g, 1.0)), ((1.0 - g, 0.0), (1.0 - g, 1.0)),
                   ((0.0, g), (1.0, g)), ((0.0, 1.0 - g), (1.0, 1.0 - g))]
        return ls


def _point_line_distance(p: Point, a: Point, b: Point) -> float:
    (px, py), (ax, ay), (bx, by) = p, a, b
    vx, vy = bx - ax, by - ay
    wx, wy = px - ax, py - ay
    c1 = vx * wx + vy * wy
    if c1 <= 0:
        return math.hypot(px - ax, py - ay)
    c2 = vx * vx + vy * vy
    if c2 <= c1:
        return math.hypot(px - bx, py - by)
    t = c1 / c2
    projx, projy = ax + t * vx, ay + t * vy
    return math.hypot(px - projx, py - projy)


def score_points(points: List[Point], guides: Guides = Guides()) -> float:
    """Lower is better. Sum min distances from each point to any guide line."""
    ls = guides.lines()
    if not ls or not points:
        return 0.0
    total = 0.0
    for p in points:
        dmin = min(_point_line_distance(p, a, b) for a, b in ls)
        total += dmin
    return total / len(points)
