"""Read-only #36 baseline on rules 0.2.2: what do the acquired skills and the 修習 action do today?

Issue #36 reports that 研究/社交/修習 skills do not feed back into any personal outcome and that 修習 is almost
never chosen. The maintainer asked for an evidence/spec PR first, using development seeds 0-29 x 100 NPC x 60 months.
This script is DESCRIPTIVE only: it adds no rule, runs no counterfactual and tunes nothing. The proposal-style term
min(0.12, 研究技能 x 0.008) from the issue is applied as plain arithmetic to observed skill values to show its
order of magnitude; behaviour change is NOT simulated, so this is not a counterfactual.

Development seeds 0-29 only (the maintainer seals a new holdout separately).
Usage: PYTHONPATH=. python3 artifacts/run_m2_skill_baseline.py [--out artifacts/m2-skill-baseline.md]
"""
import argparse
import statistics
from collections import Counter
from multiprocessing import Pool

from earth_ascension import m2
from earth_ascension.m2 import advance, canonical_hash, new_world

SEEDS = range(0, 30)
MONTHS = 60
SKILL_MONTHS = (12, 24, 36, 60)
SKILLS = ("工作", "研究", "社交", "修習")
EXAMPLE_COEF, EXAMPLE_CAP = .008, .12  # the issue's illustrative bounded term, arithmetic only


def run(seed):
    assert seed in SEEDS, "seeds 30-39 are the maintainer's holdout"
    assert m2.M2_VERSION == "0.2.2"
    world = new_world(seed, "0.2.2")
    skills_at = {}
    rows = []            # known-practice decision months: (action, best_gap_to_practice, noiseless_gap, margin_needed)
    practice_health = []
    research_months = []  # (base chance, skill before, example term)
    ever_known = {}
    known_curve = {}
    practice_count = Counter()
    work_income_by_skill = []
    for month in range(1, MONTHS + 1):
        pre = {k: (dict(p["skills"]), p["health"]) for k, p in world["people"].items() if p["alive"]}
        advance(world)
        for k, (sk, hp) in pre.items():
            p = world["people"][k]
            d = p["last_decision"]
            if d is None or d["state_month"] != month - 1:
                continue
            action = d["action"]
            known = "修習" in d["feasible"]
            if known:
                ever_known.setdefault(k, month)
                total = {a: d["scores"][a] + d["noise"][a] for a in d["feasible"]}
                best = max(total.values())
                base_gap = max(d["scores"][a] for a in d["feasible"] if a != "修習") - d["scores"]["修習"]
                rows.append((action, best - total["修習"], base_gap))
                if action == "修習":
                    practice_count[k] += 1
                    practice_health.append(hp - p["health"])
            if action == "研究":
                t = p["traits"]
                aura = world["aura"][p["district"]]
                base = min(.55, .03 + t["悟性"] * .018 + t["感知"] * .01 + aura * .12)
                term = min(EXAMPLE_CAP, sk["研究"] * EXAMPLE_COEF)
                research_months.append((base, sk["研究"], term, min(.55, base + term)))
            if action == "工作":
                work_income_by_skill.append((sk["工作"], 13 + p["traits"]["意志"] + sk["工作"]))
        known_curve[month] = sum(1 for k in ever_known) / len(world["people"])
        if month in SKILL_MONTHS:
            skills_at[month] = [dict(p["skills"]) for p in world["people"].values() if p["alive"]]
    return {"seed": seed, "hash": canonical_hash(world), "skills": skills_at, "rows": rows, "ph": practice_health,
            "research": research_months, "known_curve": known_curve, "practice_count": practice_count,
            "ever_known": ever_known, "income": work_income_by_skill}


def q(values, f):
    values = sorted(values)
    return values[int(f * (len(values) - 1))] if values else None


def pct(a, b):
    return f"{100 * a / b:.1f}%" if b else "n/a"


def render(results):
    out = ["# #36：技能與「修習」在規則 0.2.2 的基線（開發 seed 0–29，唯讀）", "",
           "只描述現況：沒有加規則、沒有反事實、沒有調參，也不跑保留 seed 30–39。引用 #36 方案 A 的示例式 "
           f"`min({EXAMPLE_CAP}, 研究技能×{EXAMPLE_COEF})` 只當**算術**代入實際技能值，看量級；它**不含行為改變**，所以不是反事實。"
           "重跑：`PYTHONPATH=. python3 artifacts/run_m2_skill_baseline.py`。", "",
           "## 1. 技能成長（存活人物，跨 30 seed 合併）", "",
           "| 月 | 技能 | 中位 | p90 | 最大 | ≥ 10 的人數占比 | ≥ 20 |", "|---|---|---:|---:|---:|---:|---:|"]
    for m in SKILL_MONTHS:
        people = [s for r in results for s in r["skills"][m]]
        for sk in SKILLS:
            vals = [s[sk] for s in people]
            out.append(f"| {m} | {sk} | {q(vals, .5)} | {q(vals, .9)} | {max(vals)} | "
                       f"{pct(sum(v >= 10 for v in vals), len(vals))} | {pct(sum(v >= 20 for v in vals), len(vals))} |")
    inc = [x for r in results for x in r["income"]]
    by_skill = {}
    for s, e in inc:
        by_skill.setdefault(min(s // 10 * 10, 60), []).append(e)
    out += ["", "工作技能是目前唯一**直接影響個人行動結算**的後天技能（工作月收入＝13＋意志＋工作技能；學習月也會讓工作技能 +1）；"
            "研究技能不影響個人行動結算，但會進入組織的 `progress = sum(研究技能)//30`（`m2.py` L542）。"
            "工作月的實際收入（依該月工作技能分段）：", "",
            "| 工作技能 | 工作月數 | 平均收入 |", "|---|---:|---:|"]
    for k in sorted(by_skill):
        out.append(f"| {k}–{k + 9}{'+' if k == 60 else ''} | {len(by_skill[k])} | {statistics.mean(by_skill[k]):.1f} |")
    research = [x for r in results for x in r["research"]]
    out += ["", "## 2. 示例有界項的量級（算術，不是反事實）", "",
            f"研究月共 {len(research)} 個（人月）。以該月月初研究技能代入 `min({EXAMPLE_CAP}, 技能×{EXAMPLE_COEF})`：", "",
            "| 項目 | 平均 | 中位 | p90 | 最大 |", "|---|---:|---:|---:|---:|"]
    for label, idx in (("現行單月發現資格機率（`chance`，含 0.55 上限）", 0), ("月初研究技能", 1), ("示例技能項", 2), ("加項後的 chance（同上限）", 3)):
        vals = [x[idx] for x in research]
        fmt = (lambda v: f"{v:.3f}") if idx != 1 else (lambda v: f"{v:.1f}")
        out.append(f"| {label} | {fmt(statistics.mean(vals))} | {fmt(q(vals, .5))} | {fmt(q(vals, .9))} | {fmt(max(vals))} |")
    capped = sum(1 for x in research if x[2] >= EXAMPLE_CAP - 1e-9)
    out += ["", f"研究月中技能項碰到示例上限 {EXAMPLE_CAP} 的占比：{pct(capped, len(research))}（技能 ≥ {EXAMPLE_CAP / EXAMPLE_COEF:.0f}）。"
            "注意：發現資格機率之後還要經過同區競爭抽籤，每區每月最多 1 人記錄，所以個人實際發現率低於 chance；"
            "且研究月數本身會因行為改變而變，這裡不模擬。", ""]
    rows = [x for r in results for x in r["rows"]]
    chosen = sum(1 for a, _, _ in rows if a == "修習")
    ph = [x for r in results for x in r["ph"]]
    out += ["## 3. 修習的實際使用（只計已知 `practice_basis`、修習可選的人月）", "",
            f"- 可選修習的人月：{len(rows)}；實際選修習：{chosen}（{pct(chosen, len(rows))}）。",
            f"- 選中時當月健康變化：平均 {statistics.mean(ph):.2f}（修習本身扣 2…5，期望 3.5；無休息或其他加減）" if ph else "- 無人選修習。", ""]
    gaps = [g for _, g, _ in rows]
    base_gaps = [g for _, _, g in rows]
    out += ["「修習離被選中多遠」：", "",
            "| 量 | p10 | 中位 | p90 | 最小 |", "|---|---:|---:|---:|---:|",
            f"| 含噪音總分差（最高分行動 − 修習；0＝修習就是最高） | {q(gaps, .1):.2f} | {q(gaps, .5):.2f} | {q(gaps, .9):.2f} | {min(gaps):.2f} |",
            f"| 不含噪音的基準分差（非修習最高 − 修習；負值＝基準分上修習領先） | {q(base_gaps, .1):.2f} | {q(base_gaps, .5):.2f} | {q(base_gaps, .9):.2f} | {min(base_gaps):.2f} |", "",
            f"基準分上修習領先（差 < 0）的人月：{sum(1 for g in base_gaps if g < 0)}（{pct(sum(1 for g in base_gaps if g < 0), len(base_gaps))}）；"
            f"噪音區間 ±0.9，若基準差大於 1.8，修習在任何噪音抽樣下都不可能勝出：基準差 > 1.8 的人月 {sum(1 for g in base_gaps if g > 1.8)}（{pct(sum(1 for g in base_gaps if g > 1.8), len(base_gaps))}）。", ""]
    n_people = sum(len(r["ever_known"]) for r in results)
    total_people = 100 * len(results)
    never = sum(1 for r in results for k in r["ever_known"] if r["practice_count"].get(k, 0) == 0)
    out += ["## 4. 誰解鎖了修習", "",
            f"60 月內曾解鎖修習（取得 `practice_basis`）的人：{n_people}／{total_people}（{pct(n_people, total_people)}）；"
            f"其中 60 月內從未選過修習：{never}（{pct(never, n_people)}）。",
            "逐月累計解鎖比例（跨 seed 中位）：" + "、".join(
                f"月 {m} {100 * statistics.median(r['known_curve'][m] for r in results):.0f}%" for m in (6, 12, 24, 36, 60)) + "。", "",
            "## 5. 限制與沒做的事", "",
            "- 沒有玩家 60 月路徑：本報告全是 NPC 群體。既有[單人試玩紀錄](m2-playtest-review-2026-10-17.md)是一條路徑；是否補玩家基線由維護者決定。",
            "- 沒有任何反事實：不知道加技能項後行為會怎麼變（尤其是 #36 要求檢查的「≥13 月連續研究是否更常見」）。那是維護者選定方案後的配對實驗。",
            "- 社交技能的效果（挫折率 `.04+.10×mismatch`、信任增幅 `5+社交特質`）沒有量測：只確認公式不讀 `skills['社交']`（`m2.py` L413、L418）。",
            "- 與 [#49](https://github.com/lalagrass/earth-ascension/pull/49)（反事實配對實驗與玩家 60 月路徑）互補：本報告只有 0.2.2 靜態基線，不取代它；示例 `min(0.12, 技能×0.008)` 的第 2 節數字只是把公式代入既有技能值的算術量級，**不是**規則效果，也不代表採用該係數或上限。",
            "- 不評論「修習太少是不是問題」：這取決於 M3 的修煉定位（#36 的待決策 1），本報告只提供量級。",
            "- 可重現性：前 3 個 seed 的末月 hash：" + "、".join(f"{r['seed']}:{r['hash'][:12]}" for r in results[:3]) + "。"]
    return "\n".join(out) + "\n"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="artifacts/m2-skill-baseline.md")
    args = parser.parse_args()
    with Pool() as pool:
        results = pool.map(run, list(SEEDS))
    text = render(results)
    with open(args.out, "w", encoding="utf-8") as fh:
        fh.write(text)
    print(text)


if __name__ == "__main__":
    main()
