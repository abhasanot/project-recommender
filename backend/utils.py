"""
backend/utils.py
----------------
Data loaders and helper functions shared across all backend files.

All bug fixes from the root utils.py are mirrored here.
"""

import json
import os
import numpy as np
from typing import List, Dict


GRADE_WEIGHTS = {
    "A+": 1.00,
    "A":  0.95,
    "B+": 0.85,
    "B":  0.75,
    "C+": 0.65,
    "C":  0.55,
    "D+": 0.45,
    "D":  0.30,
}


def grade_to_weight(grade) -> float:
    """
    Convert letter grade or numeric GPA grade to embedding weight.
    FIX: handles numeric float/int grades (e.g. 4.5) without crashing.
    """
    if isinstance(grade, (int, float)):
        if grade >= 4.5:   grade_str = "A+"
        elif grade >= 4.0: grade_str = "A"
        elif grade >= 3.5: grade_str = "B+"
        elif grade >= 3.0: grade_str = "B"
        elif grade >= 2.5: grade_str = "C+"
        elif grade >= 2.0: grade_str = "C"
        elif grade >= 1.5: grade_str = "D+"
        else:              grade_str = "D"
    else:
        grade_str = str(grade).strip().upper()
    return GRADE_WEIGHTS.get(grade_str, 0.50)


def load_plos_from_courses(courses_path: str) -> Dict[str, str]:
    """Extract PLOs → {plo_id: description}"""
    with open(courses_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    plos_map = {}
    for category in ["knowledge", "skills", "values"]:
        for plo in data.get("program_learning_outcomes", {}).get(category, []):
            plo_id   = plo.get("plo_id")
            plo_desc = plo.get("plo_description")
            if plo_id and plo_desc:
                plos_map[plo_id] = plo_desc
    return plos_map


def load_courses(path: str) -> Dict[str, dict]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {c["course_code"]: c for c in data["courses"]}


def load_interest_domains(path: str) -> Dict[str, str]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {item["name"]: item["description"] for item in data["DOMAIN_CATEGORIES"]}


def load_application_domains(path: str) -> Dict[str, str]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {item["Field"]: item["Focus"] for item in data}


def load_rdia(path: str) -> Dict[str, str]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {item["Label"]: item["Description"] for item in data["RDIA"]}


def load_acm_taxonomy(path: str) -> Dict[str, str]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    flat = {}

    def extract(items, ancestors):
        for item in items:
            name    = item.get("name", "")
            desc    = item.get("description", "")
            item_id = item.get("id", "")
            current = ancestors + ([name] if name else [])
            if item_id:
                label = " > ".join(current)
                flat[item_id] = f"{label}: {desc}" if desc else label
            if item.get("subcategories"):
                extract(item["subcategories"], current)

    for cat in data["ACM_CSS_taxonomy"]:
        cat_name = cat.get("name", "")
        cat_desc = cat.get("description", "")
        cat_id   = cat.get("id", "")
        if cat_id:
            flat[cat_id] = f"{cat_name}: {cat_desc}" if cat_desc else cat_name
        if cat.get("subcategories"):
            extract(cat["subcategories"], [cat_name] if cat_name else [])

    return flat


def load_all_projects(projects_dir: str) -> List[dict]:
    projects = []
    if not os.path.exists(projects_dir):
        print(f"  [WARNING] Projects directory not found: {projects_dir}")
        return projects
    for fname in sorted(os.listdir(projects_dir)):
        if fname.endswith(".json"):
            fpath = os.path.join(projects_dir, fname)
            with open(fpath, "r", encoding="utf-8") as f:
                try:
                    projects.append(json.load(f))
                except json.JSONDecodeError as e:
                    print(f"  [WARNING] Skipping {fname}: {e}")
    return projects


def get_course_texts(course: dict, plos_map: Dict[str, str] = None) -> List[str]:
    """
    Extract meaningful text segments from a course dict.

    FIX (Bug): `if stmt: segments.append(stmt)` was outside the inner `for clo`
    loop in both utils.py copies, causing only the last CLO per category to be
    saved and a NameError when a category had zero CLOs.
    """
    segments = []

    title = course.get("course_title", "")
    desc  = course.get("course_description", "")
    if title or desc:
        segments.append(f"{title}. {desc}".strip())

    level = course.get("course_level", "")
    if level:
        segments.append(f"Course level: {level}")

    prereq = course.get("prerequisites", "")
    if prereq:
        if isinstance(prereq, list):
            prereq = ", ".join(prereq)
        segments.append(f"Prerequisites: {prereq}")

    credits = course.get("credit_hours", "")
    if credits:
        segments.append(f"Credit hours: {credits}")

    clos = course.get("course_learning_outcomes", {})
    for category in ["knowledge", "skills", "values"]:
        for clo in clos.get(category, []):
            stmt = clo.get("clo_statement", "").strip()
            if plos_map and stmt:
                mapped_plos = clo.get("mapped_plos", [])
                plo_descs   = [
                    f"{pid}: {plos_map[pid]}"
                    for pid in mapped_plos
                    if pid in plos_map
                ]
                if plo_descs:
                    stmt += " [Associated PLOs: " + " | ".join(plo_descs) + "]"
            # FIX: inside the inner `for clo` loop
            if stmt:
                segments.append(stmt)

    return segments


def get_project_segments(
    project: dict,
    acm_map: Dict[str, str],
    interest_map: Dict[str, str] = None,
    app_map: Dict[str, str] = None,
    rdia_map: Dict[str, str] = None,
) -> List[str]:
    intro      = project.get("introduction", {})
    conclusion = project.get("conclusion", {})
    clf        = project.get("classification", {})

    acm_texts = [acm_map[c] for c in clf.get("acm", []) if c in acm_map]

    segments = []
    if project.get("title"):
        segments.append(project["title"])
    if project.get("abstract"):
        segments.append(project["abstract"])
    kws = project.get("keywords", [])
    if kws:
        segments.append(" ".join(kws))
    pa = " ".join(filter(None, [intro.get("problem"), intro.get("aim")]))
    if pa:
        segments.append(pa)
    objs = intro.get("objectives", [])
    if objs:
        segments.append(" ".join(objs))
    if conclusion.get("results"):
        segments.append(conclusion["results"])
    if conclusion.get("future_work"):
        segments.append(conclusion["future_work"])

    domain_parts = []
    for n in clf.get("interest", []):
        if interest_map and n in interest_map:
            domain_parts.append(f"{n}: {interest_map[n]}")
    for n in clf.get("application", []):
        if app_map and n in app_map:
            domain_parts.append(f"{n}: {app_map[n]}")
    for n in clf.get("rdia", []):
        if rdia_map and n in rdia_map:
            domain_parts.append(f"{n}: {rdia_map[n]}")
    if domain_parts:
        segments.append(" | ".join(domain_parts))
    if acm_texts:
        segments.append(" ".join(acm_texts))

    return [s.strip() for s in segments if s.strip()]


def weighted_average(vectors: List[np.ndarray], weights: List[float]) -> np.ndarray:
    vecs = np.array(vectors)
    w    = np.array(weights, dtype=float)
    w    = w / w.sum()
    return np.average(vecs, axis=0, weights=w)


def average_vectors(vectors: List[np.ndarray]) -> np.ndarray:
    return np.mean(np.array(vectors), axis=0)


def normalize(vec: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(vec)
    return vec / norm if norm > 0 else vec


def save_vector(vec: np.ndarray, path: str):
    np.save(path, vec)


def load_vector(path: str) -> np.ndarray:
    return np.load(path)


def encode_late_fusion_engine(model, segments: list) -> np.ndarray:
    if not segments:
        raise ValueError("No segments provided.")
    vectors = model.encode(
        segments,
        normalize_embeddings=True,
        batch_size=32,
        show_progress_bar=False,
    )
    return normalize(average_vectors(list(vectors)))
