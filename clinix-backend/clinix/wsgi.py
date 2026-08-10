"""
WSGI config for clinix project.
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "clinix.settings.dev")
application = get_wsgi_application()
