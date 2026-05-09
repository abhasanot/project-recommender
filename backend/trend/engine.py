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
from typing import Any, Dict, List, Optional

# -----------------------------------------------------------------------------
# Constants
# -----------------------------------------------------------------------------

SEMESTER_LABELS: Dict[str, str] = {
    "10": "First Semester",
    "20": "Second Semester",
}

# The project_index.json lives at <project_root>/embeddings/project_index.json
# This file is located in <project_root>/backend/trend/engine.py
_HERE       = os.path.dirname(os.path.abspath(__file__))          # backend/trend/
_BACKEND    = os.path.dirname(_HERE)                               # backend/
_ROOT       = os.path.dirname(_BACKEND)                            # project root
_INDEX_PATH = os.path.join(_ROOT, "embeddings", "project_index.json")


# -----------------------------------------------------------------------------
# Low-level helpers
# -----------------------------------------------------------------------------

def _load_index() -> Dict[str, dict]:
    """Load project_index.json from disk (called once per request cycle)."""
    with open(_INDEX_PATH, encoding="utf-8") as fh:
        return json.load(fh)


def _parse_id(project_id: str) -> Dict[str, Any]:
    """
    Parse a project ID like 'F01-42-20' into structured metadata.

    Format: {group_code}-{year_short}-{semester_code}
      year_short : 42 -> academic year 1442
      semester   : 10 = First, 20 = Second
    """
    m = re.match(r'^([A-Za-z]\d+)-(\d+)-(\d+)$', project_id.strip())
    if not m:
        return {}
    year_short   = m.group(2)          # e.g. "42"
    semester_raw = m.group(3)          # e.g. "20"
    full_year    = f"1{year_short}" if len(year_short) == 2 else year_short
    return {
        "group_code": m.group(1),
        "year_short":      year_short,          # "42"
        "year_full":       full_year,            # "142" -> corrected below
        "academic_year":   int(f"1{year_short}") if len(year_short) == 2 else int(year_short),
        "semester_code":   semester_raw,
        "semester_label":  SEMESTER_LABELS.get(semester_raw, f"Semester {semester_raw}"),
    }


def _enrich(project_id: str, meta: dict) -> dict:
    """
    Merge the parsed-ID metadata with the stored JSON metadata.
    The stored JSON may already have 'academic_year' (e.g. '1442') and
    'semester' ('10'). The ID-parsed values are used as fallbacks.
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
        "_year":          year_label,      # "1442", "1443", ...
        "_year_short":    parsed.get("year_short", stored_year[-2:] if len(stored_year) >= 2 else stored_year),
        "_semester_code": stored_sem or parsed.get("semester_code", ""),
        "_semester_label": sem_label,
        "_period":        f"{year_label} - {sem_label}",
    }


def _get_projects() -> List[dict]:
    """Return all projects as enriched dicts (reloads index every call)."""
    raw = _load_index()
    return [_enrich(pid, meta) for pid, meta in raw.items()]


# -----------------------------------------------------------------------------
# Filtering
# -----------------------------------------------------------------------------

def _apply_filters(projects: List[dict], filters: Optional[Dict[str, Any]]) -> List[dict]:
    """
    Apply arbitrary filter dict to a list of enriched projects.

    Supported filter keys (all optional, all accept a single value OR a list):
      years        -> match _year (e.g. ["1442", "1445"])
      semesters    -> match _semester_code (e.g. ["10", "20"])
      interests    -> match any element in project's 'interest' list
      applications -> match any element in project's 'application' list
      rdia         -> match any element in project's 'rdia' list

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

    result = []
    for p in projects:
        if f_years    and p["_year"] not in f_years:
            continue
        if f_sems     and p["_semester_code"] not in f_sems:
            continue
        if f_interest and not (f_interest & set(p.get("interest", []))):
            continue
        if f_app      and not (f_app & set(p.get("application", []))):
            continue
        if f_rdia     and not (f_rdia & set(p.get("rdia", []))):
            continue
        result.append(p)

    return result


# -----------------------------------------------------------------------------
# Aggregation helpers
# -----------------------------------------------------------------------------

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


# -----------------------------------------------------------------------------
# Public API
# -----------------------------------------------------------------------------

class TrendEngine:
    """
    Stateless engine - every method reloads the project index from disk.
    This ensures new projects are always reflected without restarting the server.
    """

    # -- 1. Filter options (dynamic) -----------------------------------------

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

        return {
            "years":        years,
            "semesters":    [{"code": c, "label": l} for c, l in semesters],
            "interests":    interests,
            "applications": applications,
            "rdia":         rdia_vals,
            "total_projects": len(projects),
        }

    # -- 2. Summary statistics -----------------------------------------------

    def get_summary(self, filters: Optional[dict] = None) -> dict:
        """High-level KPIs for the stats bar at the top of the dashboard."""
        all_p  = _get_projects()
        proj   = _apply_filters(all_p, filters)

        interest_c = _count_field(proj, "interest")
        app_c      = _count_field(proj, "application")
        rdia_c     = _count_field(proj, "rdia")

        top_interest = interest_c.most_common(1)[0] if interest_c else ("-", 0)
        top_app      = app_c.most_common(1)[0]      if app_c      else ("-", 0)
        top_rdia     = rdia_c.most_common(1)[0]     if rdia_c     else ("-", 0)

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

    # -- 3. Frequency / bar-chart data ---------------------------------------

    def get_frequency(
        self,
        dimension: str,
        filters: Optional[dict] = None,
        top_n: Optional[int] = None,
    ) -> List[dict]:
        """
        Count occurrences of each value along `dimension`.

        Supported dimensions (matches UI tabs):
          interest / application / rdia

        Returns list of {"name", "count", "percentage"} sorted by count desc.
        """
        proj = _apply_filters(_get_projects(), filters)
        total = len(proj) if proj else 1

        _DIM_MAP = {
            "interest":    lambda p: p.get("interest", []),
            "application": lambda p: p.get("application", []),
            "rdia":        lambda p: p.get("rdia", []),
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

    # -- 4. Timeline / line-chart data ---------------------------------------

    def get_timeline(
        self,
        dimension: str,
        filters: Optional[dict] = None,
        top_n: int = 8,
    ) -> dict:
        """
        Build a time-series dataset suitable for a Recharts LineChart.

        Supported dimensions (matches UI tabs):
          interest / application / rdia

        Returns:
          {
            "periods":  [{"key":"1442-10","label":"1442 - First Semester"}, ...],
            "series":   [{"name":"AI/ML","data":[3,5,8],"trend":"increasing","growth_rate":166.7,"total":16}, ...]
          }
        """
        proj = _apply_filters(_get_projects(), filters)

        _ARRAY_DIMS = {"interest", "application", "rdia"}

        if dimension not in _ARRAY_DIMS:
            return {}

        # First pass: collect top-N categories to keep charts readable
        top_cats = {name for name, _ in _count_field(proj, dimension).most_common(top_n)}

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
            for v in p.get(dimension, []):
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

    # -- 5. Distribution / pie-chart data ------------------------------------

    def get_distribution(
        self,
        dimension: str,
        filters: Optional[dict] = None,
    ) -> List[dict]:
        """
        Same as get_frequency but adds a 'color_index' for pie slices
        and groups small slices into 'Other'.

        Supported dimensions (matches UI tabs):
          interest / application / rdia
        """
        freq = self.get_frequency(dimension, filters)
        total = sum(f["count"] for f in freq)
        if total == 0:
            return []

        # Merge anything below 3% into "Other"
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


# -----------------------------------------------------------------------------
# Module-level singleton (instantiated once per worker process)
# -----------------------------------------------------------------------------
engine = TrendEngine()