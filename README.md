# Mu'een — Project Recommendation System
<p align="center">
  <img src="frontend/public/logo.png" width="200"/>
</p>
Mu'een is a graduation project recommendation system built for CCIS at Imam Muhammed Ibn Saud Islamic University. It matches student groups with suitable past graduation projects based on their academic interests, application domains, and course backgrounds using semantic embeddings.


The system matches groups to projects by combining multiple signals such as course performance, interest domains, application domains, and research direction (RDIA). It also provides AI-based project summaries and a trend analysis dashboard to help users understand patterns in past projects and explore emerging topics.

## Project Structure

```
project-recommender/
├── backend/              # Flask API server
│   ├── app.py            # Main application entry point
│   ├── database.py       # SQLite database layer
│   ├── embedding_engine.py
│   ├── models.py
│   ├── phase2_embed.py   # One-time embedding generation script
│   ├── requirements.txt
│   ├── summarizer.py
│   ├── trend/            # Trend analysis module
│   └── utils.py
├── data/                 # Domain taxonomy and project JSON files
├── embeddings/           # Pre-computed project and course embeddings
├── frontend/             # React + TypeScript frontend (Vite)
│   └── src/
│       ├── components/   # Page and UI components
│       ├── contexts/     # Auth context
│       └── services/     # Axios API client
├── recommenders/         # Recommendation logic modules
├── recommender_system.py # Main recommender orchestrator
└── RS_Evaluation/        # Evaluation scripts and results
```

## Prerequisites

- Python 3.10+
- Node.js 18+

## Setup and Run

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

The API server starts at `http://localhost:5000`.

### Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The app opens at `http://localhost:3000`.

### Using a virtual environment (recommended)

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

cd backend
pip install -r requirements.txt
python app.py
```

## Notes

- Embeddings are pre-computed and included in the `embeddings/` directory. If you add new projects, run `python backend/phase2_embed.py` to regenerate them.
- The database (`backend/recommendation.db`) is created automatically on first run.
- An OpenAI API key is required for the project summary feature. Set it as the `OPENAI_API_KEY` environment variable before starting the backend.
