# Bug Fixes — project-recommender

## Quick deployment guide

Replace each file in your repo with the corrected version from this archive.

### Files changed

| Fixed file | Replaces |
|---|---|
| `utils.py` | `utils.py` (root) |
| `embedding_engine.py` | `embedding_engine.py` (root) |
| `recommender_system.py` | `recommender_system.py` |
| `recommenders/project_recommender.py` | `recommenders/project_recommender.py` |
| `backend/app.py` | `backend/app.py` |
| `backend/database.py` | `backend/database.py` |
| `backend/embedding_engine.py` | `backend/embedding_engine.py` |
| `backend/utils.py` | `backend/utils.py` |
| `frontend/src/services/api.ts` | `frontend/src/services/api.ts` |
| `frontend/src/components/RecommendationsPage.tsx` | same |
| `frontend/src/components/Dashboard.tsx` | same |
| `frontend/src/components/GroupPage.tsx` | same |
| `frontend/src/components/ProfilePage.tsx` | same |

---

## Bug catalogue

### Bug 1 — `utils.py` · `get_course_texts()` — wrong indentation (Logic / NameError)
`if stmt: segments.append(stmt)` was at the outer `for category` level.
Only the last CLO per category was ever appended; a NameError was raised when
a category contained zero CLOs.
**Fix:** moved the append statement inside the inner `for clo` loop.

### Bug 2 — `utils.py` (root) · `grade_to_weight()` — AttributeError on numeric grade
The root copy typed `grade: str` and called `grade.strip()` unconditionally.
Numeric GPA values (e.g. `4.5`) from the group JSON caused an AttributeError.
**Fix:** added `isinstance(grade, (int, float))` branch to convert numeric → letter.

### Bug 3 — `embedding_engine.py` · `_load_project_matrix()` — wrong empty shape
`np.array([])` produces shape `(0,)` not `(0, D)`. The subsequent matrix
multiply `project_matrix @ query_vec` raised a `ValueError`.
**Fix:** `np.empty((0, 384), dtype=np.float32)` when no vectors are found.

### Bug 4 — `embedding_engine.py` · `_build_bm25()` — no None sentinel
When the corpus was empty, `BM25Okapi([])` would crash. Even if that were
handled, downstream code had no way to know `bm25` was unavailable.
**Fix:** set `self.bm25 = None` when corpus is empty; guard all callers.

### Bug 5 — `embedding_engine.py` · `_build_competency_vec()` — `model.encode([])`
When a course had no text segments, `model.encode([])` was called, returning
an empty array that crashed `average_vectors`.
**Fix:** `if not segments: continue` guard before calling the model.

### Bug 6 — `backend/database.py` — three missing methods (AttributeError)
`app.py` calls `db.update_group_members()`, `db.get_user_group()`, and
`db.delete_group()` on virtually every group route. None of these methods
existed, causing an immediate `AttributeError` at runtime.
**Fix:** implemented all three with correct SQL.

### Bug 7 — `backend/app.py` · `generate_group_recommendations()` — hardcoded weight
`weighting_mode` was hardcoded to `'balanced'`, ignoring any settings saved
by the leader via `PUT /api/group/weights`.
**Fix:** fetch `db.get_group_weights(group_id)` and use the stored mode.

### Bug 8 — `backend/app.py` — SESSION_FILE_DIR not configured
`SESSION_TYPE = 'filesystem'` was set but `SESSION_FILE_DIR` was never
configured. Flask-Session stored sessions in a relative path that broke
whenever the working directory changed.
**Fix:** set `SESSION_FILE_DIR` to an absolute path inside `backend/`.

### Bug 9 — `recommenders/project_recommender.py` · `_sparse_retrieval()` — None call
After Bug 4 was fixed to set `self.engine.bm25 = None`, calling
`self.engine.bm25.get_scores(...)` without checking caused an AttributeError.
**Fix:** `if self.engine.bm25 is None: return []` guard.

### Bug 10 — `frontend/src/services/api.ts` — hardcoded absolute URL
`baseURL: 'http://localhost:5000/api'` bypasses the Vite proxy, breaks CORS
in production, and couples the frontend to a specific port.
**Fix:** `baseURL: '/api'` — requests go through the Vite proxy in dev and a
reverse-proxy in production.

### Bug 11 — `RecommendationsPage.tsx` — `refreshTrigger` not in props interface
`refreshTrigger` was listed in the `useEffect` dependency array but was not
declared in `RecommendationsPageProps`, causing a TypeScript compile error.
**Fix:** added `refreshTrigger?: number` to the interface.

### Bug 12 — `Dashboard.tsx` — `isLeader` always `false`
`GroupSettingsPage` was always called with `isLeader={false}`. The group
leader could never access weight-adjustment controls.
**Fix:** fetch `/auth/me` + `/group` on mount, compare IDs to set `isLeader`.

### Bug 13 — `GroupPage.tsx` — numeric vs string ID comparison always false
The backend returns numeric user IDs. `currentUserId` was stored as a string
via `.toString()`, but `leaderMember.id` came in as a number. The strict `===`
check always returned `false`, so `isLeader` was always `false`.
**Fix:** wrap both sides in `String()` before comparing.

### Bug 14 — `ProfilePage.tsx` — saves display name instead of `course_code`
The save payload sent `name` (display title) for each course. The backend
expects `{ course_code, grade }` and the recommender engine looks up embeddings
by code — so all courses were silently skipped.
**Fix:** load course options from `/api/domains`, store `course_code`, and
send `{ course_code, grade }` to `/api/profile`.
