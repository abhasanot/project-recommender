"""
backend/summarizer.py
=====================
Graduation Project Summary Generator — standalone module.

Generates a one-cohesive-paragraph summary for the top-5 recommended
graduation projects, tailored to the group's profile.

DEPLOYMENT FIX:
  The original file had HF_TOKEN hardcoded as a string literal:
    HF_TOKEN = "enter your token here"
  This is replaced with os.environ.get() so the token is read from the
  environment variable HF_TOKEN at runtime (set in Render's dashboard).

Setup (local development):
    export HF_TOKEN="hf_your_token_here"
    pip install openai

Usage (from app.py):
    from summarizer import generate_summary
    summary = generate_summary(top5_projects, group_profile)
"""

import os
from openai import OpenAI

# ─────────────────────────────────────────────────────────────────────────────
#   MODEL CONFIGURATION
#   Set HF_TOKEN as an environment variable — never hardcode it.
# ─────────────────────────────────────────────────────────────────────────────

HF_TOKEN = os.environ.get("HF_TOKEN", "")
HF_MODEL = "Qwen/Qwen2.5-1.5B-Instruct:featherless-ai"


def _get_client():
    """Return an OpenAI-compatible client pointed at HuggingFace router."""
    if not HF_TOKEN:
        raise RuntimeError(
            "HF_TOKEN environment variable is not set. "
            "Add it to your Render dashboard (or .env file locally)."
        )
    return OpenAI(
        base_url="https://router.huggingface.co/v1",
        api_key=HF_TOKEN,
    )


def generate_summary(top5_projects: list, group_profile: dict = None) -> str:
    """
    Generate a one-paragraph natural-language summary of the top-5 projects.

    Args:
        top5_projects : list of project dicts (from recommended_projects)
        group_profile : optional dict with selected_interests, selected_rdia, etc.

    Returns:
        A string summary, or an empty string if HF_TOKEN is not set or the
        API call fails (so the caller can degrade gracefully).
    """
    if not top5_projects:
        return ""

    # Build a compact textual description of the projects
    project_texts = []
    for i, p in enumerate(top5_projects[:5], 1):
        title    = p.get("title", "Untitled")
        abstract = (p.get("abstract") or "")[:200]
        domains  = ", ".join(p.get("interest", []))
        apps     = ", ".join(p.get("application", []))
        project_texts.append(
            f"{i}. {title}\n"
            f"   Domains: {domains}\n"
            f"   Application: {apps}\n"
            f"   Abstract: {abstract}"
        )

    projects_block = "\n\n".join(project_texts)

    # Build group profile context
    profile_context = ""
    if group_profile:
        interests    = ", ".join(group_profile.get("selected_interests", []))
        applications = ", ".join(group_profile.get("selected_applications", []))
        rdia         = ", ".join(group_profile.get("selected_rdia", []))
        profile_context = (
            f"\nGroup interests: {interests}\n"
            f"Group applications: {applications}\n"
            f"Group RDIA priority: {rdia}"
        )

    prompt = (
        "You are an academic advisor. Based on the following top-5 recommended "
        "graduation projects for a student group, write exactly ONE cohesive paragraph "
        "(4-6 sentences) that summarises the common themes, domains, and why these "
        "projects are a good match for the group."
        f"{profile_context}\n\n"
        f"Top-5 recommended projects:\n{projects_block}\n\n"
        "Summary paragraph:"
    )

    try:
        client   = _get_client()
        response = client.chat.completions.create(
            model=HF_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=250,
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception as exc:
        # Log but do not crash — summary is non-critical
        print(f"[summarizer] Warning: could not generate summary — {exc}")
        return ""
