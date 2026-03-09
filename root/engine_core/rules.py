import os
import json
from dataclasses import dataclass
from types import MappingProxyType
from typing import Any, Dict, List, Optional


class SchemaValidationError(Exception):
    pass


class SimpleSchemaValidator:
    """
    Minimal JSON Schema validator for the subset used by universe_rules.schema.json:
    - type: object, array, string, boolean
    - properties, required
    - items, minItems, uniqueItems
    Closed-world: objects with declared properties reject unknown fields.
    If an object schema has no 'properties' (empty or omitted), allow arbitrary keys.
    """

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
            # Schema nodes may omit type; skip.
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

        # Closed world only if properties are declared for this object
        if props:
            for key in instance.keys():
                if key not in props:
                    raise SchemaValidationError(f"{path}: unknown property '{key}' not in schema")

        # Validate known properties recursively
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
            # Use JSON dumps as a structural proxy for uniqueness
            if len(set(map(json.dumps, instance))) != len(instance):
                raise SchemaValidationError(f"{path}: expected unique items")
        items_schema = schema.get('items')
        if items_schema is not None:
            for idx, item in enumerate(instance):
                self.validate(item, items_schema, path=f"{path}[{idx}]")


# Deep freeze utilities

def _deep_freeze(obj: Any) -> Any:
    if isinstance(obj, dict):
        return MappingProxyType({k: _deep_freeze(v) for k, v in obj.items()})
    if isinstance(obj, list):
        return tuple(_deep_freeze(v) for v in obj)
    if isinstance(obj, set):
        return frozenset(_deep_freeze(v) for v in obj)
    if isinstance(obj, tuple):
        return tuple(_deep_freeze(v) for v in obj)
    return obj


@dataclass(frozen=True)
class FrozenRules:
    data: Any

    def get(self) -> Any:
        return self.data


def _default_src_dir() -> str:
    # Attempt to locate foundation-1/source relative to CWD or this file
    # Prefer CWD-based resolution to integrate with tests and runtime.
    cwd = os.getcwd()
    candidate = os.path.join(cwd, 'foundation-1', 'source')
    if os.path.isdir(candidate):
        return candidate
    here = os.path.dirname(os.path.abspath(__file__))
    candidate2 = os.path.normpath(os.path.join(here, os.pardir, os.pardir, 'foundation-1', 'source'))
    if os.path.isdir(candidate2):
        return candidate2
    raise FileNotFoundError("Unable to locate foundation-1/source directory")


def load_rules(src_dir: Optional[str] = None) -> FrozenRules:
    """
    Load and validate the universe rules against the schema, returning a deeply immutable view.
    """
    src = src_dir or _default_src_dir()
    rules_path = os.path.join(src, 'universe_rules.json')
    schema_path = os.path.join(src, 'universe_rules.schema.json')
    with open(schema_path, 'r', encoding='utf-8') as f:
        schema = json.load(f)
    with open(rules_path, 'r', encoding='utf-8') as f:
        rules = json.load(f)

    validator = SimpleSchemaValidator()
    validator.validate(rules, schema)

    frozen = _deep_freeze(rules)
    return FrozenRules(data=frozen)


__all__ = [
    'SchemaValidationError',
    'SimpleSchemaValidator',
    'FrozenRules',
    'load_rules',
]