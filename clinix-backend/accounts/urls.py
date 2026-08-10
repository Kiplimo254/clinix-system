from django.urls import path
from .views import LoginView, RefreshView, me_view, logout_view

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("me/", me_view, name="auth-me"),
    path("logout/", logout_view, name="auth-logout"),
]
