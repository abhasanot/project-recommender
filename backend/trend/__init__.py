# backend/trend/__init__.py
"""
Trend Analysis package for Mu'een.

Exposes a single Flask Blueprint (trend_bp) that is registered by
backend/app.py with the prefix /api/trends.

Usage in app.py (one-line addition):
    from trend.routes import trend_bp
    app.register_blueprint(trend_bp)
"""
from .routes import trend_bp

__all__ = ["trend_bp"]
