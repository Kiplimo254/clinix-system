from django.urls import path
from .views import ClinicSignupView, ClinicDetailView

urlpatterns = [
    path("signup/", ClinicSignupView.as_view(), name="clinic-signup"),
    path("me/", ClinicDetailView.as_view(), name="clinic-detail"),
]
