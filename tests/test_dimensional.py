import unittest
from dataclasses import dataclass
from typing import Iterable, Mapping, Tuple

from root.engine_core.contracts import DimensionAxis, Manifold, Substrate, Context
from root.engine_core.dimensional import run_manifold, stable_coords_id

AX = DimensionAxis(name='x', ordinal=0)
AY = DimensionAxis(name='y', ordinal=1)


@dataclass(frozen=True)
class M2(Manifold):
    def axes(self) -> Tuple[DimensionAxis, ...]:
        return (AX, AY)
    def bind(self, bindings: Mapping[str, int]):
        return self


class S2(Substrate):
    def interpret(self, manifold: Manifold, coords: Mapping[str, int]) -> Iterable[dict]:
        x = coords['x']; y = coords['y']
        return [{'kind': 'm2', 'payload': {'x': x, 'y': y, 'sum': x + y}}]


class TestDimensional(unittest.TestCase):
    def test_run_full_and_slices(self):
        m = M2()
        s = S2()
        coords = [
            {'x': 0, 'y': 10},
            {'x': 1, 'y': 10},
            {'x': 0, 'y': 20},
            {'x': 1, 'y': 20},
        ]
        # Full run: all coordinates as delta
        res_full = run_manifold(m, coords, s)
        self.assertEqual(len(res_full.outputs), 4)
        # Slice by binding y=10: run only those as delta
        y10_ids = [stable_coords_id(m, c) for c in coords if c['y'] == 10]
        res_y10 = run_manifold(m, coords, s, delta_coords_ids=y10_ids)
        self.assertEqual(len(res_y10.outputs), 2)
        # Union of slices equals full result set deterministically when merged
        y20_ids = [stable_coords_id(m, c) for c in coords if c['y'] == 20]
        res_y20 = run_manifold(m, coords, s, delta_coords_ids=y20_ids)
        merged = tuple(sorted(list(res_y10.outputs) + list(res_y20.outputs), key=lambda d: (d['payload']['y'], d['payload']['x'])))
        canon_full = tuple(sorted(list(res_full.outputs), key=lambda d: (d['payload']['y'], d['payload']['x'])))
        self.assertEqual(merged, canon_full)

    def test_viewport_callable(self):
        m = M2(); s = S2()
        coords = [{'x': x, 'y': y} for x in [0, 1] for y in [10, 20]]
        # Viewport allows only x == 1
        ctx = Context(viewport=lambda e: e.get('x') == 1)
        res = run_manifold(m, coords, s, context=ctx)
        self.assertEqual(len(res.outputs), 2)
        self.assertTrue(all(o['payload']['x'] == 1 for o in res.outputs))


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromModule(__import__(__name__))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        raise SystemExit(1)
