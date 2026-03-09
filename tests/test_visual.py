import unittest
from dataclasses import dataclass
from typing import Iterable, Mapping, Tuple

from root.engine_core.contracts import DimensionAxis, Manifold, Substrate, Context
from root.engine_core.dimensional import run_manifold
from root.engine_core.visual.color import RGB, HSL, rgb_to_hsl, hsl_to_rgb, to_grayscale, luminance
from root.engine_core.visual.image import ImageManifold, PixelSubstrate, sobel_edge_magnitude


class TestColor(unittest.TestCase):
    def test_rgb_hsl_roundtrip(self):
        rgb = RGB(0.25, 0.5, 0.75)
        hsl = rgb_to_hsl(rgb)
        rgb2 = hsl_to_rgb(hsl)
        # Round-trip within a small tolerance
        self.assertAlmostEqual(rgb.r, rgb2.r, places=6)
        self.assertAlmostEqual(rgb.g, rgb2.g, places=6)
        self.assertAlmostEqual(rgb.b, rgb2.b, places=6)

    def test_grayscale_and_luminance(self):
        rgb = RGB(1.0, 0.0, 0.0)
        y = luminance(rgb)
        gray = to_grayscale(rgb)
        self.assertAlmostEqual(y, gray.r, places=6)
        self.assertAlmostEqual(gray.r, gray.g, places=6)
        self.assertAlmostEqual(gray.g, gray.b, places=6)


class TestImage(unittest.TestCase):
    def test_pixel_substrate_and_sobel(self):
        # Create a 3x3 image with a vertical edge in the center column
        img = ImageManifold(width=3, height=3)
        sampler = {}
        for y in range(3):
            sampler[(0, y)] = RGB(0.0, 0.0, 0.0)
            sampler[(1, y)] = RGB(1.0, 1.0, 1.0)
            sampler[(2, y)] = RGB(1.0, 1.0, 1.0)
        px = PixelSubstrate(sampler)
        coords = [{'x': x, 'y': y} for y in range(3) for x in range(3)]
        res = run_manifold(img, coords, px)
        # Build a gray window around center (1,1)
        def gray_at(x, y):
            # Clamp to edges for simplicity
            x = max(0, min(2, x))
            y = max(0, min(2, y))
            p = next(o for o in res.outputs if o['payload']['x'] == x and o['payload']['y'] == y)
            r = p['payload']['r']; g = p['payload']['g']; b = p['payload']['b']
            # simple average gray for test purposes
            return (r + g + b) / 3.0
        window = tuple(tuple(gray_at(1 + i - 1, 1 + j - 1) for i in range(3)) for j in range(3))
        mag = sobel_edge_magnitude(window)
        self.assertGreater(mag, 0.0)


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromModule(__import__(__name__))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        raise SystemExit(1)
