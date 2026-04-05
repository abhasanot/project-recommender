# ─────────────────────────────────────────────────────────────────────────────
# docker/backend.Dockerfile
#
# Builds the Flask backend for the Mu'een recommendation system.
#
# Key decisions:
#   - Pre-downloads the all-MiniLM-L6-v2 SBERT model during image build
#     so startup is fast (no internet needed at runtime).
#   - Runs via gunicorn with 1 worker (SBERT model is large; multiple workers
#     would each load their own copy, exhausting RAM).
#   - All persistent data (SQLite DB + sessions) lives in /data, which is
#     mapped to a named Docker volume in docker-compose.yml.
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.11-slim

# ── System dependencies ───────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
    && rm -rf /var/lib/apt/lists/*

# ── Python dependencies ───────────────────────────────────────────────────────
WORKDIR /app

COPY backend/requirements.txt /tmp/requirements.txt

# Install everything listed in the project's requirements, plus gunicorn
RUN pip install --no-cache-dir \
        -r /tmp/requirements.txt \
        gunicorn==21.2.0

# ── Pre-download SBERT model ──────────────────────────────────────────────────
# Cache it inside the image so the container starts without internet access.
# The model is ~90 MB and stored in HF_HOME.
ENV HF_HOME=/app/.hf_cache
ENV TRANSFORMERS_CACHE=/app/.hf_cache

RUN python -c "\
from sentence_transformers import SentenceTransformer; \
print('Downloading all-MiniLM-L6-v2 ...'); \
SentenceTransformer('all-MiniLM-L6-v2'); \
print('Model cached successfully.')"

# ── Copy project source ───────────────────────────────────────────────────────
# Everything goes into /app so relative paths resolve correctly:
#   /app/backend/app.py          ← Flask entry point
#   /app/recommender_system.py   ← imported via sys.path
#   /app/embedding_engine.py     ← imported via sys.path
#   /app/recommenders/           ← imported via sys.path
#   /app/data/                   ← JSON domain files
#   /app/embeddings/             ← pre-computed .npy vectors
COPY . /app

# ── Persistent-data directory ─────────────────────────────────────────────────
# SQLite DB and Flask sessions are stored here so they survive container restarts.
RUN mkdir -p /data/flask_session

# ── Expose & run ──────────────────────────────────────────────────────────────
EXPOSE 5000

# gunicorn flags:
#   --chdir /app/backend   → imports backend/app.py as module "app"
#   --workers 1            → single worker keeps memory usage low (SBERT is large)
#   --threads 4            → handle concurrent requests within the single worker
#   --timeout 300          → allow 5 min for first recommendation generation
#   --preload              → load the app once before forking (unused here since
#                            workers=1, but documented for reference)
CMD ["gunicorn", \
     "--chdir", "/app/backend", \
     "app:app", \
     "--bind", "0.0.0.0:5000", \
     "--workers", "1", \
     "--threads", "4", \
     "--timeout", "300", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info"]
