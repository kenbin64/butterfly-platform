from __future__ import annotations
from dataclasses import dataclass
from typing import Iterable, Mapping, Dict, Any

from root.engine_core.contracts import Manifold, Substrate
from root.engine_core.audio.manifolds import SECTION_AXIS, BAR_AXIS, SUB_AXIS, MusicManifold
from root.engine_core.audio.theory import Scale, degree_walk, rhythm_for_section, Note


@dataclass(frozen=True)
class NoteEventPacket:
    kind: str
    payload: Dict[str, Any]


class EventSubstrate(Substrate):
    """
    Interprets MusicManifold coordinates into deterministic note events based on
    section-specific rhythm cells and scale degree walking.
    Coordinates expected: {'section': int, 'bar': int, 'sub': int}
    """

    def __init__(self, instrument_id: str, octave: int = 4, velocity: float = 0.8):
        self._instrument_id = instrument_id
        self._octave = octave
        self._velocity = velocity

    def interpret(self, manifold: Manifold, coords: Mapping[str, int]) -> Iterable[NoteEventPacket]:
        if not isinstance(manifold, MusicManifold):
            return []
        section = int(coords[SECTION_AXIS.name])
        bar = int(coords[BAR_AXIS.name])
        sub = int(coords[SUB_AXIS.name])
        subs = max(1, int(manifold.subdivisions_per_bar))

        # Determine if a hit occurs at this subdivision
        rc = rhythm_for_section(section)
        # Quantize rotated rhythm positions to the discrete subdivision grid
        grid_positions = {int(round(p * subs)) % subs for p in rc.positions}
        if sub not in grid_positions:
            return []

        # Determine scale and degree
        scale = Scale(root_pc=manifold.key_pc, mode=manifold.mode)
        deg_idx = degree_walk(scale, bar, section)
        pc = scale.degree_pc(deg_idx)
        note = Note(pc=pc, octave=self._octave, velocity=self._velocity)

        # Timestamp in seconds from bar/sub + bpm
        beats_per_bar = 4.0
        secs_per_beat = 60.0 / manifold.bpm
        time_in_bar = (sub / subs) * beats_per_bar * secs_per_beat
        timestamp = bar * beats_per_bar * secs_per_beat + time_in_bar

        payload = {
            'instrument': self._instrument_id,
            'section': section,
            'bar': bar,
            'sub': sub,
            'midi': note.midi,
            'freq': note.freq,
            'velocity': note.velocity,
            'timestamp': timestamp,
        }
        yield NoteEventPacket(kind='note_event', payload=payload)


__all__ = [
    'NoteEventPacket', 'EventSubstrate',
]