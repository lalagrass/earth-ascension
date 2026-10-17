"""Real-browser check of the migrated legacy custom-goal reselect flow (A8/A9, issue #12).

Builds a real M1 0.1.0 save in a temp dir (player with a free-text goal, advanced 1 month), copies it
with `python3 -m earth_ascension.migrate`, serves the copy, then drives Chrome. Needs the optional
`playwright` package and a Chrome binary (default /usr/bin/google-chrome); neither is a project dependency.
Every UI step is a real click or <select> choice (person list, history-month menu, event-source button); no page
function is called directly.
Usage: PYTHONPATH=. python3 artifacts/run_m2_ui_legacy_goal_check.py [--chrome /path/to/chrome] [--port 18797] [--shots DIR]
"""
import argparse
import hashlib
import json
import sqlite3
import subprocess
import sys
import tempfile
import time
import urllib.request
from contextlib import closing
from pathlib import Path

from earth_ascension.engine import initial_world
from earth_ascension.store import Store


def build_m1(path):
    with closing(sqlite3.connect(path)) as db:
        db.executescript("CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);"
                         "CREATE TABLE snapshots(month INTEGER PRIMARY KEY,state TEXT NOT NULL);"
                         "CREATE TABLE events(id INTEGER PRIMARY KEY AUTOINCREMENT,month INTEGER NOT NULL,"
                         "kind TEXT NOT NULL,subject INTEGER,payload TEXT NOT NULL);")
        db.execute("INSERT INTO meta VALUES('current_month','0')")
        db.execute("INSERT INTO snapshots VALUES(0,?)", (json.dumps(initial_world(23), ensure_ascii=False),))
        db.commit()
    m1 = Store(path)
    m1.create_character({"name": "舊玩家", "district": "學園", "goal": "自訂的人生願望", "budget": 30,
                         "traits": {"根骨": 5, "悟性": 8, "意志": 6, "感知": 7, "社交": 4}, "answers": [3] * 16})
    m1.advance(0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--chrome", default="/usr/bin/google-chrome")
    ap.add_argument("--port", type=int, default=18797)
    ap.add_argument("--shots", help="directory for the before/after card screenshots (small PNGs)")
    args = ap.parse_args()
    from playwright.sync_api import sync_playwright
    base = f"http://127.0.0.1:{args.port}/"
    api = lambda month=None: json.load(urllib.request.urlopen(base + "api/world" + ("" if month is None else f"?month={month}")))
    log = lambda *a: print(*a, flush=True)
    with tempfile.TemporaryDirectory() as d:
        src, dst = Path(d) / "old-m1.sqlite3", Path(d) / "new-m2.sqlite3"
        build_m1(src)
        src_hash = hashlib.sha256(src.read_bytes()).hexdigest()
        subprocess.run([sys.executable, "-m", "earth_ascension.migrate", str(src), str(dst)], check=True)
        assert hashlib.sha256(src.read_bytes()).hexdigest() == src_hash, "source file changed"
        server = subprocess.Popen([sys.executable, "-m", "earth_ascension.server", "--db", str(dst), "--port", str(args.port)],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            for _ in range(50):
                try:
                    api(); break
                except Exception:
                    time.sleep(.2)
            w = api(); p = w["people"]["101"]
            log("migrated:", w["version"], "month", w["month"], "player goal type", p["goals"][0]["type"], p["goals"][0]["label"])
            assert p["goals"][0]["type"] == "legacy_custom"
            with sync_playwright() as pw:
                b = pw.chromium.launch(executable_path=args.chrome, headless=True, args=["--no-sandbox"])
                pg = b.new_page(); errs = []
                pg.on("pageerror", lambda e: errs.append(str(e)))
                pg.goto(base); pg.wait_for_selector("#advance")
                pg.click("text=人物觀察")
                other = pg.locator('[data-person]:not([data-person="101"])').first
                other.click(); assert "AUTONOMOUS NPC" in pg.locator("#content").inner_text()   # selection really changes
                pg.click('[data-person="101"]'); pg.wait_for_function("selected==101")
                assert "PLAYER CHARACTER" in pg.locator("#content").inner_text() and "ID 101" in pg.locator("#content").inner_text()
                text = pg.locator("#content").inner_text()
                log("before:", text[text.index("PLAYER"):][:260].replace("\n", " | "))
                assert "自訂的人生願望" in text and "舊存檔自訂目標" in text and pg.locator("#choose-goal").count() == 1
                shot = lambda name: args.shots and pg.locator("div.card:has(.eyebrow)").first.screenshot(path=str(Path(args.shots) / name))
                if args.shots: Path(args.shots).mkdir(parents=True, exist_ok=True)
                shot("legacy-goal-before.png")
                pg.select_option("#legacy-goal", "探索靈氣"); pg.click("#choose-goal")
                pg.wait_for_function("document.getElementById('notice').innerText.includes('舊目標已明確改選')")
                text = pg.locator("#content").inner_text()
                log("after:", text[text.index("PLAYER"):][:260].replace("\n", " | "))
                assert "長期目標：探索靈氣" in text and pg.locator("#choose-goal").count() == 0
                shot("legacy-goal-after.png")
                w = api(); p = w["people"]["101"]
                assert p["goals"][0]["type"] == "探索靈氣" and p["goal_history"][0]["label"] == "自訂的人生願望"
                assert any(e["kind"] == "目標重選" for e in p["chronicle"])
                log("saved state: goal", p["goals"][0]["type"], "| history keeps", p["goal_history"][0]["label"], "| 目標重選 event present")
                reselect = next(e for e in p["chronicle"] if e["kind"] == "目標重選")
                pg.click("text=人物觀察"); pg.click('[data-person="101"]'); pg.wait_for_function("selected==101")
                src = pg.locator(f'button[data-event="{reselect["event_id"]}"]')
                assert src.count() >= 1, "no clickable source for the 目標重選 event on the observer page"
                src.first.click(); pg.wait_for_function(f"viewMonth=={reselect['month']}")
                assert pg.locator(f"[id='event-{reselect['event_id']}']").count() == 1
                log("clicked source", reselect["event_id"], "-> history month", reselect["month"], "; event row present")
                pg.click("#live"); pg.wait_for_function("viewMonth===null")
                pg.click("#advance"); pg.wait_for_function(f"world.month=={w['month'] + 1}")
                log("advanced one month ok; month", api()["month"])
                pg.click("text=世界編年史"); pg.select_option("#historyMonth", "0"); pg.wait_for_function("viewMonth===0")
                assert pg.locator("#historyMonth").input_value() == "0" and api(0)["version"] == "0.1.0"
                log("history menu -> month 0 (M1 snapshot, version", api(0)["version"] + ") renders:",
                    bool(pg.locator("#content").inner_text().strip()))
                pg.click("#live"); pg.wait_for_function("viewMonth===null")
                for n in ["世界總覽", "創造人物", "人物觀察", "組織", "世界編年史", "生命歷程"]:
                    pg.click(f"text={n}"); assert pg.locator("#content").inner_text().strip(), n
                log("six tabs render; page errors:", errs); assert not errs
                b.close()
            log("OK")
        finally:
            server.terminate()


if __name__ == "__main__":
    main()
