"""Real-browser check of the deceased-character observer card (A8, issue #12).

Three temporary saves, all built in a temp dir through real `Store.advance` (nothing is hand-written into a snapshot
except the starting age that forces a death): (1) an M2-native death (event has `actor`), (2) an M1 0.1.0 save whose
death event has only `subject`, migrated with `Store.migrate_copy`, with a dead player who has a free-text goal and
a living player with one, (3) a copy of (2) whose death event is removed, to prove the card does not invent a source.
Drives Chrome with real clicks (person list, history-month <select>, source buttons). Needs the optional `playwright`
package and a Chrome binary; neither is a project dependency.
Usage: PYTHONPATH=. python3 artifacts/run_m2_ui_deceased_check.py [--chrome /path/to/chrome] [--port 18796]
"""
import argparse
import json
import sqlite3
import subprocess
import sys
import tempfile
import time
import urllib.request
from contextlib import closing
from pathlib import Path

from earth_ascension import m2
from earth_ascension.engine import initial_world
from earth_ascension.store import Store

TABS = ["世界總覽", "創造人物", "人物觀察", "組織", "世界編年史", "生命歷程"]


def build_m2_native(path):
    st = Store(path)
    world = m2.new_world(7)
    world["people"]["5"]["age"] = 1000
    state, digest = st._encode(world)
    with st._connect() as db:
        db.execute("UPDATE snapshots SET state=? WHERE month=0", (state,))
        db.execute("UPDATE meta SET value=? WHERE key='state_hash:0'", (digest,))
    st.advance(0)


def build_m1(path):
    world = initial_world(23)
    world["people"]["1"].update(age=900, goal="環遊世界", player=True)      # dies in month 1
    world["people"]["2"].update(goal="尋找失落之城", player=True)            # stays alive
    with closing(sqlite3.connect(path)) as db:
        db.executescript("CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);"
                         "CREATE TABLE snapshots(month INTEGER PRIMARY KEY,state TEXT NOT NULL);"
                         "CREATE TABLE events(id INTEGER PRIMARY KEY AUTOINCREMENT,month INTEGER NOT NULL,"
                         "kind TEXT NOT NULL,subject INTEGER,payload TEXT NOT NULL);")
        db.execute("INSERT INTO meta VALUES('current_month','0')")
        db.execute("INSERT INTO snapshots VALUES(0,?)", (json.dumps(world, ensure_ascii=False),))
        db.commit()
    Store(path).advance(0)


def strip_death_event(path):
    st = Store(path)
    world = st.read()
    world["events"] = [e for e in world["events"] if e["kind"] != "死亡"]
    state, digest = st._encode(world)
    with st._connect() as db:
        db.execute("UPDATE snapshots SET state=? WHERE month=?", (state, world["month"]))
        db.execute("UPDATE meta SET value=? WHERE key=?", (digest, f"state_hash:{world['month']}"))


def card(pg):
    return pg.locator("div.card:has(.eyebrow)").first.inner_text().replace("\n", " | ")


def pick(pg, pid):
    pg.click("text=人物觀察")
    pg.click(f'[data-person="{pid}"]')
    pg.wait_for_function(f"selected=={pid}")


def pick_history_month(pg, month):
    pg.click("text=世界編年史")
    pg.select_option("#historyMonth", str(month))
    pg.wait_for_function(f"viewMonth=={month}")


def serve(path, port, chrome, fn):
    from playwright.sync_api import sync_playwright
    base = f"http://127.0.0.1:{port}/"
    server = subprocess.Popen([sys.executable, "-m", "earth_ascension.server", "--db", str(path), "--port", str(port)],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                urllib.request.urlopen(base + "api/world"); break
            except Exception:
                time.sleep(.2)
        with sync_playwright() as pw:
            b = pw.chromium.launch(executable_path=chrome, headless=True, args=["--no-sandbox"])
            pg = b.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.goto(base); pg.wait_for_selector("#advance")
            fn(pg, lambda m=None: json.load(urllib.request.urlopen(base + "api/world" + ("" if m is None else f"?month={m}"))))
            assert not errs, errs
            b.close()
    finally:
        server.terminate(); server.wait()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--chrome", default="/usr/bin/google-chrome")
    ap.add_argument("--port", type=int, default=18796)
    args = ap.parse_args()
    log = lambda *a: print(*a, flush=True)
    with tempfile.TemporaryDirectory() as d:
        d = Path(d)

        def native(pg, api):
            w = api(); ev = next(e for e in w["events"] if e["kind"] == "死亡" and e.get("actor") == 5)
            pick(pg, 5); t = card(pg); log("[M2 native dead]", t[:300])
            assert "離世時的長期目標" in t and "月離世" in t and "下次檢查" not in t and "不在目前快照" not in t
            btn = pg.locator("div.card:has(.eyebrow) button[data-event]").first
            assert btn.get_attribute("data-event") == ev["event_id"]
            btn.click(); pg.wait_for_function(f"viewMonth=={ev['month']}")
            assert pg.locator(f"[id='event-{ev['event_id']}']").count() == 1
            log("  source", ev["event_id"], "-> history month", ev["month"], "row present")
            pick_history_month(pg, 0); pick(pg, 5); t0 = card(pg)
            assert "下次檢查" in t0 and "月離世" not in t0; log("  month 0 shows alive again")
            pg.click("text=世界編年史"); pg.click("#live"); pg.wait_for_function("viewMonth===null")
            alive = next(p for p in w["people"].values() if p["alive"]); pick(pg, alive["id"])
            ta = card(pg); assert "下次檢查" in ta and "月離世" not in ta; log("  living person unchanged")
            for n in TABS:
                pg.click(f"text={n}"); assert pg.locator("#content").inner_text().strip(), n
            log("  six tabs render")
        build_m2_native(d / "native.sqlite3"); serve(d / "native.sqlite3", args.port, args.chrome, native)

        m1, mig, miss = d / "m1.sqlite3", d / "mig.sqlite3", d / "mig-missing.sqlite3"
        build_m1(m1); Store.migrate_copy(m1, mig); Store.migrate_copy(m1, miss); strip_death_event(miss)

        def migrated(pg, api):
            w = api(); dead, live = w["people"]["1"], w["people"]["2"]
            ev = next(e for e in w["events"] if e["kind"] == "死亡" and e.get("subject") == 1)
            assert not dead["alive"] and dead["goals"][0]["type"] == "legacy_custom" and "actor" not in ev
            log("migrated:", w["version"], "month", w["month"], "death event", ev["event_id"], "(subject only)")
            pick(pg, 1); t = card(pg); log("[migrated dead legacy_custom player]", t[:300])
            assert "月離世" in t and "不在目前快照" not in t and pg.locator("#choose-goal").count() == 0
            btn = pg.locator("div.card:has(.eyebrow) button[data-event]").first
            assert btn.get_attribute("data-event") == ev["event_id"]
            btn.click(); pg.wait_for_function(f"viewMonth=={ev['month']}")
            assert pg.locator(f"[id='event-{ev['event_id']}']").count() == 1
            log("  source", ev["event_id"], "-> history month", ev["month"], "row present; no #choose-goal for the dead player")
            pg.click("text=世界編年史"); pg.click("#live"); pg.wait_for_function("viewMonth===null")
            pick(pg, 2); assert pg.locator("#choose-goal").count() == 1 and live["alive"]
            log("  living legacy_custom player still offered #choose-goal")
            pick_history_month(pg, 0); log("  month 0 is", api(0)["version"])
            for n in TABS:
                pg.click(f"text={n}"); assert pg.locator("#content").inner_text().strip(), n
            log("  M1 month 0 + six tabs render")
        serve(mig, args.port, args.chrome, migrated)

        def missing(pg, api):
            pick(pg, 1); t = card(pg); log("[death event removed]", t[:260])
            assert "離世事件來源不在目前快照" in t and pg.locator("div.card:has(.eyebrow) button[data-event]").count() == 0
            log("  falls back to the plain notice; no invented source")
        serve(miss, args.port, args.chrome, missing)
    log("OK")


if __name__ == "__main__":
    main()
