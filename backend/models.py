# backend/models.py
"""
Data models for the application
"""

from typing import List, Dict, Any, Optional

class User:
    def __init__(self, email: str, password_hash: str, name: str, user_type: str = 'student',
                 student_id: str = '', academic_year: str = '', major: str = 'Computer Science'):
        self.email = email
        self.password_hash = password_hash
        self.name = name
        self.user_type = user_type
        self.student_id = student_id
        self.academic_year = academic_year
        self.major = major

class StudentProfile:
    def __init__(self, user_id: int, required_courses: List[Dict] = None, 
                 elective_courses: List[Dict] = None, courses: List[Dict] = None,
                 interests: List[str] = None, applications: List[str] = None, 
                 rdia: str = '', weighting_mode: str = 'balanced'):
        self.user_id = user_id
        self.required_courses = required_courses or []
        self.elective_courses = elective_courses or []
        self.courses = courses or []
        self.interests = interests or []
        self.applications = applications or []
        self.rdia = rdia
        self.weighting_mode = weighting_mode

class StudentData:
    """For compatibility with older code - same as StudentProfile but with different naming"""
    def __init__(self, user_id: int, courses: List[Dict] = None,
                 interests: List[str] = None, applications: List[str] = None, 
                 rdia: str = '', weighting_mode: str = 'balanced'):
        self.user_id = user_id
        self.courses = courses or []
        self.interests = interests or []
        self.applications = applications or []
        self.rdia = rdia
        self.weighting_mode = weighting_mode

class GroupData:
    def __init__(self, group_id: str, group_name: str, created_by: int, 
                 members: List[int], is_finalized: bool = False):
        self.group_id = group_id
        self.group_name = group_name
        self.created_by = created_by
        self.members = members
        self.is_finalized = is_finalized