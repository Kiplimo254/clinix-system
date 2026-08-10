"""
Celery application for Clinix.
"""
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "clinix.settings.dev")

app = Celery("clinix")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
