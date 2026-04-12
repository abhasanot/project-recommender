# backend/trend/routes.py
"""
Flask Blueprint for the Trend Analysis API.

All routes are mounted under the prefix /api/trends (set in app.py).
Every endpoint is read-only and requires no authentication, making the
Trend module accessible to both students and faculty.

Routes:
  GET /api/trends/filters            → dynamic filter options
  GET /api/trends/summary            → KPI summary stats
  GET /api/trends/frequency          → frequency counts (bar chart)
  GET /api/trends/timeline           → time-series (line chart)
  GET /api/trends/distribution       → pie-chart distribution
  GET /api/trends/stacked            → stacked bar data
  GET /api/trends/trending           → fastest-growing categories
  GET /api/trends/compare            → period-vs-period comparison

All endpoints accept query-string filters:
  years        (comma-separated, e.g. years=1442,1445)
  semesters    (comma-separated, e.g. semesters=10,20)
  interests    (comma-separated)
  applications (comma-separated)
  rdia         (comma-separated)
  supervisors  (comma-separated)
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from .engine import engine

trend_bp = Blueprint("trend", __name__)


# ─────────────────────────────────────────────────────────────────────────────
# Helper: parse query-string filters
# ─────────────────────────────────────────────────────────────────────────────

def _parse_filters() -> dict:
    """
    Extract and normalise filter parameters from the request query string.
    Each parameter may be a comma-separated list.
    """
    def _csv(key: str):
        raw = request.args.get(key, "").strip()
        if not raw:
            return None
        return [v.strip() for v in raw.split(",") if v.strip()]

    filters = {
        "years":        _csv("years"),
        "semesters":    _csv("semesters"),
        "interests":    _csv("interests"),
        "applications": _csv("applications"),
        "rdia":         _csv("rdia"),
        "supervisors":  _csv("supervisors"),
        "keywords":     _csv("keywords"),
    }
    # Remove None keys so the engine sees a clean dict
    return {k: v for k, v in filters.items() if v is not None}


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@trend_bp.route("/filters")
def get_filters():
    """
    GET /api/trends/filters
    Returns all distinct values for every filterable dimension.
    No filters applied (always returns the full option set).
    """
    try:
        return jsonify(engine.get_filter_options())
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@trend_bp.route("/summary")
def get_summary():
    """
    GET /api/trends/summary[?years=&semesters=&interests=&...]
    Returns high-level KPI statistics for the filtered project set.
    """
    try:
        return jsonify(engine.get_summary(_parse_filters()))
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@trend_bp.route("/frequency")
def get_frequency():
    """
    GET /api/trends/frequency?dimension=interest[&top_n=N&...]
    Returns frequency counts for each value along the given dimension.

    Query params:
      dimension  (required): interest | application | rdia | year | semester |
                             supervisor | keyword
      top_n      (optional): integer — limit results to top-N (default: all)
    """
    dimension = request.args.get("dimension", "interest").strip()
    top_n_raw = request.args.get("top_n", "").strip()
    top_n     = int(top_n_raw) if top_n_raw.isdigit() else None
    try:
        data = engine.get_frequency(dimension, _parse_filters(), top_n)
        return jsonify({"dimension": dimension, "data": data})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@trend_bp.route("/timeline")
def get_timeline():
    """
    GET /api/trends/timeline?dimension=interest[&top_n=N&...]
    Returns a time-series dataset (periods × category counts) for a line chart.

    Query params:
      dimension (required): interest | application | rdia | supervisor | keyword
      top_n     (optional): cap number of tracked categories (default: 8)
    """
    dimension = request.args.get("dimension", "interest").strip()
    top_n_raw = request.args.get("top_n", "8").strip()
    top_n     = int(top_n_raw) if top_n_raw.isdigit() else 8
    try:
        data = engine.get_timeline(dimension, _parse_filters(), top_n)
        return jsonify({"dimension": dimension, **data})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@trend_bp.route("/distribution")
def get_distribution():
    """
    GET /api/trends/distribution?dimension=application[&...]
    Returns slice data for a pie / donut chart.
    Slices under 3 % are merged into 'Other'.
    """
    dimension = request.args.get("dimension", "application").strip()
    try:
        data = engine.get_distribution(dimension, _parse_filters())
        return jsonify({"dimension": dimension, "data": data})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@trend_bp.route("/stacked")
def get_stacked():
    """
    GET /api/trends/stacked?x_axis=year&stack_by=interest[&top_n=N&...]
    Returns data for a stacked bar chart comparing two dimensions.

    Query params:
      x_axis   (default: year):     year | semester | interest | application | rdia
      stack_by (default: interest): same options
      top_n    (default: 8):        max stacking categories
    """
    x_axis   = request.args.get("x_axis",   "year").strip()
    stack_by = request.args.get("stack_by", "interest").strip()
    top_n_raw = request.args.get("top_n",  "8").strip()
    top_n    = int(top_n_raw) if top_n_raw.isdigit() else 8
    try:
        data = engine.get_stacked(x_axis, stack_by, _parse_filters(), top_n)
        return jsonify({"x_axis": x_axis, "stack_by": stack_by, **data})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@trend_bp.route("/trending")
def get_trending():
    """
    GET /api/trends/trending?dimension=interest[&top_n=N&...]
    Returns the fastest-growing categories in the given dimension,
    sorted by growth rate descending.

    Query params:
      dimension (default: interest)
      top_n     (default: 5)
    """
    dimension = request.args.get("dimension", "interest").strip()
    top_n_raw = request.args.get("top_n", "5").strip()
    top_n     = int(top_n_raw) if top_n_raw.isdigit() else 5
    try:
        data = engine.get_trending(dimension, _parse_filters(), top_n)
        return jsonify({"dimension": dimension, "data": data})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@trend_bp.route("/compare")
def get_comparison():
    """
    GET /api/trends/compare?dimension=interest&period_a=1442-10&period_b=1445-20[&...]
    Returns a side-by-side comparison of two time periods.

    Query params:
      dimension (required): interest | application | rdia | supervisor
      period_a  (required): "<year>-<semester_code>"  e.g. "1442-10"
      period_b  (required): "<year>-<semester_code>"  e.g. "1445-20"
    """
    dimension = request.args.get("dimension", "interest").strip()
    period_a  = request.args.get("period_a", "").strip()
    period_b  = request.args.get("period_b", "").strip()

    if not period_a or not period_b:
        return jsonify({"error": "period_a and period_b are required"}), 400

    try:
        data = engine.get_comparison(dimension, period_a, period_b, _parse_filters())
        return jsonify({
            "dimension": dimension,
            "period_a":  period_a,
            "period_b":  period_b,
            "data":      data,
        })
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
