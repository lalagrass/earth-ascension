"""Exercise the actual localhost HTTP API, then write a 12-month evidence report."""
import json
from pathlib import Path
from urllib.request import Request, urlopen

BASE = "http://127.0.0.1:18765"


def get(path):
    with urlopen(BASE + path) as response:
        return json.load(response)


def post(path, body):
    req = Request(BASE + path, json.dumps(body, ensure_ascii=False).encode(),
                  {"Content-Type": "application/json"}, method="POST")
    with urlopen(req) as response:
        return json.load(response)


initial = get("/api/world")
assert initial["month"] == 0, "Demo database must start empty"
character = post("/api/characters", {
    "name": "林知夏", "district": "學園", "goal": "探索靈氣", "budget": 30,
    "traits": {"根骨": 5, "悟性": 8, "意志": 6, "感知": 7, "社交": 4},
    "answers": [5, 4, 2, 4, 4, 5, 2, 4, 5, 4, 2, 4, 4, 5, 2, 4]})
pid = str(character["id"])
monthly = []
for month in range(12):
    response = post("/api/advance", {"expected_month": month})
    state = response["world"]
    p = state["people"][pid]
    monthly.append((month + 1, p["last_action"]["action"], p["last_action"]["outcome"],
                    p["health"], p["wealth"], state["knowledge"], len(response["events"])))
assert get("/api/world")["month"] == 12
assert get("/api/world?month=0")["month"] == 0
assert get("/api/world?month=6")["month"] == 6
lines = ["# 12 個月 HTTP 端到端範例", "", "由 `artifacts/run_demo.py` 對實際執行中的本機 Dashboard API 建立人物與逐月操作；種子 2026、規則 0.1.0。", "",
         "| 月 | 林知夏行動 | 結果 | 健康 | 財富 | 世界知識 | 當月事件 |",
         "|---:|---|---|---:|---:|---:|---:|"]
for row in monthly:
    lines.append("| " + " | ".join(map(str, row)) + " |")
final = get("/api/world")
p = final["people"][pid]
lines += ["", "## 角色生命歷程", "", f"姓名：{p['name']}；年齡：{p['age']}；目標：{p['goal']}；技能：{p['skills']}。", ""]
lines += [f"- 第 {e['month']} 月：{e['text']}（原因：{'、'.join(e['causes'])}）" for e in p["chronicle"]]
lines += ["", "## 世界狀態", "", f"第 12 月：具名存活 {sum(x['alive'] for x in final['people'].values())} 名；世界知識 {final['knowledge']}；組織 {len(final['organizations'])} 個。", ""]
Path("artifacts/12-month-example.md").write_text("\n".join(lines), encoding="utf-8")
print("Generated artifacts/12-month-example.md; character", pid, "month", final["month"])
