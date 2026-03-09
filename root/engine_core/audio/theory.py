from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple, List

from root.engine_core.contracts import EPSILON


PITCH_CLASSES = ('C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B')

# Modes as interval patterns (in semitones from root)
MODES = {
    'ionian':      (0, 2, 4, 5, 7, 9, 11),  # major
    'dorian':      (0, 2, 3, 5, 7, 9, 10),
    'phrygian':    (0, 1, 3, 5, 7, 8, 10),
    'lydian':      (0, 2, 4, 6, 7, 9, 11),
    'mixolydian':  (0, 2, 4, 5, 7, 9, 10),
    'aeolian':     (0, 2, 3, 5, 7, 8, 10),  # natural minor
    'locrian':     (0, 1, 3, 5, 6, 8, 10),
}

CHORD_QUALITIES = {
    'maj': (0, 4, 7),
    'min': (0, 3, 7),
    'dim': (0, 3, 6),
    'aug': (0, 4, 8),
    '7':   (0, 4, 7, 10),
    'maj7':(0, 4, 7, 11),
    'min7':(0, 3, 7, 10),
}

A4_FREQ = 440.0
A4_MIDI = 69


def midi_to_freq(m: int) -> float:
    return A4_FREQ * (2.0 ** ((m - A4_MIDI) / 12.0))


def note_name_to_pc(name: str) -> int:
    name = name.strip().upper()
    if name not in PITCH_CLASSES:
        raise ValueError(f"unknown pitch class: {name}")
    return PITCH_CLASSES.index(name)


@dataclass(frozen=True)
class Note:
    pc: int  # 0..11
    octave: int  # e.g., 4 for middle range
    velocity: float = 1.0  # 0..1

    def __post_init__(self):
        if not (0 <= self.pc <= 11):
            raise ValueError("pitch class must be 0..11")
        if not (0.0 - EPSILON <= self.velocity <= 1.0 + EPSILON):
            raise ValueError("velocity must be in [0,1]")

    @property
    def midi(self) -> int:
        # MIDI standard: C4 = 60, A4 = 69 => midi = (octave + 1) * 12 + pc
        return int((self.octave + 1) * 12 + self.pc)

    @property
    def freq(self) -> float:
        return midi_to_freq(self.midi)


@dataclass(frozen=True)
class Scale:
    root_pc: int
    mode: str  # key: MODES

    def __post_init__(self):
        if self.mode not in MODES:
            raise ValueError("unknown mode")
        if not (0 <= self.root_pc <= 11):
            raise ValueError("root pc 0..11")

    @property
    def degrees(self) -> Tuple[int, ...]:
        return MODES[self.mode]

    def degree_pc(self, degree_index: int) -> int:
        # degree_index 0..6 maps into scale degrees
        interval = self.degrees[degree_index % len(self.degrees)]
        return (self.root_pc + interval) % 12


@dataclass(frozen=True)
class Chord:
    root_pc: int
    quality: str  # key: CHORD_QUALITIES

    def __post_init__(self):
        if self.quality not in CHORD_QUALITIES:
            raise ValueError("unknown chord quality")
        if not (0 <= self.root_pc <= 11):
            raise ValueError("root pc 0..11")

    @property
    def intervals(self) -> Tuple[int, ...]:
        return CHORD_QUALITIES[self.quality]

    def pcs(self) -> Tuple[int, ...]:
        return tuple(((self.root_pc + i) % 12) for i in self.intervals)


@dataclass(frozen=True)
class Envelope:
    attack: float
    decay: float
    sustain: float  # 0..1 level
    release: float

    def __post_init__(self):
        if self.attack < 0 or self.decay < 0 or self.release < 0:
            raise ValueError("times must be >= 0")
        if not (0.0 - EPSILON <= self.sustain <= 1.0 + EPSILON):
            raise ValueError("sustain must be in [0,1]")


@dataclass(frozen=True)
class Waveform:
    kind: str  # 'sine'|'square'|'saw'|'triangle'|'noise'
    harmonics: Tuple[float, ...] = ()  # amplitude per harmonic multiplier


@dataclass(frozen=True)
class RhythmCell:
    # Fractions of a bar (in 1.0 units) where hits occur (0..1), with accent strengths 0..1
    positions: Tuple[float, ...]
    accents: Tuple[float, ...]

    def __post_init__(self):
        if len(self.positions) != len(self.accents):
            raise ValueError("positions and accents length mismatch")
        for p in self.positions:
            if p < 0.0 - EPSILON or p > 1.0 + EPSILON:
                raise ValueError("positions must be in [0,1]")
        for a in self.accents:
            if a < 0.0 - EPSILON or a > 1.0 + EPSILON:
                raise ValueError("accents must be in [0,1]")

    def rotate(self, amount: float) -> 'RhythmCell':
        amt = amount % 1.0
        return RhythmCell(positions=tuple(((p + amt) % 1.0) for p in self.positions), accents=self.accents)


# Deterministic degree walking and rhythm sequences

def degree_walk(scale: Scale, bar_index: int, section_index: int) -> int:
    # Fibonacci-like bounded walk over degree indices 0..6
    fib = (1, 1, 2, 3, 5, 8, 13, 21)
    seed = (bar_index + 1) * (section_index + 2)
    step = fib[(seed % len(fib))]
    idx = (seed + step) % len(scale.degrees)
    return idx


def rhythm_for_section(section_index: int) -> RhythmCell:
    # Choose a base cell deterministically per section
    base = [
        RhythmCell((0.0, 0.5), (1.0, 0.7)),           # verse: on 1 and 3
        RhythmCell((0.0, 0.25, 0.5, 0.75), (1, .6, .8, .6)),  # chorus: quarters/eighths
        RhythmCell((0.0, 0.375, 0.75), (1, .9, .8)),  # hook: syncopated
        RhythmCell((0.0, 0.5, 0.875), (1, .7, .6)),   # bridge/resolution
    ][section_index % 4]
    # Rotate based on section to provide variation
    return base.rotate(((section_index * 0.137) % 1.0))


__all__ = [
    'PITCH_CLASSES', 'MODES', 'CHORD_QUALITIES',
    'Note', 'Scale', 'Chord', 'Envelope', 'Waveform', 'RhythmCell',
    'midi_to_freq', 'note_name_to_pc', 'degree_walk', 'rhythm_for_section',
]