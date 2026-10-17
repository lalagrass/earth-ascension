import copy
import hashlib
import json
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

from earth_ascension.engine import initial_world
from earth_ascension.m2 import (_event, _intent, _remember, advance, canonical_hash, draw,
                                new_world, validate)
from earth_ascension.store import Store


class M2Tests(unittest.TestCase):
    def test_fixed_seed_and_monthly_invariants(self):
        a, b = new_world(713), new_world(713)
        for _ in range(12):
            advance(a)
            advance(b)
            validate(a)
        self.assertEqual(canonical_hash(a), canonical_hash(b))
        self.assertEqual(a["month"], 12)
        self.assertEqual(len(a["trends"]), 12)
        self.assertTrue(any(p["memories_v2"] for p in a["people"].values()))
        self.assertTrue(any(p["relationships_v2"] for p in a["people"].values()))

    def test_people_insertion_order_does_not_change_result(self):
        a, b = new_world(41), new_world(41)
        b["people"] = dict(reversed(list(b["people"].items())))
        for _ in range(6):
            advance(a)
            advance(b)
        self.assertEqual(canonical_hash(a), canonical_hash(b))

    def test_no_same_month_knowledge_leak(self):
        world = new_world(901)
        advance(world)
        for person in world["people"].values():
            decision = person["last_decision"]
            if decision:
                self.assertNotIn("修習", decision["feasible"])
                self.assertEqual(decision["known_fact_ids"], [])
        self.assertTrue(any(p["knowledge_v2"] for p in world["people"].values()))

    def test_information_spreads_only_after_an_observed_exchange(self):
        world = new_world(0)
        actor = world["people"]["1"]
        actor["goal"] = "建立關係"
        actor["goals"][0].update(type="建立關係", label="建立關係")
        actor["plan"]["action"] = "社交"
        actor["profile_current"].update(外向=.95, 探索=.05, 關懷=.95)
        actor["profile"] = copy.deepcopy(actor["profile_current"])
        actor["relationships_v2"]["6"] = {"trust": 80, "last_event_id": None, "last_interaction_month": None}
        actor["relations"]["6"] = 80
        discovery = _event(world, "發現", 1, "研究發現可修習基礎", important=True)
        actor["knowledge_v2"].append({"fact_id": "practice_basis", "source_event_id": discovery["event_id"],
                                      "learned_month": 0, "confidence": 1.0})
        advance(world)
        recipient = world["people"]["6"]
        self.assertEqual(actor["last_decision"]["target"], 6)
        self.assertNotIn("修習", recipient["last_decision"]["feasible"])
        self.assertEqual(recipient["knowledge_v2"][0]["fact_id"], "practice_basis")
        source = next(e for e in world["events"] if e["event_id"] == recipient["knowledge_v2"][0]["source_event_id"])
        self.assertEqual(source["target"], 6)
        self.assertIn(discovery["event_id"], source["causal_event_ids"])

    def test_memory_changes_score_with_same_other_state(self):
        world = new_world(12)
        person = world["people"]["1"]
        event = _event(world, "關係挫折", 1, "真實關係挫折", target=2, important=True)
        base = copy.deepcopy(world)
        _remember(person, event)
        lookup = {event["event_id"]: event}
        with_memory = _intent(person, world, 1, lookup)
        without_memory = _intent(base["people"]["1"], base, 1, lookup)
        self.assertAlmostEqual(without_memory["scores"]["社交"] - with_memory["scores"]["社交"], .6)
        self.assertEqual(with_memory["memory_event_ids"], [event["event_id"]])

    def test_unknown_rules_version_rejected_without_mutation(self):
        world = new_world(1)
        world["rules_version"] = "future-incompatible"
        digest = canonical_hash(world)
        with self.assertRaises(ValueError):
            validate(world)
        with self.assertRaises(ValueError):
            advance(world)
        self.assertEqual(canonical_hash(world), digest)

    def test_compatibility_projections_must_agree(self):
        for field in ("goal", "profile", "relations"):
            world = new_world(3)
            person = world["people"]["1"]
            if field == "goal":
                person["goal"] = "錯誤目標"
            elif field == "profile":
                person["profile"]["探索"] = 0
            else:
                person["relations"]["2"] = 99
            with self.assertRaises(ValueError, msg=field):
                validate(world)

    def test_two_same_month_shares_keep_both_sources(self):
        world = new_world(0)
        for actor_id in (1, 6):
            actor = world["people"][str(actor_id)]
            actor["goal"] = "建立關係"
            actor["goals"][0].update(type="建立關係", label="建立關係")
            actor["plan"]["action"] = "社交"
            actor["profile_current"].update(外向=.95, 關懷=.95, 探索=.05)
            actor["profile"] = copy.deepcopy(actor["profile_current"])
            actor["relationships_v2"]["11"] = {"trust": 90, "last_event_id": None, "last_interaction_month": None}
            actor["relations"]["11"] = 90
            event = _event(world, "發現", actor_id, f"已知資料 {actor_id}", important=True)
            actor["knowledge_v2"].append({"fact_id": "practice_basis", "source_event_id": event["event_id"],
                                          "learned_month": 0, "confidence": 1.0})
        advance(world)
        recipient = world["people"]["11"]
        sources = [k["source_event_id"] for k in recipient["knowledge_v2"]]
        self.assertEqual(len(sources), 2)
        self.assertEqual({next(e for e in world["events"] if e["event_id"] == source)["actor"] for source in sources}, {1, 6})

    def test_goal_completion_keeps_prior_goal_and_causal_event(self):
        world = new_world(2)
        person = world["people"]["1"]
        person["goals"][0]["progress"] = person["goals"][0]["target"]
        person["plan"]["review_month"] = 1
        advance(world)
        completion = next(e for e in world["events"] if e["kind"] == "目標完成" and e["actor"] == 1)
        self.assertEqual(person["goal_history"][0]["label"], person["last_decision"]["goal_label"])
        self.assertEqual(person["goals"][0]["label"], "穩定生活")
        self.assertIn(completion["event_id"], person["last_decision"]["outcome_event_ids"])
        self.assertIn(completion["event_id"], [m["event_id"] for m in person["memories_v2"]])

    def test_simultaneous_trust_aggregates_before_clamp(self):
        world = new_world(0)
        for actor_id, target_id in ((1, 6), (6, 1)):
            actor = world["people"][str(actor_id)]
            actor["goal"] = "建立關係"
            actor["goals"][0].update(type="建立關係", label="建立關係")
            actor["plan"]["action"] = "社交"
            actor["profile_current"].update(外向=.95, 關懷=.95 if actor_id == 1 else .05,
                                             親和=.05 if actor_id == 1 else .95, 探索=.05)
            actor["profile"] = copy.deepcopy(actor["profile_current"])
            actor["relationships_v2"][str(target_id)] = {"trust": 98, "last_event_id": None, "last_interaction_month": None}
            actor["relations"][str(target_id)] = 98
        self.assertGreater(draw(0, 1, 1, "social-outcome", 6).random(), .13)
        self.assertLess(draw(0, 1, 6, "social-outcome", 1).random(), .13)
        advance(world)
        self.assertEqual(world["people"]["6"]["relationships_v2"]["1"]["trust"], 96)

    def test_directional_milestone_attributed_to_successful_actor(self):
        world = new_world(21)
        for person in world["people"].values():
            person["alive"] = person["id"] in (1, 6)
        for actor_id, target_id in ((1, 6), (6, 1)):
            actor = world["people"][str(actor_id)]
            actor["goal"] = "建立關係"
            actor["goals"][0].update(type="建立關係", label="建立關係")
            actor["plan"]["action"] = "社交"
            actor["profile_current"].update(外向=.95, 關懷=.95, 親和=.05 if actor_id == 1 else .95)
            actor["profile"] = copy.deepcopy(actor["profile_current"])
            actor["relationships_v2"][str(target_id)] = {"trust": 25, "last_event_id": None, "last_interaction_month": None}
            actor["relations"][str(target_id)] = 25
        advance(world)
        self.assertEqual(world["people"]["1"]["relationships_v2"]["6"]["trust"], 23)
        self.assertEqual(world["people"]["6"]["relationships_v2"]["1"]["trust"], 32)
        positive = [e for e in world["events"] if e["kind"] == "關係" and e["actor"] == 6 and e.get("important")]
        self.assertEqual(len(positive), 1)
        self.assertIn(positive[0]["event_id"], world["people"]["6"]["last_decision"]["relationship_event_ids"])

    def test_migrate_copy_and_custom_goal(self):
        with tempfile.TemporaryDirectory() as d:
            source, target = Path(d)/"old.sqlite3", Path(d)/"new.sqlite3"
            old = initial_world(23)
            with closing(sqlite3.connect(source)) as db:
                db.executescript("CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);"
                                 "CREATE TABLE snapshots(month INTEGER PRIMARY KEY,state TEXT NOT NULL);"
                                 "CREATE TABLE events(id INTEGER PRIMARY KEY AUTOINCREMENT,month INTEGER NOT NULL,kind TEXT NOT NULL,subject INTEGER,payload TEXT NOT NULL);")
                db.execute("INSERT INTO meta VALUES('current_month','0')")
                db.execute("INSERT INTO snapshots VALUES(0,?)", (json.dumps(old, ensure_ascii=False),))
                db.commit()
            m1 = Store(source)
            m1.create_character({"name": "舊玩家", "district": "學園", "goal": "自訂的人生願望", "budget": 30,
                                 "traits": {"根骨": 5, "悟性": 8, "意志": 6, "感知": 7, "社交": 4},
                                 "answers": [3]*16})
            m1.advance(0)
            digest = hashlib.sha256(source.read_bytes()).hexdigest()
            Store.migrate_copy(source, target)
            self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), digest)
            m2 = Store(target)
            self.assertEqual(m2.read()["version"], "0.2.0")
            self.assertEqual(m2.read(0)["version"], "0.1.0")
            person = m2.read()["people"]["101"]
            self.assertEqual(person["goals"][0]["type"], "legacy_custom")
            self.assertEqual(person["goals"][0]["label"], "自訂的人生願望")
            m2.set_legacy_goal(101, "探索靈氣", 1)
            self.assertEqual(m2.read()["people"]["101"]["goals"][0]["type"], "探索靈氣")
            self.assertEqual(m2.read()["people"]["101"]["goal_history"][0]["label"], "自訂的人生願望")
            self.assertTrue(any(e["kind"] == "目標重選" for e in m2.read()["people"]["101"]["chronicle"]))
            self.assertEqual(m2.advance(1)[0]["month"], 2)
            with closing(sqlite3.connect(target)) as db:
                saved_hash = db.execute("SELECT value FROM meta WHERE key='state_hash:2'").fetchone()[0]
            self.assertEqual(saved_hash, canonical_hash(m2.read()))
            with self.assertRaises(ValueError):
                Store.migrate_copy(source, target)

    def test_real_m1_checkpoints_migrate_or_reject_safely(self):
        with tempfile.TemporaryDirectory() as d:
            for checkpoint in (0, 12, 60):
                source = Path(d)/f"m1-{checkpoint}.sqlite3"
                target = Path(d)/f"m2-{checkpoint}.sqlite3"
                with closing(sqlite3.connect(source)) as db:
                    db.executescript("CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);"
                                     "CREATE TABLE snapshots(month INTEGER PRIMARY KEY,state TEXT NOT NULL);"
                                     "CREATE TABLE events(id INTEGER PRIMARY KEY AUTOINCREMENT,month INTEGER NOT NULL,kind TEXT NOT NULL,subject INTEGER,payload TEXT NOT NULL);")
                    db.execute("INSERT INTO meta VALUES('current_month','0')")
                    db.execute("INSERT INTO snapshots VALUES(0,?)", (json.dumps(initial_world(31), ensure_ascii=False),))
                    db.commit()
                legacy = Store(source)
                for month in range(checkpoint):
                    legacy.advance(month)
                original = hashlib.sha256(source.read_bytes()).hexdigest()
                Store.migrate_copy(source, target)
                self.assertEqual(original, hashlib.sha256(source.read_bytes()).hexdigest())
                upgraded = Store(target)
                self.assertEqual(upgraded.read()["month"], checkpoint)
                self.assertEqual(upgraded.read()["version"], "0.2.0")
                if checkpoint:
                    self.assertEqual(upgraded.read(0)["version"], "0.1.0")
                upgraded.advance(checkpoint)
            dead_source, dead_target = Path(d)/"m1-death.sqlite3", Path(d)/"m2-death.sqlite3"
            with closing(sqlite3.connect(dead_source)) as db:
                db.executescript("CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);"
                                 "CREATE TABLE snapshots(month INTEGER PRIMARY KEY,state TEXT NOT NULL);"
                                 "CREATE TABLE events(id INTEGER PRIMARY KEY AUTOINCREMENT,month INTEGER NOT NULL,kind TEXT NOT NULL,subject INTEGER,payload TEXT NOT NULL);")
                db.execute("INSERT INTO meta VALUES('current_month','0')")
                aged = initial_world(31)
                aged["people"]["1"]["age"] = 900  # Force the original M1 mortality rule in this fixture.
                db.execute("INSERT INTO snapshots VALUES(0,?)", (json.dumps(aged, ensure_ascii=False),))
                db.commit()
            Store(dead_source).advance(0)
            self.assertFalse(Store(dead_source).read()["people"]["1"]["alive"])
            Store.migrate_copy(dead_source, dead_target)
            migrated_dead = Store(dead_target).read()["people"]["1"]
            self.assertFalse(migrated_dead["alive"])
            self.assertTrue(any(e["kind"] == "死亡" for e in migrated_dead["chronicle"]))
            bad = Path(d)/"unknown.sqlite3"
            with closing(sqlite3.connect(bad)) as db:
                db.executescript("CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);"
                                 "CREATE TABLE snapshots(month INTEGER PRIMARY KEY,state TEXT NOT NULL);")
                db.execute("INSERT INTO meta VALUES('current_month','0')")
                world = initial_world(2)
                world["version"] = "unknown"
                db.execute("INSERT INTO snapshots VALUES(0,?)", (json.dumps(world, ensure_ascii=False),))
                db.commit()
            rejected = Path(d)/"rejected.sqlite3"
            with self.assertRaises(ValueError):
                Store.migrate_copy(bad, rejected)
            self.assertFalse(rejected.exists())

    def test_new_m2_character_rejects_unmapped_custom_goal(self):
        with tempfile.TemporaryDirectory() as d:
            store = Store(Path(d)/"new.sqlite3")
            with self.assertRaises(ValueError):
                store.create_character({"name": "新角色", "district": "學園", "goal": "無規則的自訂目標", "budget": 30,
                                        "traits": {"根骨": 5, "悟性": 8, "意志": 6, "感知": 7, "社交": 4}, "answers": [3]*16})
            self.assertEqual(store.read()["next_id"], 101)


if __name__ == "__main__":
    unittest.main()
