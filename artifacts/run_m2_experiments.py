"""Reproducible paired M2 rule experiments; no network or LLM calls."""
import copy
import argparse
import json
import random
import statistics
import tempfile
from pathlib import Path
from time import perf_counter

from earth_ascension.engine import initial_world
from earth_ascension.m2 import (_event, _intent, _remember, advance, canonical_hash,
                                draw, new_world, validate)
from earth_ascension.store import Store

SEEDS = range(30)
# Historical 0.2.0 acceptance evidence: this script writes the locked m2-experiments-raw.json, so pin the 0.2.0 rules.
RULES_VERSION = "0.2.0"


def run(world, months, focal="1"):
    actions = []
    no_benefit_streaks = 0
    plan_aligned = 0
    eligible = 0
    previous = None
    streak = 0
    for _ in range(months):
        before = copy.deepcopy(world["people"][focal])
        advance(world)
        person = world["people"][focal]
        action = person["last_action"]["action"] if person["last_action"] and person["last_action"]["month"] == world["month"] else None
        actions.append(action)
        if action:
            eligible += 1
            plan_aligned += action == before["plan"]["action"]
        else:
            previous = None
            streak = 0
            continue
        gained = (person["wealth"] > before["wealth"] or person["health"] > before["health"]
                  or any(person["skills"][k] > before["skills"][k] for k in person["skills"]))
        streak = streak + 1 if action == previous and not gained else 0
        if streak == 4:
            no_benefit_streaks += 1
        previous = action
    return actions, no_benefit_streaks, plan_aligned / eligible if eligible else 0


def persona_pair(seed):
    data = []
    for social in (True, False):
        w = new_world(seed, RULES_VERSION)
        p = w["people"]["1"]
        p["profile_current"].update({"外向": .95 if social else .05, "關懷": .95 if social else .05,
                                     "探索": .05 if social else .95, "開放": .05 if social else .95})
        p["profile"] = copy.deepcopy(p["profile_current"])
        p["profile_base"] = copy.deepcopy(p["profile_current"])
        actions, _, _ = run(w, 24)
        data.append((actions.count("社交"), actions.count("研究")))
    return data


def experience_pair(seed):
    original = new_world(seed, RULES_VERSION)
    focal = original["people"]["1"]
    focal["goal"] = "建立關係"
    focal["goals"][0].update(type="建立關係", label="建立關係")
    focal["plan"]["action"] = "社交"
    run(original, 6)
    contacts = original["people"]["1"]["relationships_v2"]
    target = int(max(contacts.items(), key=lambda item: item[1]["trust"])[0]) if contacts else 6
    affected = copy.deepcopy(original)
    p = affected["people"]["1"]
    event = _event(affected, "關係挫折", 1, "與熟人交流受挫", target=target,
                   effects={"trust_delta": -30}, important=True)
    _remember(p, event, 3)
    edge = p["relationships_v2"].setdefault(str(target), {"trust": 20, "last_event_id": None, "last_interaction_month": None})
    edge["trust"] = max(0, edge["trust"] - 30)
    edge["last_event_id"] = event["event_id"]
    p["relations"][str(target)] = edge["trust"]
    histories = []
    for world in (affected, original):
        history = []
        for _ in range(12):
            advance(world)
            decision = world["people"]["1"]["last_decision"]
            history.append((decision["action"], decision["target"]))
        histories.append(history)
    treatment, control = histories
    return (treatment != control, treatment[:6] != control[:6],
            event["event_id"] in affected["people"]["1"]["last_decision"]["memory_event_ids"])


def memory_probes(seed):
    kinds = ("發現", "關係挫折", "目標受挫")
    results = []
    for kind in kinds:
        w = new_world(seed, RULES_VERSION)
        w["month"] = 6
        p = w["people"]["1"]
        event = _event(w, kind, 1, f"固定驗收事件：{kind}", important=True)
        _remember(p, event, 3)
        irrelevant = _event(w, "工作", 1, "無關工作記錄")
        _remember(p, irrelevant, 1)
        for probe_month in (12, 18):
            snap = copy.deepcopy(w)
            snap["month"] = probe_month - 1
            lookup = {e["event_id"]: e for e in snap["events"]}
            full = _intent(snap["people"]["1"], snap, probe_month, lookup)
            snap["people"]["1"]["memories_v2"] = [m for m in snap["people"]["1"]["memories_v2"] if m["event_id"] != event["event_id"]]
            removed = _intent(snap["people"]["1"], snap, probe_month, lookup)
            snap["people"]["1"]["memories_v2"] = [m for m in p["memories_v2"] if m["event_id"] != irrelevant["event_id"]]
            unrelated = _intent(snap["people"]["1"], snap, probe_month, lookup)
            action = "研究" if kind in ("發現", "目標受挫") else "社交"
            results.append((event["event_id"] in full["memory_event_ids"],
                            full["scores"][action] != removed["scores"][action],
                            full["scores"] == unrelated["scores"] and full["action"] == unrelated["action"]))
    return results


def full_run(seed, ablation=None):
    w = new_world(seed, RULES_VERSION)
    if ablation:
        w["ablation"] = ablation
    actions, no_benefit, plan_alignment = run(w, 60)
    validate(w)
    return {"focal_actions": actions, "no_benefit": no_benefit, "plan_alignment": plan_alignment,
            "profile_changes": sum(len(p["profile_changes"]) for p in w["people"].values()),
            "memories": sum(len(p["memories_v2"]) for p in w["people"].values()),
            "goal_changes": sum(e["kind"] in ("目標完成", "目標受挫") for e in w["events"]),
            "event_count": len(w["events"]),
            "discoveries": sum(e["kind"] == "發現" for e in w["events"]),
            "relation_setbacks": sum(e["kind"] == "關係挫折" for e in w["events"]),
            "goal_setbacks": sum(e["kind"] == "目標受挫" for e in w["events"]),
            "hash": canonical_hash(w)}


def store_perf(seed, legacy=False):
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp)/"world.sqlite3"
        # Replace only fresh month-0 world in this temporary database.
        store = Store(path)
        if seed != 2026 or legacy:
            with store._connect() as db:
                w = initial_world(seed) if legacy else new_world(seed, RULES_VERSION)
                db.execute("UPDATE snapshots SET state=? WHERE month=0", (json.dumps(w, ensure_ascii=False),))
        started = perf_counter()
        for month in range(60):
            store.advance(month)
        return perf_counter() - started, path.stat().st_size / 2**20


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--a2-only", action="store_true", help="只重跑指定的經歷配對")
    args = parser.parse_args()
    if args.a2_only:
        results = [experience_pair(seed) for seed in SEEDS]
        print({"path_12_months": sum(x[0] for x in results),
               "path_first_6_months": sum(x[1] for x in results),
               "trace_at_12_months": sum(x[2] for x in results), "seeds": len(results)})
        return
    started = perf_counter()
    personas = [persona_pair(seed) for seed in SEEDS]
    experiences = [experience_pair(seed) for seed in SEEDS]
    probes = [item for seed in SEEDS for item in memory_probes(seed)]
    groups = {name: [full_run(seed, name if name != "full" else None) for seed in SEEDS]
              for name in ("full", "no_plan", "no_memory", "no_personality_drift")}
    timings = [store_perf(seed) for seed in SEEDS]
    m1_timings = [store_perf(seed, legacy=True) for seed in SEEDS]
    holdout = [experience_pair(seed) for seed in range(30, 40)]
    social_diffs = [a[0][0] - a[1][0] for a in personas]
    research_diffs = [a[1][1] - a[0][1] for a in personas]
    fairness = sum(draw(seed, 1, "學園", "contest", 1).random()
                   < draw(seed, 1, "學園", "contest", 2).random() for seed in SEEDS)
    full = groups["full"]
    def interval(values):
        rng = random.Random(2026)
        boots = sorted(statistics.median(rng.choices(values, k=len(values))) for _ in range(2000))
        return f"{boots[50]:.1f}–{boots[1949]:.1f}"
    raw = {"seeds": list(SEEDS), "persona_pairs": personas, "experience_pairs": experiences,
           "memory_probes": probes, "groups": groups, "m2_sqlite": timings, "m1_sqlite": m1_timings,
           "a2_holdout_30_39": holdout}
    Path(__file__).with_name("m2-experiments-raw.json").write_text(json.dumps(raw, ensure_ascii=False, indent=2))
    text = f"""# M2 規則實驗（執行結果）

執行腳本：`PYTHONPATH=. python3 artifacts/run_m2_experiments.py`；30 個 seed（0–29），無 LLM／網路／付費呼叫。總執行 {perf_counter()-started:.1f} 秒。此為遊戲規則實驗，不能推論真人心理。

| 項目 | 結果 |
|---|---:|
| A1 社交偏好相對探索偏好之社交月數配對差，中位數／24 月 | {statistics.median(social_diffs):.1f} |
| A1 探索偏好相對社交偏好之研究月數配對差，中位數／24 月 | {statistics.median(research_diffs):.1f} |
| A1 社交方向同向 seed | {sum(x>0 for x in social_diffs)}/30 |
| A1 研究方向同向 seed | {sum(x>0 for x in research_diffs)}/30 |
| A1 社交配對差中位數 bootstrap 95% 區間（月） | {interval(social_diffs)} |
| A1 研究配對差中位數 bootstrap 95% 區間（月） | {interval(research_diffs)} |
| A2 經歷介入後 12 月內行動／社交對象路徑不同 seed | {sum(x[0] for x in experiences)}/30 |
| A2 前 6 月內行動／社交對象路徑不同 seed | {sum(x[1] for x in experiences)}/30 |
| A2 第 12 月後決策仍引用事件 seed | {sum(x[2] for x in experiences)}/30 |
| A2 保留 seed 30–39，前 6 月／12 月路徑不同 | {sum(x[1] for x in holdout)}/10；{sum(x[0] for x in holdout)}/10 |
| A3 6／12 月記憶 probe 引用、相關移除差與無關移除不變 | {sum(a and b and c for a,b,c in probes)}/{len(probes)} |
| A6 等能力兩人 30 seed 競爭，人物 1 勝 | {fairness}/30 |
| A7 M2 100 NPC×60 月，SQLite 中位秒數 | {statistics.median(x[0] for x in timings):.2f} |
| A7 M2 SQLite 中位 MiB | {statistics.median(x[1] for x in timings):.2f} |
| A7 M1 同機 SQLite 中位秒數 | {statistics.median(x[0] for x in m1_timings):.2f} |
| A7 M1 同機 SQLite 中位 MiB | {statistics.median(x[1] for x in m1_timings):.2f} |
| A7 M2／M1 SQLite 中位時間比 | {statistics.median(x[0] for x in timings)/statistics.median(x[0] for x in m1_timings):.2f}× |
| A5 全規則平均人格變化次數／100 人×60 月 | {statistics.mean(x['profile_changes'] for x in full):.1f} |
| A5 凍結人格消融平均變化次數 | {statistics.mean(x['profile_changes'] for x in groups['no_personality_drift']):.1f} |
| A4 全規則焦點人物無收益連續行動四月次數 | {sum(x['no_benefit'] for x in full)} |
| A4 無計畫加分消融相同次數 | {sum(x['no_benefit'] for x in groups['no_plan'])} |
| A4 全規則／無計畫加分焦點人物計畫行動吻合率 | {statistics.mean(x['plan_alignment'] for x in full):.1%}／{statistics.mean(x['plan_alignment'] for x in groups['no_plan']):.1%} |
| M2 全規則平均活躍記憶筆數／世界 | {statistics.mean(x['memories'] for x in full):.1f} |
| M2 全規則平均目標完成／受挫事件／世界 | {statistics.mean(x['goal_changes'] for x in full):.1f} |
| M2 全規則平均自然發現／關係挫折／目標受挫事件／世界 | {statistics.mean(x['discoveries'] for x in full):.1f}／{statistics.mean(x['relation_setbacks'] for x in full):.1f}／{statistics.mean(x['goal_setbacks'] for x in full):.1f} |

## 解讀與限制

- A1 固定能力、目標、世界與同用途 RNG，只改四個人格／價值偏好；不是正式心理效度測驗。24 月社交差達候選 10 個百分點需至少 2.4 個月。
- A2 兩組人物在月 0 均選「建立關係」，月 6 複製同一存檔；挑當時信任最高的已有聯絡人，只在實驗支加入有 ID 的關係挫折記憶及信任下降。路徑包含行動與社交對象，因此觀察到的是**組合經歷**的效果，不能把全部差異歸因於記憶。A3 在固定其他狀態下單獨移除記憶，才測直接記憶作用。
- A3 是預先固定三種類型×30 seed×兩個 horizon 的 180 個 fixture probe；固定其他狀態與抽樣，分別移除相關記憶及等量無關記憶，檢查引用、指定行動分數和無關移除下選擇不變。只要分數改變即符合此 probe，並不表示選擇必定翻轉。這些事件屬合成 fixture；自然事件的 6／12 月效果與合格率尚未量測，A3 整體仍待驗收。
- A4 的 M1/M2 每次工作、學習、社交、研究、修習都至少增加資源或技能，故「四月無收益重複」可能在兩組同為零；若如此，原訂相對下降 25% 的比率沒有定義，不能聲稱改善。須以目標延續、停滯與人工原因審查補足。
- A6 是競爭決勝 RNG 的等能力 fixture，不能代替所有稀缺資源互動驗收。
- A7 M1／M2 均用同一台機器、同一 Store／SQLite 持久化模式各跑 30 seed；M2 仍把歷史事件嵌在逐月快照，檔案成長顯著。
- 消融組均跑 30 seed×60 月；`no_plan` 只移除短計畫的決策加分，仍保留長期目標與紀錄；`no_memory` 保留事件但移除其決策加分；`no_personality_drift` 停止人格變化。故不應將消融差異解讀為完整系統替代版本的效果。
- 各 seed 原始數據與各消融結果另存 `artifacts/m2-experiments-raw.json`；顯示區間為配對差中位數的固定 seed bootstrap 描述，不是對真實人口的信賴推論。
"""
    path = Path(__file__).with_name("m2-experiments.md")
    path.write_text(text)
    print(text)


if __name__ == "__main__":
    main()
