import unittest

from root.engine_core.audio.theory import (
    PITCH_CLASSES, MODES, CHORD_QUALITIES,
    Note, Scale, Chord, Envelope, Waveform, RhythmCell,
    midi_to_freq, note_name_to_pc, degree_walk, rhythm_for_section,
)


class TestAudioTheory(unittest.TestCase):
    def test_note_freq_and_name(self):
        a4 = Note(pc=note_name_to_pc('A'), octave=4)
        self.assertAlmostEqual(a4.freq, 440.0, places=6)
        c4 = Note(pc=note_name_to_pc('C'), octave=4)
        self.assertAlmostEqual(round(c4.freq), 262)

    def test_scale_and_degree(self):
        s = Scale(root_pc=note_name_to_pc('C'), mode='ionian')
        self.assertEqual(s.degrees[0], 0)
        self.assertEqual(s.degree_pc(0), note_name_to_pc('C'))
        self.assertEqual(s.degree_pc(4), note_name_to_pc('G'))

    def test_chord_pcs(self):
        cmaj = Chord(root_pc=note_name_to_pc('C'), quality='maj')
        self.assertEqual(cmaj.pcs(), (
            note_name_to_pc('C'), note_name_to_pc('E'), note_name_to_pc('G')
        ))
        amin7 = Chord(root_pc=note_name_to_pc('A'), quality='min7')
        self.assertEqual(amin7.pcs(), (
            note_name_to_pc('A'), note_name_to_pc('C'), note_name_to_pc('E'), note_name_to_pc('G')
        ))

    def test_envelope_validation(self):
        env = Envelope(attack=0.01, decay=0.2, sustain=0.8, release=0.3)
        self.assertAlmostEqual(env.sustain, 0.8)
        with self.assertRaises(ValueError):
            Envelope(-0.1, 0.2, 0.5, 0.3)
        with self.assertRaises(ValueError):
            Envelope(0.1, 0.2, 1.5, 0.3)

    def test_rhythm_cell_rotation(self):
        rc = RhythmCell((0.0, 0.5), (1.0, 0.8))
        rc2 = rc.rotate(0.25)
        self.assertIn(0.25, rc2.positions)
        self.assertIn(0.75, rc2.positions)

    def test_degree_walk_and_rhythm_for_section(self):
        s = Scale(root_pc=note_name_to_pc('C'), mode='ionian')
        idx1 = degree_walk(s, bar_index=0, section_index=0)
        idx2 = degree_walk(s, bar_index=1, section_index=0)
        self.assertTrue(0 <= idx1 < len(s.degrees))
        self.assertNotEqual(idx1, idx2)
        rc0 = rhythm_for_section(0)
        rc1 = rhythm_for_section(1)
        # Ensure both define at least 2 positions and are different between sections
        self.assertGreaterEqual(len(rc0.positions), 2)
        self.assertNotEqual(rc0.positions, rc1.positions)


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromModule(__import__(__name__))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        raise SystemExit(1)
