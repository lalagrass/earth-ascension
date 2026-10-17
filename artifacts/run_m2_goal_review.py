"""Read-only measurement of the #8 goal funnel: rules 0.2.1 (old absorbing funnel) vs 0.2.2 (rest phase + review).

Development seeds 0-29 only (the maintainer fixed 30-39 as a holdout; this script refuses to run them).
Each seed is a 100-NPC x 60-month world; the same seed runs under both rules versions.
Prints a markdown report. Usage: PYTHONPATH=. python3 artifacts/run_m2_goal_review.py [--out artifacts/m2-goal-review.md]
"""
import argparse
import statistics
from collections import Counter, defaultdict

from earth_ascension.m2 import advance, canonical_hash, new_world

SEEDS = range(0, 30)
VERSIONS = ("0.2.1", "0.2.2")
TYPES = ("探索靈氣", "建立關係", "累積財富", "服務社群", "穩定生活")
CHECK = (12, 24, 36, 48, 60)
# Proposed (uncalibrated) lines from the #8 comment; not tuned on any result and not a quota.
LINE_MAX_SHARE_MEDIAN, LINE_MAX_SHARE_WORST, LINE_REST_MEDIAN, LINE_SWITCH_RATE, LINE_MIN_SEGMENT = .60, .75, .50, .03, 4


def run(seed, version):
    assert seed in SEEDS, "seeds 30-39 are the maintainer's holdout"
    world = new_world(seed, version)
    shares, spans, switches = {}, defaultdict(list), Counter()
    person_months = 0
    last = {k: (p["goals"][0]["id"], p["goals"][0]["type"]) for k, p in world["people"].items()}
    start = {k: 0 for k in world["people"]}

    def snap(month):
        alive = [p for p in world["people"].values() if p["alive"]]
        c = Counter(p["goals"][0]["type"] for p in alive)
        shares[month] = ({t: c.get(t, 0) / len(alive) for t in TYPES}, len(alive))

    snap(0)
    for month in range(1, 61):
        alive_before = {k for k, p in world["people"].items() if p["alive"]}
        advance(world)
        for k in alive_before:
            person_months += 1
            p = world["people"][k]
            gid, gtype = p["goals"][0]["id"], p["goals"][0]["type"]
            if gid != last[k][0]:
                spans[k].append((last[k][1], start[k], month))
                switches[(last[k][1], gtype)] += 1
                start[k], last[k] = month, (gid, gtype)
        if month in CHECK:
            snap(month)
    for k, p in world["people"].items():
        if p["alive"]:
            spans[k].append((last[k][1], start[k], 60))
    reviews = Counter()
    for p in world["people"].values():
        for r in p.get("goal_reviews", []):
            reviews[(r["outcome"], r["chosen"])] += 1
    return {"hash": canonical_hash(world), "shares": shares, "spans": spans, "switches": switches,
            "person_months": person_months, "reviews": reviews}


def fmt(x):
    return f"{x:.0%}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out")
    args = ap.parse_args()
    res = {v: {s: run(s, v) for s in SEEDS} for v in VERSIONS}
    again = run(0, "0.2.2")["hash"]
    out = ["# #8 目標漏斗：規則 0.2.1 與 0.2.2 對照（開發 seed 0–29，100 NPC×60 月）", "",
           "唯讀量測。保留 seed 30–39 沒有執行，腳本也拒絕執行它們。以下門檻是我在 #8 提案、**未依結果調整**的候選線，不是配額，也不是通過判定。", "",
           f"可重現：seed 0 的 0.2.2 兩次執行 canonical hash 相同：{again == res['0.2.2'][0]['hash']}。", ""]
    for v in VERSIONS:
        r = res[v]
        out += [f"## 規則 {v}", "", "**每月最大單一目標占比（存活人物；30 seed 的最小／中位／最大）與穩定生活占比中位**", "",
                "| 月 | 最小 | 中位 | 最大 | 穩定生活占比中位 | 主導目標（seed 數） |", "|---|---|---|---|---|---|"]
        fails = defaultdict(list)
        for m in CHECK:
            tops = {s: max(r[s]["shares"][m][0].items(), key=lambda kv: kv[1]) for s in SEEDS}
            vals = [t[1] for t in tops.values()]
            rest = [r[s]["shares"][m][0]["穩定生活"] for s in SEEDS]
            dom = Counter(t[0] for t in tops.values())
            out.append(f"| {m} | {fmt(min(vals))} | {fmt(statistics.median(vals))} | {fmt(max(vals))} | {fmt(statistics.median(rest))} | "
                       + "、".join(f"{k}×{n}" for k, n in dom.most_common()) + " |")
            if m >= 24:
                fails["最大占比 > 75% 的 seed"] += [s for s, t in tops.items() if t[1] > LINE_MAX_SHARE_WORST]
        out += ["", "**各目標占比中位數（%，跨 seed）**", "", "| 月 | " + " | ".join(TYPES) + " |", "|---|" + "---|" * len(TYPES)]
        for m in (0,) + CHECK:
            out.append(f"| {m} | " + " | ".join(f"{statistics.median(r[s]['shares'][m][0][t] for s in SEEDS) * 100:.0f}" for t in TYPES) + " |")
        pm = sum(r[s]["person_months"] for s in SEEDS)
        sw = Counter()
        for s in SEEDS:
            sw.update(r[s]["switches"])
        n_sw = sum(sw.values())
        seg = defaultdict(list)
        short = 0
        for s in SEEDS:
            for spans in r[s]["spans"].values():
                for t, a, b in spans:
                    seg[t].append(b - a)
                    short += (b - a < LINE_MIN_SEGMENT and b < 60)
        out += ["", f"**切換**：共 {n_sw} 次／{pm} 人月＝每人月 {n_sw / pm:.2%}；離開「穩定生活」的切換 {sum(n for (a, b), n in sw.items() if a == '穩定生活')} 次；進入「穩定生活」{sum(n for (a, b), n in sw.items() if b == '穩定生活')} 次。",
                f"**目標段長（月；非被 60 月截斷者與截斷者都計）**：" + "；".join(f"{t} 中位 {statistics.median(seg[t]):.0f}（n={len(seg[t])}）" for t in TYPES if seg[t]),
                f"**未滿 {LINE_MIN_SEGMENT} 月即結束的目標段**：{short}", ""]
        if v == "0.2.2":
            rv = Counter()
            for s in SEEDS:
                rv.update(r[s]["reviews"])
            stay = sum(n for (o, c), n in rv.items() if o == "留任休整")
            move = sum(n for (o, c), n in rv.items() if o == "轉向")
            out += [f"**休整評估（0.2.2）**：共 {stay + move} 次；留任休整 {stay}、轉向 {move}；休整再進入活躍目標比例 {move / (stay + move):.0%}。",
                    "轉向後的新目標：" + "、".join(f"{c}×{n}" for (o, c), n in sorted(rv.items(), key=lambda kv: -kv[1]) if o == "轉向"), ""]
        med = {m: statistics.median(max(r[s]["shares"][m][0].values()) for s in SEEDS) for m in CHECK if m >= 24}
        out += ["**對照提案線**：" + "；".join(f"月 {m} 最大占比中位 {fmt(x)}（線 ≤ {fmt(LINE_MAX_SHARE_MEDIAN)}）{'達線' if x <= LINE_MAX_SHARE_MEDIAN else '未達線'}" for m, x in med.items()),
                f"每人月切換率 {n_sw / pm:.2%}（線 ≤ {LINE_SWITCH_RATE:.0%}）；最大占比 > 75% 的 seed-月（月 ≥ 24）：{len(fails['最大占比 > 75% 的 seed'])}；失敗 seed：{sorted(set(fails['最大占比 > 75% 的 seed'])) or '無'}。", ""]
    out += ["## 讀法與限制", "",
            "- 只比較「完成後走向」的規則版本；兩版同 seed、同初始世界。0.2.2 的評分權重與休整長度（一個檢查週期＝4 月）是我的初版選擇，**沒有依任何結果調整**，也沒有掃描參數。",
            "- 0.2.2 的占比不再被吸收態支配，但每人月切換率約 10%：每次完成產生「進入休整」與「離開休整」兩次切換，休整 85% 在第一次檢查即離開。這高於我先前提案的 3% 線；是否把休整進出算作切換、或調整休整長度，需維護者決定，我不為達線調參。",
            "- 服務社群成為最常見的主導目標（完成最慢，段長中位 16 月），累積財富占比很小（原因我尚未拆解，只確認分布如此）。這是新的分布特徵，不是吸收態，但屬 #4 的目標規則差異，本 PR 不處理。",
            "- 沒有執行保留 seed 30–39；沒有量人格／經歷反事實以外的行為效果（對照 fixture 在 `tests/test_m2.py::GoalReviewTests`）。這份報告不判定任何 A4 驗收通過。", ""]
    text = "\n".join(out)
    print(text)
    if args.out:
        open(args.out, "w", encoding="utf-8").write(text + "\n")


if __name__ == "__main__":
    main()
