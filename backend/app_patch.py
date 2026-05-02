# ─────────────────────────────────────────────────────────────────────────────
# HOW TO PATCH backend/app.py  (minimal, zero-risk change)
#
# STEP 1: Add this import near the top of app.py,
#         right after "from models import ..."
# ─────────────────────────────────────────────────────────────────────────────
from trend import trend_bp            # ← ADD THIS LINE

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Register the blueprint right after Session(app) and before db = Database()
#         (or anywhere after `app = Flask(__name__)`)
# ─────────────────────────────────────────────────────────────────────────────
app.register_blueprint(trend_bp, url_prefix="/api/trends")   # ← ADD THIS LINE

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: REMOVE the three old stub routes shown below.
#         (they are replaced by the blueprint — keeping them would cause
#          Flask to raise an "endpoint already defined" error)
# ─────────────────────────────────────────────────────────────────────────────
# DELETE these lines from app.py:
#
#   @app.route("/api/trends/domains",       methods=["GET"])
#   def get_domain_trends():      return jsonify({"message": "Coming soon", "data": []}), 200
#
#   @app.route("/api/trends/methodologies", methods=["GET"])
#   def get_methodology_trends(): return jsonify({"message": "Coming soon", "data": []}), 200
#
#   @app.route("/api/trends/tools",         methods=["GET"])
#   def get_tool_trends():        return jsonify({"message": "Coming soon", "data": []}), 200
#
# ─────────────────────────────────────────────────────────────────────────────
# THAT'S IT.  No other changes to app.py are needed.
# ─────────────────────────────────────────────────────────────────────────────
