# backend/trend/engine.py
"""
Trend Analysis Engine for Mu'een.

Responsibilities:
  1. Load the project index (JSON) at startup and cache it.
  2. Parse project IDs to extract year / semester metadata.
  3. Provide a fully dynamic query interface:
       - multi-dimensional groupBy
       - arbitrary filter combinations
       - trend direction detection (increasing / decreasing / stable)
  4. Scale automatically: any new project added to project_index.json
     is picked up on the next API call without code changes.

Design principles:
  - No hardcoded domain values anywhere.
  - Every public method accepts Optional filter dicts so callers can
    compose arbitrary filter combinations.
  - All aggregation uses Python's collections module (no pandas),
    keeping the dependency footprint minimal.
"""

from __future__ import annotations

import json
import os
import re
from collections import Counter, defaultdict
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

SEMESTER_LABELS: Dict[str, str] = {
    "10": "First Semester",
    "20": "Second Semester",
    "30": "Summer Semester",
}

# The project_index.json lives at  <project_root>/embeddings/project_index.json
# This file is located in  <project_root>/backend/trend/engine.py
_HERE       = os.path.dirname(os.path.abspath(__file__))          # backend/trend/
_BACKEND    = os.path.dirname(_HERE)                               # backend/
_ROOT       = os.path.dirname(_BACKEND)                            # project root
_INDEX_PATH = os.path.join(_ROOT, "embeddings", "project_index.json")


# ─────────────────────────────────────────────────────────────────────────────
# Low-level helpers
# ─────────────────────────────────────────────────────────────────────────────

def _load_index() -> Dict[str, dict]:
    """Load project_index.json from disk (called once per request cycle)."""
    with open(_INDEX_PATH, encoding="utf-8") as fh:
        return json.load(fh)


def _parse_id(project_id: str) -> Dict[str, Any]:
    """
    Parse a project ID like 'F01-42-20' into structured metadata.

    Format: {supervisor_code}-{year_short}-{semester_code}
      year_short : 42 → academic year 1442
      semester   : 10 = First, 20 = Second, 30 = Summer
    """
    m = re.match(r'^([A-Za-z]\d+)-(\d+)-(\d+)$', project_id.strip())
    if not m:
        return {}
    year_short   = m.group(2)          # e.g. "42"
    semester_raw = m.group(3)          # e.g. "20"
    full_year    = f"1{year_short}" if len(year_short) == 2 else year_short
    return {
        "supervisor_code": m.group(1),
        "year_short":      year_short,          # "42"
        "year_full":       full_year,            # "142" → corrected below
        "academic_year":   int(f"1{year_short}") if len(year_short) == 2 else int(year_short),
        "semester_code":   semester_raw,
        "semester_label":  SEMESTER_LABELS.get(semester_raw, f"Semester {semester_raw}"),
    }


def _enrich(project_id: str, meta: dict) -> dict:
    """
    Merge the parsed-ID metadata with the stored JSON metadata.
    The stored JSON may already have 'academic_year' (e.g. '1442') and
    'semester' ('10').  The ID-parsed values are used as fallbacks.
    """
    parsed = _parse_id(project_id)
    # Use the stored academic_year field if available (it's the canonical source)
    stored_year = meta.get("academic_year", "")
    stored_sem  = meta.get("semester", "")

    year_label = stored_year if stored_year else str(parsed.get("academic_year", "Unknown"))
    sem_label  = SEMESTER_LABELS.get(stored_sem, f"Semester {stored_sem}") if stored_sem \
                 else parsed.get("semester_label", "Unknown")

    return {
        **meta,
        "_id":            project_id,
        "_year":          year_label,      # "1442", "1443", …
        "_year_short":    parsed.get("year_short", stored_year[-2:] if len(stored_year) >= 2 else stored_year),
        "_semester_code": stored_sem or parsed.get("semester_code", ""),
        "_semester_label":sem_label,
        "_period":        f"{year_label} – {sem_label}",
    }


def _get_projects() -> List[dict]:
    """Return all projects as enriched dicts (reloads index every call)."""
    raw = _load_index()
    return [_enrich(pid, meta) for pid, meta in raw.items()]


# ─────────────────────────────────────────────────────────────────────────────
# Filtering
# ─────────────────────────────────────────────────────────────────────────────

def _apply_filters(projects: List[dict], filters: Optional[Dict[str, Any]]) -> List[dict]:
    """
    Apply arbitrary filter dict to a list of enriched projects.

    Supported filter keys (all optional, all accept a single value OR a list):
      years        → match _year (e.g. ["1442", "1445"])
      semesters    → match _semester_code (e.g. ["10", "20"])
      interests    → match any element in project's 'interest' list
      applications → match any element in project's 'application' list
      rdia         → match any element in project's 'rdia' list
      supervisors  → match 'supervisor_name'
      keywords     → match any element in project's 'keywords' list

    Filtering is additive (AND across dimensions, OR within each dimension).
    """
    if not filters:
        return projects

    def _as_set(v) -> set:
        if v is None:
            return set()
        return {v} if isinstance(v, str) else set(v)

    f_years    = _as_set(filters.get("years"))
    f_sems     = _as_set(filters.get("semesters"))
    f_interest = _as_set(filters.get("interests"))
    f_app      = _as_set(filters.get("applications"))
    f_rdia     = _as_set(filters.get("rdia"))
    f_sup      = _as_set(filters.get("supervisors"))
    f_kw       = _as_set(filters.get("keywords"))

    result = []
    for p in projects:
        if f_years    and p["_year"]            not in f_years:                          continue
        if f_sems     and p["_semester_code"]   not in f_sems:                           continue
        if f_interest and not (f_interest & set(p.get("interest", []))):                 continue
        if f_app      and not (f_app      & set(p.get("application", []))):              continue
        if f_rdia     and not (f_rdia     & set(p.get("rdia", []))):                     continue
        if f_sup      and p.get("supervisor_name", "").strip() not in f_sup:             continue
        if f_kw       and not (f_kw       & {k.lower() for k in p.get("keywords", [])}): continue
        result.append(p)

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Aggregation helpers
# ─────────────────────────────────────────────────────────────────────────────

def _count_field(projects: List[dict], field: str) -> Counter:
    """Count occurrences of every value in a list-typed field."""
    c: Counter = Counter()
    for p in projects:
        for v in p.get(field, []):
            c[v] += 1
    return c


def _count_scalar(projects: List[dict], field: str) -> Counter:
    """Count occurrences of a scalar (string) field."""
    return Counter(p.get(field, "Unknown") for p in projects)


def _trend_direction(history: List[int]) -> str:
    """
    Classify a time-ordered sequence of counts.
    Returns 'increasing', 'decreasing', or 'stable'.
    """
    if len(history) < 2:
        return "stable"
    deltas = [history[i] - history[i - 1] for i in range(1, len(history))]
    pos = sum(1 for d in deltas if d > 0)
    neg = sum(1 for d in deltas if d < 0)
    if pos > neg:
        return "increasing"
    if neg > pos:
        return "decreasing"
    return "stable"


def _growth_rate(history: List[int]) -> float:
    """
    Percentage change from first to last non-zero value.
    Returns 0.0 if history is empty or all zeros.
    """
    non_zero = [v for v in history if v > 0]
    if len(non_zero) < 2:
        return 0.0
    return round((non_zero[-1] - non_zero[0]) / non_zero[0] * 100, 1)


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

class TrendEngine:
    """
    Stateless engine — every method reloads the project index from disk.
    This ensures new projects are always reflected without restarting the server.
    """

    # ── 1. Filter options (dynamic) ───────────────────────────────────────────

    def get_filter_options(self) -> dict:
        """
        Return all distinct values for every filterable dimension.
        Used to populate the UI dropdowns dynamically.
        """
        projects = _get_projects()

        years        = sorted({p["_year"] for p in projects})
        semesters    = sorted({(p["_semester_code"], p["_semester_label"])
                               for p in projects if p["_semester_code"]},
                              key=lambda x: x[0])
        interests    = sorted({i for p in projects for i in p.get("interest", [])})
        applications = sorted({a for p in projects for a in p.get("application", [])})
        rdia_vals    = sorted({r for p in projects for r in p.get("rdia", [])})
        supervisors  = sorted({p.get("supervisor_name", "").strip()
                               for p in projects
                               if p.get("supervisor_name", "").strip()})

        return {
            "years":        years,
            "semesters":    [{"code": c, "label": l} for c, l in semesters],
            "interests":    interests,
            "applications": applications,
            "rdia":         rdia_vals,
            "supervisors":  supervisors,
            "total_projects": len(projects),
        }

    # ── 2. Summary statistics ─────────────────────────────────────────────────

    def get_summary(self, filters: Optional[dict] = None) -> dict:
        """High-level KPIs for the stats bar at the top of the dashboard."""
        all_p  = _get_projects()
        proj   = _apply_filters(all_p, filters)

        interest_c = _count_field(proj, "interest")
        app_c      = _count_field(proj, "application")
        rdia_c     = _count_field(proj, "rdia")

        top_interest = interest_c.most_common(1)[0] if interest_c else ("—", 0)
        top_app      = app_c.most_common(1)[0]      if app_c      else ("—", 0)
        top_rdia     = rdia_c.most_common(1)[0]     if rdia_c     else ("—", 0)

        years_seen  = sorted({p["_year"] for p in proj})
        year_counts = Counter(p["_year"] for p in proj)

        return {
            "total_projects":    len(proj),
            "total_filtered":    len(proj),
            "total_all":         len(all_p),
            "years_covered":     years_seen,
            "unique_interests":  len(interest_c),
            "unique_applications": len(app_c),
            "top_interest":      {"name": top_interest[0], "count": top_interest[1]},
            "top_application":   {"name": top_app[0],      "count": top_app[1]},
            "top_rdia":          {"name": top_rdia[0],     "count": top_rdia[1]},
            "projects_per_year": dict(year_counts),
        }

    # ── 3. Frequency / bar-chart data ─────────────────────────────────────────

    def get_frequency(
        self,
        dimension: str,
        filters: Optional[dict] = None,
        top_n: Optional[int] = None,
    ) -> List[dict]:
        """
        Count occurrences of each value along `dimension`.

        Supported dimensions:
          interest / application / rdia / year / semester / supervisor / keyword

        Returns list of {"name", "count", "percentage"} sorted by count desc.
        """
        proj = _apply_filters(_get_projects(), filters)
        total = len(proj) if proj else 1

        _DIM_MAP = {
            "interest":    lambda p: p.get("interest", []),
            "application": lambda p: p.get("application", []),
            "rdia":        lambda p: p.get("rdia", []),
            "year":        lambda p: [p["_year"]],
            "semester":    lambda p: [p["_semester_label"]],
            "supervisor":  lambda p: [p.get("supervisor_name", "Unknown").strip()],
            "keyword":     lambda p: p.get("keywords", []),
        }

        if dimension not in _DIM_MAP:
            return []

        counter: Counter = Counter()
        for p in proj:
            for v in _DIM_MAP[dimension](p):
                if v:
                    counter[v] += 1

        items = counter.most_common(top_n) if top_n else counter.most_common()
        return [
            {
                "name":       name,
                "count":      cnt,
                "percentage": round(cnt / total * 100, 1),
            }
            for name, cnt in items
        ]

    # ── 4. Timeline / line-chart data ─────────────────────────────────────────

    def get_timeline(
        self,
        dimension: str,
        filters: Optional[dict] = None,
        top_n: int = 8,
    ) -> dict:
        """
        Build a time-series dataset suitable for a Recharts LineChart.

        Returns:
          {
            "periods":  [{"key":"1442-10","label":"1442 – First Semester"}, ...],
            "series":   [{"name":"AI/ML","data":[3,5,8],"trend":"increasing"}, ...],
            "raw":      {period_key: {dimension_value: count}}
          }
        """
        proj = _apply_filters(_get_projects(), filters)

        # Determine which field to use
        _ARRAY_DIMS = {"interest", "application", "rdia", "keyword"}
        _SCALAR_DIMS = {"year", "semester", "supervisor"}

        # First pass: collect top-N categories to keep charts readable
        if dimension in _ARRAY_DIMS:
            top_cats = {name for name, _ in _count_field(proj, dimension).most_common(top_n)}
        elif dimension == "year":
            top_cats = {name for name, _ in _count_scalar(proj, "_year").most_common(top_n)}
        elif dimension == "semester":
            top_cats = {name for name, _ in _count_scalar(proj, "_semester_label").most_common(top_n)}
        elif dimension == "supervisor":
            top_cats = {name for name, _ in
                        Counter(p.get("supervisor_name", "Unknown").strip() for p in proj).most_common(top_n)}
        else:
            return {}

        # Build sorted list of time periods
        periods_set: set = set()
        for p in proj:
            key = f"{p['_year']}-{p['_semester_code']}"
            periods_set.add((key, p["_period"]))
        periods = sorted(periods_set, key=lambda x: x[0])

        # Second pass: count per period per category
        period_data: Dict[str, Counter] = defaultdict(Counter)
        for p in proj:
            pk = f"{p['_year']}-{p['_semester_code']}"
            if dimension in _ARRAY_DIMS:
                for v in p.get(dimension, []):
                    if v in top_cats:
                        period_data[pk][v] += 1
            elif dimension == "year":
                v = p["_year"]
                if v in top_cats:
                    period_data[pk][v] += 1
            elif dimension == "semester":
                v = p["_semester_label"]
                if v in top_cats:
                    period_data[pk][v] += 1
            elif dimension == "supervisor":
                v = p.get("supervisor_name", "Unknown").strip()
                if v in top_cats:
                    period_data[pk][v] += 1

        period_keys = [pk for pk, _ in periods]

        series = []
        for cat in sorted(top_cats):
            history = [period_data[pk].get(cat, 0) for pk in period_keys]
            series.append({
                "name":        cat,
                "data":        history,
                "trend":       _trend_direction(history),
                "growth_rate": _growth_rate(history),
                "total":       sum(history),
            })

        # Sort by total descending
        series.sort(key=lambda s: s["total"], reverse=True)

        return {
            "periods": [{"key": pk, "label": lbl} for pk, lbl in periods],
            "series":  series,
        }

    # ── 5. Distribution / pie-chart data ──────────────────────────────────────

    def get_distribution(
        self,
        dimension: str,
        filters: Optional[dict] = None,
    ) -> List[dict]:
        """
        Same as get_frequency but adds a 'color_index' for pie slices
        and groups small slices into 'Other'.
        """
        freq = self.get_frequency(dimension, filters)
        total = sum(f["count"] for f in freq)
        if total == 0:
            return []

        # Merge anything below 3 % into "Other"
        main, other_count = [], 0
        for item in freq:
            if item["percentage"] >= 3:
                main.append(item)
            else:
                other_count += item["count"]

        if other_count > 0:
            main.append({
                "name":       "Other",
                "count":      other_count,
                "percentage": round(other_count / total * 100, 1),
            })

        for i, item in enumerate(main):
            item["color_index"] = i

        return main

    # ── 6. Stacked / multi-dim chart data ─────────────────────────────────────

    def get_stacked(
        self,
        x_axis: str,
        stack_by: str,
        filters: Optional[dict] = None,
        top_n: int = 8,
    ) -> dict:
        """
        Build data for a stacked bar chart.

        Example: x_axis='year', stack_by='interest'
        Returns list of objects like:
          [{"x": "1442", "AI/ML": 5, "CV": 3, ...}, ...]

        Args:
          x_axis   : grouping axis  (year | semester | interest | application | rdia)
          stack_by : stacking axis  (same options)
          top_n    : limit stacking categories to top-N

        Returns:
          {"bars": [...], "stack_keys": [...]}
        """
        proj = _apply_filters(_get_projects(), filters)

        def _extract(p: dict, dim: str) -> List[str]:
            _map = {
                "year":        [p["_year"]],
                "semester":    [p["_semester_label"]],
                "interest":    p.get("interest", []),
                "application": p.get("application", []),
                "rdia":        p.get("rdia", []),
                "supervisor":  [p.get("supervisor_name", "Unknown").strip()],
            }
            return _map.get(dim, [])

        # Determine top-N stack_by categories
        stack_counter: Counter = Counter()
        for p in proj:
            for v in _extract(p, stack_by):
                stack_counter[v] += 1
        top_stack = [name for name, _ in stack_counter.most_common(top_n)]

        # Build grouped data
        grouped: Dict[str, Counter] = defaultdict(Counter)
        x_order_counter: Counter = Counter()
        for p in proj:
            for xv in _extract(p, x_axis):
                x_order_counter[xv] += 1
                for sv in _extract(p, stack_by):
                    if sv in top_stack:
                        grouped[xv][sv] += 1

        # Sort x axis values naturally
        x_vals = sorted(x_order_counter.keys())

        bars = []
        for xv in x_vals:
            row: Dict[str, Any] = {"x": xv, "total": x_order_counter[xv]}
            for sv in top_stack:
                row[sv] = grouped[xv].get(sv, 0)
            bars.append(row)

        return {"bars": bars, "stack_keys": top_stack}

    # ── 7. Trending highlights ─────────────────────────────────────────────────

    def get_trending(
        self,
        dimension: str,
        filters: Optional[dict] = None,
        top_n: int = 5,
    ) -> List[dict]:
        """
        Return the fastest-growing categories in `dimension`.
        Growth is measured by _growth_rate across all time periods.
        """
        timeline = self.get_timeline(dimension, filters, top_n=20)
        series   = timeline.get("series", [])

        trending = []
        for s in series:
            trending.append({
                "name":        s["name"],
                "trend":       s["trend"],
                "growth_rate": s["growth_rate"],
                "total":       s["total"],
                "history":     s["data"],
            })

        # Sort: increasing first, then by growth_rate desc
        trending.sort(key=lambda x: (
            0 if x["trend"] == "increasing" else
            1 if x["trend"] == "stable" else 2,
            -x["growth_rate"],
        ))

        return trending[:top_n]

    # ── 8. Comparative / semester-vs-semester ─────────────────────────────────

    def get_comparison(
        self,
        dimension: str,
        period_a: str,
        period_b: str,
        filters: Optional[dict] = None,
    ) -> List[dict]:
        """
        Compare frequency of `dimension` values between two periods.

        period_a / period_b format: "<year>-<semester_code>"  e.g. "1442-10"

        Returns:
          [{"name": "AI/ML", "period_a": 3, "period_b": 5, "delta": 2, "delta_pct": 66.7}, ...]
        """
        proj = _apply_filters(_get_projects(), filters)

        def _period_key(p: dict) -> str:
            return f"{p['_year']}-{p['_semester_code']}"

        proj_a = [p for p in proj if _period_key(p) == period_a]
        proj_b = [p for p in proj if _period_key(p) == period_b]

        _ARRAY_DIMS = {"interest", "application", "rdia", "keyword"}

        if dimension in _ARRAY_DIMS:
            cnt_a = _count_field(proj_a, dimension)
            cnt_b = _count_field(proj_b, dimension)
        else:
            cnt_a = _count_scalar(proj_a, f"_{dimension}" if dimension in ("year", "semester") else dimension)
            cnt_b = _count_scalar(proj_b, f"_{dimension}" if dimension in ("year", "semester") else dimension)

        all_names = sorted(set(list(cnt_a.keys()) + list(cnt_b.keys())))
        result = []
        for name in all_names:
            va = cnt_a.get(name, 0)
            vb = cnt_b.get(name, 0)
            delta = vb - va
            delta_pct = round((delta / va * 100) if va > 0 else (100.0 if vb > 0 else 0.0), 1)
            result.append({
                "name":      name,
                "period_a":  va,
                "period_b":  vb,
                "delta":     delta,
                "delta_pct": delta_pct,
                "direction": "up" if delta > 0 else ("down" if delta < 0 else "same"),
            })

        result.sort(key=lambda x: abs(x["delta"]), reverse=True)
        return result


# ─────────────────────────────────────────────────────────────────────────────
# Module-level singleton (instantiated once per worker process)
# ─────────────────────────────────────────────────────────────────────────────
engine = TrendEngine()
