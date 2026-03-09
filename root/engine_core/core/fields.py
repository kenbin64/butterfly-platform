"""
Universal field algebra for no-storage computing.
A Field is any callable Context -> Value. We provide minimal, pure combinators.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Callable, TypeVar, Tuple, Any, Protocol

T = TypeVar('T')
U = TypeVar('U')
V = TypeVar('V')
Context = Any


class Field(Protocol[T]):
    def __call__(self, ctx: Context) -> T: ...


def const(value: T) -> Field[T]:
    def f(_: Context) -> T:
        return value
    return f


def map_field(op: Callable[[T], U], F: Field[T]) -> Field[U]:
    def g(ctx: Context) -> U:
        return op(F(ctx))
    return g


def lift2(op: Callable[[T, U], V], F: Field[T], G: Field[U]) -> Field[V]:
    def h(ctx: Context) -> V:
        return op(F(ctx), G(ctx))
    return h


def zip_fields(*Fs: Field[Any]) -> Field[Tuple[Any, ...]]:
    def z(ctx: Context) -> Tuple[Any, ...]:
        return tuple(F(ctx) for F in Fs)
    return z


def warp(W: Callable[[Context], Context], F: Field[T]) -> Field[T]:
    def g(ctx: Context) -> T:
        return F(W(ctx))
    return g


def product(F: Field[T], G: Field[U]) -> Field[Tuple[T, U]]:
    def p(ctx: Context) -> Tuple[T, U]:
        return F(ctx), G(ctx)
    return p
