# backend/database.py (updated)

import sqlite3
import json
from datetime import datetime
from typing import Dict, List, Optional, Any
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'recommendation.db')

class Database:
    def __init__(self):
        self.init_db()
    
    def get_connection(self):
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    
    def init_db(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                user_type TEXT DEFAULT 'student',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Profiles table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                elective_courses TEXT,
                courses TEXT,
                interests TEXT,
                applications TEXT,
                rdia TEXT,
                weighting_mode TEXT DEFAULT 'balanced',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(user_id)
            )
        ''')
        
        # Groups table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id TEXT UNIQUE NOT NULL,
                group_name TEXT NOT NULL,
                created_by INTEGER NOT NULL,
                members TEXT NOT NULL,
                is_finalized INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        ''')
        
        # Group recommendations table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS group_recommendations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id TEXT NOT NULL,
                recommendations TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES groups (group_id)
            )
        ''')

        # ✅ NEW: Group weights table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS group_weights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id TEXT UNIQUE NOT NULL,
                weighting_mode TEXT DEFAULT 'balanced',
                competency_weight REAL DEFAULT 0.5,
                interests_weight REAL DEFAULT 0.5,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES groups (group_id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    # ================= USERS =================
    
    def create_user(self, user) -> int:
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO users (email, password_hash, name, user_type)
            VALUES (?, ?, ?, ?)
        ''', (user.email, user.password_hash, user.name, user.user_type))
        
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return user_id
    
    def get_user_by_email(self, email: str) -> Optional[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        conn.close()
        
        return dict(user) if user else None
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        conn.close()
        
        return dict(user) if user else None
    
    # ================= PROFILES =================
    
    def save_profile(self, profile):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO profiles 
            (user_id, elective_courses, courses, interests, applications, rdia, weighting_mode, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ''', (
            profile.user_id,
            json.dumps(profile.elective_courses),
            json.dumps(profile.courses),
            json.dumps(profile.interests),
            json.dumps(profile.applications),
            profile.rdia,
            profile.weighting_mode
        ))
        
        conn.commit()
        conn.close()
    
    def _safe_json_loads(self, value):
        if value is None:
            return []
        try:
            return json.loads(value)
        except:
            return []
    
    def get_profile(self, user_id: int) -> Optional[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM profiles WHERE user_id = ?', (user_id,))
        profile = cursor.fetchone()
        conn.close()
        
        if profile:
            profile_dict = dict(profile)
            profile_dict['required_courses'] = self._safe_json_loads(profile_dict['required_courses'])
            profile_dict['elective_courses'] = self._safe_json_loads(profile_dict['elective_courses'])
            profile_dict['courses'] = self._safe_json_loads(profile_dict['courses'])
            profile_dict['interests'] = self._safe_json_loads(profile_dict['interests'])
            profile_dict['applications'] = self._safe_json_loads(profile_dict['applications'])
            return profile_dict
        
        return None
    
    # ================= GROUPS =================
    
    def create_group(self, group):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO groups (group_id, group_name, created_by, members, is_finalized)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            group.group_id,
            group.group_name,
            group.created_by,
            json.dumps(group.members),
            group.is_finalized
        ))
        
        conn.commit()
        conn.close()
    
    def get_group(self, group_id: str) -> Optional[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM groups WHERE group_id = ?', (group_id,))
        group = cursor.fetchone()
        conn.close()
        
        if group:
            group_dict = dict(group)
            group_dict['members'] = self._safe_json_loads(group_dict['members'])
            return group_dict
        
        return None
    def get_user_group(self, user_id: int):
        """Get the group that a user belongs to"""
        conn = self.get_connection()
        cursor = conn.cursor()
    
     # Searching for a group containing user_id in the members list
        cursor.execute('SELECT * FROM groups')
        all_groups = cursor.fetchall()
        conn.close()
    
        for group in all_groups:
            group_dict = dict(group)
            members = self._safe_json_loads(group_dict['members'])
            if user_id in members:
                group_dict['members'] = members
                return group_dict
    
        return None

    def update_group_members(self, group_id: str, members: list):
        """Update the members list of a group"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('UPDATE groups SET members = ? WHERE group_id = ?', 
                    (json.dumps(members), group_id))
        
        conn.commit()
        conn.close()

    def delete_group(self, group_id: str):
        """Delete a group"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM groups WHERE group_id = ?', (group_id,))
        
        conn.commit()
        conn.close()

    def finalize_group(self, group_id: str):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('UPDATE groups SET is_finalized = 1 WHERE group_id = ?', (group_id,))
        
        conn.commit()
        conn.close()
    
    # ================= RECOMMENDATIONS =================
    
    def save_group_recommendations(self, group_id: str, recommendations: dict):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO group_recommendations (group_id, recommendations)
            VALUES (?, ?)
        ''', (group_id, json.dumps(recommendations, ensure_ascii=False)))
        
        conn.commit()
        conn.close()
    
    def get_group_recommendations(self, group_id: str) -> Optional[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM group_recommendations WHERE group_id = ?', (group_id,))
        recs = cursor.fetchone()
        conn.close()
        
        if recs:
            return self._safe_json_loads(recs['recommendations'])
        
        return None

    # ================= ✅ NEW: GROUP WEIGHTS =================
    
    def save_group_weights(self, group_id: str, weights: dict):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO group_weights 
            (group_id, weighting_mode, competency_weight, interests_weight, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ''', (
            group_id,
            weights.get('weighting_mode', 'balanced'),
            weights.get('competency_weight', 0.5),
            weights.get('interests_weight', 0.5)
        ))
        
        conn.commit()
        conn.close()

    def get_group_weights(self, group_id: str) -> dict:
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM group_weights WHERE group_id = ?', (group_id,))
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return dict(result)
        
        return {
            'weighting_mode': 'balanced',
            'competency_weight': 0.5,
            'interests_weight': 0.5
        }