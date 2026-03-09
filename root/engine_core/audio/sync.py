"""
Audio/video synchronization primitives as pure manifolds.
"""
from __future__ import annotations
from typing import Callable
import math

# Tempo map: returns beats per minute at time t
TempoFn = Callable[[float], float]


def constant_bpm(bpm: float) -> TempoFn:
    def f(t: float) -> float:
        return bpm
    return f


def beat_phase(tempo: TempoFn) -> Callable[[float], float]:
    """Return phase in [0,1) for the current beat at time t."""
    def phase(t: float) -> float:
        bpm = max(1e-3, tempo(t))
        bps = bpm / 60.0
        return (t * bps) % 1.0
    return phase


def bar_index(tempo: TempoFn, beats_per_bar: int = 4) -> Callable[[float], int]:
    def f(t: float) -> int:
        bpm = max(1e-3, tempo(t))
        beats = t * (bpm / 60.0)
        return int(beats // beats_per_bar)
    return f
