from __future__ import annotations
import json
import hashlib
from dataclasses import dataclass
from typing import Iterable, Mapping, Dict, Any, List, Tuple

from root.engine_core.contracts import Manifold, Substrate
from root.engine_core.audio.manifolds import MusicManifold, SECTION_AXIS, BAR_AXIS, SUB_AXIS
from root.engine_core.audio.theory import Envelope, Waveform
from root.engine_core.audio.events import EventSubstrate


@dataclass(frozen=True)
class AudioSamplePacket:
    kind: str
    payload: Dict[str, Any]


def _hash_parts(parts: List[Any]) -> str:
    def canon(x: Any) -> Any:
        if isinstance(x, dict):
            return {k: canon(x[k]) for k in sorted(x.keys())}
        if isinstance(x, (list, tuple)):
            vals = [canon(v) for v in x]
            vals.sort(key=lambda v: json.dumps(v, separators=(",", ":"), sort_keys=True))
            return vals
        return x
    blob = json.dumps(canon(parts), separators=(",", ":"), sort_keys=True)
    return hashlib.sha256(blob.encode('utf-8')).hexdigest()


class SynthSubstrate(Substrate):
    """
    Deterministic block-based synthesizer. Does not emit raw samples; instead emits
    AudioSamplePackets whose content_hash is a deterministic function of coordinates,
    instrument timbre (waveform, harmonics), envelope, and note frequency from EventSubstrate.
    """

    def __init__(self, instrument_id: str, wave: Waveform, env: Envelope, sample_rate: int = 48000, block_size: int = 1024):
        self._instrument_id = instrument_id
        self._wave = wave
        self._env = env
        self._sr = int(sample_rate)
        self._bs = int(block_size)
        self._event = EventSubstrate(instrument_id=instrument_id)

    def interpret(self, manifold: Manifold, coords: Mapping[str, int]) -> Iterable[AudioSamplePacket]:
        if not isinstance(manifold, MusicManifold):
            return []
        section = int(coords[SECTION_AXIS.name]); bar = int(coords[BAR_AXIS.name]); sub = int(coords[SUB_AXIS.name])
        # Trigger if an event exists for this coordinate
        evs = list(self._event.interpret(manifold, coords))
        if not evs:
            return []
        # For each event, emit stereo blocks with deterministic hashes
        packets: List[AudioSamplePacket] = []
        for ev in evs:
            freq = float(ev.payload['freq'])
            base = [
                'synth', self._instrument_id, self._wave.kind, tuple(round(h, 6) for h in self._wave.harmonics),
                round(self._env.attack, 6), round(self._env.decay, 6), round(self._env.sustain, 6), round(self._env.release, 6),
                manifold.bpm, manifold.key_pc, manifold.mode,
                section, bar, sub, self._sr, self._bs, round(freq, 6),
            ]
            # Simple stereo differentiation by channel tag
            for ch in ('L', 'R'):
                h = _hash_parts(base + [ch])
                payload = {
                    'channel': ch,
                    'sample_rate': self._sr,
                    'block_index': sub,  # simplification: one block per subdivision
                    'content_hash': h,
                    'instrument': self._instrument_id,
                    'section': section,
                }
                packets.append(AudioSamplePacket(kind='audio_block', payload=payload))
        return packets


class DrumSubstrate(Substrate):
    """Deterministic drum synthesis using quantized rhythm hits; hashed blocks only."""

    def __init__(self, kit_element: str, sample_rate: int = 48000, block_size: int = 1024):
        self._kit = kit_element  # 'kick'|'snare'|'hihat'
        self._sr = int(sample_rate)
        self._bs = int(block_size)
        self._event = EventSubstrate(instrument_id=kit_element, octave=3, velocity=0.8)

    def interpret(self, manifold: Manifold, coords: Mapping[str, int]) -> Iterable[AudioSamplePacket]:
        if not isinstance(manifold, MusicManifold):
            return []
        section = int(coords[SECTION_AXIS.name]); bar = int(coords[BAR_AXIS.name]); sub = int(coords[SUB_AXIS.name])
        if not list(self._event.interpret(manifold, coords)):
            return []
        # Hash reflects kit element and timeline
        base = ['drum', self._kit, manifold.bpm, manifold.key_pc, manifold.mode, section, bar, sub, self._sr, self._bs]
        packets: List[AudioSamplePacket] = []
        for ch in ('L', 'R'):
            h = _hash_parts(base + [ch])
            payload = {
                'channel': ch,
                'sample_rate': self._sr,
                'block_index': sub,
                'content_hash': h,
                'instrument': self._kit,
                'section': section,
            }
            packets.append(AudioSamplePacket(kind='audio_block', payload=payload))
        return packets


class MixSubstrate(Substrate):
    """Deterministic mixer over child substrates; emits mixed stereo blocks with new hashes."""

    def __init__(self, children: List[Substrate]):
        self._children = list(children)

    def interpret(self, manifold: Manifold, coords: Mapping[str, int]) -> Iterable[AudioSamplePacket]:
        # Collect child blocks
        blocks: Dict[str, List[str]] = {'L': [], 'R': []}
        for child in self._children:
            for pkt in child.interpret(manifold, coords):
                if pkt.kind != 'audio_block':
                    continue
                ch = pkt.payload.get('channel', 'L')
                blocks[ch].append(pkt.payload['content_hash'])
        # If no blocks, no output
        if not blocks['L'] and not blocks['R']:
            return []
        # Deterministic mix: sort hashes and hash the concatenation per channel
        out: List[AudioSamplePacket] = []
        for ch in ('L', 'R'):
            if blocks[ch]:
                mh = _hash_parts(['mix', ch, sorted(blocks[ch])])
                # Reuse meta from first contributing child if available
                payload = {
                    'channel': ch,
                    'sample_rate': 48000,
                    'block_index': coords.get(SUB_AXIS.name, 0),
                    'content_hash': mh,
                    'instrument': 'mix',
                    'section': coords.get(SECTION_AXIS.name, 0),
                }
                out.append(AudioSamplePacket(kind='audio_block', payload=payload))
        return out


@dataclass(frozen=True)
class ReverbSpec:
    decay: float
    mix: float


class ReverbSubstrate(Substrate):
    """Wraps a child substrate; transforms content_hash deterministically using a procedural IR spec."""

    def __init__(self, child: Substrate, spec: ReverbSpec):
        self._child = child
        self._spec = spec

    def interpret(self, manifold: Manifold, coords: Mapping[str, int]) -> Iterable[AudioSamplePacket]:
        out: List[AudioSamplePacket] = []
        for pkt in self._child.interpret(manifold, coords):
            if pkt.kind != 'audio_block':
                continue
            base = ['reverb', round(self._spec.decay, 6), round(self._spec.mix, 6), pkt.payload['content_hash']]
            nh = _hash_parts(base)
            payload = dict(pkt.payload)
            payload['content_hash'] = nh
            out.append(AudioSamplePacket(kind='audio_block', payload=payload))
        return out


__all__ = [
    'AudioSamplePacket',
    'SynthSubstrate', 'DrumSubstrate', 'MixSubstrate', 'ReverbSubstrate', 'ReverbSpec',
]