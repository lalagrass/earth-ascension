"""Pure rule engine. All facts originate here, never from presentation text."""
import hashlib
import random

from . import RULES_VERSION

TRAITS = ("根骨", "悟性", "意志", "感知", "社交")
DISTRICTS = ("河港", "學園", "舊城", "丘陵", "工業灣")
JOBS = ("研究員", "工程師", "醫護", "教師", "商務", "服務業", "行政", "學生")
GOALS = ("穩定生活", "探索靈氣", "建立關係", "累積財富", "服務社群")
SURNAMES = "陳林黃張李王吳劉蔡楊許鄭謝洪郭邱曾廖賴徐"
GIVEN = "安昕宇澄思涵明哲怡辰嘉庭若晴祐承子寧書瑋品妤"


def rng_for(seed, month, key):
    digest = hashlib.sha256(f"{seed}:{month}:{key}:{RULES_VERSION}".encode()).digest()
    return random.Random(int.from_bytes(digest[:8], "big"))


def validate_traits(traits, budget):
    if budget not in (30, 35, 40) or set(traits) != set(TRAITS):
        raise ValueError("能力模式或欄位無效")
    if any(type(traits[k]) is not int or not 1 <= traits[k] <= 10 for k in TRAITS):
        raise ValueError("各項能力須為 1–10 的整數")
    if sum(traits.values()) != budget:
        raise ValueError(f"能力點數須剛好等於 {budget}")


def score_answers(answers):
    if not isinstance(answers, list) or len(answers) != 16 or any(type(a) is not int or a not in range(1, 6) for a in answers):
        raise ValueError("請完成 16 題，每題選擇 1–5")
    # Original scenario prompts, inspired by Big Five and values research; not a clinical scale.
    dimensions = ("開放", "盡責", "外向", "親和", "穩定", "探索", "安全", "關懷")
    return {dimension: round((answers[i] + answers[i + 8]) / 10, 2) for i, dimension in enumerate(dimensions)}


def initial_world(seed=2026):
    people = {}
    for i in range(1, 101):
        r = rng_for(seed, 0, i)
        name = SURNAMES[(i - 1) % len(SURNAMES)] + GIVEN[(i * 3) % len(GIVEN)] + GIVEN[(i * 7 + 2) % len(GIVEN)]
        traits = {k: 6 for k in TRAITS}
        for _ in range(12):
            a, b = r.sample(TRAITS, 2)
            if traits[b] > 1 and traits[a] < 10:
                traits[a] += 1
                traits[b] -= 1
        profile = {k: round(r.uniform(.2, .8), 2) for k in ("開放", "盡責", "外向", "親和", "穩定", "探索", "安全", "關懷")}
        people[str(i)] = make_person(i, name, DISTRICTS[(i - 1) % 5], traits, 30, profile,
                                     GOALS[i % 5], r.randrange(18, 65), JOBS[i % len(JOBS)], False)
    org_names = ("市立新現象研究所", "河港醫療聯盟", "灣區產業協會", "舊城互助會", "學園教育網")
    orgs = {str(i+1): {"id": i+1, "name": name, "members": [j for j in range(1, 101) if j % 5 == i],
                         "resources": 100, "research": 0, "goal": "調查城市異常" if i == 0 else "維持服務", "activity": "尚未活動"}
            for i, name in enumerate(org_names)}
    return {"version": RULES_VERSION, "seed": seed, "month": 0, "start_year": 2026,
            "city": "澄灣市", "background_population": 248000,
            "aura": {d: round(.15 + rng_for(seed, 0, d).random() * .2, 3) for d in DISTRICTS},
            "knowledge": 0, "people": people, "organizations": orgs, "events": [], "trends": [], "next_id": 101}


def make_person(pid, name, district, traits, budget, profile, goal, age, job, player):
    return {"id": pid, "name": name, "district": district, "traits": traits, "budget": budget,
            "profile": profile, "goal": goal, "short_goal": "維持生活", "age": age, "job": job,
            "health": 80, "wealth": 100, "education": "高中以上", "skills": {"工作": 1, "研究": 0, "社交": 0, "修習": 0},
            "need": "生活", "relations": {}, "memories": [], "known": [], "alive": True,
            "player": player, "last_action": None, "chronicle": [], "months_lived": 0}


def validate_world(world):
    valid = (
        world["version"] == RULES_VERSION
        and world["month"] >= 0 and world["background_population"] >= 0
        and set(world["aura"]) == set(DISTRICTS)
        and all(0 <= v <= 1 for v in world["aura"].values())
        and all(p["wealth"] >= 0 and 0 <= p["health"] <= 100 for p in world["people"].values())
        and all(p["budget"] in (30, 35, 40) and sum(p["traits"].values()) == p["budget"] for p in world["people"].values())
        and all(o["resources"] >= 0 for o in world["organizations"].values())
    )
    if not valid:
        raise ValueError("世界狀態不一致或規則版本不相容")


def _event(world, kind, subject, text, causes, important=False):
    event = {"month": world["month"], "kind": kind, "subject": subject, "text": text,
             "causes": causes, "important": important}
    world["events"].append(event)
    if subject and str(subject) in world["people"]:
        person = world["people"][str(subject)]
        person["chronicle"].append(event)
        if important:
            person["memories"].append(text)
            person["memories"] = person["memories"][-12:]
    return event


def _choose_action(p, world, r):
    # Tier 0 utility policy; decision inputs are stored with the result for inspection.
    t, f = p["traits"], p["profile"]
    aura = world["aura"][p["district"]]
    scores = {
        "工作": 1.2 + t["意志"]*.10 + f["盡責"] + (1 if p["wealth"] < 75 else 0) + (0.6 if p["goal"] == "累積財富" else 0),
        "學習": .9 + t["悟性"]*.10 + f["開放"] + (0.5 if p["goal"] == "探索靈氣" else 0),
        "社交": .8 + t["社交"]*.10 + f["外向"] + f["關懷"]*.3 + (0.6 if p["goal"] == "建立關係" else 0),
        "休息": .5 + (100-p["health"])*.045 + f["安全"]*.5,
        "研究": .2 + t["悟性"]*.09 + t["感知"]*.06 + f["探索"] + aura + (1 if p["goal"] == "探索靈氣" else 0),
        "修習": .05 + t["根骨"]*.07 + f["探索"]*.4 + aura + (0.5 if p["goal"] == "探索靈氣" else 0),
    }
    if world["knowledge"] < 2:
        scores["修習"] = -1  # No established practice before discovery.
    if p["health"] < 35:
        scores["研究"] -= 1
        scores["修習"] -= 1
    noisy = {key: value + r.uniform(-.9, .9) for key, value in scores.items()}
    action = max(noisy, key=noisy.get)
    return action, {"goal": p["goal"], "need": p["need"], "known": list(p["known"]),
                    "aura_observed": round(aura, 3) if p["traits"]["感知"] >= 6 else "未察覺",
                    "scores": {k: round(v, 2) for k, v in scores.items()}}


def advance(world):
    month = world["month"] + 1
    world["month"] = month
    for district in DISTRICTS:
        r = rng_for(world["seed"], month, district)
        before = world["aura"][district]
        world["aura"][district] = round(min(.95, max(.02, before + .012 + r.uniform(-.025, .025))), 3)
    for p in list(world["people"].values()):
        if not p["alive"]:
            continue
        r = rng_for(world["seed"], month, p["id"])
        p["months_lived"] += 1
        if p["months_lived"] % 12 == 0:
            p["age"] += 1
        action, why = _choose_action(p, world, r)
        outcome = ""
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
            peers = [x for x in world["people"].values() if x["alive"] and x["district"] == p["district"] and x["id"] != p["id"]]
            if peers:
                other = r.choice(peers)
                key = str(other["id"])
                p["relations"][key] = min(100, p["relations"].get(key, 0) + 5 + p["traits"]["社交"])
                other["relations"][str(p["id"])] = min(100, other["relations"].get(str(p["id"]), 0) + 3)
                outcome = f"與 {other['name']} 交流，信任增加"
            else:
                outcome = "參加社區活動"
            p["skills"]["社交"] += 1
        elif action == "休息":
            p["health"] = min(100, p["health"] + 8)
            outcome = "健康恢復 8"
        elif action == "研究":
            p["skills"]["研究"] += 1
            p["wealth"] = max(0, p["wealth"] - 5)
            chance = min(.55, .03 + p["traits"]["悟性"]*.018 + p["traits"]["感知"]*.01 + world["aura"][p["district"]]*.12)
            if r.random() < chance:
                world["knowledge"] += 1
                finding = f"靈氣觀測紀錄 #{world['knowledge']}"
                p["known"].append(finding)
                _event(world, "發現", p["id"], f"{p['name']} 發現{finding}",
                       [f"研究技能 {p['skills']['研究']}", f"本區靈氣 {world['aura'][p['district']]}"], True)
                outcome = f"取得{finding}，支出 5"
            else:
                outcome = "未取得可重現結果，研究技能提升，支出 5"
        else:
            p["skills"]["修習"] += 1
            cost = 2 + r.randrange(4)
            p["health"] = max(0, p["health"] - cost)
            outcome = f"試驗靈氣適應，健康消耗 {cost}"
        p["wealth"] = max(0, p["wealth"] - 7)  # Monthly living costs.
        if p["wealth"] == 0:
            p["health"] = max(0, p["health"] - 3)
            p["need"] = "生計"
        elif p["health"] < 50:
            p["need"] = "健康"
        else:
            p["need"] = "生活"
        if p["health"] == 0 or (p["age"] > 79 and r.random() < (p["age"]-79)/800):
            p["alive"] = False
            _event(world, "死亡", p["id"], f"{p['name']} 離世", [f"健康 {p['health']}", f"年齡 {p['age']}"], True)
        p["last_action"] = {"month": month, "action": action, "why": why, "outcome": outcome}
        _event(world, "行動", p["id"], f"{p['name']}：{action}；{outcome}",
               [f"目標：{p['goal']}", f"需求：{why['need']}"])
        # Tier 1 rule policy: rare, grounded changes in long-term direction.
        if month % 12 == 0 and p["alive"] and p["goal"] == "探索靈氣" and p["skills"]["研究"] == 0 and p["wealth"] < 20:
            p["goal"] = "穩定生活"
            _event(world, "轉折", p["id"], f"{p['name']} 因資源不足轉向穩定生活", ["財富低於 20", "研究技能為 0"], True)
    for org in world["organizations"].values():
        researchers = [world["people"][str(i)] for i in org["members"] if world["people"][str(i)]["alive"]]
        progress = sum(p["skills"]["研究"] for p in researchers) // 30
        org["research"] += progress
        org["resources"] = max(0, org["resources"] + len(researchers)//10 - 1)
        org["activity"] = f"會員累計研究進展 +{progress}，維持服務"
        if progress >= 3:
            _event(world, "組織", None, f"{org['name']} 研究進展 {progress}", [f"活躍會員 {len(researchers)}", f"會員研究技能累計"])
    living = sum(p["alive"] for p in world["people"].values())
    world["trends"].append({"month": month, "living": living, "knowledge": world["knowledge"],
                             "aura": round(sum(world["aura"].values()) / 5, 3)})
    _event(world, "世界", None, f"第 {month} 月結算：{living} 名具名人物存活，靈氣知識 {world['knowledge']}",
           ["本月規則結算"], True)
    validate_world(world)
    return [e for e in world["events"] if e["month"] == month]
