"""Read-only multi-seed measurement of the exploration setback ("目標受挫") on rules 0.2.2 (issue #9).

Questions fixed in advance on the #9 claim: how often does an exploring goal hit a setback, does it repeat every
4 months, how long do `plan.step` and `plan.action` disagree afterwards, and how do people recover (research
actions, completion)? Development seeds 0-29 only, rules 0.2.2, nothing tuned, nothing changed; this script does
not try to make the setback event disappear and does not judge any acceptance item.

Usage: PYTHONPATH=. python3 artifacts/run_m2_setback_recovery.py [--out artifacts/m2-setback-recovery.md]
"""
import argparse
import statistics
from collections import Counter, defaultdict

from earth_ascension import m2
from earth_ascension.m2 import advance, new_world

SEEDS = range(0, 30)
MONTHS = 60
EXPLORE = "探索靈氣"


def run(seed):
    assert seed in SEEDS, "only development seeds are measured"
    assert m2.M2_VERSION == "0.2.2"
    world = new_world(seed, "0.2.2")
    kinds, seen = {}, 0
    rows = defaultdict(list)
    for month in range(1, MONTHS + 1):
        for event in world["events"][seen:]:
            kinds[event["event_id"]] = event["kind"]
        seen = len(world["events"])
        pre = {k: (p["plan"]["action"], p["plan"]["step"]) for k, p in world["people"].items() if p["alive"]}
        advance(world)
        for k, (plan_action, plan_step) in pre.items():
            d = world["people"][k]["last_decision"]
            if d is None or d["state_month"] != month - 1:
                continue
            rows[k].append({"month": month, "action": d["action"], "goal_id": d["goal_id"], "goal": d["goal_label"],
                            "plan_action": plan_action, "plan_step": plan_step,
                            "setback_memory": any(kinds.get(e) == "目標受挫" for e in d["memory_event_ids"]),
                            "scores": d["scores"], "noise": d["noise"], "feasible": d["feasible"]})
    setbacks = defaultdict(list)   # goal id -> setback months
    for event in world["events"]:
        if event["kind"] == "目標受挫":
            setbacks[event["effects"]["goal_id"]].append(event["month"])
    goals = {}
    for k, p in world["people"].items():
        for g in p["goal_history"] + p["goals"]:
            if g["type"] == EXPLORE:
                goals[g["id"]] = {"person": k, "status": g["status"], "alive": p["alive"], "progress": g["progress"],
                                  "target": g["target"], "started": g["started_month"]}
    return {"rows": rows, "setbacks": setbacks, "goals": goals, "n_people": len(world["people"])}


def pct(a, b):
    return f"{a / b:.1%}" if b else "—"


def mean(xs):
    return statistics.mean(xs) if xs else float("nan")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out")
    args = ap.parse_args()
    data = {s: run(s) for s in SEEDS}
    again = run(0)
    same = again["setbacks"] == data[0]["setbacks"] and \
        {k: [(r["month"], r["action"]) for r in v] for k, v in again["rows"].items()} == \
        {k: [(r["month"], r["action"]) for r in v] for k, v in data[0]["rows"].items()}

    rows_by_goal = defaultdict(list)
    for s in SEEDS:
        for k, rows in data[s]["rows"].items():
            for r in rows:
                rows_by_goal[(s, r["goal_id"], k)].append(r)
    explore = []  # one dict per exploring goal that was actually decided on
    for s in SEEDS:
        for gid, g in data[s]["goals"].items():
            rs = rows_by_goal.get((s, gid, g["person"]), [])
            if not rs:
                continue
            sb = sorted(data[s]["setbacks"].get(gid, []))
            explore.append({"seed": s, "id": gid, "g": g, "rows": rs, "sb": sb})
    with_sb = [e for e in explore if e["sb"]]
    without = [e for e in explore if not e["sb"]]
    people = sum(data[s]["n_people"] for s in SEEDS)
    person_goals = defaultdict(list)
    for e in explore:
        person_goals[(e["seed"], e["g"]["person"])].append(e)
    p1 = sum(1 for v in person_goals.values() if any(e["sb"] for e in v))
    p2 = sum(1 for v in person_goals.values() if sum(len(e["sb"]) for e in v) >= 2)
    total_sb = sum(len(e["sb"]) for e in explore)

    out = ["# #9：探索靈氣「目標受挫」在規則 0.2.2 的配對量測（唯讀）", "",
           f"開發 seed 0–29、各 100 NPC×60 月（{people} 人）。唯讀：不改規則、不調參、不以消除受挫事件為目標、不碰 seed 30 以上；"
           f"可重現：seed 0 再跑一次受挫與逐月行動完全相同＝{same}。這是描述，不判定 A3／A4。", ""]

    out += ["## 1. 受挫發生頻率", "",
            f"- 有決策月的探索靈氣目標 {len(explore)} 個；其中至少受挫一次 {len(with_sb)} 個（{pct(len(with_sb), len(explore))}）；受挫事件共 {total_sb} 次。",
            f"- 人物層級：曾有探索目標的 {len(person_goals)} 人中，受挫過一次以上 {p1}（{pct(p1, len(person_goals))}），兩次以上 {p2}（{pct(p2, len(person_goals))}）。",
            "- 每個受挫目標的受挫次數分布：" + "、".join(f"{n} 次×{c}" for n, c in sorted(Counter(len(e['sb']) for e in with_sb).items())),
            ]
    gaps = [b - a for e in with_sb for a, b in zip(e["sb"], e["sb"][1:])]
    out += [f"- 同一目標內連續受挫的間隔（月）：{dict(sorted(Counter(gaps).items())) or '無'}；間隔 4 月（每個檢查週期都再觸發）占 {pct(sum(g == 4 for g in gaps), len(gaps))}。", ""]

    # 2. plan/action mismatch after setback
    post, pre = [], []
    for e in with_sb:
        first = e["sb"][0]
        for r in e["rows"]:
            (post if r["month"] > first else pre).append(r)
    mism = lambda r: r["plan_action"] != "研究"
    out += ["## 2. `plan.step`↔`plan.action` 不一致", "",
            f"- 受挫目標在**第一次受挫前**的決策月：{len(pre)}；`plan.action` 不是研究的有 {sum(map(mism, pre))}（{pct(sum(map(mism, pre)), len(pre))}），而 `plan.step` 都是「累積研究紀錄」＝{all(r['plan_step'] == '累積研究紀錄' for r in pre)}。",
            f"- **第一次受挫後**的決策月：{len(post)}；`plan.action` 不是研究（工作／學習）的 {sum(map(mism, post))}（{pct(sum(map(mism, post)), len(post))}），而 `plan.step` 仍是「累積研究紀錄」的 {sum(r['plan_step'] == '累積研究紀錄' for r in post)}（{pct(sum(r['plan_step'] == '累積研究紀錄' for r in post), len(post))}）。",
            "- 受挫後 `plan.action` 的分布：" + "、".join(f"{a} {n}" for a, n in Counter(r["plan_action"] for r in post).most_common()), ""]
    unrestored = sum(1 for e in with_sb if e["rows"][-1]["plan_action"] != "研究")
    out += [f"- 受挫目標在**最後一個決策月**仍然是「計畫行動≠研究」的：{unrestored}/{len(with_sb)}（{pct(unrestored, len(with_sb))}）；其中目標已完成的 {sum(1 for e in with_sb if e['g']['status'] == 'completed' and e['rows'][-1]['plan_action'] != '研究')}。"
            " 恢復條件只有「目標結束後換新計畫」，沒有目標進行中的恢復出口。", ""]

    # 3. recovery
    def research_share(rs):
        return pct(sum(r["action"] == "研究" for r in rs), len(rs))
    wait = []
    for e in with_sb:
        first = e["sb"][0]
        nxt = [r["month"] for r in e["rows"] if r["month"] > first and r["action"] == "研究"]
        wait.append(nxt[0] - first if nxt else None)
    got = [w for w in wait if w is not None]
    out += ["## 3. 研究恢復與完成", "",
            f"- 研究行動占比：受挫目標第一次受挫前 {research_share(pre)}、受挫後 {research_share(post)}；未受挫的探索目標全期 {research_share([r for e in without for r in e['rows']])}。",
            f"- 第一次受挫後到下一次研究行動的月數：中位 {statistics.median(got):.0f}、平均 {mean(got):.2f}、最長 {max(got)}；受挫後從未再研究（到目標結束或 60 月）的目標 {wait.count(None)}（{pct(wait.count(None), len(with_sb))}）。" if got else "- 受挫後沒有任何恢復資料。", "",
            "| 探索目標群 | 目標數 | 已完成 | 仍進行中（含 60 月截斷） | 人物已死 | 已完成者平均決策月數 |", "|---|---|---|---|---|---|"]
    for label, group in (("至少受挫一次", with_sb), ("從未受挫", without)):
        done = [e for e in group if e["g"]["status"] == "completed"]
        dead = [e for e in group if e["g"]["status"] != "completed" and not e["g"]["alive"]]
        out.append(f"| {label} | {len(group)} | {len(done)}（{pct(len(done), len(group))}） | {len(group) - len(done) - len(dead)} | {len(dead)} | {mean([len(e['rows']) for e in done]):.1f} |")
    out += ["", "（探索目標只因完成而結束，所以「仍進行中」是被 60 月截斷或人物已死；兩群的啟動月分布不同，完成率不能直接當成因果。）", ""]

    def gap(rs):
        return mean([r["scores"]["研究"] - max(r["scores"][a] for a in r["feasible"] if a != "研究") for r in rs])

    def noiseless_research(rs):
        order = list(m2.ACTIONS)
        return pct(sum(max(r["feasible"], key=lambda a: (r["scores"][a], -order.index(a))) == "研究" for r in rs), len(rs))
    out += ["- 分數（決策時、不含波動）：研究減去其餘可行行動最高分的平均差：受挫前 "
            f"{gap(pre):+.2f}、受挫後 {gap(post):+.2f}（未受挫探索目標 {gap([r for e in without for r in e['rows']]):+.2f}）；"
            f"不計波動時研究是最高分的月份：受挫前 {noiseless_research(pre)}、受挫後 {noiseless_research(post)}、未受挫 {noiseless_research([r for e in without for r in e['rows']])}。",
            "- 注意選擇效應：目標會在「連續 4 個月沒有研究進展」的檢查月才受挫，所以「受挫前」的研究占比與分數差本來就偏低；它不是事前的健康基線。", ""]

    # 4. setback memory
    rr = [r for s in SEEDS for rows in data[s]["rows"].values() for r in rows]
    mem = [r for r in rr if r["setback_memory"]]
    out += ["## 4. 受挫記憶（研究 −0.4、12 月）影響的月數", "",
            f"- 全部決策月 {len(rr)} 中，受挫記憶在當月決策被引用的 {len(mem)}（{pct(len(mem), len(rr))}）；這些月份選研究的比例 {research_share(mem)}（全體研究占 {research_share(rr)}）。", ""]

    out += ["## 5. 候選規格（文字，未實作、待維護者決定；限於探索靈氣）", "",
            "依 #9 維護者決定「限於探索靈氣的一個最小版本候選」。這只是規格草案，不是規則改動。", "",
            "- **進入**（不變）：檢查月且連續 4 個月沒有研究進展 → `目標受挫` 事件（保留，不為了讓事件變少而改）。",
            "- **持續（新）**：受挫時計畫明確進入「備援期」：`plan.step` 同步改寫成與行動一致的文字（例如「補足生計」或「進修準備」），並記錄 `recovery_review_month = 下一個檢查月`；備援期**只有一個既有檢查週期（4 月）**，不新增參數，也不採用財富門檻或 8 個月數值。",
            "- **恢復（新）**：到下一個檢查月，計畫自動恢復成探索目標的預設（`plan.step`＝累積研究紀錄、`plan.action`＝研究），並寫一筆有來源的 `計畫恢復` 事件（causes＝該次 `目標受挫` 事件 ID）。每次計畫變動（進入、恢復）都有事件來源。",
            "- **再次受挫**：恢復後仍要再經過完整 4 個月無研究進展的檢查月才會再受挫，所以同一目標的受挫間隔至少 8 月（目前 96.2% 是每 4 月重複）。",
            "- **版本與相容**：新 rules version（例如 0.2.3，以 `rules_version` 閘門）；不新增 RNG purpose、不改 `RNG_NAMESPACE`；0.2.0–0.2.2 存檔繼續以原規則回放，golden hash 不變，新增 0.2.3 基線。",
            "- **要回答的實驗（實作後才跑；開發 seed 0–29 配對）**：受挫者是否仍反覆每 4 月觸發、`step↔action` 不一致月數、研究恢復率與到下次研究的月數、探索目標完成率與持續月數、財富／生計、長連續段（#35）。成功標準不是「受挫事件變少」，而是計畫與行動可解釋、且受挫後能恢復。",
            "- **待維護者決定**：備援期行動是學習還是工作、是否隨財富而不同；備援期長度是否固定 4 月；受挫記憶（研究 −0.4、12 月）要不要保留；其他目標的受挫是否等 #4 規則表。", ""]
    out += ["## 讀法與限制", "",
            "- 這只描述 0.2.2 目前的行為，不是規則修改；是否採用任何修復、門檻與數值由維護者決定。",
            "- `plan.action`／`plan.step` 取自每月決策前的人物狀態（決策用的就是這個狀態）。",
            "- 受挫前後比較是同一批目標的前後，不是配對 seed 反事實；配對比較需要先有候選規則才能做。",
            "- 沒有執行保留 seed；沒有宣稱任何驗收通過或失敗。", ""]
    text = "\n".join(out).rstrip("\n")
    print(text)
    if args.out:
        open(args.out, "w", encoding="utf-8").write(text + "\n")


if __name__ == "__main__":
    main()
