# v2 Changes — System Flow Enforcement

## New System Flow

```
1. All members complete Profile page
        ↓
2. Leader opens My Group → sees per-member status
3. Leader selects weighting mode → clicks Save Weights
        ↓
4. When ALL conditions met, leader clicks Finalize
5. Recommendations generated & stored
        ↓
6. All members view Recommendations page
```

## Backend Changes

### `backend/app.py`
- **New endpoint `GET /api/group/readiness`** — returns per-member profile completion
  status AND whether the leader has saved a weighting mode. Used by GroupPage.
- **`POST /api/group/finalize`** — now enforces **all 3 pre-conditions**:
  1. ≥2 members
  2. All profiles complete (courses + grade + interests + applications + RDIA)
  3. Leader has explicitly saved a weighting mode
  Returns `400` with a list of `incomplete_members` if profiles are missing.
- **`PUT /api/group/weights`** — now allowed **before** finalization (no longer
  requires `is_finalized=True`). This lets the leader save weights in GroupPage
  before clicking Finalize. Also still triggers re-generation post-finalization.
- **`GET /api/recommendations`** — returns structured error objects with a
  `condition` field (`no_group`, `not_finalized`, `incomplete_profiles`,
  `no_weights`) so the frontend can show specific messages.
- **`GET /api/profile/completion`** — returns `details` dict breaking down
  each completion step (courses, interests, applications, rdia).

### `backend/database.py`
- **New method `has_group_weights(group_id)`** — returns `True` only if the
  leader has explicitly saved a row to `group_weights`. Prevents the default
  fallback values from being mistaken for a deliberate choice.
- Fixed `get_user_group()`, `update_group_members()`, `delete_group()` (from v1).
- `group_recommendations` table now has `UNIQUE(group_id)` so `INSERT OR REPLACE`
  works correctly.

## Frontend Changes

### `ProfilePage.tsx` — Complete rewrite
- **Loads course options from `GET /api/domains`** — no more hardcoded lists.
- **Restores saved profile on mount** — existing selections are pre-filled.
- **Saves `course_code` (not display name)** — backend and recommender engine
  need the code for embedding lookup.
- Live completeness progress bar (4-step: courses, interests, apps, RDIA).
- Error state + retry button if API is unavailable.

### `GroupPage.tsx` — Major rewrite
- **Shows per-member profile completion** — each member listed with green
  (complete) or amber (incomplete) status badge.
- **Warning banner** when any member's profile is incomplete.
- **Weight selection UI** embedded directly in GroupPage (Step 2), before
  the Finalize button (Step 3). Leader must save a mode first.
- **Gated Finalize button** — disabled with checklist showing which conditions
  are not yet met.
- **Reads `/api/group/readiness`** on load and after weight saves.

### `GroupSettingsPage.tsx`
- Now exclusively post-finalization weight adjustment.
- Shows clear message directing pre-finalization users to GroupPage.

### `RecommendationsPage.tsx`
- **Reads `condition` field from API errors** to show specific blocked screens:
  - Not finalized → lock icon + description
  - Incomplete profiles → lists which members
  - No weights → directs to GroupPage
  - General error → retry button
- No recommendations are ever shown unless the API returns `200`.

### `Dashboard.tsx`
- Fetches `isLeader` from API on mount and after group state changes.
- Wires `refreshTrigger` between GroupSettingsPage and RecommendationsPage so
  weight changes automatically refresh the recommendations view.
