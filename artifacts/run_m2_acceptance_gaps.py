"""Focused natural-event and goal-repeat audit, using the locked 0–29 seeds."""
import copy
import json
from collections import Counter, defaultdict
from pathlib import Path

from earth_ascension.m2 import _intent, advance, canonical_hash, new_world, validate

KINDS = {"發現": "研究", "關係挫折": "社交", "目標受挫": "研究"}
BASE = Path(__file__).parent
# Historical 0.2.0 acceptance evidence: hashes are locked in m2-experiments-raw.json, so pin the 0.2.0 rules.
RULES_VERSION = "0.2.0"


def run(seed, ablation=None):
    world = new_world(seed, RULES_VERSION)
    if ablation:
        world["ablation"] = ablation
    due = defaultdict(list)
    probes = []
    reasons = Counter()
    actions = Counter()
    repeat = Counter()
    alignment = Counter()
    examples = []
    previous = {}
    switches = []
    for month in range(1, 61):
        old_people = {int(k): copy.deepcopy(p) for k, p in world["people"].items()}
        old_events = {e["event_id"]: e for e in world["events"]}
        old_peers = {str(pid): {"id": pid, "alive": p["alive"], "district": p["district"]}
                     for pid, p in old_people.items()}
        events = advance(world)
        for event in events:
            if ablation is None and event["kind"] in KINDS and event["month"] <= 48:
                for horizon in (6, 12):
                    due[month + horizon].append((event["event_id"], event["subject"], event["kind"], horizon))
        if ablation is None:
            for event_id, actor, kind, horizon in due[month]:
                p = old_people.get(actor)
                row = {"seed": seed, "event_id": event_id, "kind": kind, "horizon": horizon,
                       "month": month, "actor": actor}
                if p is None or not p["alive"]:
                    row["status"] = "deceased"
                elif kind == "關係挫折" and not any(x["alive"] and x["district"] == p["district"]
                                                        and x["id"] != actor for x in old_peers.values()):
                    row["status"] = "no_social_peer"
                else:
                    snap = {"seed": seed, "month": month - 1, "aura": world["aura"],
                            "people": old_peers}
                    lookup = {**old_events, **{e["event_id"]: e for e in events}}
                    full = _intent(p, snap, month, lookup)
                    actual = world["people"][str(actor)]["last_decision"]
                    row["reproduced"] = all(full[k] == actual[k] for k in
                                            ("scores", "noise", "action", "target", "memory_event_ids"))
                    row["trace"] = event_id in actual["memory_event_ids"]
                    row["retained"] = any(m["event_id"] == event_id for m in p["memories_v2"])
                    without = copy.deepcopy(p)
                    without["memories_v2"] = [m for m in p["memories_v2"] if m["event_id"] != event_id]
                    removed = _intent(without, snap, month, lookup)
                    action = KINDS[kind]
                    row["score_delta"] = round(full["scores"][action] - removed["scores"][action], 3)
                    row["action_flipped"] = full["action"] != removed["action"]
                    unrelated = next((m for m in p["memories_v2"] if m["event_id"] != event_id
                                      and (lookup[m["event_id"]]["kind"] not in
                                           ("發現", "關係", "關係挫折", "目標受挫")
                                           or month - m["observed_month"] > 12)), None)
                    if unrelated:
                        without["memories_v2"] = [m for m in p["memories_v2"]
                                                  if m["event_id"] != unrelated["event_id"]]
                        control = _intent(without, snap, month, lookup)
                        row["unrelated_control"] = (control["scores"] == full["scores"]
                                                    and control["action"] == full["action"])
                    else:
                        row["unrelated_control"] = None
                    row["status"] = "eligible"
                probes.append(row)
                reasons[row["status"]] += 1
        for key, person in world["people"].items():
            pid = int(key)
            before = old_people[pid]
            decision = person["last_decision"]
            if not before["alive"] or not decision or decision["state_month"] != month - 1:
                continue
            action = decision["action"]
            actions[action] += 1
            alignment["eligible"] += 1
            alignment["aligned"] += action == before["plan"]["action"]
            gained = (person["wealth"] > before["wealth"] or person["health"] > before["health"]
                      or any(person["skills"][k] > before["skills"][k] for k in person["skills"])
                      or person["goals"][0]["progress"] > before["goals"][0]["progress"])
            prior_action, prior_streak, prior_run = previous.get(pid, (None, 0, 0))
            run_length = prior_run + 1 if action == prior_action else 1
            streak = (prior_streak + 1 if action == prior_action and not gained else
                      1 if not gained else 0)
            if streak >= 4:
                repeat["no_benefit_4plus_windows"] += 1
            if action == prior_action and gained:
                repeat["same_action_benefit"] += 1
            if action in ("工作", "研究") and run_length == 4:
                repeat[f"{action}_4plus_runs"] += 1
            if action in ("工作", "研究") and run_length >= 4 and gained and len(examples) < 20:
                examples.append({"seed": seed, "actor": pid, "month": month, "action": action,
                                 "run_length": run_length, "goal": decision["goal_label"],
                                 "reason": person["last_action"]["outcome"]})
            previous[pid] = (action, streak, run_length)
            if person["goals"][0]["id"] != before["goals"][0]["id"]:
                goal = person["goals"][0]
                switches.append({"seed": seed, "actor": pid, "month": month,
                                 "trigger": goal["trigger_event_id"],
                                 "review_due": month >= before["goals"][0]["review_month"],
                                 "source_exists": any(e["event_id"] == goal["trigger_event_id"]
                                                      for e in world["events"])})
    validate(world)
    completed = {e["effects"]["goal_id"]: e["month"] for e in world["events"]
                 if e["kind"] == "目標完成" and "goal_id" in e["effects"]}
    goal_durations = [completed.get(g["id"], world["month"]) - g["started_month"]
                      for p in world["people"].values() for g in p["goals"] + p["goal_history"]]
    return {"seed": seed, "hash": canonical_hash(world), "probes": probes, "probe_reasons": reasons,
            "actions": actions, "repeat": repeat, "alignment": alignment, "switches": switches,
            "goal_durations": goal_durations, "examples": examples}


def main():
    expected = json.loads((BASE / "m2-experiments-raw.json").read_text())
    full, no_plan = [], []
    for seed in range(30):
        b = run(seed)
        c = run(seed, "no_plan")
        assert b["hash"] == expected["groups"]["full"][seed]["hash"], (seed, "full hash")
        assert c["hash"] == expected["groups"]["no_plan"][seed]["hash"], (seed, "no_plan hash")
        full.append(b)
        no_plan.append(c)
        print(f"seed {seed}: {len(b['probes'])} natural probes; hashes match", flush=True)
    (BASE / "m2-acceptance-gaps-raw.json").write_text(json.dumps(
        {"full": full, "no_plan": no_plan}, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    main()
