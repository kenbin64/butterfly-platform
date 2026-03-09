import unittest
from dataclasses import dataclass
from typing import Mapping, Tuple

from root.engine_core.contracts import DimensionAxis, Manifold
from root.engine_core.entities import Entity, EntityValidationError


AX = DimensionAxis(name='x', ordinal=0)
AY = DimensionAxis(name='y', ordinal=1)


@dataclass(frozen=True)
class TestManifold:
    def axes(self) -> Tuple[DimensionAxis, ...]:
        return (AX, AY)

    def bind(self, bindings: Mapping[str, int]):
        return self


class TestEntities(unittest.TestCase):
    def test_exact_axis_keys_required(self):
        m = TestManifold()
        # Missing 'y'
        with self.assertRaises(EntityValidationError):
            Entity(m, {'x': 1})
        # Extra 'z'
        with self.assertRaises(EntityValidationError):
            Entity(m, {'x': 1, 'y': 2, 'z': 3})
        # Exact match succeeds
        e = Entity(m, {'x': 1, 'y': 2})
        self.assertEqual(e.get('x'), 1)
        self.assertEqual(e.get('y'), 2)

    def test_immutability_and_functional_set(self):
        m = TestManifold()
        e1 = Entity(m, {'x': 0, 'y': 0})
        e2 = e1.set('x', 10)
        self.assertEqual(e1.get('x'), 0)
        self.assertEqual(e2.get('x'), 10)
        # Underlying coords mapping is read-only
        with self.assertRaises(TypeError):
            e2.coords()['x'] = 5


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromModule(__import__(__name__))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        raise SystemExit(1)
