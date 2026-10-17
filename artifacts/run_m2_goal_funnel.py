"""Read-only A4 goal-funnel measurement (issue #12 / #8 evidence). Prints a Markdown summary.

Runs the unmodified M2 engine for seeds 0-29 x 60 months, no player. Groups: B = full rules,
C = `no_plan` ablation. The final canonical hash of each run is checked against the locked
`m2-experiments-raw.json`, so this script provably measures the same worlds without changing them.
Usage: PYTHONPATH=. python3 artifacts/run_m2_goal_funnel.py [--seeds 30]
"""
import argparse
import json
import statistics as st
from collections import Counter, defaultdict
from pathlib import Path

from earth_ascension.m2 import advance, canonical_hash, new_world

BASE = Path(__file__).parent
# Historical 0.2.0 acceptance evidence: hashes are locked in m2-experiments-raw.json, so pin the 0.2.0 rules.
RULES_VERSION = "0.2.0"
TYPES = ("穩定生活", "探索靈氣", "建立關係", "累積財富", "服務社群")
CHECK_MONTHS = (0, 8, 12, 24, 36, 48, 60)
LINES = (.60, .90)  # 60% is #8's proposed (uncalibrated) line; 90% is a near-total collapse reference


def q(values, p):
    values = sorted(values)
    return values[min(len(values) - 1, int(round(p * (len(values) - 1))))] if values else None


def run(seed, ablation=None):
    world = new_world(seed, RULES_VERSION)
    if ablation:
        world["ablation"] = ablation
    shares, living_by_month = {}, {}
    life = defaultdict(list)       # pid -> [type, goal_id, start, end, ended_by]
    switches = Counter()           # (from, to, stop_reason)
    switch_months = []             # months where a goal changed (one entry per switch)
    person_months = 0
    stalled = 0

    def snapshot(month):
        alive = [p for p in world["people"].values() if p["alive"]]
        c = Counter(p["goals"][0]["type"] for p in alive)
        shares[month] = {t: c.get(t, 0) for t in TYPES}
        living_by_month[month] = len(alive)

    snapshot(0)
    for p in world["people"].values():
        g = p["goals"][0]
        life[p["id"]].append([g["type"], g["id"], 0, None, None])
    for month in range(1, 61):
        before = {k: (p["alive"], p["goals"][0]["id"], p["goals"][0]["type"]) for k, p in world["people"].items()}
        events = advance(world)
        stalled += sum(e["kind"] == "目標受挫" for e in events)
        for k, p in world["people"].items():
            was_alive, gid, gtype = before[k]
            if not was_alive:
                continue
            person_months += 1
            new = p["goals"][0]
            if new["id"] != gid:
                reason = p["goal_history"][-1].get("stop_reason", "?") if p["goal_history"] else "?"
                switches[(gtype, new["type"], reason)] += 1
                switch_months.append(month)
                life[p["id"]][-1][3:] = [month, reason]
                life[p["id"]].append([new["type"], new["id"], month, None, None])
            if not p["alive"]:
                life[p["id"]][-1][3:] = [month, "died"]
        snapshot(month)
    for goals in life.values():
        if goals[-1][3] is None:
            goals[-1][3:] = [60, "censored"]
    final_plan = Counter()
    for p in world["people"].values():
        if p["alive"] and p["goals"][0]["type"] == "探索靈氣":
            final_plan["research_goal_people"] += 1
            final_plan["plan_action_not_research"] += p["plan"]["action"] != "研究"
    return {"seed": seed, "hash": canonical_hash(world), "shares": shares, "living": living_by_month,
            "life": life, "switches": switches, "switch_months": switch_months,
            "person_months": person_months, "stalled": stalled, "final_plan": final_plan}


def summarize(name, runs):
    out = [f"### {name}\n"]
    # 1. concentration over time: largest single-goal share of living people, per seed
    maxshare = {m: [max(r["shares"][m].values()) / r["living"][m] for r in runs] for m in CHECK_MONTHS}
    out += ["**任一月最大單一目標占存活人物比例（30 seed 的最小／中位／最大）**\n",
            "| 月 | 最小 | 中位 | 最大 | 各 seed 的主導目標（seed 數） |", "|---:|---:|---:|---:|---|"]
    for m in CHECK_MONTHS:
        vals = maxshare[m]
        top = Counter(max(r["shares"][m], key=r["shares"][m].get) for r in runs
                      if list(r["shares"][m].values()).count(max(r["shares"][m].values())) == 1)
        out.append(f"| {m} | {min(vals):.0%} | {st.median(vals):.0%} | {max(vals):.0%} | "
                   + ("、".join(f"{t}×{n}" for t, n in top.most_common(2)) or "（五類平手）") + " |")
    out.append("")
    out += ["**各目標占比的中位數（%，跨 seed）**\n", "| 月 | " + " | ".join(TYPES) + " |",
            "|---:|" + "---:|" * len(TYPES)]
    for m in CHECK_MONTHS:
        out.append(f"| {m} | " + " | ".join(
            f"{st.median([100 * r['shares'][m][t] / r['living'][m] for r in runs]):.0f}" for t in TYPES) + " |")
    out.append("")
    allmax = max(max(r["shares"][m].values()) / r["living"][m] for r in runs for m in range(61))
    full_all = sum(max(r["shares"][m].values()) == r["living"][m] for r in runs for m in range(61))
    out.append(f"- 全部 seed×月（{len(runs) * 61} 個）中最大單一目標占比最高為 {allmax:.1%}；占比恰為 100%（字面「全員同一目標」）的 seed×月：{full_all}。\n")
    # 2. first month any goal exceeds a line
    out += ["**最大單一目標占比首次達線的月份（跨 seed）**\n", "| 線 | 未達線 seed 數 | 最早 | 中位 | 最晚 |", "|---|---:|---:|---:|---:|"]
    for line in LINES:
        firsts = []
        for r in runs:
            first = next((m for m in range(61) if max(r["shares"][m].values()) / r["living"][m] >= line), None)
            firsts.append(first)
        hit = [f for f in firsts if f is not None]
        out.append(f"| ≥{line:.0%} | {len(firsts) - len(hit)} | {min(hit) if hit else '—'} | "
                   f"{st.median(hit) if hit else '—'} | {max(hit) if hit else '—'} |")
    out.append("")
    # 3. goal lifetimes and the absorbing state
    out += ["**目標壽命與轉換**\n"]
    transitions = Counter()
    for r in runs:
        transitions.update(r["switches"])
    total_switch = sum(transitions.values())
    out += ["| 轉換（舊→新，停止原因） | 次數 |", "|---|---:|"]
    for (a, b, why), n in transitions.most_common():
        out.append(f"| {a}→{b}（{why}） | {n:,} |")
    out.append("")
    left_stable = sum(n for (a, b, why), n in transitions.items() if a == "穩定生活")
    person_months = sum(r["person_months"] for r in runs)
    out.append(f"- 總切換 {total_switch:,} 次／{person_months:,} 人月＝每人月 {total_switch / person_months:.3%}；"
               f"離開「穩定生活」的切換 **{left_stable}** 次。")
    streaks = defaultdict(list)
    initial_done = defaultdict(lambda: Counter())
    for r in runs:
        for goals in r["life"].values():
            for i, (t, gid, start, end, why) in enumerate(goals):
                streaks[t].append(end - start)
            first = goals[0]
            initial_done[first[0]]["n"] += 1
            initial_done[first[0]]["completed"] += first[4] == "target_reached"
            if first[4] == "target_reached":
                initial_done[first[0]]["months"] += first[3] - first[2]
    out += ["", "| 目標類型 | 目標段數 | 壽命中位（月） | p90 | 最長 | 起始目標 60 月內完成率 | 完成者平均耗時（月） |",
            "|---|---:|---:|---:|---:|---:|---:|"]
    for t in TYPES:
        s = streaks[t]
        d = initial_done[t]
        done = f"{d['completed'] / d['n']:.0%}" if d["n"] else "—"
        avg = f"{d['months'] / d['completed']:.1f}" if d["completed"] else "—"
        out.append(f"| {t} | {len(s):,} | {q(s, .5)} | {q(s, .9)} | {max(s) if s else '—'} | {done} | {avg} |")
    out.append("")
    longest = [max(end - start for t, gid, start, end, why in goals) for r in runs for goals in r["life"].values()]
    in_stable = sum(1 for r in runs for goals in r["life"].values() if goals[-1][0] == "穩定生活")
    people = sum(len(r["life"]) for r in runs)
    out.append(f"- 每人最長同一目標連續月數：中位 {q(longest, .5)}、p90 {q(longest, .9)}、最長 {max(longest)}"
               f"（含被 60 月截斷者）。60 月結束時最後一個目標為「穩定生活」的人（含已故）：{in_stable:,}／{people:,}＝{in_stable / people:.1%}。")
    # 4. stalls / replans
    stalled = sum(r["stalled"] for r in runs)
    fp = Counter()
    for r in runs:
        fp.update(r["final_plan"])
    out.append(f"- 「目標受挫」事件 {stalled:,} 次（每 seed 平均 {stalled / len(runs):.1f}）；第 60 月仍持有「探索靈氣」的人中 "
               f"{fp['plan_action_not_research']}／{fp['research_goal_people']} 人的 `plan.action` 不是「研究」（#9 的不一致）。")
    out.append("")
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=int, default=30)
    args = ap.parse_args()
    expected = json.loads((BASE / "m2-experiments-raw.json").read_text())["groups"]
    groups = {"B 完整規則": None, "C 去計畫加分（no_plan）": "no_plan"}
    for (name, abl), key in zip(groups.items(), ("full", "no_plan")):
        runs = []
        for seed in range(args.seeds):
            r = run(seed, abl)
            assert r["hash"] == expected[key][seed]["hash"], (seed, key, "hash differs from locked experiments")
            runs.append(r)
        print(summarize(name, runs), flush=True)


if __name__ == "__main__":
    main()
