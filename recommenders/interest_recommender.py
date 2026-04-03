"""
recommenders/interest_recommender.py
Score all interest domains for the group. No changes from original.
"""
import numpy as np
from collections import Counter
from typing import List

class InterestRecommender:
    def __init__(self, engine):
        self.engine = engine

    def recommend(self, group_vec, group_meta, top_n=3) -> List[dict]:
        freq = self._domain_frequency(group_vec, "interest")
        results = []
        for name, vec in self.engine.interest_vecs.items():
            sim = float(np.dot(group_vec, vec))
            sim_norm = (sim + 1.0) / 2.0
            combined = 0.70 * sim_norm + 0.30 * freq.get(name, 0.0)
            results.append({
                "name":                      name,
                "description":               self.engine.interest_map.get(name, ""),
                "combined_score":            round(combined, 4),
                "semantic_score":            round(sim_norm, 4),
                "frequency_in_top_projects": freq.get(name, 0),
                "already_selected":          name in group_meta.get("selected_interests", []),
            })
        results.sort(key=lambda x: x["combined_score"], reverse=True)
        return results[:top_n]

    def _domain_frequency(self, group_vec, field):
        if self.engine.project_matrix.size == 0:
            return {}
        scores = self.engine.project_matrix @ group_vec
        top_pids = [self.engine.project_ids[i] for i in np.argsort(scores)[::-1][:10]]
        counter = Counter()
        for pid in top_pids:
            for d in self.engine.project_index.get(pid, {}).get(field, []):
                counter[d] += 1
        max_f = max(counter.values()) if counter else 1
        return {k: v / max_f for k, v in counter.items()}
