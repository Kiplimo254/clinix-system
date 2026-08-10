from django.urls import path
from .views import today_dashboard

urlpatterns = [
    path("today/", today_dashboard, name="dashboard-today"),
]
