"""
summarizer.py
=============
Graduation Project Summary Generator — standalone module.

Generates a one-cohesive-paragraph summary for the top-5 recommended
graduation projects, tailored to the group's profile.

Setup:
    pip install openai

Usage (standalone test):
    export HF_TOKEN="your_token_here"
    python summarizer.py

Usage (from app.py):
    from summarizer import generate_summary
    summary = generate_summary(top5_projects, group_profile)
"""

import os
from openai import OpenAI

# ─────────────────────────────────────────────
#   MODEL CONFIGURATION
# ─────────────────────────────────────────────

HF_TOKEN = "enter your token here"
HF_MODEL = "Qwen/Qwen2.5-1.5B-Instruct:featherless-ai"

_client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=HF_TOKEN,
) if HF_TOKEN else None


# ─────────────────────────────────────────────
#   PROMPT TEMPLATE
# ─────────────────────────────────────────────

_PROMPT_TEMPLATE = """ You are an academic advisor helping undergraduate students identify a promising new graduation project idea, inspired by — but distinct from — a set of recommended projects.

Your task is to write ONE cohesive paragraph (no headings, no lists, no bullet points) that does three things in natural flow:

1. SYNTHESIZE the collective direction of the 5 projects: what problems they address, what approaches they share, and what they collectively leave unsolved or underexplored (based ONLY on the future_work and abstract fields provided).

2. SURFACE the innovation gap: identify one or two specific limitations, missing combinations, or underserved user needs that appear across multiple projects' future_work sections — these are the seeds of a new idea.

3. INSPIRE the reader: end with a forward-looking statement that invites the student to think about how their background intersects with these gaps, and what kind of new project they might uniquely be positioned to build. Address the reader directly using "you" and "your".

Strict constraints:
- Use ONLY information explicitly present in the abstracts and future_work fields. Do NOT invent technologies, datasets, or claims.
- Do NOT summarize each project individually.
- Do NOT list the project titles.
- Maximum 200 words.
- Tone: intellectually engaging, direct, encouraging — like a mentor thinking out loud with the student.

The set of recommended projects is as follows:
Project 1: {project_1_data}
Project 2: {project_2_data}
Project 3: {project_3_data}
Project 4: {project_4_data}
Project 5: {project_5_data}

The student group profile:
- Interests: {group_interests}
- Applications: {group_apps}
- RDIA Focus: {group_rdia} """


# ─────────────────────────────────────────────
#   HELPERS
# ─────────────────────────────────────────────

def _format_project(rank: int, project: dict) -> str:
    """Convert a project dict to a readable string for the prompt."""
    return (
        f"Rank: {rank}\n"
        f"Title: {project.get('title', '')}\n"
        f"Keywords: {', '.join(project.get('keywords', []))}\n"
        f"Application Domain(s): {', '.join(project.get('application_domains', project.get('application', [])))}\n"
        f"Interest Area(s): {', '.join(project.get('interest_domains', project.get('interest', [])))}\n"
        f"RDIA: {', '.join(project.get('rdia', []))}\n"
        f"Match Explanation: {project.get('explanation', '')}"
    )


def _build_prompt(top5: list[dict], group_profile: dict) -> str:
    """Fill the prompt template with project and group profile data."""
    return _PROMPT_TEMPLATE.format(
        project_1_data=_format_project(1, top5[0]),
        project_2_data=_format_project(2, top5[1]),
        project_3_data=_format_project(3, top5[2]),
        project_4_data=_format_project(4, top5[3]),
        project_5_data=_format_project(5, top5[4]),
        group_interests=", ".join(group_profile.get("selected_interests", [])),
        group_apps=", ".join(group_profile.get("selected_applications", [])),
        group_rdia=", ".join(group_profile.get("selected_rdia", [])),
    )


# ─────────────────────────────────────────────
#   PUBLIC API ← This is the method you import into app.py
# ─────────────────────────────────────────────

def generate_summary(top5_projects: list[dict], group_profile: dict) -> str | None:
    """
    Generate a one-paragraph summary for the top-5 recommended projects.

    Args:
        top5_projects : list of the first 5 project dicts from recommended_projects
        group_profile : dict with keys selected_interests, selected_applications, selected_rdia

    Returns:
        Summary string, or None if HF_TOKEN is missing or the call fails.
    """
    if _client is None:
        print("[SUMMARIZER] HF_TOKEN not set — skipping summary generation.")
        return None

    if len(top5_projects) < 5:
        print("[SUMMARIZER] Fewer than 5 projects — skipping summary.")
        return None

    prompt = _build_prompt(top5_projects, group_profile)

    try:
        completion = _client.chat.completions.create(
            model=HF_MODEL,
            max_tokens=500,
            temperature=0.4,
            messages=[{"role": "user", "content": prompt}],
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"[SUMMARIZER] Model call failed: {e}")
        return None
