import unittest
from dataclasses import dataclass
from typing import Iterable, Mapping, Tuple

from root.engine_core.contracts import DimensionAxis, Manifold, Context
from root.engine_core.entities import Entity
from root.engine_core.processes import ViewportDeltaInterpreter, stable_entity_id


AX = DimensionAxis(name='x', ordinal=0)


@dataclass(frozen=True)
class M1(Manifold):
    def axes(self) -> Tuple[DimensionAxis, ...]:
        return (AX,)
    def bind(self, bindings: Mapping[str, int]):
        return self


class S1:
    def interpret(self, manifold: Manifold, coords: Mapping[str, int]) -> Iterable[dict]:
        return [{'kind': 'm1', 'payload': {'x': coords['x'], 'double': coords['x'] * 2}}]


class TestProcesses(unittest.TestCase):
    def test_delta_only_and_viewport_filtering(self):
        m = M1()
        s = S1()
        p = ViewportDeltaInterpreter(s)
        e1 = Entity(m, {'x': 1})
        e2 = Entity(m, {'x': 2})
        # Viewport allows only e2 by stable ID
        allowed = {stable_entity_id(e2)}
        ctx = Context(viewport=allowed)
        out = list(p.run([e1, e2], ctx))
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]['payload']['x'], 2)
        self.assertEqual(out[0]['payload']['double'], 4)

    def test_deterministic_ordering(self):
        m = M1()
        s = S1()
        p = ViewportDeltaInterpreter(s)
        entities = [Entity(m, {'x': i}) for i in [3, 1, 2]]
        ctx = Context(viewport=None)
        out1 = list(p.run(list(reversed(entities)), ctx))
        out2 = list(p.run(entities, ctx))
        # Deterministic order irrespective of input order
        self.assertEqual(out1, out2)


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromModule(__import__(__name__))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        raise SystemExit(1)
