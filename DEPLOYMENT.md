# Mu'een — Deployment Guide
## Frontend → Vercel | Backend → Render

---

## ⚠️ BEFORE YOU START — Read These Warnings

### 1. Stack Clarification
Your project is **Python Flask + React/Vite**, NOT Node.js/Express.
- Render supports Python natively — no adapter needed.
- The deployment steps below reflect the actual stack.

### 2. SQLite on Render (Critical Limitation)
SQLite stores data in a local file (`recommendation.db`).
Render's **free/starter plan** uses an **ephemeral filesystem** — files are deleted every time the service restarts, redeploys, or scales.

**What this means in practice:**
- User accounts, groups, and recommendations are wiped on every deploy/restart.
- This is acceptable for a demo or academic project.
- For production use, you need one of:
  - **Render Persistent Disk** (~$7/month) — mount at `/mnt/data`, set `DB_PATH=/mnt/data/mueen.db`
  - **Migrate to PostgreSQL** — Render offers a free PostgreSQL instance; requires rewriting `database.py` to use `psycopg2` instead of `sqlite3`

### 3. SBERT Model Download
The `all-MiniLM-L6-v2` model (~90 MB) is downloaded by `sentence-transformers` on the first startup. On Render's free plan:
- Cold start can take **3–5 minutes** on first boot or after inactivity.
- The model is NOT cached between restarts on the free plan (ephemeral disk).
- On the paid plan with a persistent disk, cache the model at `/mnt/data/hf_cache`.

### 4. Render Free Plan Sleeps
On the free Starter plan, your backend sleeps after 15 minutes of inactivity. The first request after sleep triggers a cold start (3–5 min due to SBERT).

---

## Step 1 — Fix Git (Do This First!)

Your `.gitignore` had these lines at the bottom which were **silently excluding your entire Python backend** from git:
```
*.py       ← excluded ALL Python files!
*.pth      ← unnecessary
/backend   ← excluded the entire backend/ directory!
```

The new `.gitignore` in this package removes those three lines. Apply it and verify:

```bash
# Apply the fixed .gitignore (replace the root .gitignore with the one in this package)
cp deployment/.gitignore .gitignore

# Verify the backend files are now tracked:
git status
# You should see all .py files listed as untracked/modified, NOT ignored.

# If backend/ was previously ignored and its files aren't tracked yet:
git add backend/ recommenders/ recommender_system.py embedding_engine.py utils.py
git add .gitignore
git commit -m "fix: restore Python backend files to git tracking"
git push
```

---

## Step 2 — Apply All Deployment Files

Copy the files from this package into your repo root:

```
project-recommender/              ← repo root
├── .gitignore                    ← REPLACE (critical fix)
├── .env.example                  ← REPLACE (updated)
├── render.yaml                   ← NEW
├── vercel.json                   ← NEW
├── backend/
│   ├── requirements.txt          ← REPLACE (adds gunicorn)
│   └── summarizer.py             ← REPLACE (fixes hardcoded HF_TOKEN)
└── frontend/
    ├── package.json              ← REPLACE (adds preview/start scripts)
    └── src/services/api.ts       ← REPLACE (uses VITE_API_URL env var)
```

---

## Step 3 — Deploy the Backend to Render

### 3a. Create a new Web Service on Render

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repository
3. Render will auto-detect `render.yaml` — click **Apply Blueprint**

If you prefer manual setup:
- **Runtime**: Python 3
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `gunicorn --chdir backend app:app --workers 1 --threads 4 --timeout 300 --bind 0.0.0.0:$PORT`
- **Health Check Path**: `/api/health`

### 3b. Set Environment Variables in Render Dashboard

Go to your service → Environment → Add these:

| Key | Value | Notes |
|-----|-------|-------|
| `SECRET_KEY` | (generate) | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `CORS_ORIGINS` | `https://your-app.vercel.app` | Update after Vercel deploy |
| `DB_PATH` | `/tmp/mueen.db` | Ephemeral on free plan |
| `SESSION_DIR` | `/tmp/mueen_sessions` | Ephemeral on free plan |
| `HF_HOME` | `/tmp/hf_cache` | Model re-downloads on cold start |
| `TRANSFORMERS_CACHE` | `/tmp/hf_cache` | Same as HF_HOME |
| `HF_TOKEN` | `hf_xxxx` | Only if using the summary feature |

### 3c. Wait for First Deploy

First deploy takes **3–5 minutes** (SBERT model download). Subsequent deploys are faster (model is re-downloaded each time on free plan).

Copy your Render URL: `https://mueen-backend.onrender.com`

---

## Step 4 — Deploy the Frontend to Vercel

### 4a. Import the project

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Select your repo

### 4b. Configure the project

Vercel reads `vercel.json` automatically. In the **Build & Output Settings**:
- **Framework Preset**: Other (or Vite)
- **Build Command**: `cd frontend && npm install && npm run build`
- **Output Directory**: `frontend/dist`

### 4c. Set Environment Variables in Vercel Dashboard

Go to Settings → Environment Variables → Add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://mueen-backend.onrender.com` |

⚠️ This must be set **before the build**, not at runtime — Vite replaces `import.meta.env.VITE_*` at compile time.

### 4d. Deploy

Click **Deploy**. Build takes ~2 minutes.

Copy your Vercel URL: `https://your-app.vercel.app`

---

## Step 5 — Wire Frontend ↔ Backend

### Update CORS on Render

Now that you have both URLs, go to Render → Environment → update:

```
CORS_ORIGINS = https://your-app.vercel.app
```

Then click **Manual Deploy** → Deploy latest commit.

### Verify it works

```bash
# Health check
curl https://mueen-backend.onrender.com/api/health

# Expected: {"status": "ok", "service": "mueen-backend"}
```

---

## Step 6 — Test the Full Flow

1. Open `https://your-app.vercel.app`
2. Register a new account (student)
3. Fill in your profile
4. Create a group and test the recommendation flow

---

## Local Development (unchanged)

```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
python app.py

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

The Vite proxy (`vite.config.ts`) forwards `/api/*` to `http://localhost:5000` automatically in local dev — no environment variable needed.

---

## Environment Variable Reference

| Variable | Backend/Frontend | Required | Description |
|----------|-----------------|----------|-------------|
| `SECRET_KEY` | Backend | ✅ | Flask session signing key |
| `CORS_ORIGINS` | Backend | ✅ | Comma-separated allowed origins |
| `DB_PATH` | Backend | Recommended | SQLite file path |
| `SESSION_DIR` | Backend | Recommended | Flask-Session storage path |
| `HF_HOME` | Backend | Recommended | HuggingFace model cache |
| `TRANSFORMERS_CACHE` | Backend | Recommended | Same as HF_HOME |
| `HF_TOKEN` | Backend | Optional | For AI summary feature |
| `VITE_API_URL` | Frontend | ✅ in prod | Render backend URL |
