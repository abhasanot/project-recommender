# backend/trend/routes.py
"""
Flask Blueprint for the Trend Analysis API.

All routes are mounted under the prefix /api/trends (set in app.py).
Every endpoint is read-only and requires no authentication, making the
Trend module accessible to both students and faculty.

Routes:
  GET /api/trends/filters            -> dynamic filter options
  GET /api/trends/summary            -> KPI summary stats
  GET /api/trends/frequency          -> frequency counts (bar chart)
  GET /api/trends/timeline           -> time-series (line chart)
  GET /api/trends/distribution       -> pie-chart distribution

All endpoints accept query-string filters:
  years        (comma-separated, e.g. years=1442,1445)
  semesters    (comma-separated, e.g. semesters=10,20)
  interests    (comma-separated)
  applications (comma-separated)
  rdia         (comma-separated)
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from .engine import engine

trend_bp = Blueprint("trend", __name__)


# -----------------------------------------------------------------------------
# Helper: parse query-string filters
# -----------------------------------------------------------------------------

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
    }
    # Remove None keys so the engine sees a clean dict
    return {k: v for k, v in filters.items() if v is not None}


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

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
      dimension  (required): interest | application | rdia
      top_n      (optional): integer - limit results to top-N (default: all)
    """
    dimension = request.args.get("dimension", "interest").strip()

    # Validate dimension is supported
    if dimension not in ("interest", "application", "rdia"):
        return jsonify({"error": f"Unsupported dimension: {dimension}. Must be one of: interest, application, rdia"}), 400

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
    Returns a time-series dataset (periods x category counts) for a line chart.

    Query params:
      dimension (required): interest | application | rdia
      top_n     (optional): cap number of tracked categories (default: 8)
    """
    dimension = request.args.get("dimension", "interest").strip()

    # Validate dimension is supported
    if dimension not in ("interest", "application", "rdia"):
        return jsonify({"error": f"Unsupported dimension: {dimension}. Must be one of: interest, application, rdia"}), 400

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
    GET /api/trends/distribution?dimension=interest[&...]
    Returns slice data for a pie / donut chart.
    Slices under 3% are merged into 'Other'.

    Query params:
      dimension (required): interest | application | rdia
    """
    dimension = request.args.get("dimension", "interest").strip()

    # Validate dimension is supported
    if dimension not in ("interest", "application", "rdia"):
        return jsonify({"error": f"Unsupported dimension: {dimension}. Must be one of: interest, application, rdia"}), 400

    try:
        data = engine.get_distribution(dimension, _parse_filters())
        return jsonify({"dimension": dimension, "data": data})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500