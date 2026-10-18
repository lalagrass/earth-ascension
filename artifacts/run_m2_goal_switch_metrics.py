"""Read-only #8 re-measurement on rules 0.2.2: full vs substantive goal switches and per-person goal duration.

Maintainer asked (issue #8, 2026-10-17 12:32): report the full switch rate, the substantive switch rate that
excludes rest entry/exit, and per-person goal duration; thresholds are calibrated beforehand. The candidate
lines below were stated in the claim comment before the run; nothing is tuned, no rule/save/RNG is touched.
Development seeds 0-29 only (the maintainer seals a new holdout separately); 100 NPC x 60 months.

Usage: PYTHONPATH=. python3 artifacts/run_m2_goal_switch_metrics.py [--out artifacts/m2-goal-switch-metrics.md]
"""
import argparse
import statistics
from collections import Counter
from multiprocessing import Pool

from earth_ascension import m2
from earth_ascension.m2 import advance, canonical_hash, new_world

SEEDS = range(0, 30)
MONTHS = 60
TYPES = ("探索靈氣", "建立關係", "累積財富", "服務社群", "穩定生活")
PERIODS = ((1, 20), (21, 40), (41, 60))
SHARE_MONTHS = (12, 24, 36, 48, 60)
# Candidate lines stated before the run (待校準, not a pass/fail rule).
LINE_SUBSTANTIVE_RATE = .03
LINE_SEGMENT_MEDIAN = 8
LINE_SEGMENT_MIN = 4
LINE_REST_SHARE = .50
LINE_TYPE_SHARE = .05


def run(seed):
    assert seed in SEEDS, "seeds 30-39 are the maintainer's holdout"
    assert m2.M2_VERSION == "0.2.2"
    world = new_world(seed, "0.2.2")
    alive_months = Counter()
    last_alive = {k: 0 for k in world["people"]}
    shares = {}
    for month in range(1, MONTHS + 1):
        alive_before = [k for k, p in world["people"].items() if p["alive"]]
        advance(world)
        for k in alive_before:
            alive_months[k] += 1
            last_alive[k] = month
        if month in SHARE_MONTHS:
            alive = [p for p in world["people"].values() if p["alive"]]
            c = Counter(p["goals"][0]["type"] for p in alive)
            shares[month] = {t: c.get(t, 0) / len(alive) for t in TYPES}
    persons = {}
    for k, p in world["people"].items():
        goals = list(p["goal_history"]) + list(p["goals"])
        end_of_life = last_alive[k]
        segs = []
        for i, g in enumerate(goals):
            nxt = goals[i + 1] if i + 1 < len(goals) else None
            end = nxt["started_month"] if nxt else end_of_life
            segs.append({"type": g["type"], "start": g["started_month"], "end": end, "closed": nxt is not None,
                         "kind": g.get("transition_kind"), "id": g["id"], "parent": g.get("parent_goal_id")})
        reviews = [r for r in p.get("goal_reviews", [])]
        persons[k] = {"segs": segs, "alive_months": alive_months[k], "reviews": reviews,
                      "dead": not p["alive"]}
    return {"seed": seed, "hash": canonical_hash(world), "persons": persons, "shares": shares}


def pct(a, b):
    return f"{100 * a / b:.2f}%" if b else "n/a"


def q(values, frac):
    values = sorted(values)
    return values[int(frac * (len(values) - 1))] if values else None


def render(results):
    out = ["# #8：規則 0.2.2 目標切換率與每人目標持續月數（開發 seed 0–29，唯讀）", "",
           "對應維護者在 #8 的要求：同時報**全切換率**、**排除休整進出的實質目標切換率**與**每人目標持續月數**。"
           "只描述現況；候選線是認領留言事前寫下的「待校準」線（我當時已看過前次數字，所以不是盲設），**不調參、不宣稱 A4 通過**。"
           "不含保留 seed 30–39。重跑：`PYTHONPATH=. python3 artifacts/run_m2_goal_switch_metrics.py`。", ""]
    per_seed = []
    seg_rows = []         # non-rest segments
    all_person_rows = []
    period_counts = {pr: Counter() for pr in PERIODS}
    stays_per_rest = []
    exit_choice = Counter()
    initial_rest_exits = 0
    for res in results:
        full = rest_in = rest_out = subst = pm = 0
        for pers in res["persons"].values():
            pm += pers["alive_months"]
            segs = pers["segs"]
            rest_ids = {s["id"]: s for s in segs if s["type"] == m2.REST_GOAL}
            for s in segs[1:]:
                full += 1
                for pr in PERIODS:
                    if pr[0] <= s["start"] <= pr[1]:
                        period_counts[pr]["full"] += 1
                if s["kind"] == "complete_rest":
                    rest_in += 1
                elif s["kind"] == "rest_exit":
                    rest_out += 1
                    rest = rest_ids.get(s["parent"])
                    if rest and rest["parent"]:
                        subst += 1
                        for pr in PERIODS:
                            if pr[0] <= s["start"] <= pr[1]:
                                period_counts[pr]["subst"] += 1
                    else:
                        initial_rest_exits += 1
                    exit_choice[s["type"]] += 1
            for rest in rest_ids.values():
                stays_per_rest.append(sum(1 for r in pers["reviews"] if r["goal_id"] == rest["id"] and r["outcome"] == "留任休整"))
            nonrest = [s for s in segs if s["type"] != m2.REST_GOAL]
            lengths_closed = [s["end"] - s["start"] for s in nonrest if s["closed"]]
            for s in nonrest:
                seg_rows.append((s["type"], s["end"] - s["start"], s["closed"]))
            rest_months = sum(s["end"] - s["start"] for s in segs if s["type"] == m2.REST_GOAL)
            all_person_rows.append({"distinct": len({s["type"] for s in nonrest}), "n_nonrest": len(nonrest),
                                    "mean_len": statistics.mean(lengths_closed) if lengths_closed else None,
                                    "rest_share": rest_months / pers["alive_months"] if pers["alive_months"] else 0})
        per_seed.append({"seed": res["seed"], "pm": pm, "full": full, "rest_in": rest_in, "rest_out": rest_out, "subst": subst})
    total_pm = sum(r["pm"] for r in per_seed)
    out += ["## 1. 切換率（每個存活人月）", "",
            "| 指標 | 合計 | 每人月 | 逐 seed 最小／中位／最大 |", "|---|---:|---:|---:|"]
    for label, key in (("全切換（goal_id 變動，含進出休整）", "full"), ("進入休整（`complete_rest`）", "rest_in"),
                       ("離開休整（`rest_out`）", "rest_out"), ("**實質切換**（完成非休整目標→休整→離開，一個周期算 1 次）", "subst")):
        rates = [r[key] / r["pm"] for r in per_seed]
        out.append(f"| {label} | {sum(r[key] for r in per_seed)} | {pct(sum(r[key] for r in per_seed), total_pm)} | "
                   f"{100 * min(rates):.2f}%／{100 * statistics.median(rates):.2f}%／{100 * max(rates):.2f}% |")
    out += ["", f"存活人月合計 {total_pm}。起始即休整、無父目標者的首次離開 {initial_rest_exits} 次，單獨列出，**不計入**實質切換。", ""]
    out += ["### 依月段（切換發生月；每段人月以全期存活人月按月數比例近似，僅供看趨勢）", "",
            "| 月段 | 全切換 | 實質切換 | 全切換每人月（近似） | 實質每人月（近似） |", "|---|---:|---:|---:|---:|"]
    for pr in PERIODS:
        span = pr[1] - pr[0] + 1
        approx_pm = total_pm * span / MONTHS
        c = period_counts[pr]
        out.append(f"| {pr[0]}–{pr[1]} | {c['full']} | {c['subst']} | {pct(c['full'], approx_pm)} | {pct(c['subst'], approx_pm)} |")
    out += ["", "## 2. 每人目標持續月數（非休整目標）", "",
            "| 目標 | 段數 | 已結束段中位／p10／p90（月） | 被 60 月或死亡截斷的段 | 已結束段中 < 4 月 |", "|---|---:|---:|---:|---:|"]
    for t in TYPES[:4]:
        rows = [r for r in seg_rows if r[0] == t]
        closed = [r[1] for r in rows if r[2]]
        out.append(f"| {t} | {len(rows)} | {q(closed, .5)}／{q(closed, .1)}／{q(closed, .9)} | {sum(1 for r in rows if not r[2])} | "
                   f"{sum(1 for x in closed if x < LINE_SEGMENT_MIN)} |")
    closed_all = [r[1] for r in seg_rows if r[2]]
    out += ["", f"全部非休整已結束段：中位 {q(closed_all, .5)}、p10 {q(closed_all, .1)}、p90 {q(closed_all, .9)} 月；段長 < 4 月：{sum(1 for x in closed_all if x < 4)}。", ""]
    n_goals = Counter(r["n_nonrest"] for r in all_person_rows)
    distinct = Counter(r["distinct"] for r in all_person_rows)
    out += ["| 每人 60 月內持有的非休整目標段數 | 人數 | 不同目標類型數 | 人數 |", "|---|---:|---:|---:|"]
    for i in range(0, max(max(n_goals), max(distinct)) + 1):
        out.append(f"| {i} | {n_goals.get(i, 0)} | {i} | {distinct.get(i, 0)} |")
    rest_shares = [r["rest_share"] for r in all_person_rows]
    out += ["", f"每人休整月占存活月比例：p10 {100 * q(rest_shares, .1):.0f}%／中位 {100 * q(rest_shares, .5):.0f}%／p90 {100 * q(rest_shares, .9):.0f}%"
            f"（共 {len(rest_shares)} 人；包含起始即休整的人，起始就是 20%）。", "",
            "## 3. 休整停留與離開去向", "",
            f"休整段共 {len(stays_per_rest)} 個；每段「留任休整」評估次數分布（0＝第一次評估就離開）："
            + "、".join(f"{k} 次 {v}" for k, v in sorted(Counter(stays_per_rest).items())) + "。", "",
            "離開休整所選目標分布（`rest_exit`）：" + "、".join(f"{t} {exit_choice[t]}（{pct(exit_choice[t], sum(exit_choice.values()))}）" for t in TYPES[:4]) + "。", "",
            "## 4. 各目標占比（存活人物，跨 seed 中位）", "",
            "| 月 | " + " | ".join(TYPES) + " | 最大單一占比中位 |", "|---|" + "---:|" * (len(TYPES) + 1)]
    share_median = {}
    for m in SHARE_MONTHS:
        cells = []
        for t in TYPES:
            share_median[(m, t)] = statistics.median(r["shares"][m][t] for r in results)
            cells.append(f"{100 * share_median[(m, t)]:.1f}%")
        mx = statistics.median(max(r["shares"][m].values()) for r in results)
        out.append(f"| {m} | " + " | ".join(cells) + f" | {100 * mx:.1f}% |")
    # verdicts against the candidate lines stated in the claim comment
    subst_rate = sum(r["subst"] for r in per_seed) / total_pm
    seg_med = q(closed_all, .5)
    seg_min = min(closed_all) if closed_all else None
    rest_med_share = statistics.median(
        statistics.median(r["shares"][m][m2.REST_GOAL] for m in (24, 36, 48, 60)) for r in results)
    low_types = [(t, m) for m in (24, 36, 48, 60) for t in TYPES if share_median[(m, t)] < LINE_TYPE_SHARE]
    out += ["", "## 5. 對照事前候選線（待校準；不是通過判定）", "",
            "| 候選線 | 本次 | 對照 |", "|---|---:|---|",
            f"| 實質切換率 ≤ {100 * LINE_SUBSTANTIVE_RATE:.0f}% 每人月 | {100 * subst_rate:.2f}% | {'未超過' if subst_rate <= LINE_SUBSTANTIVE_RATE else '超過'} |",
            f"| 非休整已結束段長中位 ≥ {LINE_SEGMENT_MEDIAN} 月 | {seg_med} | {'達線' if seg_med >= LINE_SEGMENT_MEDIAN else '未達線'} |",
            f"| 任一已結束段 ≥ {LINE_SEGMENT_MIN} 月 | 最短 {seg_min} | {'達線' if seg_min >= LINE_SEGMENT_MIN else '未達線'} |",
            f"| 休整人物占比（月 24–60，各 seed 中位後再取跨 seed 中位）≤ {100 * LINE_REST_SHARE:.0f}% | {100 * rest_med_share:.1f}% | {'達線' if rest_med_share <= LINE_REST_SHARE else '未達線'} |",
            f"| 月 24–60 任一類型跨 seed 中位占比 ≥ {100 * LINE_TYPE_SHARE:.0f}%（新增描述線） | 低於線者：" + ("、".join(f"{t}@{m}月 {100 * share_median[(m, t)]:.1f}%" for t, m in low_types) or "無") + " | " + ("有類型低於 5% 線" if low_types else "無") + " |",
            "", "## 6. 限制", "",
            "- 換算：3% 每人月＝平均每 33 個月才一次實質切換；在「完成最早第 8 月＋休整 4 月」的現行結構下，一個周期至少 12 月，"
            "若要求每人 60 月內只切換 1–2 次，等於要求多數人長期停在同一目標或休整。維護者保留 4 月休整，這條 3% 線與該結構是否相容需要重新校準"
            "（本報告只提供量測，不建議新數值）。",
            "- 這些線是待校準候選，且我在寫線前已看過前次數字；達線與否都不是 A4 的通過／失敗判定。",
            "- 因休整窗口與完成檢查都是 4 月，段長必為 4 的倍數、最短理論值為 8 月；「≥ 4 月」這條因此幾乎不可能失敗，只是檢查沒有出現異常短段。",
            "- 截斷段（60 月或死亡）不列入已結束段長，所以段長分布偏向較短的目標。",
            "- 目標類型與人格、區域有選擇偏誤；服務社群與累積財富的占比差異不能直接歸因於規則（#4 配對實驗處理）。",
            f"- 可重現性：每 seed 末 canonical hash 已在同一次執行取得，前 3 個 seed：" + "、".join(f"{r['seed']}:{r['hash'][:12]}" for r in results[:3]) + "。"]
    return "\n".join(out) + "\n"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="artifacts/m2-goal-switch-metrics.md")
    args = parser.parse_args()
    with Pool() as pool:
        results = pool.map(run, list(SEEDS))
    text = render(results)
    with open(args.out, "w", encoding="utf-8") as fh:
        fh.write(text)
    print(text)


if __name__ == "__main__":
    main()
