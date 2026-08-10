from .base import *  # noqa

DEBUG = True

# Allow all origins for local dev
CORS_ALLOW_ALL_ORIGINS = True

# Email backend for dev — prints to console
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
