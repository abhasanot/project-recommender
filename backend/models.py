from typing import List, Dict

class User:
    def __init__(self, email, password_hash, name, user_type='student',
                 student_id='', academic_year='', major='Computer Science'):
        self.email = email; self.password_hash = password_hash; self.name = name
        self.user_type = user_type; self.student_id = student_id
        self.academic_year = academic_year; self.major = major

class StudentProfile:
    def __init__(self, user_id, required_courses=None, elective_courses=None,
                 courses=None, interests=None, applications=None, rdia='', weighting_mode='balanced'):
        self.user_id = user_id; self.required_courses = required_courses or []
        self.elective_courses = elective_courses or []; self.courses = courses or []
        self.interests = interests or []; self.applications = applications or []
        self.rdia = rdia; self.weighting_mode = weighting_mode

class GroupData:
    def __init__(self, group_id, group_name, created_by, members, is_finalized=False):
        self.group_id = group_id; self.group_name = group_name
        self.created_by = created_by; self.members = members; self.is_finalized = is_finalized
