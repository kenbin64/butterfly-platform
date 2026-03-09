import unittest

from root.engine_core.audio.theory import Envelope, Waveform
from root.engine_core.audio.manifolds import MusicManifold
from root.engine_core.audio.synthesis import SynthSubstrate, DrumSubstrate, MixSubstrate, ReverbSubstrate, ReverbSpec
from root.engine_core.dimensional import run_manifold


class TestAudioSynthesis(unittest.TestCase):
    def test_synth_and_drum_produce_blocks(self):
        m = MusicManifold(subdivisions_per_bar=4, key_pc=0, mode='ionian', bpm=120.0)
        synth = SynthSubstrate('lead', Waveform('saw', (1.0, 0.5, 0.25)), Envelope(0.01, 0.2, 0.7, 0.3))
        drum = DrumSubstrate('kick')
        coords = [{'section': 0, 'bar': 0, 'sub': i} for i in range(4)]
        res_s = run_manifold(m, coords, synth)
        res_d = run_manifold(m, coords, drum)
        self.assertTrue(any(o['kind'] == 'audio_block' for o in res_s.outputs))
        self.assertTrue(any(o['kind'] == 'audio_block' for o in res_d.outputs))

    def test_mix_and_reverb_determinism(self):
        m = MusicManifold(subdivisions_per_bar=4, key_pc=0, mode='ionian', bpm=120.0)
        lead = SynthSubstrate('lead', Waveform('sine', (1.0,)), Envelope(0.01, 0.1, 0.8, 0.2))
        bass = SynthSubstrate('bass', Waveform('square', (1.0, 0.33)), Envelope(0.02, 0.2, 0.9, 0.3))
        drums = DrumSubstrate('snare')
        mix = MixSubstrate([lead, bass, drums])
        rev = ReverbSubstrate(mix, ReverbSpec(decay=1.2, mix=0.25))
        coords = [{'section': 1, 'bar': 0, 'sub': i} for i in range(4)]
        out1 = run_manifold(m, coords, rev).outputs
        out2 = run_manifold(m, list(reversed(coords)), rev).outputs
        self.assertEqual(out1, out2)
        # Ensure hashes are stable and present
        self.assertTrue(all('content_hash' in o['payload'] for o in out1))


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromModule(__import__(__name__))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        raise SystemExit(1)
