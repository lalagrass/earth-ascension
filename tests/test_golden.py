"""Golden canonical hashes for fixed seeds.

A failure here means a rule, schema or RNG change altered replay. If that is intended, bump the
version, describe the expected hash change in the PR, and update the constants below.
"""
import unittest

from earth_ascension import engine, m2

M2_SEED7_MONTH0 = "deb3b6e9fa2af911d600cc19a025740777623faa3a9638e73dfafe33255caa7c"
M2_SEED7_MONTH24 = "8d607fede2c0bbd77574df2bcce59fda4132592af671217bed9181950a3b3982"
M1_SEED7_MONTH24 = "51bb1f4f5afbf5cefd0fcca2567667b3827aff9499e358eb69e0208cd379709a"


class GoldenHashTests(unittest.TestCase):
    def test_m2_rules_0_2_0_replay(self):
        self.assertEqual(m2.M2_VERSION, "0.2.0")
        world = m2.new_world(7)
        self.assertEqual(m2.canonical_hash(world), M2_SEED7_MONTH0)
        for _ in range(24):
            m2.advance(world)
        self.assertEqual(m2.canonical_hash(world), M2_SEED7_MONTH24)

    def test_m1_legacy_replay(self):
        world = engine.initial_world(7)
        for _ in range(24):
            engine.advance(world)
        self.assertEqual(m2.canonical_hash(world), M1_SEED7_MONTH24)


if __name__ == "__main__":
    unittest.main()
