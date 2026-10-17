"""Read-only audit for Issue #37:
1. Verify M1 -> M2 `progress >= 3` organization event omission across dev seeds 0..29 (100 NPCs x 60 months)
   and quantify its impact on world events, personal chronicles, event_id numbering, canonical_hash, and decisions.
2. Measure 60-month player character trajectories across archetypes (positive & negative examples) to ground
   the minimal traceable identity/job transition and organization membership specification.

Does not touch holdout seeds (>= 30) and does not modify any engine/m2/store code or saved worlds.
"""
import copy
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from earth_ascension import engine, m2

DEV_SEEDS = list(range(30))
MONTHS = 60

PLAYER_PROFILES = {
    "scholar": {
        "name": "林知夏",
        "district": "學園",
        "goal": "探索靈氣",
        "budget": 30,
        "traits": {"根骨": 5, "悟性": 8, "意志": 5, "感知": 7, "社交": 5},
        "answers": [5, 4, 3, 3, 4, 5, 2, 3, 5, 4, 3, 3, 4, 5, 3, 3],
    },
    "builder": {
        "name": "陳實幹",
        "district": "工業灣",
        "goal": "累積財富",
        "budget": 30,
        "traits": {"根骨": 6, "悟性": 6, "意志": 8, "感知": 5, "社交": 5},
        "answers": [3, 5, 3, 3, 5, 2, 5, 3, 3, 5, 3, 3, 5, 2, 5, 3],
    },
    "community": {
        "name": "黃溫言",
        "district": "舊城",
        "goal": "服務社群",
        "budget": 30,
        "traits": {"根骨": 5, "悟性": 5, "意志": 6, "感知": 6, "社交": 8},
        "answers": [3, 3, 5, 5, 4, 3, 4, 5, 3, 3, 5, 5, 4, 3, 4, 5],
    },
    "unqualified_student": {
        "name": "張緩步",
        "district": "丘陵",
        "goal": "探索靈氣",
        "budget": 30,
        "traits": {"根骨": 8, "悟性": 3, "意志": 8, "感知": 3, "社交": 8},
        "answers": [2, 5, 2, 3, 5, 2, 5, 3, 2, 5, 2, 3, 5, 2, 5, 3],
    },
}


def advance_with_org_events(world):
    """Counterfactual M2 monthly advance that restores the M1 `if progress >= 3:` organization event
    immediately before the monthly world summary event. Used only in-memory for impact measurement.
    """
    m2.advance(world)
    world_ev = world["events"].pop()
    assert world_ev["kind"] == "世界"
    for org in world["organizations"].values():
        researchers = [world["people"][str(i)] for i in org["members"] if world["people"][str(i)]["alive"]]
        progress = sum(p["skills"]["研究"] for p in researchers) // 30
        if progress >= 3:
            m2._event(world, "組織", None, f"{org['name']} 研究進展 {progress}",
                      [f"活躍會員 {len(researchers)}", "會員研究技能累計"])
    world_ev["event_id"] = f"m2:{world['month']}:{len(world['events'])}"
    world["events"].append(world_ev)
    m2.validate(world)
    return [e for e in world["events"] if e["month"] == world["month"] and e.get("event_id", "").startswith("m2:")]


def add_player_in_memory(world, spec):
    pid = world["next_id"]
    world["next_id"] += 1
    profile = engine.score_answers(spec["answers"])
    person = engine.make_person(pid, spec["name"], spec["district"], spec["traits"], spec["budget"],
                                profile, spec["goal"], 20, "學生", True)
    m2.upgrade_person(person, world)
    world["people"][str(pid)] = person
    ev = {"month": world["month"], "kind": "投放", "subject": pid,
          "text": f"{spec['name']} 於 {spec['district']} 投放世界",
          "causes": [f"玩家創建；能力模式 {spec['budget']} 點"], "important": True,
          "event_id": f"m2:{world['month']}:{len(world['events'])}", "actor": pid,
          "target": None, "effects": {"budget": spec["budget"]}, "causal_event_ids": []}
    world["events"].append(ev)
    person["chronicle"].append(ev)
    return pid


def audit_part1_org_events():
    seed_summaries = []
    org_trigger_totals = {str(i): 0 for i in range(1, 6)}
    action_mismatch_seeds = 0
    goal_mismatch_seeds = 0
    memory_order_mismatch_seeds = 0
    first_diverge_months = []

    for seed in DEV_SEEDS:
        w_base = m2.new_world(seed=seed)
        w_cf = m2.new_world(seed=seed)
        first_diverge = None
        org_triggers_this_seed = 0
        first_trigger_month = None
        action_mismatch = False
        goal_mismatch = False
        memory_mismatch = False

        for month in range(1, MONTHS + 1):
            # Count how many orgs hit progress >= 3 in baseline this month
            m2.advance(w_base)
            advance_with_org_events(w_cf)

            for oid, org in w_base["organizations"].items():
                researchers = [w_base["people"][str(i)] for i in org["members"] if w_base["people"][str(i)]["alive"]]
                progress = sum(p["skills"]["研究"] for p in researchers) // 30
                if progress >= 3:
                    org_triggers_this_seed += 1
                    org_trigger_totals[oid] += 1
                    if first_trigger_month is None:
                        first_trigger_month = month

            if first_diverge is None and m2.canonical_hash(w_base) != m2.canonical_hash(w_cf):
                first_diverge = month

            for pid in w_base["people"]:
                pb = w_base["people"][pid]
                pc = w_cf["people"][pid]
                if (pb["last_action"] and pb["last_action"]["action"]) != (pc["last_action"] and pc["last_action"]["action"]):
                    action_mismatch = True
                if pb["goals"][0]["type"] != pc["goals"][0]["type"] or pb["goals"][0]["progress"] != pc["goals"][0]["progress"]:
                    goal_mismatch = True
                # Compare memory observed_month + importance sequence
                mb = [(m["observed_month"], m["importance"]) for m in pb["memories_v2"]]
                mc = [(m["observed_month"], m["importance"]) for m in pc["memories_v2"]]
                if mb != mc:
                    memory_mismatch = True

        first_diverge_months.append(first_diverge)
        if action_mismatch:
            action_mismatch_seeds += 1
        if goal_mismatch:
            goal_mismatch_seeds += 1
        if memory_mismatch:
            memory_order_mismatch_seeds += 1

        # Count how many non-org events in w_cf had a different event_id than in w_base
        base_non_org = [(e["month"], e["kind"], e["actor"], e["text"], e["event_id"]) for e in w_base["events"]]
        cf_non_org = [(e["month"], e["kind"], e["actor"], e["text"], e["event_id"])
                      for e in w_cf["events"] if e["kind"] != "組織"]
        shifted_event_ids = sum(1 for b, c in zip(base_non_org, cf_non_org) if b[4] != c[4])
        chronicle_diff = sum(
            len(w_cf["people"][pid]["chronicle"]) - len(w_base["people"][pid]["chronicle"])
            for pid in w_base["people"]
        )

        seed_summaries.append({
            "seed": seed,
            "org_events_omitted": org_triggers_this_seed,
            "first_trigger_month": first_trigger_month,
            "first_hash_diverge_month": first_diverge,
            "base_total_events": len(w_base["events"]),
            "cf_total_events": len(w_cf["events"]),
            "shifted_non_org_event_ids": shifted_event_ids,
            "shifted_ratio": round(shifted_event_ids / len(base_non_org), 4),
            "personal_chronicle_diff": chronicle_diff,
        })

    return {
        "seeds_count": len(DEV_SEEDS),
        "org_events_per_seed_min": min(s["org_events_omitted"] for s in seed_summaries),
        "org_events_per_seed_mean": round(sum(s["org_events_omitted"] for s in seed_summaries) / len(seed_summaries), 1),
        "org_events_per_seed_max": max(s["org_events_omitted"] for s in seed_summaries),
        "org_events_total_30_seeds": sum(s["org_events_omitted"] for s in seed_summaries),
        "org_trigger_totals_by_org": org_trigger_totals,
        "first_trigger_month_min": min(s["first_trigger_month"] for s in seed_summaries),
        "first_trigger_month_max": max(s["first_trigger_month"] for s in seed_summaries),
        "first_hash_diverge_month_min": min(first_diverge_months),
        "first_hash_diverge_month_max": max(first_diverge_months),
        "shifted_event_ids_mean": round(sum(s["shifted_non_org_event_ids"] for s in seed_summaries) / len(seed_summaries), 1),
        "shifted_ratio_mean": round(sum(s["shifted_ratio"] for s in seed_summaries) / len(seed_summaries), 4),
        "personal_chronicle_diff_total": sum(s["personal_chronicle_diff"] for s in seed_summaries),
        "action_mismatch_seeds": action_mismatch_seeds,
        "goal_mismatch_seeds": goal_mismatch_seeds,
        "memory_order_mismatch_seeds": memory_order_mismatch_seeds,
        "seed_0_sample": seed_summaries[0],
    }


def evaluate_candidate_transition(person):
    """Evaluate when a player character first satisfies a strict, event-sourced transition rule:
    - Must have completed at least one non-rest goal (`goal_history` has entry with `stop_reason == 'target_reached'`),
      linked to its `'目標完成'` event (`e['kind'] == '目標完成'` and `e['effects']['goal_id'] == g['id']`) in `person['chronicle']`.
    - Checked at annual/review boundaries (`months_lived >= 12`), requiring domain skill threshold >= 12.
    Returns dict describing whether/when transition triggers, job, org_id, and causal_event_ids.
    """
    if person["months_lived"] < 12:
        return None
    completion_events = {
        e.get("effects", {}).get("goal_id"): e["event_id"]
        for e in person["chronicle"]
        if e.get("kind") == "目標完成" and e.get("event_id")
    }
    completed = [
        g for g in person["goal_history"]
        if g.get("stop_reason") == "target_reached" and g["id"] in completion_events
    ]
    if not completed:
        return None
    skills = person["skills"]
    for goal_rec in completed:
        gtype = goal_rec["type"]
        ev_id = completion_events[goal_rec["id"]]
        if gtype == "探索靈氣" and skills["研究"] >= 12:
            disc_ids = [k["source_event_id"] for k in person["knowledge_v2"] if k["fact_id"] == "practice_basis"][:1]
            return {"job": "研究員", "org_id": 1, "org_name": "市立新現象研究所",
                    "trigger_goal_id": goal_rec["id"], "trigger_event_ids": [ev_id] + disc_ids,
                    "criterion": "完成「探索靈氣」目標（目標完成事件）且研究技能 ≥ 12"}
        if gtype == "累積財富" and skills["工作"] >= 12:
            return {"job": "工程師" if person["district"] == "工業灣" else "商務",
                    "org_id": 3, "org_name": "灣區產業協會",
                    "trigger_goal_id": goal_rec["id"], "trigger_event_ids": [ev_id],
                    "criterion": "完成「累積財富」目標（目標完成事件）且工作技能 ≥ 12"}
        if gtype == "服務社群" and (skills["社交"] + skills["工作"]) >= 12:
            org_id, org_name, job = (
                (2, "河港醫療聯盟", "醫護") if person["district"] == "河港"
                else (5, "學園教育網", "教師") if person["district"] == "學園"
                else (4, "舊城互助會", "服務業")
            )
            return {"job": job, "org_id": org_id, "org_name": org_name,
                    "trigger_goal_id": goal_rec["id"], "trigger_event_ids": [ev_id],
                    "criterion": "完成「服務社群」目標（目標完成事件）且（社交＋工作技能）≥ 12"}
        if gtype == "建立關係" and skills["社交"] >= 12:
            org_id, org_name, job = (
                (5, "學園教育網", "行政") if person["district"] == "學園"
                else (4, "舊城互助會", "行政")
            )
            return {"job": job, "org_id": org_id, "org_name": org_name,
                    "trigger_goal_id": goal_rec["id"], "trigger_event_ids": [ev_id],
                    "criterion": "完成「建立關係」目標（目標完成事件）且社交技能 ≥ 12"}
    return None


def audit_part2_player_paths():
    results = {}
    for key, spec in PLAYER_PROFILES.items():
        qualified_seeds = 0
        first_qualified_months = []
        final_skills_sum = {"工作": 0, "研究": 0, "社交": 0, "修習": 0}
        completed_goals_total = 0
        setback_goals_total = 0
        seed2026_case = None

        for seed in DEV_SEEDS + [2026]:
            w = m2.new_world(seed=seed)
            pid = add_player_in_memory(w, spec)
            first_transition = None
            for m in range(1, MONTHS + 1):
                m2.advance(w)
                p = w["people"][str(pid)]
                if first_transition is None and m >= 12:
                    cand = evaluate_candidate_transition(p)
                    if cand is not None:
                        first_transition = {"month": m, **cand, "skills_at_transition": dict(p["skills"])}
            p = w["people"][str(pid)]
            if seed in DEV_SEEDS:
                if first_transition is not None:
                    qualified_seeds += 1
                    first_qualified_months.append(first_transition["month"])
                for sk, val in p["skills"].items():
                    final_skills_sum[sk] += val
                completed_goals_total += sum(1 for g in p["goal_history"] if g.get("stop_reason") == "target_reached")
                setback_goals_total += sum(1 for g in p["goal_history"] if g.get("stop_reason") == "stalled_setback")
            if seed == 2026:
                completion_events = {
                    e.get("effects", {}).get("goal_id"): e["event_id"]
                    for e in p["chronicle"]
                    if e.get("kind") == "目標完成" and e.get("event_id")
                }
                seed2026_case = {
                    "name": p["name"],
                    "district": p["district"],
                    "initial_goal": spec["goal"],
                    "final_age": p["age"],
                    "current_0_2_2_job": p["job"],
                    "current_0_2_2_in_any_org": any(pid in o["members"] for o in w["organizations"].values()),
                    "final_skills": dict(p["skills"]),
                    "goal_history": [
                        {"id": g["id"], "type": g["type"], "started_month": g["started_month"],
                         "stop_reason": g.get("stop_reason"),
                         "completion_event_id": completion_events.get(g["id"]),
                         "trigger_event_id": g.get("trigger_event_id")}
                        for g in p["goal_history"]
                    ],
                    "candidate_transition": first_transition,
                }

        results[key] = {
            "qualified_seeds_out_of_30": qualified_seeds,
            "first_qualified_month_median": (
                sorted(first_qualified_months)[len(first_qualified_months) // 2] if first_qualified_months else None
            ),
            "first_qualified_month_range": (
                [min(first_qualified_months), max(first_qualified_months)] if first_qualified_months else None
            ),
            "mean_final_skills": {k: round(v / len(DEV_SEEDS), 1) for k, v in final_skills_sum.items()},
            "mean_completed_goals": round(completed_goals_total / len(DEV_SEEDS), 2),
            "mean_setback_goals": round(setback_goals_total / len(DEV_SEEDS), 2),
            "seed2026_case": seed2026_case,
        }
    return results


def main():
    part1 = audit_part1_org_events()
    part2 = audit_part2_player_paths()
    summary = {"part1_org_events": part1, "part2_player_paths": part2}
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
