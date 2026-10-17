"""Recheck review issues against code and seed-7 states; no world modifications."""
import json
import sqlite3
import tempfile
from collections import Counter
from pathlib import Path

from earth_ascension.m2 import _event, _remember, advance, new_world
from earth_ascension.store import Store


def main():
    world = new_world(7)
    for _ in range(60):
        advance(world)
    living = [p for p in world["people"].values() if p["alive"]]
    memories = [m for p in living for m in p["memories_v2"]]
    drift = [max(abs(p["profile_current"][k] - p["profile_base"][k]) for k in p["profile_current"])
             for p in living]
    total_drift = [sum(abs(p["profile_current"][k] - p["profile_base"][k])
                       for k in p["profile_current"]) for p in living]
    fixture = new_world(7)
    fixture["month"] = 13
    p = fixture["people"]["1"]
    p["memories_v2"] = []
    for i in range(24):
        e = _event(fixture, "發現", 1, f"old {i}", important=True)
        e["month"] = 0
        _remember(p, e, 3)
    fresh = _event(fixture, "關係挫折", 1, "new setback", important=True)
    _remember(p, fresh, 2)
    with tempfile.TemporaryDirectory() as d:
        db_path = Path(d) / "issue-audit.sqlite3"
        store = Store(db_path)
        with store._connect() as db:
            state, digest = store._encode(new_world(7))
            db.execute("UPDATE snapshots SET state=? WHERE month=0", (state,))
            db.execute("UPDATE meta SET value=? WHERE key='state_hash:0'", (digest,))
        sizes = {}
        for month in range(60):
            store.advance(month)
            if month + 1 in (12, 36, 60):
                with sqlite3.connect(db_path) as db:
                    sizes[month + 1] = db.execute("SELECT length(CAST(state AS BLOB)) FROM snapshots WHERE month=?",
                                                  (month + 1,)).fetchone()[0]
        result = {"seed": 7, "month": 60, "living": len(living),
                  "goal_distribution": dict(Counter(p["goals"][0]["type"] for p in living)),
                  "active_memories": len(memories),
                  "memory_older_than_12": sum(60 - m["observed_month"] > 12 for m in memories),
                  "fresh_importance2_retained_in_full_old3_fixture": any(m["event_id"] == fresh["event_id"]
                                                                    for m in p["memories_v2"]),
                  "max_dimension_drift": max(drift), "mean_max_dimension_drift": sum(drift) / len(drift),
                  "max_total_drift": max(total_drift), "mean_total_drift": sum(total_drift) / len(total_drift),
                  "people_with_profile_changes": sum(bool(p["profile_changes"]) for p in living),
                  "snapshot_bytes": sizes, "sqlite_bytes": db_path.stat().st_size}
    Path(__file__).with_name("m2-issue-audit-raw.json").write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(result)


if __name__ == "__main__":
    main()
