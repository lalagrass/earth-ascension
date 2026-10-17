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
    reviews, trace = Counter(), []
    for p in world["people"].values():
        for r in p.get("goal_reviews", []):
            reviews[(r["outcome"], r["chosen"])] += 1
            trace.append(r)
    return {"hash": canonical_hash(world), "shares": shares, "spans": spans, "switches": switches,
            "person_months": person_months, "reviews": reviews, "trace": trace}


def fmt(x):
    return f"{x:.0%}"


def diagnostics(r):
    """Selection vs duration, causes and path diversity for 0.2.2 (reported as measured; nothing is tuned on it)."""
    trace = [t for s in SEEDS for t in r[s]["trace"]]
    moves = [t for t in trace if t["outcome"] == "轉向"]
    chosen = Counter(t["chosen"] for t in moves)
    seg = defaultdict(list)
    months = Counter()
    for s in SEEDS:
        for spans in r[s]["spans"].values():
            for t, a, b in spans:
                months[t] += b - a
                if b < 60:
                    seg[t].append(b - a)
    total_months = sum(months.values())
    cand = defaultdict(list)
    memory = defaultdict(float)
    for t in trace:
        for k, v in t["scores"].items():
            cand[k].append(v)
        for c in t["contributions"]:
            memory[c["candidate"]] += c["delta"]
    out = ["**選擇偏好 vs 段長（0.2.2；轉向選中次數、完整段平均長度、占全部人月）**", "",
           "| 目標 | 轉向後被選中（占比） | 完整段平均月數（中位） | 占全部人月 | 評估時平均分數 | 記憶累計貢獻／評估次數 |", "|---|---|---|---|---|---|"]
    for t in TYPES:
        n = chosen.get(t, 0)
        mean_seg = f"{statistics.mean(seg[t]):.1f}（{statistics.median(seg[t]):.0f}）" if seg[t] else "—"
        out.append(f"| {t} | {n}（{n / max(1, len(moves)):.0%}） | {mean_seg} | {months[t] / total_months:.0%} | "
                   f"{statistics.mean(cand[t]):.2f} | {memory[t] / len(trace):+.3f} |")
    caused = [t for t in moves if t["cause_event_ids"]]
    out += ["", f"**轉向的因果來源**：{len(moves)} 次轉向中，{len(caused)} 次（{len(caused) / max(1, len(moves)):.0%}）有至少一個有來源事件被引用為原因；"
            f"其餘 {len(moves) - len(caused)} 次來自人格／財富／健康的基準分數（`basis=profile_baseline`，轉向事件 causes 為空）。"
            f"被判定為「移除後結果會改變」的轉向 {sum(1 for t in moves if t['decisive_event_ids'])} 次。", ""]
    paths = Counter()
    for s in SEEDS:
        for spans in r[s]["spans"].values():
            seq = []
            for t, a, b in sorted(spans, key=lambda x: x[1]):
                if t != "穩定生活" and (not seq or seq[-1] != t):
                    seq.append(t)
            paths[tuple(seq[:3])] += 1
    n_people = sum(paths.values())
    out += [f"**路徑多樣性**（每人前 3 個活躍目標的類型序列；{n_people} 人；相異序列 {len(paths)} 種；最常見者占比如下）", ""]
    out += [f"- {' → '.join(k) or '（無）'}：{v}（{v / n_people:.1%}）" for k, v in paths.most_common(6)]
    first = Counter(k[0] if k else "（無）" for k in (tuple(x) for x in paths.elements()))
    out += ["- 第一個活躍目標類型分布：" + "、".join(f"{k} {v / n_people:.0%}" for k, v in first.most_common()), ""]
    return out


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
        rates = {s: sum(r[s]["switches"].values()) / r[s]["person_months"] for s in SEEDS}
        over = sorted(s for s, x in rates.items() if x > LINE_SWITCH_RATE)
        out += [f"**切換率逐 seed（全部 goal_id 切換／存活人月，不排除休整進出）**：最小 {min(rates.values()):.2%}、中位 {statistics.median(rates.values()):.2%}、最大 {max(rates.values()):.2%}；"
                f"超過 {LINE_SWITCH_RATE:.0%} 線的 seed（{len(over)}/{len(SEEDS)}）：{over or '無'}。",
                f"（上方「失敗 seed」只針對最大占比 > 75%，不含切換率。）", ""]
        if v == "0.2.2":
            rv = Counter()
            for s in SEEDS:
                rv.update(r[s]["reviews"])
            stay = sum(n for (o, c), n in rv.items() if o == "留任休整")
            move = sum(n for (o, c), n in rv.items() if o == "轉向")
            out += [f"**休整評估（0.2.2）**：共 {stay + move} 次；留任休整 {stay}、轉向 {move}；休整再進入活躍目標比例 {move / (stay + move):.0%}。",
                    "轉向後的新目標：" + "、".join(f"{c}×{n}" for (o, c), n in sorted(rv.items(), key=lambda kv: -kv[1]) if o == "轉向"), ""]
        if v == "0.2.2":
            out += diagnostics(r)
        med = {m: statistics.median(max(r[s]["shares"][m][0].values()) for s in SEEDS) for m in CHECK if m >= 24}
        out += ["**對照提案線**：" + "；".join(f"月 {m} 最大占比中位 {fmt(x)}（線 ≤ {fmt(LINE_MAX_SHARE_MEDIAN)}）{'達線' if x <= LINE_MAX_SHARE_MEDIAN else '未達線'}" for m, x in med.items()),
                f"每人月切換率 {n_sw / pm:.2%}（線 ≤ {LINE_SWITCH_RATE:.0%}）；最大占比 > 75% 的 seed-月（月 ≥ 24）：{len(fails['最大占比 > 75% 的 seed'])}；失敗 seed：{sorted(set(fails['最大占比 > 75% 的 seed'])) or '無'}。", ""]
    out += ["## 讀法與限制", "",
            "- 只比較「完成後走向」的規則版本；兩版同 seed、同初始世界。0.2.2 的評分權重與休整長度（一個檢查週期＝4 月）是初版選擇，**沒有依任何結果調整**，也沒有掃描參數。",
            "- 切換率以**全部 goal_id 切換／存活人月**計，**不排除休整進出**，分子分母不變；30 個開發 seed 全部超過 3% 線（逐 seed 清單見上）。「最大占比失敗 seed：無」只對 > 75% 集中度成立，不代表切換率達線。3% 線未校準，是否容許較高切換率由維護者以角色路徑與理由是否可理解判斷；我不調參去壓數字。",
            "- 服務社群占比高是「被選中次數」與「段長」共同造成還是單一原因，請看上方「選擇偏好 vs 段長」表；它是描述，不是結論。#4 的目標類型語義另做 PR。",
            "- 休整期間，剛完成目標的類型**整個休整目標存續期間**都不在候選內（不只第一次評估）；85% 的休整在第一次評估就離開，留任者要等到離開休整後才可能再選到原類型。這限制了「新事件重新開啟同一條研究線」；本 PR 未實作有限重新評估，保留為後續需求，待維護者決定。",
            "- 保留 seed 30–39 的目標分布沒有執行；公平性 fixture 曾含 seed 30、32–35（見 PR 描述）。這份報告不判定任何 A4 驗收通過。", ""]
    text = "\n".join(out).rstrip("\n")
    print(text)
    if args.out:
        open(args.out, "w", encoding="utf-8").write(text + "\n")


if __name__ == "__main__":
    main()
