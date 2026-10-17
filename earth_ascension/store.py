"""SQLite state, history snapshots, and atomic monthly commits."""
import copy
import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from .engine import advance, initial_world, make_person, score_answers, validate_traits, validate_world, DISTRICTS


class Store:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS snapshots (month INTEGER PRIMARY KEY, state TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, month INTEGER NOT NULL,
                    kind TEXT NOT NULL, subject INTEGER, payload TEXT NOT NULL);
            """)
            if not db.execute("SELECT 1 FROM meta WHERE key='current_month'").fetchone():
                world = initial_world()
                db.execute("INSERT INTO meta VALUES ('current_month','0')")
                db.execute("INSERT INTO snapshots VALUES (0,?)", (json.dumps(world, ensure_ascii=False),))

    @contextmanager
    def _connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.execute("PRAGMA busy_timeout=10000")
        try:
            with db:
                yield db
        finally:
            db.close()

    @staticmethod
    def _load(db, month=None):
        if month is None:
            month = int(db.execute("SELECT value FROM meta WHERE key='current_month'").fetchone()[0])
        row = db.execute("SELECT state FROM snapshots WHERE month=?", (month,)).fetchone()
        if not row:
            raise ValueError("找不到該月歷史")
        return json.loads(row[0])

    def read(self, month=None):
        with self._connect() as db:
            return self._load(db, month)

    def create_character(self, data):
        name = str(data.get("name", "")).strip()
        district = data.get("district")
        goal = str(data.get("goal", "")).strip()
        if not 1 <= len(name) <= 24 or any(c in name for c in "<>\n\r"):
            raise ValueError("姓名須為 1–24 字元，不含標記或換行")
        if district not in DISTRICTS or not 1 <= len(goal) <= 40:
            raise ValueError("出身或人生目標無效")
        budget = data.get("budget")
        traits = data.get("traits", {})
        validate_traits(traits, budget)
        profile = score_answers(data.get("answers"))
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            world = self._load(db)
            validate_world(world)
            if sum(p["player"] for p in world["people"].values()) >= 3:
                raise ValueError("最多投放 3 名玩家人物")
            pid = world["next_id"]
            world["next_id"] += 1
            world["people"][str(pid)] = make_person(pid, name, district, traits, budget, profile, goal, 20, "學生", True)
            event = {"month": world["month"], "kind": "投放", "subject": pid,
                     "text": f"{name} 於 {district} 投放世界", "causes": [f"玩家創建；能力模式 {budget} 點"], "important": True}
            world["events"].append(event)
            world["people"][str(pid)]["chronicle"].append(event)
            validate_world(world)
            db.execute("UPDATE snapshots SET state=? WHERE month=?", (json.dumps(world, ensure_ascii=False), world["month"]))
            db.execute("INSERT INTO events(month,kind,subject,payload) VALUES (?,?,?,?)",
                       (world["month"], event["kind"], pid, json.dumps(event, ensure_ascii=False)))
            db.commit()
            return copy.deepcopy(world["people"][str(pid)])

    def advance(self, expected_month):
        if type(expected_month) is not int:
            raise ValueError("須指定目前月份以防重複結算")
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            world = self._load(db)
            validate_world(world)
            if world["month"] != expected_month:
                raise ValueError(f"世界已在第 {world['month']} 月；請重新載入後再推進")
            events = advance(world)
            month = world["month"]
            db.execute("INSERT INTO snapshots VALUES (?,?)", (month, json.dumps(world, ensure_ascii=False)))
            for event in events:
                db.execute("INSERT INTO events(month,kind,subject,payload) VALUES (?,?,?,?)",
                           (month, event["kind"], event["subject"], json.dumps(event, ensure_ascii=False)))
            db.execute("UPDATE meta SET value=? WHERE key='current_month'", (str(month),))
            db.commit()
            return world, events
