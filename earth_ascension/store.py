"""SQLite state, history snapshots, and atomic monthly commits."""
import copy
import hashlib
import json
import sqlite3
from contextlib import contextmanager, closing
from pathlib import Path

from .engine import advance, initial_world, make_person, score_answers, validate_traits, validate_world, DISTRICTS
from . import m2


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
                world = m2.new_world()
                state, digest = self._encode(world)
                db.execute("INSERT INTO meta VALUES ('current_month','0')")
                db.execute("INSERT INTO snapshots VALUES (0,?)", (state,))
                db.execute("INSERT INTO meta VALUES (?,?)", ("state_hash:0", digest))

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

    @staticmethod
    def _encode(world):
        if m2.is_m2_world(world):
            state = json.dumps(world, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
            return state, hashlib.sha256(state.encode()).hexdigest()
        return json.dumps(world, ensure_ascii=False), None

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
            self._validate(world)
            if m2.is_m2_world(world) and goal not in m2.GOALS:
                raise ValueError("M2 新人物須選擇既有五類目標；舊版自訂目標可由遷移保留")
            if sum(p["player"] for p in world["people"].values()) >= 3:
                raise ValueError("最多投放 3 名玩家人物")
            pid = world["next_id"]
            world["next_id"] += 1
            person = make_person(pid, name, district, traits, budget, profile, goal, 20, "學生", True)
            if m2.is_m2_world(world):
                m2.upgrade_person(person, world)
            world["people"][str(pid)] = person
            event = {"month": world["month"], "kind": "投放", "subject": pid,
                     "text": f"{name} 於 {district} 投放世界", "causes": [f"玩家創建；能力模式 {budget} 點"], "important": True}
            if m2.is_m2_world(world):
                event.update({"event_id": f"m2:{world['month']}:{len(world['events'])}", "actor": pid,
                              "target": None, "effects": {"budget": budget}, "causal_event_ids": []})
            world["events"].append(event)
            world["people"][str(pid)]["chronicle"].append(event)
            self._validate(world)
            state, digest = self._encode(world)
            db.execute("UPDATE snapshots SET state=? WHERE month=?", (state, world["month"]))
            if m2.is_m2_world(world):
                db.execute("INSERT OR REPLACE INTO meta VALUES (?,?)", (f"state_hash:{world['month']}", digest))
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
            if not m2.is_m2_world(world):
                self._validate(world)
            if world["month"] != expected_month:
                raise ValueError(f"世界已在第 {world['month']} 月；請重新載入後再推進")
            events = m2.advance(world) if m2.is_m2_world(world) else advance(world)
            month = world["month"]
            state, digest = self._encode(world)
            db.execute("INSERT INTO snapshots VALUES (?,?)", (month, state))
            for event in events:
                db.execute("INSERT INTO events(month,kind,subject,payload) VALUES (?,?,?,?)",
                           (month, event["kind"], event["subject"], json.dumps(event, ensure_ascii=False)))
            db.execute("UPDATE meta SET value=? WHERE key='current_month'", (str(month),))
            if m2.is_m2_world(world):
                db.execute("INSERT INTO meta VALUES (?,?)", (f"state_hash:{month}", digest))
            db.commit()
            return world, events

    def set_legacy_goal(self, person_id, goal, expected_month):
        if goal not in m2.GOALS or type(person_id) is not int or type(expected_month) is not int:
            raise ValueError("目標、人物或月份無效")
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            world = self._load(db)
            self._validate(world)
            if not m2.is_m2_world(world) or world["month"] != expected_month:
                raise ValueError("世界版本或月份已變更，請重新載入")
            person = world["people"].get(str(person_id))
            if not person or not person["player"] or person["goals"][0]["type"] != "legacy_custom":
                raise ValueError("只有舊存檔自訂目標的玩家人物可重選")
            old_label = person["goals"][0]["label"]
            event = m2._event(world, "目標重選", person_id, f"{person['name']} 將舊目標改選為{goal}",
                              effects={"old_label": old_label, "new_goal": goal}, important=True)
            previous = copy.deepcopy(person["goals"][0])
            previous.update(status="reselected", stop_reason="player_reselected")
            person["goal_history"].append(previous)
            m2._remember(person, event, 2)
            person["goal"] = goal
            new_goal = m2._goal(person, goal)
            new_goal.update({"id": f"g:{person_id}:{world['month']}:{len(world['events'])}",
                             "started_month": world["month"], "review_month": world["month"] + 4,
                             "trigger_event_id": event["event_id"]})
            person["goals"] = [new_goal]
            person["plan"] = {"goal_id": new_goal["id"], "step": m2._step_label(goal), "action": m2._step(goal),
                              "review_month": world["month"] + 4, "last_progress_month": world["month"]}
            self._validate(world)
            state, digest = self._encode(world)
            db.execute("UPDATE snapshots SET state=? WHERE month=?", (state, world["month"]))
            db.execute("INSERT OR REPLACE INTO meta VALUES (?,?)", (f"state_hash:{world['month']}", digest))
            db.execute("INSERT INTO events(month,kind,subject,payload) VALUES (?,?,?,?)",
                       (world["month"], event["kind"], person_id, json.dumps(event, ensure_ascii=False)))
            db.commit()
            return person

    @staticmethod
    def _validate(world):
        if m2.is_m2_world(world):
            m2.validate(world)
        else:
            validate_world(world)

    @classmethod
    def migrate_copy(cls, source, destination):
        """Copy an M1 SQLite file and upgrade only its latest snapshot; never write source."""
        source, destination = Path(source).resolve(), Path(destination).resolve()
        if source == destination or not source.is_file() or destination.exists():
            raise ValueError("來源須存在，且遷移目標必須是不同的新路徑")
        original_hash = hashlib.sha256(source.read_bytes()).hexdigest()
        destination.parent.mkdir(parents=True, exist_ok=True)
        try:
            with closing(sqlite3.connect(f"file:{source}?mode=ro", uri=True)) as src, closing(sqlite3.connect(destination)) as dst:
                src.backup(dst)
            with closing(sqlite3.connect(destination)) as db:
                db.execute("BEGIN IMMEDIATE")
                old = cls._load(db)
                world = m2.upgrade_world(old)
                state, digest = cls._encode(world)
                db.execute("UPDATE snapshots SET state=? WHERE month=?", (state, world["month"]))
                db.execute("INSERT INTO meta VALUES (?,?)", ("migrated_from_sha256", original_hash))
                db.execute("INSERT INTO meta VALUES (?,?)", (f"state_hash:{world['month']}", digest))
                db.commit()
            if hashlib.sha256(source.read_bytes()).hexdigest() != original_hash:
                raise ValueError("遷移過程中來源存檔已變更；請重試")
            return destination
        except Exception:
            destination.unlink(missing_ok=True)
            raise
