"""Exercise the localhost service end-to-end with a disposable M2 database."""
import json
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = "http://127.0.0.1:18766"


def get(path):
    with urlopen(ROOT + path) as response:
        return response.status, response.read()


def post(path, data):
    request = Request(ROOT + path, json.dumps(data, ensure_ascii=False).encode(),
                      {"Content-Type": "application/json"})
    try:
        with urlopen(request) as response:
            return response.status, json.load(response)
    except HTTPError as error:
        return error.code, json.load(error)


def main():
    html_status, html = get("/")
    js_status, js = get("/m2.js")
    world = json.loads(get("/api/world")[1])
    assert html_status == js_status == 200 and b"m2Observer" in js and b"/m2.js" in html
    assert world["version"] == "0.2.0" and world["month"] == 0
    payload = {"name": "端到端驗收", "district": "學園", "goal": "探索靈氣", "budget": 30,
               "traits": {"根骨": 5, "悟性": 8, "意志": 6, "感知": 7, "社交": 4}, "answers": [3]*16}
    created, person = post("/api/characters", payload)
    assert created == 201 and person["player"]
    first, reply = post("/api/advance", {"expected_month": 0})
    assert first == 200 and reply["world"]["month"] == 1
    duplicate, _ = post("/api/advance", {"expected_month": 0})
    assert duplicate == 400
    for month in range(1, 12):
        status, reply = post("/api/advance", {"expected_month": month})
        assert status == 200 and reply["world"]["month"] == month + 1
    current = reply["world"]["people"][str(person["id"])]
    assert current["last_decision"]["outcome_event_ids"]
    assert json.loads(get("/api/world?month=1")[1])["month"] == 1
    print({"page": html_status, "script": js_status, "created": person["id"],
           "duplicate_status": duplicate, "current_month": reply["world"]["month"],
           "player_action": current["last_action"]["action"], "memory_count": len(current["memories_v2"])})


if __name__ == "__main__":
    main()
