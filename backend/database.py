# backend/database.py

import sqlite3
import json
from typing import Dict, List, Optional
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "recommendation.db")


class Database:
    def __init__(self):
        self.init_db()

    def get_connection(self):
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        conn   = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                user_type TEXT DEFAULT 'student',
                student_id TEXT,
                academic_year TEXT,
                major TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                required_courses TEXT,
                elective_courses TEXT,
                courses TEXT,
                interests TEXT,
                applications TEXT,
                rdia TEXT,
                weighting_mode TEXT DEFAULT 'balanced',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id TEXT UNIQUE NOT NULL,
                group_name TEXT NOT NULL,
                created_by INTEGER NOT NULL,
                members TEXT NOT NULL,
                is_finalized INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS group_recommendations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id TEXT NOT NULL UNIQUE,
                recommendations TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES groups(group_id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS group_weights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id TEXT UNIQUE NOT NULL,
                weighting_mode TEXT DEFAULT 'balanced',
                competency_weight REAL DEFAULT 0.5,
                interests_weight REAL DEFAULT 0.5,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES groups(group_id)
            )
        """)

        conn.commit()
        conn.close()

    # ─────────────────── helpers ───────────────────────────────────────────

    def _safe_json(self, value, default=None):
        if value is None:
            return default if default is not None else []
        try:
            return json.loads(value)
        except Exception:
            return default if default is not None else []

    # ─────────────────── users ────────────────────────────────────────────

    def create_user(self, user) -> int:
        conn   = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (email,password_hash,name,user_type,student_id,academic_year,major) "
            "VALUES (?,?,?,?,?,?,?)",
            (user.email, user.password_hash, user.name, user.user_type,
             user.student_id, user.academic_year, user.major),
        )
        uid = cursor.lastrowid
        conn.commit(); conn.close()
        return uid

    def get_user_by_email(self, email: str) -> Optional[Dict]:
        conn = self.get_connection()
        row  = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        conn.close()
        return dict(row) if row else None

    def get_user_by_id(self, user_id: int) -> Optional[Dict]:
        conn = self.get_connection()
        row  = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        conn.close()
        return dict(row) if row else None

    # ─────────────────── profiles ─────────────────────────────────────────

    def save_profile(self, profile):
        conn = self.get_connection()
        conn.execute(
            "INSERT OR REPLACE INTO profiles "
            "(user_id,required_courses,elective_courses,courses,interests,applications,rdia,weighting_mode,updated_at) "
            "VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)",
            (
                profile.user_id,
                json.dumps(profile.required_courses),
                json.dumps(profile.elective_courses),
                json.dumps(profile.courses),
                json.dumps(profile.interests),
                json.dumps(profile.applications),
                profile.rdia,
                profile.weighting_mode,
            ),
        )
        conn.commit(); conn.close()

    def get_profile(self, user_id: int) -> Optional[Dict]:
        conn = self.get_connection()
        row  = conn.execute("SELECT * FROM profiles WHERE user_id=?", (user_id,)).fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        d["required_courses"] = self._safe_json(d.get("required_courses"))
        d["elective_courses"]  = self._safe_json(d.get("elective_courses"))
        d["courses"]           = self._safe_json(d.get("courses"))
        d["interests"]         = self._safe_json(d.get("interests"))
        d["applications"]      = self._safe_json(d.get("applications"))
        return d

    # ─────────────────── groups ───────────────────────────────────────────

    def create_group(self, group):
        conn = self.get_connection()
        conn.execute(
            "INSERT INTO groups (group_id,group_name,created_by,members,is_finalized) VALUES (?,?,?,?,?)",
            (group.group_id, group.group_name, group.created_by,
             json.dumps(group.members), int(group.is_finalized)),
        )
        conn.commit(); conn.close()

    def get_group(self, group_id: str) -> Optional[Dict]:
        conn = self.get_connection()
        row  = conn.execute("SELECT * FROM groups WHERE group_id=?", (group_id,)).fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        d["members"] = self._safe_json(d["members"])
        return d

    def get_user_group(self, user_id: int) -> Optional[Dict]:
        """Return the first group whose members list contains user_id."""
        conn = self.get_connection()
        rows = conn.execute("SELECT * FROM groups ORDER BY created_at DESC").fetchall()
        conn.close()
        for row in rows:
            d       = dict(row)
            members = self._safe_json(d["members"])
            if user_id in members:
                d["members"] = members
                return d
        return None

    def update_group_members(self, group_id: str, members: List[int]):
        conn = self.get_connection()
        conn.execute("UPDATE groups SET members=? WHERE group_id=?",
                     (json.dumps(members), group_id))
        conn.commit(); conn.close()

    def finalize_group(self, group_id: str):
        conn = self.get_connection()
        conn.execute("UPDATE groups SET is_finalized=1 WHERE group_id=?", (group_id,))
        conn.commit(); conn.close()

    def delete_group(self, group_id: str):
        conn = self.get_connection()
        conn.execute("DELETE FROM group_recommendations WHERE group_id=?", (group_id,))
        conn.execute("DELETE FROM group_weights WHERE group_id=?", (group_id,))
        conn.execute("DELETE FROM groups WHERE group_id=?", (group_id,))
        conn.commit(); conn.close()

    def update_group_leader(self, group_id: str, new_leader_id: int):
        """Update the created_by field to assign a new leader."""
        conn = self.get_connection()
        conn.execute(
            "UPDATE groups SET created_by = ? WHERE group_id = ?",
            (new_leader_id, group_id))
        conn.commit()
        conn.close()  

    # ─────────────────── recommendations ─────────────────────────────────

    def save_group_recommendations(self, group_id: str, recommendations: dict):
        conn = self.get_connection()
        conn.execute(
            "INSERT OR REPLACE INTO group_recommendations (group_id,recommendations) VALUES (?,?)",
            (group_id, json.dumps(recommendations, ensure_ascii=False)),
        )
        conn.commit(); conn.close()

    def get_group_recommendations(self, group_id: str) -> Optional[Dict]:
        conn = self.get_connection()
        row  = conn.execute(
            "SELECT * FROM group_recommendations WHERE group_id=?", (group_id,)
        ).fetchone()
        conn.close()
        if row:
            return self._safe_json(row["recommendations"], default=None)
        return None

    # ─────────────────── weights ──────────────────────────────────────────

    def save_group_weights(self, group_id: str, weights: dict):
        conn = self.get_connection()
        conn.execute(
            "INSERT OR REPLACE INTO group_weights "
            "(group_id,weighting_mode,competency_weight,interests_weight,updated_at) "
            "VALUES (?,?,?,?,CURRENT_TIMESTAMP)",
            (group_id,
             weights.get("weighting_mode", "balanced"),
             weights.get("competency_weight", 0.5),
             weights.get("interests_weight", 0.5)),
        )
        conn.commit(); conn.close()

    def has_group_weights(self, group_id: str) -> bool:
        """True if the leader has explicitly saved a weighting mode for this group."""
        conn = self.get_connection()
        row  = conn.execute(
            "SELECT id FROM group_weights WHERE group_id=?", (group_id,)
        ).fetchone()
        conn.close()
        return row is not None

    def get_group_weights(self, group_id: str) -> dict:
        conn = self.get_connection()
        row  = conn.execute(
            "SELECT * FROM group_weights WHERE group_id=?", (group_id,)
        ).fetchone()
        conn.close()
        if row:
            return dict(row)
        return {"weighting_mode": "balanced", "competency_weight": 0.5, "interests_weight": 0.5}
