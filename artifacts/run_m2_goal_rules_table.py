"""Read-only per-goal-type measurement that backs docs/m2/goal-rules-table.md (issue #4, first step).

Question: for each of the five goal types, how often does the person's actual action match the action the plan
step announces, how often does a month produce goal progress, how long do non-rest goals take to complete, and
how often would the exploration-only stall check (>= 4 months without progress at a review) fire on each type
if it applied to it? Description only: nothing is tuned, no rule/save/RNG is touched, no threshold is proposed.

Development seeds 0-29 only (the maintainer seals a new holdout separately); rules 0.2.2; 100 NPC x 60 months.
Usage: PYTHONPATH=. python3 artifacts/run_m2_goal_rules_table.py [--out artifacts/m2-goal-rules-table.md]
"""
import argparse
import statistics
from collections import Counter, defaultdict
from multiprocessing import Pool

from earth_ascension import m2
from earth_ascension.m2 import advance, new_world

SEEDS = range(0, 30)
MONTHS = 60
GOAL_TYPES = ("探索靈氣", "建立關係", "累積財富", "服務社群", "穩定生活")
ACTION_ORDER = ("工作", "學習", "社交", "休息", "研究", "修習")


def run(seed):
    assert seed in SEEDS, "only development seeds are measured"
    assert m2.M2_VERSION == "0.2.2"
    world = new_world(seed, "0.2.2")
    month_rows = []      # (goal_type, plan_step, action)
    stall_checks = []    # (goal_type, month, stalled, actual_setback_event)
    for month in range(1, MONTHS + 1):
        pre = {}
        for k, p in world["people"].items():
            goal = p["goals"][0]
            if p["alive"] and goal["type"] != m2.REST_GOAL and p["plan"]["review_month"] <= month:
                pre[k] = (goal["id"], goal["type"], goal["progress"])
        n_events = len(world["events"])
        vitals = {k: (p["wealth"], p["health"]) for k, p in world["people"].items()}
        alive_before = {k for k, p in world["people"].items() if p["alive"]}
        advance(world)
        setback_actors = {e["subject"] for e in world["events"][n_events:] if e["kind"] == "目標受挫"}
        for k in alive_before:
            p = world["people"][k]
            d = p["last_decision"]
            if d is None or d["state_month"] != month - 1:
                continue
            month_rows.append((d["goal_label"], d["plan_step"], d["action"], vitals[k][0], vitals[k][1]))
            if k in pre and p["goals"][0]["id"] == pre[k][0]:
                # Same goal id after the month: the review month did not complete the goal, so the stall test ran.
                stalled = month - p["plan"]["last_progress_month"] >= 4
                stall_checks.append((pre[k][1], month, stalled, p["id"] in setback_actors))
    segments = []        # (goal_type, started, ended_or_None, completed, is_start_goal)
    for k, p in world["people"].items():
        goals = list(p["goal_history"]) + list(p["goals"])
        for i, g in enumerate(goals):
            if g["type"] == m2.REST_GOAL:
                continue
            nxt = goals[i + 1] if i + 1 < len(goals) else None
            done = g["status"] == "completed"
            end = nxt["started_month"] if (nxt and done) else None
            segments.append((g["type"], g["started_month"], end, done, g["id"] == f"g:{p['id']}:0"))
    start_goal = {k: p["goal_history"][0]["type"] if p["goal_history"] else p["goals"][0]["type"]
                  for k, p in world["people"].items()}
    return {"months": month_rows, "stalls": stall_checks, "segments": segments, "start": Counter(start_goal.values())}


def pct(a, b):
    return f"{100 * a / b:.1f}%" if b else "n/a"


def render(results):
    rows = [r for res in results for r in res["months"]]
    stalls = [r for res in results for r in res["stalls"]]
    segs = [r for res in results for r in res["segments"]]
    starts = Counter()
    for res in results:
        starts.update(res["start"])
    out = ["# #4：五種目標的行動一致性、進度與停滯風險（規則 0.2.2，開發 seed 0–29，唯讀）", "",
           "配合 [`docs/m2/goal-rules-table.md`](../docs/m2/goal-rules-table.md)。只描述現況，不調參、不提議門檻；",
           "不含保留 seed 30–39。重跑：`PYTHONPATH=. python3 artifacts/run_m2_goal_rules_table.py`。", "",
           f"樣本：{len(results)} seed × 100 NPC × {MONTHS} 月，人物月決策共 {len(rows)} 筆；起始目標分布 "
           + "、".join(f"{g} {starts[g]}" for g in GOAL_TYPES) + "（`GOALS[i % 5]`，各 1/5）。", "",
           "## 1. 各目標下的實際行動（預期行動以粗體標示）", "",
           "| 目標 | 人物月 | 預期行動 | " + " | ".join(ACTION_ORDER) + " | 行動與計畫步驟一致 |",
           "|---|---:|---|" + "---:|" * len(ACTION_ORDER) + "---:|"]
    for g in GOAL_TYPES:
        sel = [r for r in rows if r[0] == g]
        c = Counter(r[2] for r in sel)
        expected = m2._step(g)
        cells = [(f"**{pct(c[a], len(sel))}**" if a == expected else pct(c[a], len(sel))) for a in ACTION_ORDER]
        out.append(f"| {g} | {len(sel)} | {expected} | " + " | ".join(cells) + f" | {pct(c[expected], len(sel))} |")
    out += ["", "「行動與計畫步驟一致」＝行動等於 `_step(目標)`。因受挫後 `plan.action` 會被改成工作／學習（#9），"
            "此欄是「目標預設行動」的占比，不是「計畫當下的行動」；受挫後的計畫行動不在此表（見 #41）。", "",
            "### 1b. 偏離預期行動的月份：偏去哪裡、當時有無生計壓力", "",
            "互斥分類，依序判定：①偏離到「休息」（現行規則的健康保護路徑：休息分數隨健康下降）；"
            "②預期行動不是工作、月初財富 < 75，但選了休息以外的行動（此時工作分數已 +1，等於逆著生計壓力偏離）；"
            "③其餘（月初財富 ≥ 75 或預期行動本來就是工作）。財富取月初值（決策讀的凍結快照）。"
            "**這只描述偏離發生在哪，不判斷哪些偏離「可接受」**，容許理由清單由維護者決定。", "",
            "| 目標 | 偏離月 | ①偏去休息 | 休息月平均月初健康 | ②生計壓力下仍偏離 | ③其餘 | ③中最常見的行動 |",
            "|---|---:|---:|---:|---:|---:|---|"]
    for g in GOAL_TYPES:
        dev = [r for r in rows if r[0] == g and r[2] != m2._step(g)]
        rest = [r for r in dev if r[2] == "休息"]
        wealth = [r for r in dev if r[2] != "休息" and m2._step(g) != "工作" and r[3] < 75]
        other = [r for r in dev if r not in rest and r not in wealth]
        top = Counter(r[2] for r in other).most_common(2)
        avg_h = f"{statistics.mean(r[4] for r in rest):.0f}" if rest else "n/a"
        out.append(f"| {g} | {len(dev)} | {pct(len(rest), len(dev))} | {avg_h} | {pct(len(wealth), len(dev))} | "
                   f"{pct(len(other), len(dev))} | " + "、".join(f"{a} {pct(c, len(other))}" for a, c in top) + " |")
    out += ["",
            "## 2. 進度月占比與非休整目標完成", "",
            "進度月＝該月行動等於預期行動（休整的進度是經過月數，不由行動決定，故不列）。", "",
            "| 目標 | 進度月占比 | 目標段數 | 60 月內完成 | 完成段平均耗時（月） | 完成耗時中位／p90 | 起始目標者完成率 | 起始目標者完成平均耗時 |",
            "|---|---:|---:|---:|---:|---:|---:|---:|"]
    for g in GOAL_TYPES[:4]:
        sel = [r for r in rows if r[0] == g]
        prog = sum(1 for r in sel if r[2] == m2._step(g))
        s = [x for x in segs if x[0] == g]
        done = [x for x in s if x[3]]
        dur = sorted(x[2] - x[1] for x in done)
        sd = [x for x in s if x[4]]
        sdd = [x[2] - x[1] for x in sd if x[3]]
        p90 = dur[int(.9 * (len(dur) - 1))] if dur else None
        out.append(f"| {g} | {pct(prog, len(sel))} | {len(s)} | {pct(len(done), len(s))} | "
                   f"{statistics.mean(dur):.1f} | {statistics.median(dur):.0f}／{p90} | "
                   f"{pct(len(sdd), len(sd))} | {statistics.mean(sdd):.1f} |" if dur and sdd else f"| {g} | {pct(prog, len(sel))} | {len(s)} | n/a |||||")
    out += ["", "目標段含起始目標與休整後新選的目標；尚在進行中的段在 60 月被截斷，故「完成率」對後期才開始的段偏低，"
            "只有「起始目標者」欄可與 #25 直接比較。", "",
            "## 3. 若套用「4 月無進度」停滯檢查（目前只有探索靈氣會產生事件）", "",
            "每次非休整目標在檢查月（`month >= plan.review_month`）且當月未完成時，看 `month - last_progress_month >= 4`。"
            "「實際受挫事件」只有探索靈氣會有；其他目標的「會觸發」純屬假設情境，引擎並未為其產生事件。", "",
            "| 目標 | 檢查次數 | 無進度 ≥ 4 月（會觸發） | 占比 | 引擎實際產生受挫事件 |", "|---|---:|---:|---:|---:|"]
    for g in GOAL_TYPES[:4]:
        s = [x for x in stalls if x[0] == g]
        st = sum(1 for x in s if x[2])
        real = sum(1 for x in s if x[3])
        out.append(f"| {g} | {len(s)} | {st} | {pct(st, len(s))} | {real} |")
    expl = [x for x in stalls if x[0] == "探索靈氣"]
    mismatch = sum(1 for x in expl if x[2] != x[3])
    out += ["", f"自我檢查：探索靈氣的檢查中「重算的停滯」與「引擎實際事件」不一致 {mismatch} 筆（應為 0；非 0 代表我的重算與引擎不同，結果需存疑）。", "",
            "## 4. 限制", "",
            "- 全部是描述；「一致性低」或「風險高」是否為問題、是否要改權重，是 #4 後續配對實驗與維護者的決策。",
            "- 目標類型與人格、區域、起始財富相關（選擇偏誤），不能把差異直接歸因於規則本身；因果需配對 seed 的反事實實驗。",
            "- 一個月的行動可能是別的目標下的強項（例：研究對高悟性者），預期行動占比低不等於規則錯。"]
    return "\n".join(out) + "\n"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="artifacts/m2-goal-rules-table.md")
    args = parser.parse_args()
    with Pool() as pool:
        results = pool.map(run, list(SEEDS))
    text = render(results)
    with open(args.out, "w", encoding="utf-8") as fh:
        fh.write(text)
    print(text)


if __name__ == "__main__":
    main()
