"""
Stateless evaluator: streams contexts through fields and yields packets.
"""
from __future__ import annotations
from typing import Iterable, Iterator, Any, Callable

from root.engine_core.core.fields import Field


def evaluate(field: Field[Any], contexts: Iterable[Any]) -> Iterator[Any]:
    for ctx in contexts:
        yield field(ctx)


def stream(field: Field[Any], context_gen: Callable[[], Iterable[Any]], sink: Callable[[Any], None]) -> None:
    for out in evaluate(field, context_gen()):
        sink(out)
