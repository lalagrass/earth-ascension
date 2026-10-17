"""Small reproducible M1 rule experiments; no external data or API."""
from collections import Counter
from pathlib import Path

from earth_ascension.engine import advance, initial_world

seeds = range(1, 21)


def run(seed, traits, profile):
    world = initial_world(seed)
    p = world["people"]["1"]
    p["traits"] = dict(zip(p["traits"], traits))
    p["budget"] = sum(traits)
    p["profile"].update(profile)
    p["goal"] = "探索靈氣"
    actions = Counter()
    for _ in range(12):
        advance(world)
        actions[p["last_action"]["action"]] += 1
    return actions, p["skills"]["研究"], sum(e["kind"] == "發現" for e in p["chronicle"])


profiles = {
    "社交傾向": {"外向": 1, "關懷": 1, "探索": 0, "開放": .3},
    "探索傾向": {"外向": 0, "關懷": 0, "探索": 1, "開放": 1},
}
lines = ["# M1 規則實驗", "", "每組 20 個 seed，每個 seed 12 個月；只比較規則行動與發現，不將樣本當作社會或心理學結論。", "", "## A：相同能力，不同偏好", "", "| 偏好 | 社交月數 | 研究月數 | 發現次數 |", "|---|---:|---:|---:|"]
for label, profile in profiles.items():
    results = [run(seed, [6]*5, profile) for seed in seeds]
    lines.append(f"| {label} | {sum(x[0]['社交'] for x in results)} | {sum(x[0]['研究'] for x in results)} | {sum(x[2] for x in results)} |")
lines += ["", "## B：30／35／40 點", "", "各能力均分，保持相同人格與目標。", "", "| 點數 | 研究月數 | 研究技能總和 | 發現次數 |", "|---:|---:|---:|---:|"]
for budget, value in [(30,6),(35,7),(40,8)]:
    results = [run(seed, [value]*5, {"探索":.7,"外向":.4,"關懷":.5,"開放":.7}) for seed in seeds]
    lines.append(f"| {budget} | {sum(x[0]['研究'] for x in results)} | {sum(x[1] for x in results)} | {sum(x[2] for x in results)} |")
lines += ["", "此測試顯示機制差異；點數平衡與 Pay-to-Win 評估需要更完整的目標、成功指標與較大樣本。", ""]
Path("artifacts/experiments.md").write_text("\n".join(lines), encoding="utf-8")
print("Generated artifacts/experiments.md")
