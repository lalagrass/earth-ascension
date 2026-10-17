"""Golden canonical hashes for fixed seeds.

A failure here means a rule, schema or RNG change altered replay. If that is intended, bump the
version, describe the expected hash change in the PR, and update the constants below.
"""
import unittest

from earth_ascension import engine, m2

# 0.2.0 baseline: a 0.2.0 save must keep replaying exactly under the 0.2.0 rules.
M2_0_2_0_SEED7_MONTH0 = "deb3b6e9fa2af911d600cc19a025740777623faa3a9638e73dfafe33255caa7c"
M2_0_2_0_SEED7_MONTH24 = "8d607fede2c0bbd77574df2bcce59fda4132592af671217bed9181950a3b3982"
# 0.2.1 baseline (#2 memory eviction); RNG_NAMESPACE is unchanged, so only the version labels differ here.
M2_0_2_1_SEED7_MONTH0 = "6c00f73ead3cdc69ea71657daa715838aa94052248a6e505158c2c7be713b71b"
M2_0_2_1_SEED7_MONTH24 = "e1d97f8483c0e2f805f21b96627578fff767cd8d637a5e682ef373b133732ecc"
M1_SEED7_MONTH24 = "51bb1f4f5afbf5cefd0fcca2567667b3827aff9499e358eb69e0208cd379709a"


class GoldenHashTests(unittest.TestCase):
    def _replay(self, rules_version):
        world = m2.new_world(7)
        world["version"] = world["rules_version"] = rules_version
        start = m2.canonical_hash(world)
        for _ in range(24):
            m2.advance(world)
        return start, m2.canonical_hash(world)

    def test_m2_rules_0_2_0_replay(self):
        self.assertEqual(self._replay("0.2.0"), (M2_0_2_0_SEED7_MONTH0, M2_0_2_0_SEED7_MONTH24))

    def test_m2_rules_0_2_1_replay(self):
        self.assertEqual(m2.M2_VERSION, "0.2.1")
        self.assertEqual(self._replay(m2.M2_VERSION), (M2_0_2_1_SEED7_MONTH0, M2_0_2_1_SEED7_MONTH24))

    def test_m1_legacy_replay(self):
        world = engine.initial_world(7)
        for _ in range(24):
            engine.advance(world)
        self.assertEqual(m2.canonical_hash(world), M1_SEED7_MONTH24)


if __name__ == "__main__":
    unittest.main()
