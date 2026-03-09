import unittest

from root.engine_core.contracts import Context
from root.engine_core.audio.manifolds import MusicManifold
from root.engine_core.audio.events import EventSubstrate
from root.engine_core.dimensional import run_manifold


class TestAudioEvents(unittest.TestCase):
    def test_note_events_by_section_and_subdivision(self):
        m = MusicManifold(subdivisions_per_bar=4, key_pc=0, mode='ionian', bpm=120.0)
        es = EventSubstrate(instrument_id='lead', octave=4, velocity=0.9)
        # Build one bar with 4 subdivisions for two sections
        coords = []
        for section in [0, 1]:
            for bar in [0]:
                for sub in range(4):
                    coords.append({'section': section, 'bar': bar, 'sub': sub})
        res = run_manifold(m, coords, es)
        # Ensure some events present and that sections differ
        events_s0 = [o for o in res.outputs if o['payload']['section'] == 0]
        events_s1 = [o for o in res.outputs if o['payload']['section'] == 1]
        self.assertTrue(len(events_s0) >= 1)
        self.assertTrue(len(events_s1) >= 1)
        self.assertNotEqual([(e['payload']['bar'], e['payload']['sub']) for e in events_s0],
                            [(e['payload']['bar'], e['payload']['sub']) for e in events_s1])
        # Timestamps must be multiples of 0.5s at 120 BPM with 4/4 and 4 subs
        for e in res.outputs:
            ts = e['payload']['timestamp']
            self.assertAlmostEqual((ts / 0.5) - round(ts / 0.5), 0.0, places=6)


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromModule(__import__(__name__))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        raise SystemExit(1)
