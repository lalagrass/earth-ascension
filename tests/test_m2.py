import copy
import hashlib
import json
import sqlite3
import tempfile
import unittest
from unittest import mock
from contextlib import closing
from pathlib import Path

from earth_ascension import m2 as m2_module
from earth_ascension.engine import initial_world
from earth_ascension.m2 import (_change_profile, _event, _intent, _remember, advance, canonical_hash, draw,
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

    def _fill_memory_then_setback(self, setback_month, rules_version=m2_module.M2_VERSION):
        world = new_world(12)
        world["version"] = world["rules_version"] = rules_version
        person = world["people"]["1"]
        for _ in range(m2_module.MEMORY_LIMIT):
            _remember(person, _event(world, "發現", 1, "早年發現", important=True), 3, rules_version)
        world["month"] = setback_month
        setback = _event(world, "關係挫折", 1, "近期關係挫折", target=2, important=True)
        _remember(person, setback, 2, rules_version)
        validate(world)
        lookup = {e["event_id"]: e for e in world["events"]}
        next_decision = _intent(person, world, setback_month + 1, lookup)
        return person, setback, next_decision

    def test_full_memory_evicts_inert_memories_before_effective_ones(self):
        # Month 12 is the boundary: month-0 memories are inert for the month-13 decision that follows.
        for month in (m2_module.MEMORY_EFFECT_MONTHS, m2_module.MEMORY_EFFECT_MONTHS + 1):
            with self.subTest(month=month):
                person, setback, next_decision = self._fill_memory_then_setback(month)
                self.assertEqual(len(person["memories_v2"]), m2_module.MEMORY_LIMIT)
                self.assertIn(setback["event_id"], [m["event_id"] for m in person["memories_v2"]])
                self.assertEqual(next_decision["memory_event_ids"], [setback["event_id"]])

    def test_full_memory_keeps_still_effective_memories_one_month_before_boundary(self):
        person, setback, next_decision = self._fill_memory_then_setback(m2_module.MEMORY_EFFECT_MONTHS - 1)
        self.assertNotIn(setback["event_id"], [m["event_id"] for m in person["memories_v2"]])
        self.assertEqual(len(next_decision["memory_event_ids"]), m2_module.MEMORY_LIMIT)

    def test_rules_0_2_0_keep_original_eviction(self):
        person, setback, _ = self._fill_memory_then_setback(m2_module.MEMORY_EFFECT_MONTHS, "0.2.0")
        self.assertNotIn(setback["event_id"], [m["event_id"] for m in person["memories_v2"]])

    def test_full_memory_keeps_effective_important_memories(self):
        world = new_world(12)
        person = world["people"]["1"]
        world["month"] = 5
        recent = [_event(world, "發現", 1, "近期發現", important=True) for _ in range(m2_module.MEMORY_LIMIT)]
        for event in recent:
            _remember(person, event, 3)
        _remember(person, _event(world, "關係挫折", 1, "較不重要", target=2, important=True))
        self.assertEqual({m["event_id"] for m in person["memories_v2"]}, {e["event_id"] for e in recent})

    def _drift(self, world, person, months, dimension="外向", step=.02):
        """Apply genuine event-sourced profile changes through the engine's own _change_profile.

        Each source event is created in its own month (world["month"] is advanced to it), so the
        resulting world stays valid; months must be ascending.
        """
        for month in months:
            world["month"] = month
            event = _event(world, "關係", int(person["id"]), "測試用人格經歷", important=True)
            _change_profile(person, dimension, step, event)

    def test_profile_drift_within_12_month_cap_passes(self):
        world = new_world(5)
        person = world["people"]["1"]
        person["profile_current"]["外向"] = person["profile"]["外向"] = .30
        self._drift(world, person, [1, 2, 3, 4, 5], step=.02)  # exactly 0.10 within one window
        self.assertAlmostEqual(sum(c["after"] - c["before"] for c in person["profile_changes"]), .10)
        event_months = {e["event_id"]: e["month"] for e in world["events"]}
        self.assertTrue(all(c["month"] == event_months[c["event_id"]] <= world["month"]
                            for c in person["profile_changes"]))
        validate(world)

    def test_profile_drift_over_12_month_cap_rejected(self):
        world = new_world(5)
        person = world["people"]["1"]
        person["profile_current"]["外向"] = person["profile"]["外向"] = .30
        self._drift(world, person, [1, 2, 3, 4, 5, 6], step=.02)  # each change <= 0.02 but 0.12 in 12 months
        with self.assertRaisesRegex(ValueError, "累積"):
            validate(world)

    def test_profile_drift_cap_window_boundary(self):
        # Five 0.02 changes in months 1-5 fill the window. A sixth change 12 months after the
        # first (month 13) falls outside every window that holds month 1, so it is allowed;
        # a sixth change at month 12 shares the month 1-12 window and must be rejected.
        for sixth_month, allowed in ((13, True), (12, False)):
            world = new_world(5)
            person = world["people"]["1"]
            person["profile_current"]["外向"] = person["profile"]["外向"] = .30
            self._drift(world, person, [1, 2, 3, 4, 5, sixth_month], step=.02)
            if allowed:
                validate(world)
            else:
                with self.assertRaisesRegex(ValueError, "累積"):
                    validate(world)

    def test_profile_change_month_must_match_source_event_and_not_be_future(self):
        def drifted_world():
            world = new_world(5)
            person = world["people"]["1"]
            person["profile_current"]["外向"] = person["profile"]["外向"] = .30
            self._drift(world, person, [1, 2, 3, 4, 5, 6], step=.02)
            return world, person

        world, person = drifted_world()
        with self.assertRaisesRegex(ValueError, "累積"):  # months 1-6 are honest: 0.12 is rejected for the cap
            validate(world)

        # Review counterexample: only the sixth change's month is rewritten (to 100) while its
        # source event is still month 6 and world.month is 6. Must not slip past the cap check.
        world, person = drifted_world()
        self.assertEqual(world["month"], 6)
        person["profile_changes"][5]["month"] = 100
        with self.assertRaisesRegex(ValueError, "月份"):
            validate(world)

        # A month that differs from the source event's month (but is not in the future) is rejected.
        world, person = drifted_world()
        person["profile_changes"][5]["month"] = 5
        with self.assertRaisesRegex(ValueError, "月份"):
            validate(world)

        # A change that matches its source event but lies after world.month is rejected.
        world, person = drifted_world()
        person["profile_changes"].pop()
        person["profile_changes"][-1]["month"] = 7
        next(e for e in world["events"] if e["event_id"] == person["profile_changes"][-1]["event_id"])["month"] = 7
        world["month"] = 6
        with self.assertRaisesRegex(ValueError, "月份"):
            validate(world)

    def test_unknown_rules_version_rejected_without_mutation(self):
        world = new_world(1)
        world["rules_version"] = "future-incompatible"
        digest = canonical_hash(world)
        with self.assertRaises(ValueError):
            validate(world)
        with self.assertRaises(ValueError):
            advance(world)
        self.assertEqual(canonical_hash(world), digest)

    def test_rules_version_bump_keeps_rng_namespace(self):
        def run():
            world = new_world(7)
            for _ in range(6):
                advance(world)
            for key in ("version", "rules_version"):
                world.pop(key)
            return world

        baseline = run()
        bumped_rules = {("0.2.99", "0.2.99", m2_module.SCHEMA_VERSION, "m2_rules")}
        with mock.patch.object(m2_module, "M2_VERSION", "0.2.99"), \
                mock.patch.object(m2_module, "COMPATIBLE", bumped_rules), \
                mock.patch.object(m2_module, "GOAL_REVIEW_RULES", {"0.2.99"}):
            bumped = run()
        self.assertEqual(bumped["aura"], baseline["aura"])
        self.assertEqual(canonical_hash(bumped), canonical_hash(baseline))
        with mock.patch.object(m2_module, "RNG_NAMESPACE", "reshuffled"):
            reshuffled = run()
        self.assertNotEqual(reshuffled["aura"], baseline["aura"])

    def test_store_keeps_unknown_m2_saves_on_m2_path(self):
        cases = ({"version": "0.2.99", "rules_version": "0.2.99"}, {"schema_version": 3},
                 {"policy_mode": "unknown"})
        for change in cases:
            with self.subTest(change=change), tempfile.TemporaryDirectory() as tmp:
                path = Path(tmp) / "world.sqlite3"
                Store(path)
                with closing(sqlite3.connect(path)) as db:
                    world = json.loads(db.execute("SELECT state FROM snapshots WHERE month=0").fetchone()[0])
                    world.update(change)
                    db.execute("UPDATE snapshots SET state=? WHERE month=0", (json.dumps(world, ensure_ascii=False),))
                    db.commit()
                store = Store(path)
                before = store.read()
                self.assertTrue(m2_module.is_m2_world(before))
                with self.assertRaisesRegex(ValueError, "M2 規則或資料版本不相容"):
                    store.advance(0)
                self.assertEqual(store.read(), before)

    def test_new_world_rules_version_is_explicit_and_checked(self):
        self.assertEqual(new_world(3)["rules_version"], m2_module.M2_VERSION)
        old = new_world(3, "0.2.0")
        self.assertEqual((old["version"], old["rules_version"]), ("0.2.0", "0.2.0"))
        with self.assertRaises(ValueError):
            new_world(3, "0.2.99")

    def test_m1_save_without_markers_stays_on_m1_path(self):
        self.assertFalse(m2_module.is_m2_world(initial_world(7)))

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
            self.assertEqual(m2.read()["version"], m2_module.M2_VERSION)
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
                self.assertEqual(upgraded.read()["version"], m2_module.M2_VERSION)
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


class GoalReviewTests(unittest.TestCase):
    """#8 / rules 0.2.2: a completed goal leads to a rest phase that is re-evaluated, not an absorbing state."""

    @staticmethod
    def _due_rest_world(seed, **profile):
        """Person 1 rests with a review due next month; fixed wealth/health; the given profile and nothing else."""
        world = new_world(seed)
        p = world["people"]["1"]
        base = {key: 0.0 for key in m2_module.PROFILE_KEYS}
        base.update(profile)
        for key in ("profile", "profile_base", "profile_current"):
            p[key] = dict(base)
        p["wealth"], p["health"] = 200, 100
        rest = m2_module._goal(p, "穩定生活")
        p["goals"], p["goal"] = [rest], "穩定生活"
        p["plan"] = {"goal_id": rest["id"], "step": "維持工作與生計", "action": "工作", "review_month": 1, "last_progress_month": 0}
        return world

    def test_same_ability_different_personality_chooses_differently(self):
        results = {}
        for name, profile in (("explorer", {"探索": 1.0, "開放": 1.0}), ("carer", {"關懷": 1.0, "親和": 1.0})):
            world = self._due_rest_world(7, **profile)
            advance(world)
            results[name] = world["people"]["1"]["goal_reviews"][-1]
        self.assertEqual(results["explorer"]["chosen"], "探索靈氣")
        self.assertEqual(results["carer"]["chosen"], "服務社群")
        self.assertEqual({r["month"] for r in results.values()}, {1})
        self.assertTrue(all(r["reason"] == "review_month" and r["outcome"] == "轉向" for r in results.values()))

    def test_each_personality_dimension_moves_only_its_own_candidate_scores(self):
        world = self._due_rest_world(7)
        p = world["people"]["1"]

        def scores(**profile):
            p["profile_current"] = {**{k: 0.0 for k in m2_module.PROFILE_KEYS}, **profile}
            return m2_module._goal_review_scores(p, p["goals"][0], None, 10, 9, {}, set())[0]

        base = scores()
        expected = {"探索": {"探索靈氣": 1.0}, "開放": {"探索靈氣": .5}, "外向": {"建立關係": 1.0},
                    "關懷": {"建立關係": .3, "服務社群": 1.0}, "親和": {"服務社群": .4}, "盡責": {"累積財富": .5},
                    "安全": {"穩定生活": .5}}
        for dimension, deltas in expected.items():
            raised = scores(**{dimension: 1.0})
            for goal, base_score in base.items():
                self.assertAlmostEqual(raised[goal] - base_score, deltas.get(goal, 0.0), msg=f"{dimension}->{goal}")
        p["wealth"] = 10  # needing money raises the wealth candidate; poor health raises resting
        self.assertAlmostEqual(scores()["累積財富"] - base["累積財富"], .8)
        p["wealth"], p["health"] = 200, 40
        self.assertAlmostEqual(scores()["穩定生活"] - base["穩定生活"], .6)

    def test_same_personality_different_experience_changes_scores_only_by_visible_sourced_memories(self):
        world = self._due_rest_world(7, **{"探索": .5, "開放": .5, "外向": .5, "關懷": .5, "親和": .5})
        p = world["people"]["1"]
        world["month"] = 10
        lookup = {}

        def scores():
            return m2_module._goal_review_scores(p, p["goals"][0], None, 10, 9, lookup, set())[0]

        base = scores()
        for kind, month in (("發現", 5), ("目標受挫", 6), ("關係挫折", 7)):
            event = _event(world, kind, 1, kind)
            event["month"] = month
            lookup[event["event_id"]] = event
            _remember(p, event, 2)
        after = scores()
        self.assertAlmostEqual(after["探索靈氣"], base["探索靈氣"] + .3 - .4)
        self.assertAlmostEqual(after["建立關係"], base["建立關係"] - .4)
        self.assertAlmostEqual(after["服務社群"], base["服務社群"] - .2)
        self.assertEqual(after["穩定生活"], base["穩定生活"])
        p["memories_v2"] = []
        self.assertEqual(scores(), base)  # remove the experience and the explanation disappears

    def _sourced_review(self, kinds, same_month_kind=None, seed=7, **profile):
        """Person 1 rests with a review due in month 1 and holds sourced memories of the given kinds."""
        world = self._due_rest_world(seed, **profile)
        p = world["people"]["1"]
        ids = {}
        for kind in kinds:
            event = _event(world, kind, 1, kind)
            event["month"] = 0
            _remember(p, event, 2)
            ids[kind] = event["event_id"]
        advance(world)
        review = world["people"]["1"]["goal_reviews"][-1]
        moved = next((e for e in world["events"] if e["event_id"] == review["event_id"]), None)
        return world, review, moved, ids

    def test_transition_event_cites_the_sourced_events_that_actually_scored(self):
        profile = {"探索": .6, "開放": .6}
        world, review, moved, ids = self._sourced_review(("發現", "目標完成"), **profile)
        self.assertEqual(review["chosen"], "探索靈氣")
        # 目標完成 does not feed any candidate score, so it is neither a contribution nor a cause
        self.assertEqual([c["event_id"] for c in review["contributions"]], [ids["發現"]])
        self.assertEqual(review["contributions"][0]["candidate"], "探索靈氣")
        self.assertAlmostEqual(review["contributions"][0]["delta"], .3)
        self.assertEqual((review["cause_event_ids"], review["basis"]), ([ids["發現"]], "memory"))
        self.assertEqual((moved["causes"], moved["effects"]["basis"]), ([ids["發現"]], "memory"))
        self.assertNotIn(ids["目標完成"], moved["causes"])
        validate(world)
        # counterfactual: without the sourced memory the same person has no memory cause at all
        world2, review2, moved2, _ = self._sourced_review(("目標完成",), **profile)
        self.assertEqual((review2["contributions"], review2["cause_event_ids"], review2["basis"]), ([], [], "profile_baseline"))
        self.assertEqual((moved2["causes"], moved2["effects"]["basis"]), ([], "profile_baseline"))

    def test_a_setback_that_removes_a_rival_is_cited_only_when_it_decided_the_outcome(self):
        profile = {"外向": .6, "探索": .6}
        decisive_seen, idle_seen = 0, 0
        for seed in range(80):
            world, review, moved, ids = self._sourced_review(("關係挫折",), seed=seed, **profile)
            event_id = ids["關係挫折"]
            self.assertEqual({c["candidate"]: c["delta"] for c in review["contributions"]}, {"建立關係": -.4, "服務社群": -.2})
            if review["chosen"] == "探索靈氣" and review["decisive_event_ids"] == [event_id]:
                decisive_seen += 1
                self.assertEqual(moved["causes"], [event_id])
            elif not review["decisive_event_ids"]:
                idle_seen += 1
                self.assertEqual(review["cause_event_ids"], [])  # the setback only lowered rivals and changed nothing
                if moved:
                    self.assertEqual(moved["causes"], [])
        self.assertTrue(decisive_seen and idle_seen, (decisive_seen, idle_seen))

    def test_events_of_the_deciding_month_never_become_causes(self):
        world = self._due_rest_world(7, **{"探索": .6, "開放": .6})
        world["month"] = 0
        advance(world)  # month 1 review; the person's own month-1 events exist but cannot have scored
        review = world["people"]["1"]["goal_reviews"][-1]
        month1 = {e["event_id"] for e in world["events"] if e["month"] == 1}
        used = {c["event_id"] for c in review["contributions"]}
        self.assertFalse(used & month1)
        self.assertFalse(set(review["cause_event_ids"]) & month1)

    def test_decisive_means_removing_the_event_changes_the_choice(self):
        noise = {"探索靈氣": 0.0, "服務社群": 0.0, "穩定生活": 0.0}
        contributions = [{"event_id": "m2:1:1", "candidate": "探索靈氣", "delta": .3},
                         {"event_id": "m2:1:2", "candidate": "穩定生活", "delta": .05}]
        # explore (1.3, of which .3 comes from m2:1:1) beats service (1.1); without m2:1:1 it would lose
        scores = {"探索靈氣": 1.3, "服務社群": 1.1, "穩定生活": .5}
        self.assertEqual(m2_module._review_choice(scores, noise, contributions), "探索靈氣")
        self.assertEqual(m2_module._review_choice(scores, noise, contributions, "m2:1:1"), "服務社群")
        self.assertEqual(m2_module._review_choice(scores, noise, contributions, "m2:1:2"), "探索靈氣")
        # a clear winner stays the winner even without the event, so that event is not decisive
        scores["探索靈氣"] = 1.9
        self.assertEqual(m2_module._review_choice(scores, noise, contributions, "m2:1:1"), "探索靈氣")

    def test_rest_progress_is_the_current_review_window_and_never_exceeds_its_target(self):
        world = new_world(0)
        seen = set()
        for _ in range(60):
            advance(world)
            for p in world["people"].values():
                goal = p["goals"][0]
                if p["alive"] and goal["type"] == "穩定生活":
                    self.assertEqual(goal["target"], m2_module.REST_WINDOW_MONTHS)
                    self.assertLessEqual(goal["progress"], goal["target"])
                    self.assertEqual(goal["progress"], world["month"] - (p["plan"]["review_month"] - goal["target"]))
                    seen.add(goal["progress"])
        # month-end values: 0 right after a stay/entry, then 1..3; the review month itself ends in a stay (0) or an exit
        self.assertEqual(seen, {0, 1, 2, 3})
        old = new_world(0, "0.2.1")
        for _ in range(60):
            advance(old)
        self.assertTrue(all(p["goals"][0]["target"] % 6 == 0 and "goal_reviews" not in p
                            for p in old["people"].values() if p["goals"][0]["type"] == "穩定生活"),
                        "0.2.1 keeps its original +6 rest target and gets no goal_reviews")

    def test_goal_review_cannot_use_events_of_the_deciding_month(self):
        world = self._due_rest_world(7, **{"探索": 1.0})
        seen = []
        real = m2_module._goal_review_scores

        def spy(frozen, goal, parent_type, month, snapshot_month, event_lookup, excluded):
            seen.append((month, snapshot_month, {e["month"] for e in event_lookup.values()}))
            return real(frozen, goal, parent_type, month, snapshot_month, event_lookup, excluded)

        with mock.patch.object(m2_module, "_goal_review_scores", spy):
            advance(world)
        month, snapshot_month, event_months = seen[0]
        self.assertEqual((month, snapshot_month), (1, 0))
        self.assertTrue(all(m <= snapshot_month for m in event_months))
        # an event recorded in the deciding month, even a 發現 for the same person, is not in the lookup
        self.assertTrue(any(e["month"] == 1 for e in world["events"]))

    def test_completion_leads_to_rest_then_review_leaves_without_repeating_the_completed_label(self):
        world = new_world(7)
        found = None
        for _ in range(60):
            advance(world)
            for p in world["people"].values():
                ids = {g["id"] for g in p["goal_history"] if g.get("transition_kind") == "complete_rest"}
                if any(g.get("transition_kind") == "rest_exit" and g["parent_goal_id"] in ids for g in p["goal_history"] + p["goals"]):
                    found = p
                    break
            if found:
                break
        self.assertIsNotNone(found)
        history = found["goal_history"] + found["goals"]
        by_id = {g["id"]: g for g in history}
        rest, moved = next((g, c) for g in history if g.get("transition_kind") == "complete_rest"
                           for c in history if c.get("parent_goal_id") == g["id"])
        self.assertEqual((rest["type"], by_id[rest["parent_goal_id"]]["status"]), ("穩定生活", "completed"))
        self.assertEqual(moved["transition_kind"], "rest_exit")
        self.assertNotEqual(moved["type"], by_id[rest["parent_goal_id"]]["type"])
        self.assertEqual(by_id[rest["id"]]["status"], "replaced")
        review = next(r for r in found["goal_reviews"] if r["goal_id"] == rest["id"] and r["outcome"] == "轉向")
        event = next(e for e in world["events"] if e["event_id"] == review["event_id"])
        self.assertEqual((event["kind"], event["effects"]["parent_goal_id"], event["month"]), ("目標轉向", rest["id"], review["month"]))
        self.assertIn(by_id[rest["parent_goal_id"]]["type"], review["excluded"])
        validate(world)

    def test_rest_is_not_absorbing_in_0_2_2_but_is_in_0_2_1(self):
        def rest_share(version):
            world = new_world(11, version)
            for _ in range(40):
                advance(world)
            people = [p for p in world["people"].values() if p["alive"]]
            return sum(p["goals"][0]["type"] == "穩定生活" for p in people) / len(people), world
        old_share, old = rest_share("0.2.1")
        new_share, new = rest_share("0.2.2")
        self.assertGreater(old_share, .85)
        self.assertLess(new_share, .5)
        self.assertNotIn("goal_reviews", next(iter(old["people"].values())))
        self.assertTrue(any(p["goal_reviews"] for p in new["people"].values()))

    def test_same_seed_same_version_is_deterministic(self):
        a, b = new_world(23), new_world(23)
        for _ in range(30):
            advance(a)
            advance(b)
        self.assertEqual(canonical_hash(a), canonical_hash(b))

    def test_validate_rejects_forged_goal_review_records(self):
        world = new_world(7)
        for _ in range(24):
            advance(world)
        person = next(p for p in world["people"].values() if p["goal_reviews"])
        for forge in (lambda r: r.update(event_id="m2:99:99", outcome="轉向"),
                      lambda r: r.update(outcome="留任休整", event_id=world["events"][0]["event_id"]),
                      lambda r: r.update(goal_id="g:no:such"),
                      lambda r: r.update(month=world["month"] + 1),
                      lambda r: r.update(chosen="古武")):
            with self.subTest(forge=forge):
                bad = copy.deepcopy(world)
                forge(bad["people"][str(person["id"])]["goal_reviews"][0])
                with self.assertRaises(ValueError):
                    validate(bad)
        bad = copy.deepcopy(world)
        goal = bad["people"][str(person["id"])]["goals"][0]
        goal["parent_goal_id"] = "g:no:such"
        with self.assertRaises(ValueError):
            validate(bad)
        bad = copy.deepcopy(world)
        target = bad["people"][str(person["id"])]
        target["goal_history"].append(copy.deepcopy(target["goals"][0]))
        with self.assertRaises(ValueError):
            validate(bad)

    def test_old_rules_versions_do_not_get_goal_review_fields(self):
        for version in ("0.2.0", "0.2.1"):
            world = new_world(5, version)
            for _ in range(12):
                advance(world)
            self.assertFalse(any("goal_reviews" in p for p in world["people"].values()), version)
            self.assertFalse(any(g.get("transition_kind") for p in world["people"].values()
                                 for g in p["goal_history"] + p["goals"]), version)


if __name__ == "__main__":
    unittest.main()
