"""
Context-aware music score manifolds (simplified). Pure functional hooks.
"""
from __future__ import annotations
from typing import Callable, Tuple
import math

Note = Tuple[float, float]  # (frequency Hz, duration seconds)


def motif_sine(root_hz: float = 220.0, steps: Tuple[int, ...] = (0, 2, 4, 7)) -> Callable[[float], float]:
    """Return a frequency field over time cycling over a simple motif."""
    def f(t: float) -> float:
        idx = int(t * 2.0) % len(steps)
        semis = steps[idx]
        return root_hz * (2 ** (semis / 12.0))
    return f


def amplitude_envelope(attack: float = 0.01, decay: float = 0.1, sustain: float = 0.8, release: float = 0.2) -> Callable[[float], float]:
    def env(t: float) -> float:
        if t < attack:
            return t / max(attack, 1e-6)
        t -= attack
        if t < decay:
            return 1.0 - (1.0 - sustain) * (t / max(decay, 1e-6))
        return sustain
    return env
