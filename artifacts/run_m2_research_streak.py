"""Read-only, multi-seed check of the 13-month research streak seen in the #35 playtest sample.

Question (issues #35 items 2-3, #4, #9, #2): is a long run of the same action, a rest/service goal whose
decisions do not follow the plan, or a discovery memory dropped at a rest review a one-person accident or
common across the 100-NPC population? Development seeds 0-29 only (the maintainer seals a new holdout
separately); rules 0.2.2; nothing is tuned, nothing is changed, no rule or save is touched.

Usage: PYTHONPATH=. python3 artifacts/run_m2_research_streak.py [--out artifacts/m2-research-streak.md]
"""
import argparse
import statistics
from collections import Counter, defaultdict

from earth_ascension import m2
from earth_ascension.m2 import advance, new_world

SEEDS = range(0, 30)
MONTHS = 60
LONG = 13  # the playtest sample's streak length (months 29-41)
MEMORY_DELTA = {"研究": {"發現": .35, "目標受挫": -.4}, "社交": {"關係": .25, "關係挫折": -.6}}


def run(seed):
    assert seed in SEEDS, "only development seeds are measured"
    assert m2.M2_VERSION == "0.2.2"
    world = new_world(seed, "0.2.2")
    kinds, seen = {}, 0
    rows = defaultdict(list)       # person id -> per-month dict (months the person decided)
    wealth_before = {}
    review_ctx = []                # one entry per rest review, captured from the pre-advance (frozen) state
    for month in range(1, MONTHS + 1):
        for event in world["events"][seen:]:
            kinds[event["event_id"]] = event["kind"]
        seen = len(world["events"])
        pre = {}
        for k, p in world["people"].items():
            if not p["alive"]:
                continue
            wealth_before[k] = p["wealth"]
            goal = p["goals"][0]
            if goal["type"] == m2.REST_GOAL and p["plan"]["review_month"] <= month:
                valid = [mem for mem in p["memories_v2"] if kinds.get(mem["event_id"]) == "發現"
                         and mem["observed_month"] <= month - 1 and month - mem["observed_month"] <= m2.MEMORY_EFFECT_MONTHS]
                pre[k] = len(valid)
        n_reviews = {k: len(p["goal_reviews"]) for k, p in world["people"].items()}
        alive_before = {k for k, p in world["people"].items() if p["alive"]}
        advance(world)
        for k in alive_before:
            p = world["people"][k]
            d = p["last_decision"]
            if d is None or d["state_month"] != month - 1:
                continue
            goal = p["goals"][0]
            mem_kinds = [kinds.get(e) for e in d["memory_event_ids"]]
            rows[k].append({"month": month, "action": d["action"], "goal_id": d["goal_id"], "goal": d["goal_label"],
                            "plan_step": d["plan_step"], "scores": d["scores"], "noise": d["noise"],
                            "feasible": d["feasible"], "mem_kinds": mem_kinds, "wealth_before": wealth_before[k],
                            "end_progress": goal["progress"], "end_target": goal["target"], "end_goal": goal["type"],
                            "end_goal_id": goal["id"]})
            if k in pre and len(p["goal_reviews"]) > n_reviews[k]:
                review = p["goal_reviews"][-1]
                review_ctx.append({"month": month, "valid_discovery": pre[k], "excluded": review["excluded"],
                                   "basis": review["basis"], "outcome": review["outcome"], "chosen": review["chosen"],
                                   "cause_kinds": [kinds.get(e) for e in review["cause_event_ids"]],
                                   "contrib_kinds": sorted({c["kind"] for c in review["contributions"]})})
    profiles = {k: p["profile_current"] for k, p in world["people"].items()}
    traits = {k: p["traits"] for k, p in world["people"].items()}
    return {"rows": rows, "reviews": review_ctx, "profiles": profiles, "traits": traits}


def without_memory_action(row):
    """Winner if the observed memory terms were removed, keeping the stored noise (no rule rerun)."""
    scores = dict(row["scores"])
    for kind in row["mem_kinds"]:
        for action, table in MEMORY_DELTA.items():
            scores[action] -= table.get(kind, 0)
    order = list(m2.ACTIONS)
    return max(row["feasible"], key=lambda a: (scores[a] + row["noise"][a], -order.index(a)))


def noiseless_action(row):
    order = list(m2.ACTIONS)
    return max(row["feasible"], key=lambda a: (row["scores"][a], -order.index(a)))


def streaks(rows):
    """(action, start_index, length) for consecutive-month runs of the same action."""
    out, i = [], 0
    while i < len(rows):
        j = i
        while j + 1 < len(rows) and rows[j + 1]["action"] == rows[i]["action"] and rows[j + 1]["month"] == rows[j]["month"] + 1:
            j += 1
        out.append((rows[i]["action"], i, j - i + 1))
        i = j + 1
    return out


def pct(a, b):
    return f"{a / b:.1%}" if b else "—"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out")
    args = ap.parse_args()
    data = {s: run(s) for s in SEEDS}
    again = run(0)
    same = {k: [(r["month"], r["action"]) for r in v] for k, v in again["rows"].items()} == \
           {k: [(r["month"], r["action"]) for r in v] for k, v in data[0]["rows"].items()}
    people = [(s, k, rows) for s in SEEDS for k, rows in data[s]["rows"].items()]
    out = ["# #35／#4：連續研究、休整期行動與發現記憶的多 seed 唯讀檢查（規則 0.2.2）", "",
           f"開發 seed 0–29、各 100 NPC×60 月（{len(people)} 人）。唯讀：不改規則、不依結果調整、不碰 seed 30 以上；"
           f"可重現：seed 0 再跑一次逐月行動完全相同＝{same}。這是描述「是否普遍」，是否算問題由維護者判斷；不判定 A3／A4／#2。", ""]

    # 1. streak distribution
    longest = {a: [] for a in m2.ACTIONS}
    long_people = []
    for s, k, rows in people:
        best = {a: 0 for a in m2.ACTIONS}
        for a, i, n in streaks(rows):
            best[a] = max(best[a], n)
            if a == "研究" and n >= LONG:
                long_people.append((s, k, rows, i, n))
        for a in m2.ACTIONS:
            longest[a].append(best[a])
    out += [f"## 1. 同一行動最長連續月數（每人 60 月內的最長一段；n={len(people)}）", "",
            "| 行動 | 中位 | p90 | 最大 | ≥ 13 月的人數（占比） |", "|---|---|---|---|---|"]
    for a in m2.ACTIONS:
        v = sorted(longest[a])
        out.append(f"| {a} | {statistics.median(v):.0f} | {v[int(len(v) * .9)]} | {v[-1]} | {sum(x >= LONG for x in v)}（{pct(sum(x >= LONG for x in v), len(v))}） |")
    per_seed = Counter(s for s, *_ in long_people)
    out += ["", f"連續研究 ≥ {LONG} 月的段共 {len(long_people)} 段，涉及 {len({(s, k) for s, k, *_ in long_people})} 人；有此現象的 seed：{len(per_seed)}/{len(SEEDS)}。", ""]

    # 2. what the long research streaks cross
    if long_people:
        cross_goal = cross_rest = cross_service = 0
        goal_mix = Counter()
        for s, k, rows, i, n in long_people:
            seg = rows[i:i + n]
            ids = {r["goal_id"] for r in seg}
            types = {r["goal"] for r in seg}
            cross_goal += len(ids) > 1
            cross_rest += "穩定生活" in types
            cross_service += "服務社群" in types
            goal_mix.update(r["goal"] for r in seg)
        out += [f"## 2. ≥ {LONG} 月連續研究段跨越了什麼（{len(long_people)} 段）", "",
                f"- 跨越至少一次目標轉換：{cross_goal}（{pct(cross_goal, len(long_people))}）；含休整（穩定生活）月：{cross_rest}（{pct(cross_rest, len(long_people))}）；含服務社群月：{cross_service}（{pct(cross_service, len(long_people))}）。",
                "- 這些段內各月所處目標（月數）：" + "、".join(f"{g} {n}" for g, n in goal_mix.most_common()), ""]

    # 3. rest / service months: action vs plan step
    out += ["## 3. 各目標月的實際行動（計畫步驟 vs 行動）", "",
            "| 決策時目標 | 月數 | 工作 | 研究 | 社交 | 學習 | 休息 | 修習 |", "|---|---|---|---|---|---|---|---|"]
    by_goal = defaultdict(Counter)
    for s, k, rows in people:
        for r in rows:
            by_goal[r["goal"]][r["action"]] += 1
    for g in ("探索靈氣", "建立關係", "累積財富", "服務社群", "穩定生活"):
        c = by_goal[g]
        t = sum(c.values())
        out.append(f"| {g} | {t} | " + " | ".join(pct(c[a], t) for a in ("工作", "研究", "社交", "學習", "休息", "修習")) + " |")
    rest_rows = [r for _, _, rows in people for r in rows if r["goal"] == "穩定生活"]
    mism = [r for r in rest_rows if r["plan_step"] == "維持工作與生計" and r["action"] != "工作"]
    out += ["", f"休整月中計畫步驟為「維持工作與生計」的有 {sum(r['plan_step'] == '維持工作與生計' for r in rest_rows)} 月；其中行動不是「工作」的 {len(mism)} 月（{pct(len(mism), len(rest_rows))}），其中研究 {sum(r['action'] == '研究' for r in mism)} 月。", ""]

    # 4. what carries research in long streaks / all research months
    def attribution(rows_iter, label):
        n = base = changed = noise_needed = 0
        for r in rows_iter:
            if r["action"] != "研究":
                continue
            n += 1
            changed += without_memory_action(r) != "研究"
            noise_needed += noiseless_action(r) != "研究"
        return label, n, changed, noise_needed
    long_rows = [r for s, k, rows, i, m in long_people for r in rows[i:i + m]]
    all_rows = [r for _, _, rows in people for r in rows]
    out += ["## 4. 研究月靠什麼勝出（用已存的分數與波動反推，不重跑規則）", "",
            "| 範圍 | 研究月數 | 拿掉發現／受挫記憶後不再是研究（占比） | 不計波動時研究不是最高分（占比） |", "|---|---|---|---|"]
    for label, n, changed, noise_needed in (attribution(long_rows, f"≥ {LONG} 月連續研究段內"), attribution(all_rows, "全部研究月")):
        out.append(f"| {label} | {n} | {changed}（{pct(changed, n)}） | {noise_needed}（{pct(noise_needed, n)}） |")
    long_ids = {(s, k) for s, k, *_ in long_people}
    mean = lambda xs: statistics.mean(xs) if xs else float("nan")
    out += ["", f"長連續研究者（{len(long_ids)} 人）與其他人的平均人格／先天：探索 {mean([data[s]['profiles'][k]['探索'] for s, k in long_ids]):.2f} vs {mean([v['探索'] for s in SEEDS for k, v in data[s]['profiles'].items() if (s, k) not in long_ids]):.2f}；"
            f"悟性 {mean([data[s]['traits'][k]['悟性'] for s, k in long_ids]):.2f} vs {mean([v['悟性'] for s in SEEDS for k, v in data[s]['traits'].items() if (s, k) not in long_ids]):.2f}；"
            f"感知 {mean([data[s]['traits'][k]['感知'] for s, k in long_ids]):.2f} vs {mean([v['感知'] for s in SEEDS for k, v in data[s]['traits'].items() if (s, k) not in long_ids]):.2f}。", ""]

    # 5. how streaks end
    ends = Counter()
    for s, k, rows in people:
        for a, i, n in streaks(rows):
            if a != "研究" or n < LONG:
                continue
            j = i + n
            if j >= len(rows):
                ends["到 60 月或人物不再決策"] += 1
            elif rows[j]["wealth_before"] < 75:
                ends["下一個決策月財富 < 75（生計加分）"] += 1
            elif rows[j]["goal_id"] != rows[j - 1]["goal_id"]:
                ends["目標轉換"] += 1
            else:
                ends["其他"] += 1
    out += [f"## 5. ≥ {LONG} 月連續研究如何結束", "",
            "（依序判斷：先看下一個決策月財富是否 < 75，再看目標是否轉換；這只是時間上的巧合歸類，沒有重跑規則證明因果。）", ""] + \
           [f"- {k}：{v}" for k, v in ends.most_common()] + [""]

    # 6. discovery memories at rest reviews
    reviews = [r for s in SEEDS for r in data[s]["reviews"]]
    moved = [r for r in reviews if r["outcome"] == "轉向"]
    with_disc = [r for r in reviews if r["valid_discovery"] > 0]
    blocked = [r for r in with_disc if "探索靈氣" in r["excluded"]]
    out += ["## 6. 休整評估與發現記憶（對照 #35 留言的機制說法）", "",
            f"- 休整評估共 {len(reviews)} 次；評估時本人仍有至少一筆 12 月內有效的發現記憶：{len(with_disc)} 次（{pct(len(with_disc), len(reviews))}）。",
            f"- 其中探索靈氣被排除（因剛完成探索）而使發現記憶沒有計分的：{len(blocked)} 次（{pct(len(blocked), len(with_disc))}）。",
            f"- 探索靈氣沒被排除、但仍有有效發現記憶可計分的評估：{len(with_disc) - len(blocked)} 次。",
            f"- 轉向 {len(moved)} 次中 `basis=memory` 的有 {sum(r['basis'] == 'memory' for r in moved)} 次（{pct(sum(r['basis'] == 'memory' for r in moved), len(moved))}）；被引用為原因的事件數（一次轉向可引用多筆）："
            + "、".join(f"{k} {v}" for k, v in Counter(c for r in moved for c in r["cause_kinds"]).most_common()) + "。",
            f"- 評估中出現過分數貢獻的事件數（以評估次數計，同次評估同種類只算一次）：" + "、".join(f"{k} {v}" for k, v in Counter(c for r in reviews for c in r["contrib_kinds"]).most_common()) + "。", ""]

    # 7. reached target, waiting for review
    waiting = tot = 0
    runs = []
    for s, k, rows in people:
        run_len = 0
        for r in rows:
            tot += 1
            if r["end_goal"] != "穩定生活" and r["end_progress"] >= r["end_target"]:
                waiting += 1
                run_len += 1
            elif run_len:
                runs.append(run_len)
                run_len = 0
        if run_len:
            runs.append(run_len)
    out += ["## 7. 已達標但等檢查月（進度 ≥ 目標）", "",
            f"- 月末進度 ≥ 目標的人月：{waiting}/{tot}（{pct(waiting, tot)}）；連續等待段 {len(runs)} 段，平均 {mean(runs):.1f} 月、最長 {max(runs) if runs else 0} 月。", ""]

    out += ["## 讀法與限制", "",
            "- 這是 100 NPC 的完整人群與 seed 0–29，不是「測試旅人」中性人格；兩者結論可以不同，請兩邊一起看。",
            "- 第 4 節是用已存的分數與波動反推「拿掉記憶項」的結果，只回答「若沒有這些加分、同樣波動，行動是否改變」，不是重跑規則的反事實，也不代表記憶機制有或沒有設計問題。",
            "- 第 6 節的有效記憶以評估前一個月末（凍結快照）的人物記憶計算；記憶欄位滿 24 筆時可能已被擠掉，所以數字是下限的近似。",
            "- 「連續研究 13 月是否算迴圈」是設計判斷。這裡只量它有多普遍、跨哪些目標、靠什麼分數、怎麼結束。",
            "- 沒有執行保留 seed，沒有修改任何規則或存檔。", ""]
    text = "\n".join(out).rstrip("\n")
    print(text)
    if args.out:
        open(args.out, "w", encoding="utf-8").write(text + "\n")


if __name__ == "__main__":
    main()
