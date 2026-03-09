import unittest
from dataclasses import dataclass
from typing import Iterable, Mapping, Tuple

from root.engine_core.contracts import Context, DimensionAxis, Manifold, Substrate
from root.engine_core.entities import Entity
from root.engine_core.kernel import run_step

AX = DimensionAxis(name='x', ordinal=0)


@dataclass(frozen=True)
class M1(Manifold):
    def axes(self) -> Tuple[DimensionAxis, ...]:
        return (AX,)
    def bind(self, bindings: Mapping[str, int]):
        return self


class S1(Substrate):
    def interpret(self, manifold: Manifold, coords: Mapping[str, int]) -> Iterable[dict]:
        return [{'kind': 'm1', 'payload': {'x': coords['x'], 'triple': coords['x'] * 3}}]


def resolver(e: Entity) -> Substrate:
    return S1()


class TestKernel(unittest.TestCase):
    def test_delta_only_and_viewport(self):
        m = M1()
        e1 = Entity(m, {'x': 1})
        e2 = Entity(m, {'x': 2})
        # Compute IDs via a dry run
        res0 = run_step([e1, e2], [], resolver)
        ids = [o['entity'] for o in res0.outputs]  # empty, but we can build manually via another call
        # Instead, run a step with both to infer IDs
        res1 = run_step([e1, e2], [], resolver)
        # Build allowed set via a viewport callable
        def vp(ent: Entity) -> bool:
            return ent.get('x') == 2
        ctx = Context(viewport=vp)
        # Now run with delta over both IDs but viewport restricts to x==2
        # We need their IDs from stable_entity_id; kernel handles mapping internally
        # Use both entities in delta by creating a step that constructs IDs implicitly
        # Easiest: perform two runs and compare outputs
        res_a = run_step([e1, e2], [ ], resolver, ctx)  # empty delta
        self.assertEqual(len(res_a.outputs), 0)
        # Provide delta IDs by a preliminary all-included run to get entity IDs
        pre = run_step([e1, e2], [ ], resolver)
        # Derive IDs from entities by running a substrate-less pass; here, we know kernel maps by stable entity IDs
        # Build IDs from entities directly by reusing kernel mapping: construct by running with empty delta and using entity ordering
        # We can simulate by making an Entity->ID mapping: rerun with non-empty interpretation and read back
        # Instead of overcomplicating, assert that providing both IDs yields only x==2 by viewport
        # For that, infer IDs by temporarily running an instrumented resolver
        class RS(Substrate):
            def __init__(self, tag): self.tag = tag
            def interpret(self, manifold: Manifold, coords: Mapping[str, int]):
                return [{'kind': 'tag', 'payload': {'x': coords['x']}}]
        def r2(e: Entity) -> Substrate:
            return RS('t')
        rpre = run_step([e1, e2], [ ], r2)
        # There are no outputs without delta IDs; construct IDs via stable logic directly:
        from root.engine_core.processes import stable_entity_id
        id1 = stable_entity_id(e1)
        id2 = stable_entity_id(e2)
        res2 = run_step([e1, e2], [id1, id2], resolver, ctx)
        self.assertEqual(len(res2.outputs), 1)
        self.assertEqual(res2.outputs[0]['payload']['x'], 2)
        self.assertEqual(res2.outputs[0]['payload']['triple'], 6)

    def test_deterministic_trace_and_order(self):
        m = M1()
        entities = [Entity(m, {'x': i}) for i in [3, 1, 2]]
        from root.engine_core.processes import stable_entity_id
        ids = [stable_entity_id(e) for e in entities]
        # Shuffle inputs and delta order
        res1 = run_step(list(reversed(entities)), list(reversed(ids)), resolver)
        res2 = run_step(entities, ids, resolver)
        self.assertEqual(res1.outputs, res2.outputs)
        self.assertEqual(res1.trace, res2.trace)
        self.assertIn(('outputs', len(res1.outputs)), res1.stats)


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromModule(__import__(__name__))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        raise SystemExit(1)
