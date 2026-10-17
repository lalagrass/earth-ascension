import json
import tempfile
import unittest
from pathlib import Path

from earth_ascension.engine import advance, initial_world, validate_traits, validate_world
from earth_ascension.store import Store


def player(name="林知夏"):
    return {"name": name, "district": "學園", "goal": "探索靈氣", "budget": 30,
            "traits": {"根骨": 5, "悟性": 8, "意志": 6, "感知": 7, "社交": 4},
            "answers": [5, 4, 2, 4, 4, 5, 2, 4, 5, 4, 2, 4, 4, 5, 2, 4]}


class M1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "world.sqlite3"

    def test_character_budget_and_limit(self):
        s = Store(self.path)
        bad = player()
        bad["traits"]["悟性"] = 9
        with self.assertRaises(ValueError):
            s.create_character(bad)
        bad = player()
        bad["answers"] = [3] * 15
        with self.assertRaises(ValueError):
            s.create_character(bad)
        for i in range(3):
            s.create_character(player(f"玩家{i}"))
        with self.assertRaises(ValueError):
            s.create_character(player("第四位"))
        self.assertEqual(sum(p["player"] for p in s.read()["people"].values()), 3)

    def test_atomic_restart_and_duplicate_guard(self):
        s = Store(self.path)
        p = s.create_character(player())
        world, events = s.advance(0)
        self.assertEqual(world["month"], 1)
        self.assertTrue(events)
        self.assertEqual(Store(self.path).read(), world)
        with self.assertRaises(ValueError):
            Store(self.path).advance(0)
        self.assertEqual(Store(self.path).read(0)["month"], 0)
        self.assertIn(str(p["id"]), Store(self.path).read()["people"])

    def test_fixed_seed_reproduces_rule_result(self):
        a, b = initial_world(901), initial_world(901)
        for _ in range(12):
            advance(a)
            advance(b)
        self.assertEqual(json.dumps(a, sort_keys=True), json.dumps(b, sort_keys=True))

    def test_unattended_60_month_consistency(self):
        world = initial_world(12)
        for _ in range(60):
            advance(world)
            validate_world(world)
        self.assertEqual(world["month"], 60)
        self.assertEqual(len(world["trends"]), 60)
        self.assertGreater(sum(sum(p["skills"].values()) for p in world["people"].values()), 100)
        self.assertTrue(any(p["relations"] for p in world["people"].values()))

    def test_dead_person_history_is_retained(self):
        world = initial_world()
        p = world["people"]["1"]
        p["age"] = 900  # Force the aging death path deterministically.
        for _ in range(20):
            advance(world)
            if not p["alive"]:
                break
        self.assertFalse(p["alive"])
        self.assertTrue(any(e["kind"] == "死亡" for e in p["chronicle"]))
        self.assertIn("1", world["people"])


if __name__ == "__main__":
    unittest.main()
