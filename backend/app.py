# backend/app.py
"""
Main Flask application — Student Project Recommendation System.

Enforced system flow:
  1. All group members must have a complete profile
  2. The group leader must select the weighting mode
  3. Leader clicks "Finalize" → recommendations are generated

Recommendations are NEVER generated unless ALL three conditions are met.

Docker changes vs. original:
  • CORS_ORIGINS env-var replaces the hard-coded localhost:3000 list so
    nginx-proxied requests (Origin: http://localhost) are accepted.
  • SESSION_FILE_DIR is read from the SESSION_DIR env-var so Flask-Session
    stores files in the persistent Docker volume (/data/flask_session).
  • GET /api/health added for Docker healthcheck / liveness probe.
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

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from recommender_system import RecommenderSystem
from database import Database
from models import User, GroupData, StudentProfile
from trend import trend_bp          # Trend Analysis Blueprint
from summarizer import generate_summary  # one-paragraph project summary

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ─────────────────────────────────────────────────────────────────────────────
# APP SETUP
# ─────────────────────────────────────────────────────────────────────────────

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_PERMANENT"] = False
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(hours=24)

# SESSION_DIR env-var points to the Docker volume; fall back to local dir for
# plain (non-Docker) development.
_session_dir = os.environ.get(
    "SESSION_DIR",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "flask_session"),
)
os.makedirs(_session_dir, exist_ok=True)
app.config["SESSION_FILE_DIR"] = _session_dir

# CORS_ORIGINS env-var lets docker-compose inject the correct origin list.
# In Docker: nginx proxies /api → backend, browser Origin is http://localhost.
# In dev:    Vite proxies /api → Flask, browser Origin is http://localhost:3000.
_raw_origins = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost,http://localhost:80,http://localhost:3000,http://localhost:5173",
)
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
CORS(app, origins=_allowed_origins, supports_credentials=True)

bcrypt = Bcrypt(app)
Session(app)
app.register_blueprint(trend_bp, url_prefix="/api/trends")  # Mount trend routes

db = Database()
recommender_system = RecommenderSystem()


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated


def _is_profile_complete(user_id: int) -> bool:
    """
    A profile is complete when the student has provided:
      - at least 1 course with a grade
      - at least 1 interest domain
      - at least 1 application domain
      - an RDIA selection
    """
    profile = db.get_profile(user_id)
    if not profile:
        return False
    has_courses  = len(profile.get("courses", [])) >= 1
    grades_ok    = all(c.get("grade", "") for c in profile.get("courses", []))
    has_interest = len(profile.get("interests", [])) >= 1
    has_app      = len(profile.get("applications", [])) >= 1
    has_rdia     = bool(profile.get("rdia", "").strip())
    return has_courses and grades_ok and has_interest and has_app and has_rdia


def _check_group_ready(group_id: str) -> dict:
    group = db.get_group(group_id)
    if not group:
        return {"ready": False, "error": "Group not found"}

    member_statuses = []
    all_complete = True
    for uid in group["members"]:
        user = db.get_user_by_id(uid)
        complete = _is_profile_complete(uid)
        if not complete:
            all_complete = False
        leader = (uid == group["created_by"])
        member_statuses.append({
            "id":               uid,
            "name":             user["name"] if user else "Unknown",
            "email":            user["email"] if user else "",
            "role":             "Leader" if leader else "Member",
            "profile_complete": complete,
        })

    weights_selected = db.has_group_weights(group_id)
    weights = db.get_group_weights(group_id)

    return {
        "all_profiles_complete": all_complete,
        "weights_selected":      weights_selected,
        "weighting_mode":        weights.get("weighting_mode", "balanced"),
        "member_statuses":       member_statuses,
        "ready":                 all_complete and weights_selected,
    }


def _build_member_list(group: dict) -> list:
    members = []
    for uid in group["members"]:
        user = db.get_user_by_id(uid)
        if user:
            members.append({
                "id":    user["id"],
                "name":  user["name"],
                "email": user["email"],
                "role":  "Leader" if uid == group["created_by"] else "Member",
            })
    return members


def _generate_recommendations(group_id: str):
    """Build group JSON and run the recommender system."""
    group = db.get_group(group_id)
    if not group:
        return None

    weights = db.get_group_weights(group_id)

    students = []
    for uid in group["members"]:
        profile = db.get_profile(uid)
        user    = db.get_user_by_id(uid)
        if profile and user:
            students.append({
                "student_id":   str(uid),
                "name":         user["name"],
                "courses":      profile.get("courses", []),
                "interests":    profile.get("interests", []),
                "applications": profile.get("applications", []),
                "rdia":         profile.get("rdia", ""),
            })

    if not students:
        return None

    group_json = {
        "group_id":       group_id,
        "weighting_mode": weights.get("weighting_mode", "balanced"),
        "students":       students,
    }

    try:
        return recommender_system.recommend_all(group_json)
    except Exception as e:
        print(f"[ERROR] Recommendation engine failed for {group_id}: {e}")
        import traceback; traceback.print_exc()
        return None


# ═════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK  (used by Docker healthcheck and nginx upstream checks)
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/health")
def health():
    """
    Lightweight liveness probe.
    Returns 200 once Flask (and the SBERT model) has fully started.
    Docker compose waits for this before starting the frontend container.
    """
    return jsonify({"status": "ok", "service": "mueen-backend"}), 200


# ═════════════════════════════════════════════════════════════════════════════
# AUTH
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/auth/signup", methods=["POST"])
def signup():
    data = request.json or {}
    for field in ["email", "password", "name", "user_type"]:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    if db.get_user_by_email(data["email"]):
        return jsonify({"error": "Email already registered"}), 409

    hashed = bcrypt.generate_password_hash(data["password"]).decode("utf-8")
    user = User(
        email=data["email"], password_hash=hashed, name=data["name"],
        user_type=data["user_type"],
    )
    user_id = db.create_user(user)
    session.update({"user_id": user_id, "user_email": user.email,
                    "user_name": user.name, "user_type": user.user_type})
    return jsonify({"message": "User created successfully",
                    "user": {"id": user_id, "email": user.email,
                             "name": user.name, "user_type": user.user_type}}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json or {}
    if not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email and password required"}), 400

    user = db.get_user_by_email(data["email"])
    if not user or not bcrypt.check_password_hash(user["password_hash"], data["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    session.update({"user_id": user["id"], "user_email": user["email"],
                    "user_name": user["name"], "user_type": user["user_type"]})
    return jsonify({"message": "Login successful",
                    "user": {"id": user["id"], "email": user["email"],
                             "name": user["name"], "user_type": user["user_type"]}}), 200


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
        "id": user["id"], "email": user["email"], "name": user["name"],
        "user_type": user["user_type"],
    }), 200


# ═════════════════════════════════════════════════════════════════════════════
# PROFILE
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/profile", methods=["POST"])
@login_required
def save_profile():
    data = request.json or {}
    for key in ["courses", "interests", "applications", "rdia"]:
        if key not in data:
            return jsonify({"error": f"Missing required section: {key}"}), 400

    for course in data.get("courses", []):
        if "course_code" not in course or "grade" not in course:
            return jsonify({"error": "Each course must have course_code and grade"}), 400
        if not course.get("grade", "").strip():
            return jsonify({"error": f"Grade missing for course {course['course_code']}"}), 400

    profile = StudentProfile(
        user_id=session["user_id"],
        elective_courses=data.get("elective_courses", []),
        courses=data.get("courses", []),
        interests=data.get("interests", []),
        applications=data.get("applications", []),
        rdia=data.get("rdia", ""),
        weighting_mode=data.get("weighting_mode", "balanced"),
    )
    db.save_profile(profile)
    return jsonify({"message": "Profile saved successfully",
                    "complete": _is_profile_complete(session["user_id"])}), 200


@app.route("/api/profile", methods=["GET"])
@login_required
def get_profile():
    profile = db.get_profile(session["user_id"])
    if not profile:
        return jsonify({
            "elective_courses": [], "courses": [],
            "interests": [], "applications": [], "rdia": "", "weighting_mode": "balanced",
        }), 200
    profile["complete"] = _is_profile_complete(session["user_id"])
    return jsonify(profile), 200


@app.route("/api/profile/completion", methods=["GET"])
@login_required
def get_profile_completion():
    profile = db.get_profile(session["user_id"])
    if not profile:
        return jsonify({"completion": 0, "details": {}}), 200

    courses  = profile.get("courses", [])
    grade_ok = all(c.get("grade", "") for c in courses)
    steps = {
        "courses":      len(courses) >= 1 and grade_ok,
        "interests":    len(profile.get("interests", [])) >= 1,
        "applications": len(profile.get("applications", [])) >= 1,
        "rdia":         bool(profile.get("rdia", "").strip()),
    }
    pct = sum(steps.values()) / len(steps) * 100
    return jsonify({"completion": pct, "details": steps}), 200


# ═════════════════════════════════════════════════════════════════════════════
# GROUP
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/group/create", methods=["POST"])
@login_required
def create_group():
    data = request.json or {}
    if not data.get("group_name"):
        return jsonify({"error": "Group name required"}), 400

    import random, string
    gid = "GP-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    group = GroupData(group_id=gid, group_name=data["group_name"],
                      created_by=session["user_id"], members=[session["user_id"]])
    db.create_group(group)
    return jsonify({"message": "Group created successfully",
                    "group": {"id": gid, "name": data["group_name"],
                              "members": [session["user_id"]], "is_finalized": False}}), 201


@app.route("/api/group/join", methods=["POST"])
@login_required
def join_group():
    data = request.json or {}
    if not data.get("group_id"):
        return jsonify({"error": "Group ID required"}), 400

    group = db.get_group(data["group_id"])
    if not group:
        return jsonify({"error": "Group not found"}), 404
    if group["is_finalized"]:
        return jsonify({"error": "Cannot join a finalized group"}), 400
    if session["user_id"] in group["members"]:
        return jsonify({"error": "Already a member of this group"}), 400

    group["members"].append(session["user_id"])
    db.update_group_members(data["group_id"], group["members"])

    updated = db.get_group(data["group_id"])
    return jsonify({"message": "Joined group successfully",
                    "group": {"id": updated["group_id"], "name": updated["group_name"],
                              "members": _build_member_list(updated),
                              "is_finalized": updated["is_finalized"]}}), 200


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
            "is_finalized": bool(group["is_finalized"]),
            "created_by":   group["created_by"],
        },
    }), 200


@app.route("/api/group/readiness", methods=["GET"])
@login_required
def get_group_readiness():
    group = db.get_user_group(session["user_id"])
    if not group:
        return jsonify({"error": "No group found"}), 404
    return jsonify(_check_group_ready(group["group_id"])), 200


@app.route("/api/group/finalize", methods=["POST"])
@login_required
def finalize_group():
    group = db.get_user_group(session["user_id"])
    if not group:
        return jsonify({"error": "No group found"}), 404
    if session["user_id"] != group["created_by"]:
        return jsonify({"error": "Only the group leader can finalize"}), 403
    if group["is_finalized"]:
        return jsonify({"error": "Group is already finalized"}), 400
    if len(group["members"]) < 2:
        return jsonify({"error": "Group must have at least 2 members"}), 400

    status = _check_group_ready(group["group_id"])

    if not status["all_profiles_complete"]:
        incomplete = [m["name"] for m in status["member_statuses"] if not m["profile_complete"]]
        return jsonify({
            "error": "Cannot finalize: some members have incomplete profiles",
            "incomplete_members": incomplete,
        }), 400

    if not status["weights_selected"]:
        return jsonify({
            "error": "Cannot finalize: the leader must select the weighting mode first",
        }), 400

    db.finalize_group(group["group_id"])

    recs = _generate_recommendations(group["group_id"])
    if recs:
        # attach summary to recs before saving so it is stored with them
        top5    = recs.get("recommended_projects", [])[:5]
        profile = recs.get("group_profile", {})
        recs["summary"] = generate_summary(top5, profile)
        db.save_group_recommendations(group["group_id"], recs)
        return jsonify({"message": "Group finalized and recommendations generated",
                        "recommendations_ready": True}), 200
    else:
        return jsonify({"message": "Group finalized but recommendation generation failed",
                        "recommendations_ready": False}), 200


@app.route("/api/group/unfinalize", methods=["POST"])
@login_required
def unfinalize_group():
    """Allow leader to unfinalize a group so members can rejoin."""
    group = db.get_user_group(session["user_id"])
    if not group:
        return jsonify({"error": "No group found"}), 404
    
    if session["user_id"] != group["created_by"]:
        return jsonify({"error": "Only the group leader can unfinalize"}), 403
    
    if not group["is_finalized"]:
        return jsonify({"error": "Group is not finalized"}), 400
    
    # Unfinalize the group
    db.unfinalize_group(group["group_id"])
    
    return jsonify({
        "message": "Group unfinalized successfully. Members can now rejoin.",
        "group": {
            "id": group["group_id"],
            "name": group["group_name"],
            "is_finalized": False,
        }
    }), 200


@app.route("/api/group/leave", methods=["POST"])
@login_required
def leave_group():
    group = db.get_user_group(session["user_id"])
    if not group:
        return jsonify({"error": "No group found"}), 404

    user_id    = session["user_id"]
    was_leader = (user_id == group["created_by"])
    group["members"].remove(user_id)

    if len(group["members"]) == 0:
        db.delete_group(group["group_id"])
        return jsonify({"message": "Left group successfully (group was deleted)"}), 200

    if was_leader:
        new_leader_id = group["members"][0]
        db.update_group_leader(group["group_id"], new_leader_id)

    db.update_group_members(group["group_id"], group["members"])
    return jsonify({"message": "Left group successfully"}), 200


# ═════════════════════════════════════════════════════════════════════════════
# GROUP WEIGHTS
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
        "is_set":            db.has_group_weights(group["group_id"]),
    }), 200


@app.route("/api/group/weights", methods=["PUT"])
@login_required
def update_group_weights():
    data  = request.json or {}
    group = db.get_user_group(session["user_id"])
    if not group:
        return jsonify({"error": "No group found"}), 404
    if session["user_id"] != group["created_by"]:
        return jsonify({"error": "Only the group leader can set weights"}), 403

    mode = data.get("weighting_mode", "balanced")
    if mode == "courses_heavy":
        cw, iw = 0.75, 0.25
    elif mode == "interests_heavy":
        cw, iw = 0.25, 0.75
    else:
        cw, iw = 0.50, 0.50
        mode = "balanced"

    db.save_group_weights(group["group_id"], {
        "weighting_mode": mode, "competency_weight": cw, "interests_weight": iw,
    })

    if group["is_finalized"]:
        recs = _generate_recommendations(group["group_id"])
        if recs:
            top5    = recs.get("recommended_projects", [])[:5]
            profile = recs.get("group_profile", {})
            recs["summary"] = generate_summary(top5, profile)
            db.save_group_recommendations(group["group_id"], recs)

    return jsonify({
        "message":           "Weights saved successfully",
        "weighting_mode":    mode,
        "competency_weight": cw,
        "interests_weight":  iw,
    }), 200


# ═════════════════════════════════════════════════════════════════════════════
# RECOMMENDATIONS
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/recommendations", methods=["GET"])
@login_required
def get_recommendations():
    group = db.get_user_group(session["user_id"])
    if not group:
        return jsonify({"error": "No group found", "condition": "no_group"}), 404
    if not group["is_finalized"]:
        return jsonify({"error": "Group not finalized yet", "condition": "not_finalized"}), 400

    status = _check_group_ready(group["group_id"])
    if not status["all_profiles_complete"]:
        return jsonify({"error": "Some member profiles are incomplete",
                        "condition": "incomplete_profiles",
                        "incomplete_members": [m["name"] for m in status["member_statuses"]
                                               if not m["profile_complete"]]}), 400
    if not status["weights_selected"]:
        return jsonify({"error": "Weighting mode not set by leader",
                        "condition": "no_weights"}), 400

    recs = db.get_group_recommendations(group["group_id"])
    if not recs:
        recs = _generate_recommendations(group["group_id"])
        if recs:
            top5    = recs.get("recommended_projects", [])[:5]
            profile = recs.get("group_profile", {})
            recs["summary"] = generate_summary(top5, profile)
            db.save_group_recommendations(group["group_id"], recs)

    if not recs:
        return jsonify({"error": "Unable to generate recommendations"}), 500

    return jsonify({
        "group_id":      recs.get("group_id", group["group_id"]),
        "group_profile": recs.get("group_profile", {}),
        "projects":      recs.get("recommended_projects", []),
        "interests":     recs.get("recommended_interests", []),
        "applications":  recs.get("recommended_applications", []),
        "rdia":          recs.get("recommended_rdia", []),
        "summary":       recs.get("summary"),   # stored at finalize time
    }), 200


# ═════════════════════════════════════════════════════════════════════════════
# DOMAIN DATA
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/domains", methods=["GET"])
def get_domains():
    try:
        data_dir = os.path.join(BASE_DIR, "data")
        with open(os.path.join(data_dir, "Interest_Domains.json"), encoding="utf-8") as f:
            interests = json.load(f)["DOMAIN_CATEGORIES"]
        with open(os.path.join(data_dir, "Application_Domains.json"), encoding="utf-8") as f:
            applications = json.load(f)
        with open(os.path.join(data_dir, "RDIA.json"), encoding="utf-8") as f:
            rdia = json.load(f)["RDIA"]
        with open(os.path.join(data_dir, "courses.json"), encoding="utf-8") as f:
            courses_data = json.load(f)
            courses = [{"code": c["course_code"], "title": c["course_title"]}
                       for c in courses_data["courses"]]
        return jsonify({"interests": interests, "applications": applications,
                        "rdia": rdia, "courses": courses}), 200
    except Exception as e:
        print(f"[ERROR] /api/domains: {e}")
        return jsonify({"error": "Failed to load domain data"}), 500


# ═════════════════════════════════════════════════════════════════════════════
# PROJECTS / SUPERVISORS / TRENDS
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/projects", methods=["GET"])
def get_projects():
    path = os.path.join(BASE_DIR, "embeddings", "project_index.json")
    try:
        with open(path, encoding="utf-8") as f:
            projects = json.load(f)
        return jsonify([{
            "id": pid, "title": p.get("title", ""), "abstract": p.get("abstract", ""),
            "supervisor": p.get("supervisor_name", ""), "semester": p.get("semester", ""),
            "academic_year": p.get("academic_year", ""),
            "domain_of_interest": p.get("interest", []),
            "domain_of_application": p.get("application", []),
            "rdia_priority": p.get("rdia", []), "keywords": p.get("keywords", []),
        } for pid, p in projects.items()]), 200
    except FileNotFoundError:
        return jsonify({"message": "Projects data not available yet.", "projects": []}), 200


@app.route("/api/supervisors", methods=["GET"])
def get_supervisors():
    path = os.path.join(BASE_DIR, "embeddings", "project_index.json")
    try:
        with open(path, encoding="utf-8") as f:
            projects = json.load(f)
        sups = {}
        for pid, p in projects.items():
            n = p.get("supervisor_name", "")
            if not n: continue
            if n not in sups:
                sups[n] = {"name": n, "projects": 0, "domains": [], "applications": []}
            sups[n]["projects"] += 1
            sups[n]["domains"].extend(p.get("interest", []))
            sups[n]["applications"].extend(p.get("application", []))
        for s in sups.values():
            s["domains"] = list(set(s["domains"]))
            s["applications"] = list(set(s["applications"]))
        return jsonify(list(sups.values())), 200
    except FileNotFoundError:
        return jsonify([]), 200






if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)