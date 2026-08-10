"""clinix/__init__.py — load Celery on startup."""
from .celery import app as celery_app

__all__ = ("celery_app",)
