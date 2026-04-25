"""
backend/embedding_engine.py
--------------------
Shared Embedding Engine — used by ALL recommenders (backend copy).

This is identical in logic to the root embedding_engine.py but lives inside
the backend/ folder so the Flask app can import it when sys.path is set to
the project root.  All bug fixes applied to the root version are mirrored here.
"""

import os
import json
import numpy as np
from typing import Dict, List, Tuple
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi

from utils import (
    load_courses,
    load_interest_domains,
    load_application_domains,
    load_rdia,
    load_acm_taxonomy,
    get_course_texts,
    get_project_segments,
    encode_late_fusion_engine,
    grade_to_weight,
    weighted_average,
    average_vectors,
    normalize,
    load_vector,
    save_vector,
    load_plos_from_courses,
)

# ─────────────────────────────────────────────────────────────────────────────
# PATHS — resolved relative to the PROJECT ROOT (parent of this backend/ folder)
# ─────────────────────────────────────────────────────────────────────────────

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATA_DIR       = os.path.join(PROJECT_ROOT, "data")
EMBEDDINGS_DIR = os.path.join(PROJECT_ROOT, "embeddings")

COURSES_PATH     = os.path.join(DATA_DIR, "courses.json")
INTEREST_PATH    = os.path.join(DATA_DIR, "Interest_Domains.json")
APPLICATION_PATH = os.path.join(DATA_DIR, "Application_Domains.json")
RDIA_PATH        = os.path.join(DATA_DIR, "RDIA.json")
ACM_PATH         = os.path.join(DATA_DIR, "ACM_CSS_taxonomy.json")

PROJECTS_EMB_DIR   = os.path.join(EMBEDDINGS_DIR, "projects")
COURSES_EMB_DIR    = os.path.join(EMBEDDINGS_DIR, "courses")
PROJECT_INDEX_PATH = os.path.join(EMBEDDINGS_DIR, "project_index.json")

SBERT_MODEL  = "all-MiniLM-L6-v2"
_DEFAULT_DIM = 384


class EmbeddingEngine:
    """
    Shared engine initialized once at startup.
    Passed to every recommender as a dependency.
    """

    def __init__(self):
        print("[EmbeddingEngine] Initializing...")

        self.course_map   = load_courses(COURSES_PATH)
        self.plos_map     = load_plos_from_courses(COURSES_PATH)
        self.interest_map = load_interest_domains(INTEREST_PATH)
        self.app_map      = load_application_domains(APPLICATION_PATH)
        self.rdia_map     = load_rdia(RDIA_PATH)
        self.acm_map      = load_acm_taxonomy(ACM_PATH)

        print(f"  Loading SBERT: {SBERT_MODEL}")
        self.model = SentenceTransformer(SBERT_MODEL)

        self._precompute_domain_vecs()

        with open(PROJECT_INDEX_PATH, "r", encoding="utf-8") as f:
            self.project_index: Dict[str, dict] = json.load(f)

        self._load_project_matrix()
        self._build_bm25()

        print(
            f"[EmbeddingEngine] Ready — "
            f"{len(self.project_ids)} projects | "
            f"{len(self.interest_vecs)} interests | "
            f"{len(self.app_vecs)} apps | "
            f"{len(self.rdia_vecs)} RDIA\n"
        )

    def _precompute_domain_vecs(self):
        self.interest_vecs: Dict[str, np.ndarray] = {}
        for name, desc in self.interest_map.items():
            self.interest_vecs[name] = self._encode_domain(name, desc)

        self.app_vecs: Dict[str, np.ndarray] = {}
        for field, focus in self.app_map.items():
            self.app_vecs[field] = self._encode_domain(field, focus)

        self.rdia_vecs: Dict[str, np.ndarray] = {}
        for label, desc in self.rdia_map.items():
            self.rdia_vecs[label] = self._encode_domain(label, desc)

        print(
            f"  Domain vectors: {len(self.interest_vecs)} interests | "
            f"{len(self.app_vecs)} apps | {len(self.rdia_vecs)} RDIA"
        )

    def _encode_domain(self, name: str, description: str) -> np.ndarray:
        segments = [name, description] if description else [name]
        vecs = self.model.encode(segments, normalize_embeddings=True,
                                 show_progress_bar=False)
        return normalize(average_vectors(list(vecs)))

    def _load_project_matrix(self):
        """FIX: guard against empty vecs creating wrong-shaped array."""
        self.project_ids: List[str] = []
        vecs: List[np.ndarray] = []

        for pid in self.project_index:
            path = os.path.join(PROJECTS_EMB_DIR, f"{pid}.npy")
            if os.path.exists(path):
                self.project_ids.append(pid)
                vecs.append(load_vector(path))

        if not vecs:
            print("  [WARNING] No project vectors found. Matrix will be empty.")
            self.project_matrix = np.empty((0, _DEFAULT_DIM), dtype=np.float32)
        else:
            self.project_matrix = np.array(vecs)
            print(f"  Project matrix loaded: {self.project_matrix.shape}")

    def _build_bm25(self):
        """FIX: set self.bm25 = None when corpus is empty."""
        corpus: List[List[str]] = []
        self.bm25_order: List[str] = []

        for pid, meta in self.project_index.items():
            text = " ".join([
                meta.get("title", ""),
                " ".join(meta.get("keywords", [])),
                " ".join(meta.get("interest", [])),
                " ".join(meta.get("application", [])),
                " ".join(meta.get("rdia", [])),
            ]).lower()
            corpus.append(text.split())
            self.bm25_order.append(pid)

        if corpus:
            self.bm25 = BM25Okapi(corpus)
            print(f"  BM25 index built: {len(self.bm25_order)} documents")
        else:
            self.bm25 = None
            print("  [WARNING] No documents for BM25 index.")

    # ─────────────────────────────────────────────────────────────────────────

    def build_group_profile(self, group_json: dict) -> Tuple[np.ndarray, dict]:
        weighting_mode = group_json.get("weighting_mode", "balanced")
        if weighting_mode == "courses_heavy":
            comp_w, int_w = 0.75, 0.25
        elif weighting_mode == "interests_heavy":
            comp_w, int_w = 0.25, 0.75
        else:
            comp_w, int_w = 0.50, 0.50

        student_vecs  = []
        all_interests = set()
        all_apps      = set()
        all_rdia      = set()

        for student in group_json.get("students", []):
            comp_vec    = self._build_competency_vec(student)
            int_vec     = self._build_interest_vec(student)
            student_vec = normalize(comp_w * comp_vec + int_w * int_vec)
            student_vecs.append(student_vec)

            all_interests.update(student.get("interests", []))
            all_apps.update(student.get("applications", []))
            rdia = student.get("rdia", "")
            if rdia:
                all_rdia.add(rdia)

        if not student_vecs:
            raise ValueError("Group has no valid students.")

        group_vec = normalize(np.mean(np.array(student_vecs), axis=0))
        group_meta = {
            "selected_interests":    list(all_interests),
            "selected_applications": list(all_apps),
            "selected_rdia":         list(all_rdia),
        }
        return group_vec, group_meta

    def _build_competency_vec(self, student: dict) -> np.ndarray:
        """FIX: guard against empty segments before calling model.encode."""
        vecs, weights = [], []
        dim = self.project_matrix.shape[1] if self.project_matrix.size > 0 else _DEFAULT_DIM

        for entry in student.get("courses", []):
            code  = entry.get("course_code", "")
            grade = entry.get("grade", "C")

            path = os.path.join(COURSES_EMB_DIR, f"{code}.npy")
            if os.path.exists(path):
                vec = load_vector(path)
            elif code in self.course_map:
                segments = get_course_texts(self.course_map[code], self.plos_map)
                if not segments:
                    print(f"  [WARNING] No text segments for course '{code}', skipping.")
                    continue
                vecs_raw = self.model.encode(segments, normalize_embeddings=True,
                                             show_progress_bar=False)
                vec = normalize(average_vectors(list(vecs_raw)))
            else:
                print(f"  [WARNING] Unknown course '{code}', skipping.")
                continue

            vecs.append(vec)
            weights.append(grade_to_weight(grade))

        if not vecs:
            return np.zeros(dim)
        return normalize(weighted_average(vecs, weights))

    def _build_interest_vec(self, student: dict) -> np.ndarray:
        vecs = []
        dim  = self.project_matrix.shape[1] if self.project_matrix.size > 0 else _DEFAULT_DIM

        for name in student.get("interests", []):
            if name in self.interest_vecs:
                vecs.append(self.interest_vecs[name])

        for name in student.get("applications", []):
            if name in self.app_vecs:
                vecs.append(self.app_vecs[name])

        rdia = student.get("rdia", "")
        if rdia and rdia in self.rdia_vecs:
            vecs.append(self.rdia_vecs[rdia])

        if not vecs:
            return np.zeros(dim)
        return normalize(average_vectors(vecs))

    def get_project_vec(self, pid: str) -> np.ndarray:
        path = os.path.join(PROJECTS_EMB_DIR, f"{pid}.npy")
        return load_vector(path) if os.path.exists(path) else None

    def embed_and_register_project(self, project: dict) -> bool:
        """
        Generate embedding for a single NEW project and register it live
        in the engine — WITHOUT re-embedding existing projects.

        Steps:
          1. Build text segments for the new project (same logic as phase2_embed.py)
          2. Encode with Late Fusion → single normalized vector
          3. Save vector to embeddings/projects/{pid}.npy
          4. Add metadata entry to self.project_index (in-memory)
          5. Append vector to self.project_matrix
          6. Append pid to self.project_ids
          7. Rebuild BM25 index to include the new document

        Returns True on success, False if no segments could be built.
        """
        pid = project.get("id", "")
        if not pid:
            print("[embed_and_register_project] ERROR: project has no 'id'.")
            return False

        # 1. Build segments (identical approach to phase2_embed.py)
        segments = get_project_segments(
            project,
            self.acm_map,
            self.interest_map,
            self.app_map,
            self.rdia_map,
        )
        if not segments:
            print(f"[embed_and_register_project] No segments for {pid}, skipping.")
            return False

        # 2. Encode via Late Fusion
        vecs_raw = self.model.encode(
            segments,
            normalize_embeddings=True,
            batch_size=32,
            show_progress_bar=False,
        )
        vector = normalize(average_vectors(list(vecs_raw)))

        # 3. Save .npy file
        os.makedirs(PROJECTS_EMB_DIR, exist_ok=True)
        save_vector(vector, os.path.join(PROJECTS_EMB_DIR, f"{pid}.npy"))

        # 4. Add to in-memory project_index
        clf = project.get("classification", {})
        conclusion = project.get("conclusion", {})
        self.project_index[pid] = {
            "id":              pid,
            "title":           project.get("title", ""),
            "supervisor_name": project.get("supervisor_name", ""),
            "supervisor_id":   project.get("supervisor_id", ""),
            "academic_year":   project.get("academic_year", ""),
            "semester":        project.get("semester", ""),
            "keywords":        project.get("keywords", []),
            "abstract":        project.get("abstract", ""),
            "future_work":     conclusion.get("future_work", ""),
            "application":     clf.get("application", []),
            "interest":        clf.get("interest", []),
            "rdia":            clf.get("rdia", []),
            "acm":             clf.get("acm", []),
        }

        # 5 & 6. Append to project matrix and IDs list
        self.project_ids.append(pid)
        new_row = vector.reshape(1, -1).astype(np.float32)
        if self.project_matrix.shape[0] == 0:
            self.project_matrix = new_row
        else:
            self.project_matrix = np.vstack([self.project_matrix, new_row])

        # 7. Rebuild BM25 so the new project is searchable immediately
        self._build_bm25()

        print(f"[embed_and_register_project] ✓ {pid} embedded & registered live.")
        return True
