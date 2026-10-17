"""Read-only counterfactual paired experiment for Issue #36 (complementary to #45 baseline).

Evaluates across dev seeds 0..29 (100 NPCs x 60 months) + player character 60-month paths:
- baseline: exact 0.2.2 rules
- arm_r: research skill -> personal discovery qualification rate (+min(0.10, skills['研究']*0.005), 待校準)
- arm_s: social skill -> setback reduction (-min(0.03, skills['社交']*0.002)) & trust bonus (+min(2, skills['社交']//10), 待校準)
- arm_p: bounded positive feedback & cost reduction for '修習' after knowing practice_basis (待校準)
- arm_rsp: combined arm_r + arm_s + arm_p

Does not modify any engine/m2/store code, does not touch holdout seeds (>= 30), and preserves 0.2.2 replay.
"""
import copy
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from earth_ascension import engine, m2

DEV_SEEDS = list(range(30))
MONTHS = 60
ARMS = ("baseline", "arm_r", "arm_s", "arm_p", "arm_rsp")

PLAYER_SPECS = {
    "scholar": {
        "name": "林知夏",
        "district": "學園",
        "goal": "探索靈氣",
        "budget": 30,
        "traits": {"根骨": 6, "悟性": 8, "意志": 5, "感知": 7, "社交": 4},
        "answers": [5, 4, 3, 3, 4, 5, 2, 3, 5, 4, 3, 3, 4, 5, 3, 3],
    },
    "neutral": {
        "name": "測試旅人",
        "district": "學園",
        "goal": "探索靈氣",
        "budget": 30,
        "traits": {"根骨": 6, "悟性": 6, "意志": 6, "感知": 6, "社交": 6},
        "answers": [4] * 16,
    },
}


def _intent_cf(person, snapshot, month, event_lookup, use_p=False):
    p = person
    goal = p["goals"][0]
    known = any(k["fact_id"] == "practice_basis" for k in p["knowledge_v2"])
    aura = snapshot["aura"][p["district"]] if p["traits"]["感知"] >= 6 else 0.25
    f, t = p["profile_current"], p["traits"]
    scores = {
        "工作": 1.2 + t["意志"] * 0.10 + f["盡責"] + (1 if p["wealth"] < 75 else 0),
        "學習": 0.9 + t["悟性"] * 0.10 + f["開放"],
        "社交": 0.8 + t["社交"] * 0.10 + f["外向"] + f["關懷"] * 0.3,
        "休息": 0.5 + (100 - p["health"]) * 0.045 + f["安全"] * 0.5,
        "研究": 0.2 + t["悟性"] * 0.09 + t["感知"] * 0.06 + f["探索"] + aura,
        "修習": 0.05 + t["根骨"] * 0.07 + f["探索"] * 0.4 + aura,
    }
    for action, kind in (("工作", "累積財富"), ("社交", "建立關係"), ("研究", "探索靈氣")):
        if goal["type"] == kind:
            scores[action] += 0.6
    if p["plan"]["action"] in scores and snapshot.get("ablation") != "no_plan":
        scores[p["plan"]["action"]] += 0.45
    if use_p and known and p["health"] >= 60:
        # Bounded positive feedback after practice_basis is known (待校準)
        scores["修習"] += 0.55 + min(0.25, p["skills"]["修習"] * 0.03)
        if goal["type"] == "探索靈氣":
            scores["修習"] += 0.25
    if p["health"] < 35:
        scores["研究"] -= 1
        scores["修習"] -= 1
    memory_ids = []
    for memory, event in ([] if snapshot.get("ablation") == "no_memory" else m2._visible_memories(p, event_lookup, snapshot["month"])):
        age = month - memory["observed_month"]
        if age > m2.MEMORY_EFFECT_MONTHS:
            continue
        if event["kind"] == "發現":
            scores["研究"] += 0.35
            memory_ids.append(event["event_id"])
        elif event["kind"] == "關係":
            scores["社交"] += 0.25
            memory_ids.append(event["event_id"])
        elif event["kind"] == "關係挫折":
            scores["社交"] -= 0.6
            memory_ids.append(event["event_id"])
        elif event["kind"] == "目標受挫":
            scores["研究"] -= 0.4
            memory_ids.append(event["event_id"])
    feasible = list(m2.ACTIONS)
    if not known:
        feasible.remove("修習")
    rng = m2.draw(snapshot["seed"], month, p["id"], "choice")
    noise = {action: rng.uniform(-0.9, 0.9) for action in m2.ACTIONS}
    action = max(feasible, key=lambda a: (scores[a] + noise[a], -m2.ACTIONS.index(a)))
    peers = sorted((x for x in snapshot["people"].values() if x["alive"] and x["district"] == p["district"]
                    and x["id"] != p["id"]), key=lambda x: x["id"])
    target = None
    if action == "社交" and peers:
        target = max(peers, key=lambda x: (p["relationships_v2"].get(str(x["id"]), {}).get("trust", 0)
                                           + m2.draw(snapshot["seed"], month, p["id"], "peer", x["id"]).uniform(0, 30), -x["id"]))["id"]
    return {
        "actor": p["id"], "action": action, "target": target,
        "scores": {k: round(v, 3) for k, v in scores.items()},
        "noise": {k: round(v, 3) for k, v in noise.items()}, "feasible": feasible,
        "goal_id": goal["id"], "goal_label": goal["label"], "goal_progress": goal["progress"],
        "goal_target": goal["target"], "memory_event_ids": memory_ids, "state_month": snapshot["month"],
        "known_fact_ids": [k["fact_id"] for k in p["knowledge_v2"]],
        "constraints": [] if known else ["修習需要本人已知的可修習基礎"],
        "plan_step": p["plan"]["step"], "relationship_event_ids": [],
        "rng_draw_key": f"{snapshot['seed']}:{m2.RNG_NAMESPACE}:{month}:{p['id']}:choice",
    }


def advance_arm(world, arm="baseline"):
    if arm == "baseline":
        return m2.advance(world), {"qualified_count": 0}
    use_r = arm in ("arm_r", "arm_rsp")
    use_s = arm in ("arm_s", "arm_rsp")
    use_p = arm in ("arm_p", "arm_rsp")

    m2._check_compatible(world)
    month = world["month"] + 1
    world["month"] = month
    for district in m2.DISTRICTS:
        r = m2.draw(world["seed"], month, district, "aura")
        world["aura"][district] = round(min(0.95, max(0.02, world["aura"][district] + 0.012 + r.uniform(-0.025, 0.025))), 3)

    snapshot = {
        "seed": world["seed"], "month": month - 1, "aura": dict(world["aura"]),
        "ablation": world.get("ablation"),
        "people": {
            key: {field: copy.deepcopy(value) for field, value in person.items()
                  if field in ("id", "alive", "district", "traits", "profile_current", "wealth", "health",
                               "goals", "plan", "knowledge_v2", "memories_v2", "relationships_v2", "need", "known", "skills")}
            for key, person in world["people"].items()
        },
    }
    event_lookup = {e.get("event_id"): e for e in world["events"]}
    intents = [_intent_cf(p, snapshot, month, event_lookup, use_p=use_p)
               for p in sorted(snapshot["people"].values(), key=lambda p: p["id"]) if p["alive"]]

    contenders = {}
    for intent in intents:
        if intent["action"] != "研究":
            continue
        p = snapshot["people"][str(intent["actor"])]
        skill_bonus = min(0.10, p["skills"]["研究"] * 0.005) if use_r else 0.0
        chance = min(0.55, 0.03 + p["traits"]["悟性"] * 0.018 + p["traits"]["感知"] * 0.01
                     + world["aura"][p["district"]] * 0.12 + skill_bonus)
        if m2.draw(world["seed"], month, p["id"], "discovery").random() < chance:
            contenders.setdefault(p["district"], []).append(p["id"])
    winners = {min(ids, key=lambda pid: m2.draw(world["seed"], month, district, "contest", pid).random())
               for district, ids in contenders.items()}
    qualified = {pid for ids in contenders.values() for pid in ids}

    social_effects, edge_deltas = {}, {}
    for intent in intents:
        actor, target = intent["actor"], intent["target"]
        if intent["action"] != "社交" or target is None:
            continue
        person, other = snapshot["people"][str(actor)], snapshot["people"][str(target)]
        mismatch = abs(person["profile_current"]["親和"] - other["profile_current"]["親和"])
        setback_prob = 0.04 + 0.10 * mismatch
        if use_s:
            setback_prob = max(0.01, setback_prob - min(0.03, person["skills"]["社交"] * 0.002))
        setback = m2.draw(world["seed"], month, actor, "social-outcome", target).random() < setback_prob
        known = next((k for k in person["knowledge_v2"] if k["fact_id"] == "practice_basis"), None)
        shared = bool(known and not any(k["fact_id"] == "practice_basis" for k in other["knowledge_v2"]) and not setback)
        social_effects[actor] = {"target": target, "setback": setback, "shared": shared,
                                 "source": known["source_event_id"] if shared else None}
        pos_gain = 5 + person["traits"]["社交"] + (min(2, person["skills"]["社交"] // 10) if use_s else 0)
        edge_deltas[(actor, target)] = edge_deltas.get((actor, target), 0) + (-5 if setback else pos_gain)
        edge_deltas[(target, actor)] = edge_deltas.get((target, actor), 0) + (-2 if setback else 3)

    milestone_actors = set()
    for (actor, target), delta in sorted(edge_deltas.items()):
        person = world["people"][str(actor)]
        edge = person["relationships_v2"].setdefault(str(target), {"trust": 0, "last_event_id": None, "last_interaction_month": None})
        before = edge["trust"]
        edge["trust"] = min(100, max(0, before + delta))
        edge["last_interaction_month"] = month
        person["relations"][str(target)] = edge["trust"]
        if before < 30 <= edge["trust"]:
            direct = social_effects.get(actor)
            reverse = social_effects.get(target)
            if direct and direct["target"] == target and not direct["setback"]:
                milestone_actors.add(actor)
            elif reverse and reverse["target"] == actor and not reverse["setback"]:
                milestone_actors.add(target)

    for intent in intents:
        p = world["people"][str(intent["actor"])]
        action = intent["action"]
        p["months_lived"] += 1
        if p["months_lived"] % 12 == 0:
            p["age"] += 1
        outcome, discovery, social_state = "", None, None
        if action == "工作":
            earned = 13 + p["traits"]["意志"] + p["skills"]["工作"]
            p["wealth"] += earned
            p["skills"]["工作"] += 1
            p["health"] = max(0, p["health"] - 1)
            outcome = f"收入 {earned}，工作技能提升"
        elif action == "學習":
            p["skills"]["工作"] += 1
            p["wealth"] = max(0, p["wealth"] - 4)
            outcome = "工作技能提升，支出 4"
        elif action == "社交":
            target = intent["target"]
            p["skills"]["社交"] += 1
            if target is not None:
                other = world["people"][str(target)]
                effect = social_effects[p["id"]]
                setback = effect["setback"]
                outcome = f"與 {other['name']} 交流不順，信任下降" if setback else f"與 {other['name']} 交流，信任增加"
                social_state = {**effect, "milestone": p["id"] in milestone_actors}
                if not setback:
                    p["experience_counts"]["social"] += 1
            else:
                outcome = "參加社區活動"
        elif action == "休息":
            p["health"] = min(100, p["health"] + 8)
            outcome = "健康恢復 8"
        elif action == "研究":
            p["skills"]["研究"] += 1
            p["wealth"] = max(0, p["wealth"] - 5)
            if p["id"] in winners:
                world["knowledge"] += 1
                finding = f"靈氣觀測紀錄 #{world['knowledge']}"
                p["known"].append(finding)
                discovery = m2._event(world, "發現", p["id"], f"{p['name']} 發現{finding}",
                                      effects={"fact_id": "practice_basis", "finding": finding}, important=True)
                p["knowledge_v2"].append({"fact_id": "practice_basis", "source_event_id": discovery["event_id"],
                                          "learned_month": month, "confidence": 1.0})
                m2._remember(p, discovery, 3, world["rules_version"])
                p["experience_counts"]["research"] += 1
                if p["experience_counts"]["research"] % 4 == 0 and world.get("ablation") != "no_personality_drift":
                    m2._change_profile(p, "探索", 0.01, discovery)
                outcome = f"取得{finding}，支出 5"
            else:
                outcome = ("同區成果競爭未獲優先紀錄，研究技能提升，支出 5" if p["id"] in qualified
                           else "未取得可重現結果，研究技能提升，支出 5")
        else:
            p["skills"]["修習"] += 1
            raw_cost = 2 + m2.draw(world["seed"], month, p["id"], "practice-cost").randrange(4)
            if use_p:
                cost = max(1, raw_cost - min(2, (p["skills"]["修習"] - 1) // 4))
                p["health"] = max(0, p["health"] - cost)
                if p["skills"]["修習"] % 4 == 0:
                    p["health"] = min(100, p["health"] + 3)
                    outcome = f"靈氣調息純熟，健康消耗 {cost} 並回氣 3"
                else:
                    outcome = f"試驗靈氣適應，健康消耗 {cost}"
            else:
                cost = raw_cost
                p["health"] = max(0, p["health"] - cost)
                outcome = f"試驗靈氣適應，健康消耗 {cost}"
        p["wealth"] = max(0, p["wealth"] - 7)
        p["need"] = "生計" if p["wealth"] == 0 else "健康" if p["health"] < 50 else "生活"
        if p["wealth"] == 0:
            p["health"] = max(0, p["health"] - 3)
        death = p["health"] == 0 or (p["age"] > 79 and m2.draw(world["seed"], month, p["id"], "mortality").random() < (p["age"] - 79) / 800)
        if death:
            p["alive"] = False
            death_event = m2._event(world, "死亡", p["id"], f"{p['name']} 離世", effects={"health": p["health"], "age": p["age"]}, important=True)
            m2._remember(p, death_event, 3, world["rules_version"])
        decision = {**intent, "resolution": "research_contested" if p["id"] in qualified - winners else "accepted",
                    "outcome_event_ids": []}
        event = m2._event(world, "行動", p["id"], f"{p['name']}：{action}；{outcome}",
                          causes=intent["memory_event_ids"], effects={"action": action, "outcome": outcome,
                                                                      "target": intent["target"]})
        decision["outcome_event_ids"] = [event["event_id"]]
        if social_state:
            target = social_state["target"]
            other = world["people"][str(target)]
            relation_event = event
            if social_state["setback"] or social_state["shared"] or social_state["milestone"]:
                relation_event = m2._event(world, "關係挫折" if social_state["setback"] else "關係", p["id"], outcome,
                                           causes=[social_state["source"]] if social_state["source"] else [event["event_id"]],
                                           target=target, effects={"trust": p["relationships_v2"][str(target)]["trust"],
                                                                   "shared_fact_id": "practice_basis" if social_state["shared"] else None},
                                           important=social_state["setback"] or social_state["milestone"])
                decision["outcome_event_ids"].append(relation_event["event_id"])
                decision["relationship_event_ids"].append(relation_event["event_id"])
                if relation_event["important"]:
                    m2._remember(p, relation_event, 2, world["rules_version"])
                    m2._remember(other, relation_event, 1, world["rules_version"])
            other["chronicle"].append(relation_event)
            p["relationships_v2"][str(target)]["last_event_id"] = relation_event["event_id"]
            other["relationships_v2"][str(p["id"])]["last_event_id"] = relation_event["event_id"]
            if social_state["shared"]:
                other["knowledge_v2"].append({"fact_id": "practice_basis", "source_event_id": relation_event["event_id"],
                                              "learned_month": month, "confidence": 1.0})
            if not social_state["setback"] and p["experience_counts"]["social"] % 8 == 0 and world.get("ablation") != "no_personality_drift":
                m2._change_profile(p, "外向", 0.01, relation_event)
        if discovery:
            decision["outcome_event_ids"].append(discovery["event_id"])
        p["last_decision"] = decision
        p["last_action"] = {"month": month, "action": action, "why": {"goal": p["goal"],
                            "need": snapshot["people"][str(p["id"])]["need"], "known": list(snapshot["people"][str(p["id"])]["known"]),
                            "aura_observed": snapshot["aura"][p["district"]] if p["traits"]["感知"] >= 6 else "未察覺",
                            "scores": intent["scores"]}, "outcome": outcome}
        if p["alive"]:
            decision["outcome_event_ids"].extend(m2._progress(p, intent, world, event, snapshot["people"][str(p["id"])], event_lookup))
    for org in world["organizations"].values():
        researchers = [world["people"][str(i)] for i in org["members"] if world["people"][str(i)]["alive"]]
        progress = sum(p["skills"]["研究"] for p in researchers) // 30
        org["research"] += progress
        org["resources"] = max(0, org["resources"] + len(researchers) // 10 - 1)
        org["activity"] = f"會員累計研究進展 +{progress}，維持服務"
    living = sum(p["alive"] for p in world["people"].values())
    world["trends"].append({"month": month, "living": living, "knowledge": world["knowledge"],
                            "aura": round(sum(world["aura"].values()) / 5, 3)})
    m2._event(world, "世界", None, f"第 {month} 月結算：{living} 名具名人物存活，靈氣知識 {world['knowledge']}",
              effects={"living": living, "knowledge": world["knowledge"]}, important=True)
    m2.validate(world)
    return [e for e in world["events"] if e["month"] == month and e.get("event_id", "").startswith("m2:")], {"qualified_count": len(qualified)}


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


def longest_streak(actions, target_action):
    best = cur = 0
    for a in actions:
        if a == target_action:
            cur += 1
            if cur > best:
                best = cur
        else:
            cur = 0
    return best


def _eval_arm(arm):
    action_counts = {a: 0 for a in m2.ACTIONS}
    total_person_months = 0
    known_person_months = 0
    known_practice_months = 0
    discoveries = 0
    contested_months = 0
    social_setbacks = 0
    social_milestones = 0
    social_shares = 0
    research_streaks_ge13_people = 0
    research_streaks_max = 0
    practice_users_ever = 0
    known_users_ever = 0
    final_health_sum = 0
    final_alive_count = 0

    for seed in DEV_SEEDS:
        w = m2.new_world(seed=seed)
        per_person_actions = {pid: [] for pid in w["people"]}
        for _ in range(MONTHS):
            advance_arm(w, arm=arm)
            for pid, p in w["people"].items():
                if p["last_action"] and p["last_action"]["month"] == w["month"]:
                    act = p["last_action"]["action"]
                    action_counts[act] += 1
                    total_person_months += 1
                    per_person_actions[pid].append(act)
                    if p["last_decision"] and "practice_basis" in p["last_decision"]["known_fact_ids"]:
                        known_person_months += 1
                        if act == "修習":
                            known_practice_months += 1
                    if p["last_decision"] and p["last_decision"].get("resolution") == "research_contested":
                        contested_months += 1

        discoveries += w["knowledge"]
        for e in w["events"]:
            if e.get("kind") == "關係挫折":
                social_setbacks += 1
            elif e.get("kind") == "關係":
                if e.get("effects", {}).get("shared_fact_id") == "practice_basis":
                    social_shares += 1
                if e.get("important") and not e.get("effects", {}).get("shared_fact_id"):
                    social_milestones += 1

        for pid, p in w["people"].items():
            acts = per_person_actions[pid]
            r_streak = longest_streak(acts, "研究")
            if r_streak >= 13:
                research_streaks_ge13_people += 1
            if r_streak > research_streaks_max:
                research_streaks_max = r_streak
            if any(k["fact_id"] == "practice_basis" for k in p["knowledge_v2"]):
                known_users_ever += 1
            if "修習" in acts:
                practice_users_ever += 1
            if p["alive"]:
                final_alive_count += 1
                final_health_sum += p["health"]

    pop_stat = {
        "total_person_months": total_person_months,
        "action_shares_pct": {a: round(action_counts[a] * 100.0 / total_person_months, 2) for a in m2.ACTIONS},
        "action_counts": action_counts,
        "known_person_months": known_person_months,
        "known_practice_months": known_practice_months,
        "known_practice_rate_pct": round(known_practice_months * 100.0 / max(1, known_person_months), 2),
        "known_users_ever_pct": round(known_users_ever * 100.0 / 3000, 2),
        "practice_users_ever_count": practice_users_ever,
        "practice_users_of_known_pct": round(practice_users_ever * 100.0 / max(1, known_users_ever), 2),
        "discoveries_per_seed": round(discoveries / len(DEV_SEEDS), 2),
        "research_contested_per_seed": round(contested_months / len(DEV_SEEDS), 2),
        "social_setbacks_per_seed": round(social_setbacks / len(DEV_SEEDS), 2),
        "social_shares_per_seed": round(social_shares / len(DEV_SEEDS), 2),
        "social_milestones_per_seed": round(social_milestones / len(DEV_SEEDS), 2),
        "research_streak_ge13_people": research_streaks_ge13_people,
        "research_streak_ge13_pct": round(research_streaks_ge13_people * 100.0 / 3000, 2),
        "research_streak_max": research_streaks_max,
        "mean_final_health_alive": round(final_health_sum / max(1, final_alive_count), 2),
        "final_alive_per_seed": round(final_alive_count / len(DEV_SEEDS), 2),
    }

    player_stat = {}
    for pkey, spec in PLAYER_SPECS.items():
        seed2026_summary = None
        dev_action_counts = {a: 0 for a in m2.ACTIONS}
        dev_discoveries = 0
        dev_streaks_ge13 = 0
        dev_practice_seeds = 0
        dev_health_sum = 0

        for seed in DEV_SEEDS + [2026]:
            w = m2.new_world(seed=seed)
            pid = add_player_in_memory(w, spec)
            acts = []
            for _ in range(MONTHS):
                advance_arm(w, arm=arm)
                p = w["people"][str(pid)]
                if p["last_action"] and p["last_action"]["month"] == w["month"]:
                    acts.append(p["last_action"]["action"])
            p = w["people"][str(pid)]
            p_disc = sum(1 for e in p["chronicle"] if e.get("kind") == "發現" and e.get("actor") == pid)
            r_streak = longest_streak(acts, "研究")
            if seed in DEV_SEEDS:
                for a in acts:
                    dev_action_counts[a] += 1
                dev_discoveries += p_disc
                if r_streak >= 13:
                    dev_streaks_ge13 += 1
                if "修習" in acts:
                    dev_practice_seeds += 1
                dev_health_sum += p["health"]
            if seed == 2026:
                seed2026_summary = {
                    "actions": {a: acts.count(a) for a in m2.ACTIONS},
                    "discoveries": p_disc,
                    "longest_research_streak": r_streak,
                    "final_skills": dict(p["skills"]),
                    "final_health": p["health"],
                    "final_wealth": p["wealth"],
                    "completed_goals": sum(1 for g in p["goal_history"] if g.get("stop_reason") == "target_reached"),
                }
        player_stat[pkey] = {
            "dev30_mean_actions": {a: round(dev_action_counts[a] / len(DEV_SEEDS), 2) for a in m2.ACTIONS},
            "dev30_mean_discoveries": round(dev_discoveries / len(DEV_SEEDS), 2),
            "dev30_research_streak_ge13_seeds": dev_streaks_ge13,
            "dev30_practice_active_seeds": dev_practice_seeds,
            "dev30_mean_final_health": round(dev_health_sum / len(DEV_SEEDS), 1),
            "seed2026": seed2026_summary,
        }
    return arm, pop_stat, player_stat


def main():
    from concurrent.futures import ProcessPoolExecutor
    assert m2.M2_VERSION == "0.2.2"
    pop = {}
    players = {pkey: {} for pkey in PLAYER_SPECS}
    with ProcessPoolExecutor(max_workers=len(ARMS)) as ex:
        for arm, pop_stat, player_stat in ex.map(_eval_arm, ARMS):
            pop[arm] = pop_stat
            for pkey, pstat in player_stat.items():
                players[pkey][arm] = pstat
    print(json.dumps({"population_dev30": pop, "player_paths": players}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
