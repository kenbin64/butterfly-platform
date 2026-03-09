import math
import unittest

from root.engine_core.math.geometry import (
    EPSILON, is_close, clamp, lerp, Vector,
    add, sub, mul_scalar, div_scalar, dot, norm, norm_sq, normalize,
    distance, distance_sq, project, reject, angle_between,
    perpendicular_2d, cross_3d, barycentric_triangle,
    orientation2d, segments_intersect_2d, point_in_triangle_2d,
)


class TestScalars(unittest.TestCase):
    def test_is_close(self):
        self.assertTrue(is_close(1.0, 1.0 + EPSILON * 0.5))
        self.assertFalse(is_close(1.0, 1.0 + EPSILON * 2.0))

    def test_clamp_lerp(self):
        self.assertEqual(clamp(5.0, 0.0, 10.0), 5.0)
        self.assertEqual(clamp(-1.0, 0.0, 10.0), 0.0)
        self.assertEqual(clamp(11.0, 0.0, 10.0), 10.0)
        self.assertEqual(lerp(0.0, 10.0, 0.25), 2.5)


class TestVectors(unittest.TestCase):
    def test_add_sub_dot_norm(self):
        a: Vector = (1.0, 2.0, 3.0)
        b: Vector = (4.0, 5.0, 6.0)
        self.assertEqual(add(a, b), (5.0, 7.0, 9.0))
        self.assertEqual(sub(b, a), (3.0, 3.0, 3.0))
        self.assertEqual(dot(a, b), 32.0)
        self.assertTrue(is_close(norm_sq(a), 14.0))
        self.assertTrue(is_close(norm(a), math.sqrt(14.0)))

    def test_scalar_ops(self):
        a: Vector = (2.0, -2.0)
        self.assertEqual(mul_scalar(a, 3.0), (6.0, -6.0))
        self.assertEqual(div_scalar(a, 2.0), (1.0, -1.0))
        with self.assertRaises(ValueError):
            div_scalar(a, 0.0)

    def test_normalize_angle(self):
        a: Vector = (1.0, 0.0)
        b: Vector = (0.0, 1.0)
        na = normalize(a)
        nb = normalize(b)
        self.assertTrue(is_close(norm(na), 1.0))
        self.assertTrue(is_close(angle_between(a, b), math.pi / 2))
        with self.assertRaises(ValueError):
            normalize((0.0, 0.0))

    def test_projection_rejection(self):
        v: Vector = (3.0, 4.0)
        onto: Vector = (1.0, 0.0)
        p = project(v, onto)
        r = reject(v, onto)
        self.assertTrue(is_close(dot(r, onto), 0.0))
        self.assertTrue(is_close(norm_sq(v), norm_sq(p) + norm_sq(r)))


class TestPlanar(unittest.TestCase):
    def test_perpendicular_and_cross(self):
        self.assertEqual(perpendicular_2d((1.0, 2.0)), (-2.0, 1.0))
        self.assertEqual(cross_3d((1.0, 0.0, 0.0), (0.0, 1.0, 0.0)), (0.0, 0.0, 1.0))

    def test_barycentric_and_point_in_triangle(self):
        a = (0.0, 0.0)
        b = (1.0, 0.0)
        c = (0.0, 1.0)
        p = (0.25, 0.25)
        u, v, w = barycentric_triangle(p, a, b, c)
        self.assertTrue(is_close(u + v + w, 1.0))
        self.assertTrue(point_in_triangle_2d(p, a, b, c))
        # Outside point
        self.assertFalse(point_in_triangle_2d((1.5, 1.5), a, b, c))

    def test_orientation_and_segment_intersection(self):
        self.assertEqual(orientation2d((0, 0), (1, 0), (1, 1)), 1.0)
        self.assertEqual(orientation2d((0, 0), (1, 0), (-1, -1)), -1.0)
        # Collinear
        self.assertEqual(orientation2d((0, 0), (1, 1), (2, 2)), 0.0)
        # Intersecting segments
        self.assertTrue(segments_intersect_2d((0, 0), (2, 2), (0, 2), (2, 0)))
        # Non-intersecting
        self.assertFalse(segments_intersect_2d((0, 0), (1, 0), (0, 1), (1, 1)))


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromModule(__import__(__name__))
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if not result.wasSuccessful():
        raise SystemExit(1)
