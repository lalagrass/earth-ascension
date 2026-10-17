"""M2 rule policy. Decisions use one frozen monthly snapshot; effects commit later."""
import copy
import hashlib
import json
import random

from .engine import DISTRICTS, GOALS, initial_world, validate_traits

M2_VERSION = "0.2.1"  # rules version written to new and migrated worlds
SCHEMA_VERSION = 2
# Independent of the rules version: bump only to deliberately reshuffle every draw.
RNG_NAMESPACE = "0.2.0"
# (version, rules_version, schema_version, policy_mode) this code can load and advance.
# 0.2.0 saves keep replaying under 0.2.0 rules; see RULES_0_2_0_EVICTION.
COMPATIBLE = {(version, version, SCHEMA_VERSION, "m2_rules") for version in ("0.2.0", M2_VERSION)}
# 0.2.0 trimmed full memory by importance alone, even dropping still-effective memories (#2).
RULES_0_2_0_EVICTION = {"0.2.0"}
ACTIONS = ("工作", "學習", "社交", "休息", "研究", "修習")
PROFILE_KEYS = ("開放", "盡責", "外向", "親和", "穩定", "探索", "安全", "關懷")
PROFILE_WINDOW_MONTHS = 12
MEMORY_LIMIT = 24
MEMORY_EFFECT_MONTHS = 12  # a memory older than this no longer changes decision scores
PROFILE_WINDOW_CAP = .10  # A5 candidate cap (待校準); checked per dimension over any 12 consecutive months


def draw(seed, month, actor, purpose, target=""):
    key = f"{seed}:{RNG_NAMESPACE}:{month}:{actor}:{purpose}:{target}"
    return random.Random(int.from_bytes(hashlib.sha256(key.encode()).digest()[:8], "big"))


M2_MARKERS = ("schema_version", "rules_version", "policy_mode")


def is_m2_world(world):
    """True for any save carrying M2 version markers, even ones this code rejects.

    M1 saves have none of these keys, so anything else goes to the M2 validator and is refused
    there explicitly instead of falling into the M1 engine.
    """
    return any(key in world for key in M2_MARKERS)


def _check_compatible(world):
    key = (world.get("version"), world.get("rules_version"), world.get("schema_version"), world.get("policy_mode"))
    if key not in COMPATIBLE:
        raise ValueError("M2 規則或資料版本不相容")


def canonical_hash(world):
    return hashlib.sha256(json.dumps(world, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()


def _goal(person, kind=None):
    kind = kind or person["goal"]
    if kind not in GOALS:
        kind = "legacy_custom"
    return {"id": f"g:{person['id']}:0", "type": kind, "label": kind if kind in GOALS else person["goal"], "status": "active",
            "started_month": 0, "review_month": 4, "progress": 0, "target": 6,
            "trigger_event_id": None, "stop_reason": None}


def _step(kind):
    return {"探索靈氣": "研究", "建立關係": "社交", "累積財富": "工作",
            "服務社群": "社交", "穩定生活": "工作"}.get(kind, "工作")


def _step_label(kind):
    return {"探索靈氣": "累積研究紀錄", "建立關係": "維繫區域關係", "累積財富": "累積工作收入",
            "服務社群": "參與社區互動", "穩定生活": "維持工作與生計"}.get(kind, "維持生活")


def upgrade_person(person, world):
    goal = _goal(person)
    goal["started_month"] = world["month"]
    goal["review_month"] = world["month"] + 4
    person["goals"] = [goal]
    person["goal_history"] = []
    person["plan"] = {"goal_id": goal["id"], "step": _step_label(goal["type"]), "action": _step(goal["type"]),
                      "review_month": world["month"] + 4, "last_progress_month": world["month"]}
    person["profile_base"] = copy.deepcopy(person["profile"])
    person["profile_current"] = copy.deepcopy(person["profile"])
    person["profile_changes"] = []
    person["experience_counts"] = {"research": 0, "social": 0}
    person["memories_v2"] = []
    person["legacy_memories"] = list(person["memories"])
    person["knowledge_v2"] = []
    person["relationships_v2"] = {key: {"trust": value, "last_event_id": None,
                                        "last_interaction_month": None}
                                  for key, value in person["relations"].items()}
    person["last_decision"] = None
    # Only verified research events become known facts; old free text remains display-only.
    for event in world["events"]:
        if event["kind"] == "發現" and event["subject"] == person["id"] and "靈氣觀測紀錄 #" in event["text"]:
            person["knowledge_v2"].append({"fact_id": "practice_basis", "source_event_id": event["event_id"],
                                            "learned_month": event["month"], "confidence": 1.0})
            break
    return person


def upgrade_world(old, rules_version=None):
    """Upgrade a copied M1 snapshot. Earlier snapshots stay untouched in the database.

    rules_version (default M2_VERSION) is only for reproducing historical runs, e.g. the locked 0.2.0
    acceptance evidence; validate() rejects any version outside COMPATIBLE.
    """
    if old.get("version") != "0.1.0":
        raise ValueError("只接受 M1 0.1.0 存檔")
    rules_version = rules_version or M2_VERSION
    world = copy.deepcopy(old)
    world["version"] = rules_version
    world["rules_version"] = rules_version
    world["schema_version"] = SCHEMA_VERSION
    world["policy_mode"] = "m2_rules"
    for index, event in enumerate(world["events"]):
        event["event_id"] = f"legacy:{index}"
    for person in world["people"].values():
        upgrade_person(person, world)
        by_key = {(e["month"], e["kind"], e["subject"], e["text"]): e["event_id"] for e in world["events"]}
        for event in person["chronicle"]:
            event_id = by_key.get((event["month"], event["kind"], event["subject"], event["text"]))
            if event_id:
                event["event_id"] = event_id
    validate(world)
    return world


def new_world(seed=2026, rules_version=None):
    return upgrade_world(initial_world(seed), rules_version)


def _event(world, kind, actor, text, causes=(), target=None, effects=None, important=False):
    event = {"event_id": f"m2:{world['month']}:{len(world['events'])}", "month": world["month"],
             "kind": kind, "subject": actor, "actor": actor, "target": target, "text": text,
             "causes": list(causes), "causal_event_ids": [c for c in causes if isinstance(c, str) and c.startswith(("m2:", "legacy:"))],
             "effects": effects or {}, "important": important}
    world["events"].append(event)
    if actor is not None and str(actor) in world["people"]:
        world["people"][str(actor)]["chronicle"].append(event)
    return event


def _remember(person, event, importance=2, rules_version=M2_VERSION):
    person["memories_v2"].append({"event_id": event["event_id"], "observed_month": event["month"],
                                  "source": "experienced", "importance": importance,
                                  "expiry_or_review_month": event["month"] + 24})
    memories = sorted(person["memories_v2"], key=lambda x: (-x["importance"], -x["observed_month"], x["event_id"]))
    if len(memories) > MEMORY_LIMIT and rules_version not in RULES_0_2_0_EVICTION:
        # Evict memories that can no longer affect the next decision (made in month + 1) before any
        # still-effective one; the source event stays in world events and the chronicle.
        next_decision = event["month"] + 1
        keep = {m["event_id"] for m in sorted(memories, key=lambda x: (
            next_decision - x["observed_month"] > MEMORY_EFFECT_MONTHS,
            -x["importance"], -x["observed_month"], x["event_id"]))[:MEMORY_LIMIT]}
        memories = [m for m in memories if m["event_id"] in keep]
    person["memories_v2"] = memories[:MEMORY_LIMIT]


def _visible_memories(person, event_lookup, month):
    return [(m, event_lookup[m["event_id"]]) for m in person["memories_v2"]
            if m["event_id"] in event_lookup and m["observed_month"] <= month]


def _intent(person, snapshot, month, event_lookup):
    p = person
    goal = p["goals"][0]
    known = any(k["fact_id"] == "practice_basis" for k in p["knowledge_v2"])
    aura = snapshot["aura"][p["district"]] if p["traits"]["感知"] >= 6 else .25
    f, t = p["profile_current"], p["traits"]
    scores = {
        "工作": 1.2 + t["意志"]*.10 + f["盡責"] + (1 if p["wealth"] < 75 else 0),
        "學習": .9 + t["悟性"]*.10 + f["開放"],
        "社交": .8 + t["社交"]*.10 + f["外向"] + f["關懷"]*.3,
        "休息": .5 + (100-p["health"])*.045 + f["安全"]*.5,
        "研究": .2 + t["悟性"]*.09 + t["感知"]*.06 + f["探索"] + aura,
        "修習": .05 + t["根骨"]*.07 + f["探索"]*.4 + aura,
    }
    for action, kind in (("工作", "累積財富"), ("社交", "建立關係"), ("研究", "探索靈氣")):
        if goal["type"] == kind:
            scores[action] += .6
    if p["plan"]["action"] in scores and snapshot.get("ablation") != "no_plan":
        scores[p["plan"]["action"]] += .45
    if p["health"] < 35:
        scores["研究"] -= 1
        scores["修習"] -= 1
    # Only directly relevant, genuinely observed events affect future scores.
    memory_ids = []
    for memory, event in ([] if snapshot.get("ablation") == "no_memory" else _visible_memories(p, event_lookup, snapshot["month"])):
        age = month - memory["observed_month"]
        if age > MEMORY_EFFECT_MONTHS:
            continue
        if event["kind"] == "發現":
            scores["研究"] += .35
            memory_ids.append(event["event_id"])
        elif event["kind"] == "關係":
            scores["社交"] += .25
            memory_ids.append(event["event_id"])
        elif event["kind"] == "關係挫折":
            scores["社交"] -= .6
            memory_ids.append(event["event_id"])
        elif event["kind"] == "目標受挫":
            scores["研究"] -= .4
            memory_ids.append(event["event_id"])
    feasible = list(ACTIONS)
    if not known:
        feasible.remove("修習")
    rng = draw(snapshot["seed"], month, p["id"], "choice")
    noise = {action: rng.uniform(-.9, .9) for action in ACTIONS}
    action = max(feasible, key=lambda a: (scores[a] + noise[a], -ACTIONS.index(a)))
    peers = sorted((x for x in snapshot["people"].values() if x["alive"] and x["district"] == p["district"]
                    and x["id"] != p["id"]), key=lambda x: x["id"])
    target = None
    if action == "社交" and peers:
        target = max(peers, key=lambda x: (p["relationships_v2"].get(str(x["id"]), {}).get("trust", 0)
                                     + draw(snapshot["seed"], month, p["id"], "peer", x["id"]).uniform(0, 30), -x["id"]))["id"]
    return {"actor": p["id"], "action": action, "target": target, "scores": {k: round(v, 3) for k, v in scores.items()},
            "noise": {k: round(v, 3) for k, v in noise.items()}, "feasible": feasible,
            "goal_id": goal["id"], "goal_label": goal["label"], "goal_progress": goal["progress"],
            "goal_target": goal["target"], "memory_event_ids": memory_ids, "state_month": snapshot["month"],
            "known_fact_ids": [k["fact_id"] for k in p["knowledge_v2"]],
            "constraints": [] if known else ["修習需要本人已知的可修習基礎"],
            "plan_step": p["plan"]["step"], "relationship_event_ids": [],
            "rng_draw_key": f"{snapshot['seed']}:{RNG_NAMESPACE}:{month}:{p['id']}:choice"}


def _change_profile(person, key, amount, event):
    before = person["profile_current"][key]
    after = round(min(1, max(0, before + amount)), 2)
    if after != before:
        person["profile_current"][key] = after
        person["profile"][key] = after  # compatibility projection
        person["profile_changes"].append({"month": event["month"], "dimension": key,
                                           "before": before, "after": after, "event_id": event["event_id"]})


def _progress(person, intent, world, event):
    goal = person["goals"][0]
    progress_action = _step(goal["type"])
    if goal["type"] != "legacy_custom" and intent["action"] == progress_action:
        goal["progress"] += 1
        person["plan"]["last_progress_month"] = world["month"]
    if world["month"] >= person["plan"]["review_month"]:
        if goal["progress"] >= goal["target"]:
            if goal["type"] == "穩定生活":
                goal["target"] += 6
                goal["review_month"] = world["month"] + 4
                person["plan"]["review_month"] = world["month"] + 4
                return []
            goal["status"] = "completed"
            goal["stop_reason"] = "target_reached"
            person["goal_history"].append(copy.deepcopy(goal))
            next_goal = _goal(person, "穩定生活")
            next_goal["id"] = f"g:{person['id']}:{world['month']}"
            next_goal["started_month"] = world["month"]
            next_goal["review_month"] = world["month"] + 4
            next_goal["trigger_event_id"] = event["event_id"]
            person["goals"] = [next_goal]
            person["goal"] = "穩定生活"
            person["plan"] = {"goal_id": next_goal["id"], "step": _step_label("穩定生活"), "action": "工作",
                              "review_month": world["month"] + 4, "last_progress_month": world["month"]}
            completed = _event(world, "目標完成", person["id"], f"{person['name']} 完成階段目標", [event["event_id"]],
                               effects={"goal_id": goal["id"]}, important=True)
            _remember(person, completed, 3, world["rules_version"])
            return [completed["event_id"]]
        else:
            person["plan"]["review_month"] = world["month"] + 4
            goal["review_month"] = world["month"] + 4
            if world["month"] - person["plan"]["last_progress_month"] >= 4 and goal["type"] == "探索靈氣":
                setback = _event(world, "目標受挫", person["id"], f"{person['name']} 的研究計畫停滯",
                                 [event["event_id"]], effects={"goal_id": goal["id"]}, important=True)
                _remember(person, setback, 2, world["rules_version"])
                person["plan"]["action"] = "工作" if person["wealth"] < 75 else "學習"
                return [setback["event_id"]]
    return []


def advance(world):
    _check_compatible(world)
    month = world["month"] + 1
    world["month"] = month
    for district in DISTRICTS:
        r = draw(world["seed"], month, district, "aura")
        world["aura"][district] = round(min(.95, max(.02, world["aura"][district] + .012 + r.uniform(-.025, .025))), 3)
    # Freeze only decision inputs. Copying the entire growing event/chronicle history each month is quadratic.
    snapshot = {"seed": world["seed"], "month": month - 1, "aura": dict(world["aura"]),
                "ablation": world.get("ablation"),
                "people": {key: {field: copy.deepcopy(value) for field, value in person.items()
                                 if field in ("id", "alive", "district", "traits", "profile_current", "wealth", "health",
                                              "goals", "plan", "knowledge_v2", "memories_v2", "relationships_v2", "need", "known")}
                           for key, person in world["people"].items()}}
    event_lookup = {e.get("event_id"): e for e in world["events"]}
    intents = [_intent(p, snapshot, month, event_lookup) for p in sorted(snapshot["people"].values(), key=lambda p: p["id"]) if p["alive"]]
    # A district may record at most one distinct discovery this month. Lottery is independent of traversal order.
    contenders = {}
    for intent in intents:
        if intent["action"] != "研究":
            continue
        p = snapshot["people"][str(intent["actor"])]
        chance = min(.55, .03 + p["traits"]["悟性"]*.018 + p["traits"]["感知"]*.01
                     + world["aura"][p["district"]]*.12)
        if draw(world["seed"], month, p["id"], "discovery").random() < chance:
            contenders.setdefault(p["district"], []).append(p["id"])
    winners = {min(ids, key=lambda pid: draw(world["seed"], month, district, "contest", pid).random())
               for district, ids in contenders.items()}
    qualified = {pid for ids in contenders.values() for pid in ids}
    # Aggregate directed trust changes from the frozen state before recording outcomes.
    social_effects, edge_deltas = {}, {}
    for intent in intents:
        actor, target = intent["actor"], intent["target"]
        if intent["action"] != "社交" or target is None:
            continue
        person, other = snapshot["people"][str(actor)], snapshot["people"][str(target)]
        mismatch = abs(person["profile_current"]["親和"] - other["profile_current"]["親和"])
        setback = draw(world["seed"], month, actor, "social-outcome", target).random() < .04 + .10 * mismatch
        known = next((k for k in person["knowledge_v2"] if k["fact_id"] == "practice_basis"), None)
        shared = bool(known and not any(k["fact_id"] == "practice_basis" for k in other["knowledge_v2"]) and not setback)
        social_effects[actor] = {"target": target, "setback": setback, "shared": shared,
                                 "source": known["source_event_id"] if shared else None}
        edge_deltas[(actor, target)] = edge_deltas.get((actor, target), 0) + (-5 if setback else 5 + person["traits"]["社交"])
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
                discovery = _event(world, "發現", p["id"], f"{p['name']} 發現{finding}",
                                   effects={"fact_id": "practice_basis", "finding": finding}, important=True)
                p["knowledge_v2"].append({"fact_id": "practice_basis", "source_event_id": discovery["event_id"],
                                          "learned_month": month, "confidence": 1.0})
                _remember(p, discovery, 3, world["rules_version"])
                p["experience_counts"]["research"] += 1
                if p["experience_counts"]["research"] % 4 == 0 and world.get("ablation") != "no_personality_drift":
                    _change_profile(p, "探索", .01, discovery)
                outcome = f"取得{finding}，支出 5"
            else:
                outcome = ("同區成果競爭未獲優先紀錄，研究技能提升，支出 5" if p["id"] in qualified
                           else "未取得可重現結果，研究技能提升，支出 5")
        else:
            p["skills"]["修習"] += 1
            cost = 2 + draw(world["seed"], month, p["id"], "practice-cost").randrange(4)
            p["health"] = max(0, p["health"] - cost)
            outcome = f"試驗靈氣適應，健康消耗 {cost}"
        p["wealth"] = max(0, p["wealth"] - 7)
        p["need"] = "生計" if p["wealth"] == 0 else "健康" if p["health"] < 50 else "生活"
        if p["wealth"] == 0:
            p["health"] = max(0, p["health"] - 3)
        death = p["health"] == 0 or (p["age"] > 79 and draw(world["seed"], month, p["id"], "mortality").random() < (p["age"]-79)/800)
        if death:
            p["alive"] = False
            death_event = _event(world, "死亡", p["id"], f"{p['name']} 離世", effects={"health": p["health"], "age": p["age"]}, important=True)
            _remember(p, death_event, 3, world["rules_version"])
        decision = {**intent, "resolution": "research_contested" if p["id"] in qualified - winners else "accepted",
                    "outcome_event_ids": []}
        event = _event(world, "行動", p["id"], f"{p['name']}：{action}；{outcome}",
                       causes=intent["memory_event_ids"], effects={"action": action, "outcome": outcome,
                                                                   "target": intent["target"]})
        decision["outcome_event_ids"] = [event["event_id"]]
        if social_state:
            target = social_state["target"]
            other = world["people"][str(target)]
            relation_event = event
            if social_state["setback"] or social_state["shared"] or social_state["milestone"]:
                relation_event = _event(world, "關係挫折" if social_state["setback"] else "關係", p["id"], outcome,
                                        causes=[social_state["source"]] if social_state["source"] else [event["event_id"]],
                                        target=target, effects={"trust": p["relationships_v2"][str(target)]["trust"],
                                                                "shared_fact_id": "practice_basis" if social_state["shared"] else None},
                                        important=social_state["setback"] or social_state["milestone"])
                decision["outcome_event_ids"].append(relation_event["event_id"])
                decision["relationship_event_ids"].append(relation_event["event_id"])
                if relation_event["important"]:
                    _remember(p, relation_event, 2, world["rules_version"])
                    _remember(other, relation_event, 1, world["rules_version"])
            other["chronicle"].append(relation_event)
            p["relationships_v2"][str(target)]["last_event_id"] = relation_event["event_id"]
            other["relationships_v2"][str(p["id"])]["last_event_id"] = relation_event["event_id"]
            # Multiple exchanges in one month are all genuine observations; retain every source.
            if social_state["shared"]:
                other["knowledge_v2"].append({"fact_id": "practice_basis", "source_event_id": relation_event["event_id"],
                                              "learned_month": month, "confidence": 1.0})
            if not social_state["setback"] and p["experience_counts"]["social"] % 8 == 0 and world.get("ablation") != "no_personality_drift":
                _change_profile(p, "外向", .01, relation_event)
        if discovery:
            decision["outcome_event_ids"].append(discovery["event_id"])
        p["last_decision"] = decision
        p["last_action"] = {"month": month, "action": action, "why": {"goal": p["goal"],
                            "need": snapshot["people"][str(p["id"])]["need"], "known": list(snapshot["people"][str(p["id"])]["known"]),
                            "aura_observed": snapshot["aura"][p["district"]] if p["traits"]["感知"] >= 6 else "未察覺",
                            "scores": intent["scores"]}, "outcome": outcome}
        if p["alive"]:
            decision["outcome_event_ids"].extend(_progress(p, intent, world, event))
    for org in world["organizations"].values():
        researchers = [world["people"][str(i)] for i in org["members"] if world["people"][str(i)]["alive"]]
        progress = sum(p["skills"]["研究"] for p in researchers) // 30
        org["research"] += progress
        org["resources"] = max(0, org["resources"] + len(researchers)//10 - 1)
        org["activity"] = f"會員累計研究進展 +{progress}，維持服務"
    living = sum(p["alive"] for p in world["people"].values())
    world["trends"].append({"month": month, "living": living, "knowledge": world["knowledge"],
                             "aura": round(sum(world["aura"].values())/5, 3)})
    _event(world, "世界", None, f"第 {month} 月結算：{living} 名具名人物存活，靈氣知識 {world['knowledge']}",
           effects={"living": living, "knowledge": world["knowledge"]}, important=True)
    validate(world)
    return [e for e in world["events"] if e["month"] == month and e.get("event_id", "").startswith("m2:")]


def _profile_window_excess(changes):
    """Largest per-dimension sum of |change| within any PROFILE_WINDOW_MONTHS consecutive months."""
    worst = 0.0
    by_dimension = {}
    for change in changes:
        by_dimension.setdefault(change["dimension"], []).append((change["month"], abs(change["after"] - change["before"])))
    for steps in by_dimension.values():
        for start, _ in steps:
            worst = max(worst, sum(x for month, x in steps if start <= month < start + PROFILE_WINDOW_MONTHS))
    return worst


def validate(world):
    _check_compatible(world)
    if world["month"] < 0 or world["background_population"] < 0 or set(world["aura"]) != set(DISTRICTS):
        raise ValueError("世界時間、人口或區域無效")
    if any(not 0 <= aura <= 1 for aura in world["aura"].values()) or any(o["resources"] < 0 for o in world["organizations"].values()):
        raise ValueError("靈氣或組織資源越界")
    ids = [e.get("event_id") for e in world["events"]]
    if len(ids) != len(set(ids)) or None in ids:
        raise ValueError("事件 ID 重複或缺失")
    known_ids = set(ids)
    event_months = {e["event_id"]: e["month"] for e in world["events"]}
    known_or_none = known_ids | {None}
    for p in world["people"].values():
        validate_traits(p["traits"], p["budget"])
        if not 0 <= p["health"] <= 100 or p["wealth"] < 0 or len(p["memories_v2"]) > MEMORY_LIMIT:
            raise ValueError("人物狀態越界")
        if len(p["goals"]) != 1 or p["goals"][0]["status"] != "active":
            raise ValueError("活躍目標無效")
        if p["goal"] != p["goals"][0]["label"] or p["plan"]["goal_id"] != p["goals"][0]["id"]:
            raise ValueError("目標投影不一致")
        if any(not 0 <= x <= 1 for x in p["profile_current"].values()):
            raise ValueError("人格越界")
        if p["profile"] != p["profile_current"]:
            raise ValueError("人格投影不一致")
        if any(m["event_id"] not in known_ids or m["observed_month"] > world["month"] for m in p["memories_v2"]):
            raise ValueError("記憶無事件來源")
        if any(k["source_event_id"] not in known_ids or k["learned_month"] > world["month"] for k in p["knowledge_v2"]):
            raise ValueError("知識無事件來源")
        if any(not 0 <= x["trust"] <= 100 or x["last_event_id"] not in known_or_none
               for x in p["relationships_v2"].values()):
            raise ValueError("關係越界")
        if {k: v["trust"] for k, v in p["relationships_v2"].items()} != p["relations"]:
            raise ValueError("關係投影不一致")
        if p["goals"][0]["trigger_event_id"] not in known_or_none:
            raise ValueError("目標來源不存在")
        if any(change["event_id"] not in known_ids or abs(change["after"] - change["before"]) > .020001
               for change in p["profile_changes"]):
            raise ValueError("人格變化無來源或幅度過大")
        if any(change["month"] != event_months[change["event_id"]] or change["month"] > world["month"]
               for change in p["profile_changes"]):
            raise ValueError("人格變化月份與來源事件不符或在未來")
        if _profile_window_excess(p["profile_changes"]) > PROFILE_WINDOW_CAP + .000001:
            raise ValueError("人格 12 個月累積變化過大")
        decision = p["last_decision"]
        if decision and any(event_id not in known_ids for event_id in
                            decision["memory_event_ids"] + decision["outcome_event_ids"] + decision["relationship_event_ids"]):
            raise ValueError("決策來源不存在")
    for e in world["events"]:
        if any(c not in known_ids for c in e.get("causal_event_ids", [])):
            raise ValueError("事件因果引用無來源")
