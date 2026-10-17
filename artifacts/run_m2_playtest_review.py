"""Reproduce the synthetic M2 player path used in the playtest review.

Only a temporary SQLite database is created. No existing save is read or changed.
Run from the repository root:
    PYTHONPATH=. python3 artifacts/run_m2_playtest_review.py --out artifacts/m2-playtest-seed2026.json
"""

import argparse
import json
import tempfile
from pathlib import Path

from earth_ascension import m2
from earth_ascension.store import Store


BASE_COMMIT = "e92cee6b889f49b0ccbddf6881b32bed8637086c"
PLAYER_INPUT = {
    "name": "測試旅人",
    "district": "學園",
    "goal": "探索靈氣",
    "budget": 30,
    "traits": {"根骨": 6, "悟性": 6, "意志": 6, "感知": 6, "社交": 6},
    "answers": [3] * 16,
}


def reproduce():
    with tempfile.TemporaryDirectory(prefix="earth-ascension-playtest-") as directory:
        store = Store(Path(directory) / "sample.sqlite3")
        start = store.read()
        assert start["seed"] == 2026 and start["rules_version"] == "0.2.2"
        created = store.create_character(PLAYER_INPUT)
        actor_id = str(created["id"])
        assert actor_id == "101"
        initial = store.read()
        months = []
        for expected_month in range(60):
            world, _ = store.advance(expected_month)
            person = world["people"][actor_id]
            decision = person["last_decision"]
            goal = person["goals"][0]
            months.append({
                "month": world["month"],
                "action": decision["action"],
                "decision_goal": decision["goal_label"],
                "decision_goal_id": decision["goal_id"],
                "plan_step": decision["plan_step"],
                "scores": decision["scores"],
                "noise": decision["noise"],
                "memory_event_ids": decision["memory_event_ids"],
                "outcome_event_ids": decision["outcome_event_ids"],
                "month_end_goal": goal["type"],
                "month_end_goal_id": goal["id"],
                "progress": goal["progress"],
                "target": goal["target"],
                "wealth": person["wealth"],
                "health": person["health"],
                "alive": person["alive"],
            })
        final = store.read()
        person = final["people"][actor_id]
        referenced = {
            event_id for month in months
            for event_id in month["memory_event_ids"] + month["outcome_event_ids"]
        }
        for review in person["goal_reviews"]:
            referenced.update(c["event_id"] for c in review["contributions"])
            referenced.update(review["cause_event_ids"])
        for event in final["events"]:
            if event.get("actor") == created["id"] and event["kind"] in ("目標完成", "目標轉向", "目標受挫"):
                referenced.add(event["event_id"])
        events = [
            {key: event.get(key) for key in ("event_id", "month", "kind", "actor", "target", "causes", "effects")}
            for event in final["events"] if event.get("event_id") in referenced
        ]
        assert len({event["event_id"] for event in events}) == len(referenced)
        return {
            "source_commit": BASE_COMMIT,
            "seed": 2026,
            "rules_version": "0.2.2",
            "sample_kind": "synthetic project QA; not a user's save",
            "player_input": PLAYER_INPUT,
            "player_id": created["id"],
            "initial_profile": created["profile_current"],
            "month_0_hash_after_creation": m2.canonical_hash(initial),
            "month_60_hash": m2.canonical_hash(final),
            "months": months,
            "goal_reviews": person["goal_reviews"],
            "goal_history": person["goal_history"],
            "referenced_events": events,
        }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    payload = json.dumps(reproduce(), ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if args.out:
        args.out.write_text(payload, encoding="utf-8")
        print(args.out)
    else:
        print(payload, end="")


if __name__ == "__main__":
    main()
