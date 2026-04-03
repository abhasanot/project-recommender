# backend/app.py
"""
Main Flask application for the Student Project Recommendation System.
"""

from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_session import Session
import os
import sys
import json
from datetime import timedelta
from functools import wraps

# Add the parent directory to sys.path so backend can import the shared engine
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from recommender_system import RecommenderSystem
from database import Database
from models import User, StudentData, GroupData, StudentProfile

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ─────────────────────────────────────────────────────────────────────────────
# APP CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_PERMANENT"] = False
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(hours=24)

# FIX (Bug): SESSION_FILE_DIR was not set. Without it Flask-Session stores
# sessions in a relative './flask_session' directory which breaks when the
# working directory changes.  Point it explicitly to a subdirectory of the
# backend folder so it always resolves to the same location.
app.config["SESSION_FILE_DIR"] = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "flask_session"
)
os.makedirs(app.config["SESSION_FILE_DIR"], exist_ok=True)

# FIX (Bug): CORS was only allowing http://localhost:3000. Vite defaults to
# port 5173. Accept both so the frontend works regardless of which port Vite
# picks up (vite.config.ts explicitly sets 3000, but having both is safer).
CORS(
    app,
    origins=["http://localhost:3000", "http://localhost:5173"],
    supports_credentials=True,
)

bcrypt = Bcrypt(app)
Session(app)

# Initialize database and recommender system (both loaded once at startup)
db = Database()
recommender_system = RecommenderSystem()


# ─────────────────────────────────────────────────────────────────────────────
# AUTH DECORATOR
# ─────────────────────────────────────────────────────────────────────────────

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated_function


# ═════════════════════════════════════════════════════════════════════════════
# AUTH ROUTES
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/auth/signup", methods=["POST"])
def signup():
    data = request.json

    for field in ["email", "password", "name", "user_type"]:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    if db.get_user_by_email(data["email"]):
        return jsonify({"error": "Email already registered"}), 409

    hashed_password = bcrypt.generate_password_hash(data["password"]).decode("utf-8")

    user = User(
        email=data["email"],
        password_hash=hashed_password,
        name=data["name"],
        user_type=data["user_type"],
        student_id=data.get("student_id", ""),
        academic_year=data.get("academic_year", ""),
        major=data.get("major", "Computer Science"),
    )

    user_id = db.create_user(user)
    session["user_id"]    = user_id
    session["user_email"] = user.email
    session["user_name"]  = user.name
    session["user_type"]  = user.user_type

    return jsonify({
        "message": "User created successfully",
        "user": {
            "id":        user_id,
            "email":     user.email,
            "name":      user.name,
            "user_type": user.user_type,
        },
    }), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json

    if not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email and password required"}), 400

    user = db.get_user_by_email(data["email"])
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    if not bcrypt.check_password_hash(user["password_hash"], data["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    session["user_id"]    = user["id"]
    session["user_email"] = user["email"]
    session["user_name"]  = user["name"]
    session["user_type"]  = user["user_type"]

    return jsonify({
        "message": "Login successful",
        "user": {
            "id":        user["id"],
            "email":     user["email"],
            "name":      user["name"],
            "user_type": user["user_type"],
        },
    }), 200


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200


@app.route("/api/auth/me", methods=["GET"])
@login_required
def get_current_user():
    user = db.get_user_by_id(session["user_id"])
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id":            user["id"],
        "email":         user["email"],
        "name":          user["name"],
        "user_type":     user["user_type"],
        "student_id":    user.get("student_id", ""),
        "academic_year": user.get("academic_year", ""),
        "major":         user.get("major", ""),
    }), 200


# ═════════════════════════════════════════════════════════════════════════════
# STUDENT PROFILE ROUTES
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/profile", methods=["POST"])
@login_required
def save_profile():
    data = request.json

    for key in ["courses", "interests", "applications", "rdia"]:
        if key not in data:
            return jsonify({"error": f"Missing required data section: {key}"}), 400

    for course in data.get("courses", []):
        if "course_code" not in course or "grade" not in course:
            return jsonify({"error": "Each course must have course_code and grade"}), 400

    profile = StudentProfile(
        user_id=session["user_id"],
        required_courses=data.get("required_courses", []),
        elective_courses=data.get("elective_courses", []),
        courses=data.get("courses", []),
        interests=data.get("interests", []),
        applications=data.get("applications", []),
        rdia=data.get("rdia", ""),
        weighting_mode=data.get("weighting_mode", "balanced"),
    )

    db.save_profile(profile)
    return jsonify({"message": "Profile saved successfully"}), 200


@app.route("/api/profile", methods=["GET"])
@login_required
def get_profile():
    profile = db.get_profile(session["user_id"])
    if not profile:
        return jsonify({
            "required_courses": [],
            "elective_courses": [],
            "courses":          [],
            "interests":        [],
            "applications":     [],
            "rdia":             "",
            "weighting_mode":   "balanced",
        }), 200
    return jsonify(profile), 200


@app.route("/api/profile/completion", methods=["GET"])
@login_required
def get_profile_completion():
    profile = db.get_profile(session["user_id"])
    if not profile:
        return jsonify({"completion": 0}), 200

    completed = 0
    if len(profile.get("courses", [])) >= 5:
        completed += 1
    if len(profile.get("interests", [])) >= 2:
        completed += 1
    if profile.get("rdia"):
        completed += 1
    if len(profile.get("applications", [])) >= 1:
        completed += 1

    return jsonify({"completion": (completed / 4) * 100}), 200


# ═════════════════════════════════════════════════════════════════════════════
# GROUP ROUTES
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/group/create", methods=["POST"])
@login_required
def create_group():
    data = request.json
    if not data.get("group_name"):
        return jsonify({"error": "Group name required"}), 400

    import random, string
    group_id = "GP-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

    group = GroupData(
        group_id=group_id,
        group_name=data["group_name"],
        created_by=session["user_id"],
        members=[session["user_id"]],
        is_finalized=False,
    )

    db.create_group(group)
    return jsonify({
        "message": "Group created successfully",
        "group": {
            "id":           group_id,
            "name":         data["group_name"],
            "members":      [session["user_id"]],
            "is_finalized": False,
        },
    }), 201


@app.route("/api/group/join", methods=["POST"])
@login_required
def join_group():
    data = request.json
    if not data.get("group_id"):
        return jsonify({"error": "Group ID required"}), 400

    group = db.get_group(data["group_id"])
    if not group:
        return jsonify({"error": "Group not found"}), 404
    if group["is_finalized"]:
        return jsonify({"error": "Cannot join finalized group"}), 400
    if session["user_id"] in group["members"]:
        return jsonify({"error": "Already a member of this group"}), 400

    group["members"].append(session["user_id"])
    db.update_group_members(data["group_id"], group["members"])

    updated_group = db.get_group(data["group_id"])
    members = _build_member_list(updated_group)

    return jsonify({
        "message": "Joined group successfully",
        "group": {
            "id":           updated_group["group_id"],
            "name":         updated_group["group_name"],
            "members":      members,
            "is_finalized": updated_group["is_finalized"],
        },
    }), 200


@app.route("/api/group", methods=["GET"])
@login_required
def get_group():
    group = db.get_user_group(session["user_id"])
    if not group:
        return jsonify({"has_group": False}), 200

    return jsonify({
        "has_group": True,
        "group": {
            "id":           group["group_id"],
            "name":         group["group_name"],
            "members":      _build_member_list(group),
            "is_finalized": group["is_finalized"],
        },
    }), 200


@app.route("/api/group/finalize", methods=["POST"])
@login_required
def finalize_group():
    group = db.get_user_group(session["user_id"])
    if not group:
        return jsonify({"error": "No group found"}), 404
    if len(group["members"]) < 2:
        return jsonify({"error": "Group must have at least 2 members to finalize"}), 400

    db.finalize_group(group["group_id"])

    recs = generate_group_recommendations(group["group_id"])
    if recs:
        db.save_group_recommendations(group["group_id"], recs)

    return jsonify({"message": "Group finalized successfully", "recommendations_ready": True}), 200


@app.route("/api/group/leave", methods=["POST"])
@login_required
def leave_group():
    group = db.get_user_group(session["user_id"])
    if not group:
        return jsonify({"error": "No group found"}), 404
    if group["is_finalized"]:
        return jsonify({"error": "Cannot leave finalized group"}), 400

    group["members"].remove(session["user_id"])
    if len(group["members"]) == 0:
        db.delete_group(group["group_id"])
    else:
        db.update_group_members(group["group_id"], group["members"])

    return jsonify({"message": "Left group successfully"}), 200


# ═════════════════════════════════════════════════════════════════════════════
# RECOMMENDATION HELPERS & ROUTES
# ═════════════════════════════════════════════════════════════════════════════

def generate_group_recommendations(group_id: str):
    """
    Build the recommendation payload for a group and return it.

    FIX (Bug): The original function hardcoded 'weighting_mode': 'balanced'
    instead of reading the group's persisted weight settings from the DB.
    This meant that changing weights via PUT /api/group/weights had no effect
    on the initial recommendation generation triggered by group finalization.
    """
    group = db.get_group(group_id)
    if not group:
        return None

    members_profiles = []
    for member_id in group["members"]:
        profile = db.get_profile(member_id)
        if profile:
            user = db.get_user_by_id(member_id)
            members_profiles.append({
                "student_id":   member_id,
                "name":         user["name"],
                "courses":      profile.get("courses", []),
                "interests":    profile.get("interests", []),
                "applications": profile.get("applications", []),
                "rdia":         profile.get("rdia", ""),
            })

    if not members_profiles:
        return None

    # FIX: fetch the group's saved weighting mode instead of hardcoding 'balanced'
    weights = db.get_group_weights(group_id)

    group_json = {
        "group_id":        group_id,
        "weighting_mode":  weights.get("weighting_mode", "balanced"),
        "students":        members_profiles,
    }

    try:
        return recommender_system.recommend_all(group_json)
    except Exception as e:
        print(f"Error generating recommendations: {e}")
        return None


@app.route("/api/recommendations", methods=["GET"])
@login_required
def get_recommendations():
    group = db.get_user_group(session["user_id"])
    if not group:
        return jsonify({"error": "No group found"}), 404
    if not group["is_finalized"]:
        return jsonify({"error": "Group not finalized yet"}), 400

    recommendations = db.get_group_recommendations(group["group_id"])
    if not recommendations:
        recommendations = generate_group_recommendations(group["group_id"])
        if recommendations:
            db.save_group_recommendations(group["group_id"], recommendations)

    if not recommendations:
        return jsonify({"error": "Unable to generate recommendations"}), 500

    return jsonify({
        "group_id":     recommendations.get("group_id", group["group_id"]),
        "group_profile": recommendations.get("group_profile", {}),
        "projects":      recommendations.get("recommended_projects", []),
        "interests":     recommendations.get("recommended_interests", []),
        "applications":  recommendations.get("recommended_applications", []),
        "rdia":          recommendations.get("recommended_rdia", []),
    }), 200


# ═════════════════════════════════════════════════════════════════════════════
# GROUP WEIGHT SETTINGS
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/group/weights", methods=["GET"])
@login_required
def get_group_weights():
    group = db.get_user_group(session["user_id"])
    if not group:
        return jsonify({"error": "No group found"}), 404

    weights = db.get_group_weights(group["group_id"])
    return jsonify({
        "weighting_mode":    weights.get("weighting_mode", "balanced"),
        "competency_weight": weights.get("competency_weight", 0.5),
        "interests_weight":  weights.get("interests_weight", 0.5),
    }), 200


@app.route("/api/group/weights", methods=["PUT"])
@login_required
def update_group_weights():
    data  = request.json
    group = db.get_user_group(session["user_id"])
    if not group:
        return jsonify({"error": "No group found"}), 404
    if session["user_id"] != group["created_by"]:
        return jsonify({"error": "Only group leader can adjust weights"}), 403
    if not group["is_finalized"]:
        return jsonify({"error": "Group must be finalized before adjusting weights"}), 400

    weighting_mode = data.get("weighting_mode", "balanced")
    if weighting_mode == "courses_heavy":
        comp_w, int_w = 0.75, 0.25
    elif weighting_mode == "interests_heavy":
        comp_w, int_w = 0.25, 0.75
    else:
        comp_w, int_w = 0.50, 0.50

    db.save_group_weights(group["group_id"], {
        "weighting_mode":    weighting_mode,
        "competency_weight": comp_w,
        "interests_weight":  int_w,
    })

    group_json = _build_group_json_from_db(group["group_id"])
    if group_json:
        results = recommender_system.recommend_all(group_json)
        db.save_group_recommendations(group["group_id"], results)

    return jsonify({
        "message":           "Weights updated successfully",
        "weighting_mode":    weighting_mode,
        "competency_weight": comp_w,
        "interests_weight":  int_w,
    }), 200


def _build_group_json_from_db(group_id: str):
    group = db.get_group(group_id)
    if not group:
        return None

    members_profiles = []
    for member_id in group["members"]:
        profile = db.get_profile(member_id)
        if profile:
            user = db.get_user_by_id(member_id)
            members_profiles.append({
                "student_id":   member_id,
                "name":         user["name"],
                "courses":      profile.get("courses", []),
                "interests":    profile.get("interests", []),
                "applications": profile.get("applications", []),
                "rdia":         profile.get("rdia", ""),
            })

    if not members_profiles:
        return None

    weights = db.get_group_weights(group_id)
    return {
        "group_id":       group_id,
        "weighting_mode": weights.get("weighting_mode", "balanced"),
        "students":       members_profiles,
    }


# ═════════════════════════════════════════════════════════════════════════════
# TRENDS / ANALYTICS (stubs)
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/trends/domains", methods=["GET"])
def get_domain_trends():
    return jsonify({"message": "Coming soon", "data": []}), 200


@app.route("/api/trends/methodologies", methods=["GET"])
def get_methodology_trends():
    return jsonify({"message": "Coming soon", "data": []}), 200


@app.route("/api/trends/tools", methods=["GET"])
def get_tool_trends():
    return jsonify({"message": "Coming soon", "data": []}), 200


# ═════════════════════════════════════════════════════════════════════════════
# PROJECT DATA
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/projects", methods=["GET"])
def get_projects():
    project_index_path = os.path.join(BASE_DIR, "embeddings", "project_index.json")
    try:
        with open(project_index_path, "r", encoding="utf-8") as f:
            projects = json.load(f)

        formatted = []
        for pid, project in projects.items():
            formatted.append({
                "id":                   pid,
                "title":                project.get("title", ""),
                "abstract":             project.get("abstract", ""),
                "supervisor":           project.get("supervisor_name", ""),
                "semester":             project.get("semester", ""),
                "academic_year":        project.get("academic_year", ""),
                "domain_of_interest":   project.get("interest", []),
                "domain_of_application": project.get("application", []),
                "rdia_priority":        project.get("rdia", []),
                "keywords":             project.get("keywords", []),
            })
        return jsonify(formatted), 200

    except FileNotFoundError:
        return jsonify({
            "message": "Projects data not available yet. Run phase2_embed.py first.",
            "projects": [],
        }), 200
    except Exception as e:
        print(f"Error loading projects: {e}")
        return jsonify([]), 200


# ═════════════════════════════════════════════════════════════════════════════
# SUPERVISORS DATA
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/supervisors", methods=["GET"])
def get_supervisors():
    project_index_path = os.path.join(BASE_DIR, "embeddings", "project_index.json")
    try:
        with open(project_index_path, "r", encoding="utf-8") as f:
            projects = json.load(f)

        supervisors = {}
        for pid, project in projects.items():
            sup_name = project.get("supervisor_name", "")
            if not sup_name:
                continue
            if sup_name not in supervisors:
                supervisors[sup_name] = {
                    "name":         sup_name,
                    "projects":     0,
                    "domains":      [],
                    "applications": [],
                }
            supervisors[sup_name]["projects"] += 1
            supervisors[sup_name]["domains"].extend(project.get("interest", []))
            supervisors[sup_name]["applications"].extend(project.get("application", []))

        for sup in supervisors.values():
            sup["domains"]      = list(set(sup["domains"]))
            sup["applications"] = list(set(sup["applications"]))

        return jsonify(list(supervisors.values())), 200

    except FileNotFoundError:
        return jsonify({"message": "Supervisors data not available yet.", "supervisors": []}), 200
    except Exception as e:
        print(f"Error loading supervisors: {e}")
        return jsonify([]), 200


# ═════════════════════════════════════════════════════════════════════════════
# DOMAIN DATA
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/domains", methods=["GET"])
def get_domains():
    try:
        data_dir = os.path.join(BASE_DIR, "data")

        with open(os.path.join(data_dir, "Interest_Domains.json"), "r", encoding="utf-8") as f:
            interests = json.load(f)["DOMAIN_CATEGORIES"]

        with open(os.path.join(data_dir, "Application_Domains.json"), "r", encoding="utf-8") as f:
            applications = json.load(f)

        with open(os.path.join(data_dir, "RDIA.json"), "r", encoding="utf-8") as f:
            rdia = json.load(f)["RDIA"]

        with open(os.path.join(data_dir, "courses.json"), "r", encoding="utf-8") as f:
            courses_data = json.load(f)
            courses = [
                {"code": c["course_code"], "title": c["course_title"]}
                for c in courses_data["courses"]
            ]

        return jsonify({
            "interests":    interests,
            "applications": applications,
            "rdia":         rdia,
            "courses":      courses,
        }), 200

    except Exception as e:
        print(f"Error loading domain data: {e}")
        return jsonify({"error": "Failed to load domain data"}), 500


# ═════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═════════════════════════════════════════════════════════════════════════════

def _build_member_list(group: dict) -> list:
    """Return a list of member detail dicts for the given group."""
    members = []
    for member_id in group["members"]:
        user = db.get_user_by_id(member_id)
        if user:
            members.append({
                "id":    user["id"],
                "name":  user["name"],
                "email": user["email"],
                "role":  "Leader" if member_id == group["created_by"] else "Member",
            })
    return members


# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True, port=5000)
