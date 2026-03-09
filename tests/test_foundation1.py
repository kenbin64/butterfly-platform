import os
import re
import json
import math
import hashlib
import itertools
import unittest
from dataclasses import dataclass, field, FrozenInstanceError
from typing import Any, Dict, List, Tuple, Iterable

# Base directory for repository-relative paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
SRC_DIR = os.path.join(BASE_DIR, 'foundation-1', 'source')
ROOT_DIR = os.path.join(BASE_DIR, 'root')


# -----------------------------
# Simple JSON Schema Validator
# Supports subset used by universe_rules.schema.json: type, properties, required,
# items, minItems, uniqueItems. Unknown fields in instances are rejected (closed-world).
# -----------------------------
class SchemaValidationError(Exception):
    pass


class SimpleSchemaValidator:
    def validate(self, instance: Any, schema: Dict[str, Any], path: str = "$") -> None:
        stype = schema.get('type')
        if stype == 'object':
            self._validate_object(instance, schema, path)
        elif stype == 'array':
            self._validate_array(instance, schema, path)
        elif stype == 'string':
            if not isinstance(instance, str):
                raise SchemaValidationError(f"{path}: expected string, got {type(instance).__name__}")
        elif stype == 'boolean':
            if not isinstance(instance, bool):
                raise SchemaValidationError(f"{path}: expected boolean, got {type(instance).__name__}")
        elif stype is None:
            # Allow schemas without explicit 'type' if not used here.
            pass
        else:
            raise SchemaValidationError(f"{path}: unsupported schema type: {stype}")

    def _validate_object(self, instance: Any, schema: Dict[str, Any], path: str) -> None:
        if not isinstance(instance, dict):
            raise SchemaValidationError(f"{path}: expected object, got {type(instance).__name__}")
        props: Dict[str, Dict[str, Any]] = schema.get('properties', {})
        required: List[str] = schema.get('required', [])

        # Required keys
        for key in required:
            if key not in instance:
                raise SchemaValidationError(f"{path}: missing required property '{key}'")

        # Closed-world: no extras beyond declared properties
        # Closed-world at this level only if properties are declared. If schema omits
        # 'properties' (empty) for a sub-object (e.g., examples objects), allow arbitrary keys.
        if props:
            for key in instance.keys():
                if key not in props:
                    raise SchemaValidationError(f"{path}: unknown property '{key}' not in schema")

        # Validate each property recursively
        for key, subschema in props.items():
            if key in instance:
                self.validate(instance[key], subschema, path=f"{path}.{key}")

    def _validate_array(self, instance: Any, schema: Dict[str, Any], path: str) -> None:
        if not isinstance(instance, list):
            raise SchemaValidationError(f"{path}: expected array, got {type(instance).__name__}")
        min_items = schema.get('minItems')
        if min_items is not None and len(instance) < int(min_items):
            raise SchemaValidationError(f"{path}: expected at least {min_items} items, got {len(instance)}")
        if schema.get('uniqueItems'):
            if len(set(map(json.dumps, instance))) != len(instance):
                raise SchemaValidationError(f"{path}: expected unique items")
        items_schema = schema.get('items')
        if items_schema is not None:
            for idx, item in enumerate(instance):
                self.validate(item, items_schema, path=f"{path}[{idx}]")


# -----------------------------
# Fibonacci with Cap at 21
# -----------------------------

def fibonacci_capped(last_value: int = 21) -> List[int]:
    if last_value <= 0:
        raise ValueError("Cap must be positive")
    seq = [1, 1]
    while seq[-1] < last_value:
        seq.append(seq[-1] + seq[-2])
    if seq[-1] != last_value:
        # If cap not exactly on a Fibonacci number, remove the last overshoot
        while seq and seq[-1] > last_value:
            seq.pop()
        # Ensure we do not exceed the cap
        if not seq or seq[-1] != last_value:
            # If last_value is not a Fibonacci number, append no further values
            pass
    # Remove duplicates beyond the cap if any logic drifted
    return [n for n in seq if n <= last_value]


# -----------------------------
# Enclosure Rule Aggregation
# Deterministically aggregate prior-step outputs into a single identity string.
# -----------------------------

def canonical_aggregate(items: Iterable[Any]) -> str:
    def canonicalize(x: Any) -> Any:
        if isinstance(x, dict):
            return {k: canonicalize(x[k]) for k in sorted(x.keys())}
        elif isinstance(x, (list, tuple)):
            vals = [canonicalize(v) for v in x]
            # Sort a stable stringified representation to be order-independent
            vals_sorted = sorted(vals, key=lambda v: json.dumps(v, separators=(",", ":"), sort_keys=True))
            return vals_sorted
        else:
            return x

    canonical = canonicalize(list(items))
    blob = json.dumps(canonical, separators=(",", ":"), sort_keys=True)
    return hashlib.sha256(blob.encode('utf-8')).hexdigest()


# -----------------------------
# Traversal and Slicing Semantics (Nested Iteration Law)
# Axis order: index 0 is the lowest dimension (innermost loop),
# index N-1 is the highest (outermost loop).
# -----------------------------

def cartesian_product(domains: List[List[Any]]) -> Iterable[Tuple[Any, ...]]:
    # Innermost-first order => use itertools.product over reversed and reverse back each tuple
    if not domains:
        yield tuple()
        return
    for combo in itertools.product(*reversed(domains)):
        yield tuple(reversed(combo))


def evaluate_full(domains: List[List[Any]], fn) -> List[Any]:
    return [fn(coords) for coords in cartesian_product(domains)]


def evaluate_slice(domains: List[List[Any]], axis_index: int, bound_value: Any, fn) -> List[Any]:
    if axis_index < 0 or axis_index >= len(domains):
        raise ValueError("axis_index out of range")
    new_domains = [list(d) for d in domains]
    if bound_value not in new_domains[axis_index]:
        raise ValueError("bound_value not in domain for axis")
    new_domains[axis_index] = [bound_value]
    return evaluate_full(new_domains, fn)


# -----------------------------
# Immutable Packet Contract (minimal)
# -----------------------------

@dataclass(frozen=True)
class Packet:
    kind: str
    payload: Dict[str, Any] = field(default_factory=dict)


# -----------------------------
# Import Layering Check
# Ensures no forward references across dimension modules of the pattern root/manifold/d<k>
# A file in dJ must not import from any dK where K > J.
# -----------------------------

def find_dimension_from_path(path: str) -> int | None:
    # e.g., .../root/manifold/d1/... -> returns 1
    m = re.search(r"\\root\\manifold\\d(\\d+)\\", path) or re.search(r"/root/manifold/d(\\d+)/", path)
    if m:
        return int(m.group(1))
    return None


def scan_import_violations(root_dir: str) -> List[Tuple[str, str, int, int]]:
    violations: List[Tuple[str, str, int, int]] = []
    for dirpath, _, filenames in os.walk(root_dir):
        for fn in filenames:
            if not fn.endswith('.py'):
                continue
            fpath = os.path.join(dirpath, fn)
            cur_dim = find_dimension_from_path(fpath)
            try:
                with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
            except Exception:
                continue
            for imp in re.findall(r"(?:from|import)\\s+root\\.manifold\\.d(\\d+)", content):
                imp_dim = int(imp)
                if cur_dim is not None and imp_dim > cur_dim:
                    violations.append((fpath, f"root.manifold.d{imp_dim}", imp_dim, cur_dim))
    return violations


# -----------------------------
# Tests
# -----------------------------

class TestRulesSchema(unittest.TestCase):
    def setUp(self) -> None:
        self.schema_path = os.path.join(SRC_DIR, 'universe_rules.schema.json')
        self.rules_path = os.path.join(SRC_DIR, 'universe_rules.json')
        with open(self.schema_path, 'r', encoding='utf-8') as f:
            self.schema = json.load(f)
        with open(self.rules_path, 'r', encoding='utf-8') as f:
            self.rules = json.load(f)

    def test_schema_validation_passes(self):
        validator = SimpleSchemaValidator()
        validator.validate(self.rules, self.schema)

    def test_rejects_unknown_top_level_property(self):
        bad = json.loads(json.dumps(self.rules))
        bad['unknown_field'] = {}
        validator = SimpleSchemaValidator()
        with self.assertRaises(SchemaValidationError):
            validator.validate(bad, self.schema)

    def test_enforces_unique_dimensions_and_min_items(self):
        bad = json.loads(json.dumps(self.rules))
        # Duplicate the first dimension to break uniqueness
        bad['dimensions']['order'][1] = bad['dimensions']['order'][0]
        validator = SimpleSchemaValidator()
        with self.assertRaises(SchemaValidationError):
            validator.validate(bad, self.schema)

    def test_rejects_wrong_types(self):
        bad = json.loads(json.dumps(self.rules))
        bad['primitives']['dimension']['defines_axis_of_variation'] = "yes"
        validator = SimpleSchemaValidator()
        with self.assertRaises(SchemaValidationError):
            validator.validate(bad, self.schema)


class TestFibonacciCapAndMapping(unittest.TestCase):
    def test_fibonacci_capped_21(self):
        seq = fibonacci_capped(21)
        self.assertEqual(seq, [1, 1, 2, 3, 5, 8, 13, 21])
        self.assertEqual(seq[-1], 21)
        self.assertTrue(all(n <= 21 for n in seq))

    def test_no_values_beyond_cap(self):
        seq = fibonacci_capped(21)
        self.assertNotIn(34, seq)

    def test_dimension_mapping_alignment(self):
        # Map the first 8 Fibonacci numbers to 8 emergent layers up to Expression; Source is enclosure.
        seq = fibonacci_capped(21)
        dims = [
            'point', 'line', 'plane', 'volume', 'object', 'motion', 'awareness', 'expression'
        ]
        self.assertEqual(len(seq), len(dims))


class TestEnclosureRule(unittest.TestCase):
    def test_deterministic_and_order_independent(self):
        items1 = [
            {"a": 1, "b": [2, 3]},
            {"x": "y"},
            42,
        ]
        items2 = [42, {"x": "y"}, {"b": [2, 3], "a": 1}]
        id1 = canonical_aggregate(items1)
        id2 = canonical_aggregate(items2)
        self.assertEqual(id1, id2)
        # Changing content changes the aggregate
        items3 = [42, {"x": "z"}, {"b": [2, 3], "a": 1}]
        id3 = canonical_aggregate(items3)
        self.assertNotEqual(id1, id3)
        self.assertEqual(len(id1), 64)  # sha256 hex length


class TestTraversalSlices(unittest.TestCase):
    def test_full_equals_union_of_slices(self):
        domains = [
            [0, 1],        # axis 0 (lower, innermost)
            [10, 20, 30],  # axis 1 (higher, outermost)
        ]
        def f(coords: Tuple[int, int]) -> Tuple[int, int, int]:
            x, y = coords
            return (x, y, x + y)

        full = evaluate_full(domains, f)
        slices = []
        for y in domains[1]:
            sl = evaluate_slice(domains, axis_index=1, bound_value=y, fn=f)
            slices.extend(sl)
        # Canonical order equivalence
        self.assertEqual(full, slices)

        # Filtering equivalence: each slice equals filtered full at that y
        for y in domains[1]:
            sl = evaluate_slice(domains, axis_index=1, bound_value=y, fn=f)
            filtered = [t for t in full if t[1] == y]
            self.assertEqual(sl, filtered)

    def test_delta_only_evaluation(self):
        # Initial domains and extended domains (adding 20 on axis 1)
        domains_a = [[0, 1], [10]]
        domains_b = [[0, 1], [10, 20]]
        def f(coords: Tuple[int, int]) -> Tuple[int, int, int]:
            x, y = coords
            return (x, y, x * y)
        full_a = evaluate_full(domains_a, f)
        full_b = evaluate_full(domains_b, f)
        # New work equals all combinations involving the new value 20
        new_work = [t for t in full_b if t not in full_a]
        expected_new = evaluate_slice(domains_b, axis_index=1, bound_value=20, fn=f)
        self.assertEqual(new_work, expected_new)


class TestImportLayering(unittest.TestCase):
    def test_no_forward_dimension_imports(self):
        if not os.path.isdir(ROOT_DIR):
            self.skipTest("root directory not present; skipping layering checks")
        violations = scan_import_violations(ROOT_DIR)
        if violations:
            msgs = [
                f"{path} imports {imp} (imp_dim={impd} > cur_dim={curd})" for path, imp, impd, curd in violations
            ]
            self.fail("Forward dimension imports detected:\n" + "\n".join(msgs))


class TestPacketImmutability(unittest.TestCase):
    def test_packet_is_frozen(self):
        p = Packet(kind='pixel', payload={'x': 1, 'y': 2, 'color': '#fff'})
        with self.assertRaises(FrozenInstanceError):
            # Attempt to mutate should raise
            p.kind = 'sound'
        with self.assertRaises(FrozenInstanceError):
            p.payload = {}
        # Underlying dict is still mutable unless deeply frozen; enforce contract by replacement only
        # Here we assert object identity remains and Packet prevents reassignment
        self.assertEqual(p.payload['x'], 1)


class TestDocumentsPresenceAndContent(unittest.TestCase):
    def test_dimensions_manifolds_substrates_doc(self):
        path = os.path.join(SRC_DIR, 'dimensions_manifolds_substrates.md')
        self.assertTrue(os.path.isfile(path))
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        self.assertIn('Dimensions: Axes of Variation', content)
        self.assertIn('Manifolds: Shapes of Possibility', content)
        self.assertIn('Substrates: Interpreters of Manifolds', content)

    def test_emergence_doc_cap_and_enclosure(self):
        path = os.path.join(SRC_DIR, 'dimensional_traversal_and_creative_emergence.md')
        self.assertTrue(os.path.isfile(path))
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        self.assertIn('Fibonacci sequence (capped): 1, 1, 2, 3, 5, 8, 13, 21', content)
        self.assertIn('Enclosure Rule', content)

    def test_rules_and_schema_exist(self):
        rules = os.path.join(SRC_DIR, 'universe_rules.json')
        schema = os.path.join(SRC_DIR, 'universe_rules.schema.json')
        self.assertTrue(os.path.isfile(rules))
        self.assertTrue(os.path.isfile(schema))


if __name__ == '__main__':
    # Allow running this file directly for quick checks
    suite = unittest.defaultTestLoader.loadTestsFromModule(__import__(__name__))
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if not result.wasSuccessful():
        raise SystemExit(1)
