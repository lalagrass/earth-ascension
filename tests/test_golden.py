"""Golden canonical hashes for fixed seeds.

A failure here means a rule, schema or RNG change altered replay. If that is intended, bump the
version, describe the expected hash change in the PR, and update the constants below.
"""
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from earth_ascension import engine, m2
from earth_ascension.store import Store

# 0.2.0 baseline: a 0.2.0 save must keep replaying exactly under the 0.2.0 rules.
M2_0_2_0_SEED7_MONTH0 = "deb3b6e9fa2af911d600cc19a025740777623faa3a9638e73dfafe33255caa7c"
M2_0_2_0_SEED7_MONTH24 = "8d607fede2c0bbd77574df2bcce59fda4132592af671217bed9181950a3b3982"
# 0.2.1 baseline (#2 memory eviction); RNG_NAMESPACE is unchanged, so only the version labels differ here.
M2_0_2_1_SEED7_MONTH0 = "6c00f73ead3cdc69ea71657daa715838aa94052248a6e505158c2c7be713b71b"
M2_0_2_1_SEED7_MONTH24 = "e1d97f8483c0e2f805f21b96627578fff767cd8d637a5e682ef373b133732ecc"
# 0.2.2 baseline (#8 goal review: rest phase + re-evaluation); RNG_NAMESPACE is still 0.2.0, new draw purpose "goal-review".
M2_0_2_2_SEED7_MONTH0 = "596f82fc5455f7c6d5b5dcc7716b1e23e55cce1000a1f4ec9e6aad150f41c42a"
M2_0_2_2_SEED7_MONTH24 = "cac9ee388690a8063f7709603ce7af0bc6e05f5d6eba5672825a45a27a1acf5a"
# A 0.2.1 SQLite save created by the 0.2.1 code (dev @ 255855e) and advanced to months 24 and 25 by that same code.
M2_0_2_1_STORE_MONTH24 = "236b3b9e41bcfdb68f2a3fe8bbe4f19911ab3ef26ffc1ded811fb10bcec6b0b5"
M2_0_2_1_STORE_MONTH25 = "40491fb46499e06b79f2a387ab9b76548b0413a6b461a593d84d8fc61c62d587"
# A real 0.2.0 SQLite save: default seed, created and advanced to month 24 by the 0.2.0 code (dev @ ba64c00),
# then advanced to month 25 by that same code. The current code must continue it byte for byte.
M2_0_2_0_STORE_MONTH24 = "eb6199cde772bae685cd65a59813c2f225118d4ec45e70d38039d59c8bb9ab46"
M2_0_2_0_STORE_MONTH25 = "a9b3362e5918cc32fce35de5e3a856726c216976f1f435034e774020166dd838"
M1_SEED7_MONTH24 = "51bb1f4f5afbf5cefd0fcca2567667b3827aff9499e358eb69e0208cd379709a"


class GoldenHashTests(unittest.TestCase):
    def _replay(self, rules_version):
        world = m2.new_world(7, rules_version)
        start = m2.canonical_hash(world)
        for _ in range(24):
            m2.advance(world)
        return start, m2.canonical_hash(world)

    def test_m2_rules_0_2_0_replay(self):
        self.assertEqual(self._replay("0.2.0"), (M2_0_2_0_SEED7_MONTH0, M2_0_2_0_SEED7_MONTH24))

    def test_m2_rules_0_2_1_replay(self):
        self.assertEqual(self._replay("0.2.1"), (M2_0_2_1_SEED7_MONTH0, M2_0_2_1_SEED7_MONTH24))

    def test_m2_rules_0_2_2_replay(self):
        self.assertEqual(m2.M2_VERSION, "0.2.2")
        self.assertEqual(self._replay(m2.M2_VERSION), (M2_0_2_2_SEED7_MONTH0, M2_0_2_2_SEED7_MONTH24))

    def test_m2_0_2_1_save_continues_under_0_2_1_rules(self):
        with tempfile.TemporaryDirectory() as tmp:
            original = m2.new_world
            with mock.patch.object(m2, "new_world", lambda: original(2026, "0.2.1")):
                store = Store(Path(tmp) / "world.sqlite3")
            for month in range(24):
                store.advance(month)
            self.assertEqual(m2.canonical_hash(store.read()), M2_0_2_1_STORE_MONTH24)
            world, _ = store.advance(24)
            self.assertEqual((world["rules_version"], m2.canonical_hash(store.read())), ("0.2.1", M2_0_2_1_STORE_MONTH25))
            self.assertFalse(any("goal_reviews" in p for p in world["people"].values()))

    def test_m2_0_2_0_save_continues_under_0_2_0_rules(self):
        with tempfile.TemporaryDirectory() as tmp:
            # Store() creates the month-0 world exactly as the 0.2.0 code did.
            original = m2.new_world
            with mock.patch.object(m2, "new_world", lambda: original(2026, "0.2.0")):
                store = Store(Path(tmp) / "world.sqlite3")
            for month in range(24):
                store.advance(month)
            self.assertEqual(m2.canonical_hash(store.read()), M2_0_2_0_STORE_MONTH24)
            world, _ = store.advance(24)
            self.assertEqual((world["rules_version"], m2.canonical_hash(store.read())), ("0.2.0", M2_0_2_0_STORE_MONTH25))

    def test_m1_legacy_replay(self):
        world = engine.initial_world(7)
        for _ in range(24):
            engine.advance(world)
        self.assertEqual(m2.canonical_hash(world), M1_SEED7_MONTH24)


if __name__ == "__main__":
    unittest.main()
