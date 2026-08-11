from django.urls import path
from .views import LoginView, RefreshView, me_view, logout_view
from .password_reset_views import request_password_reset, confirm_password_reset
from .audit_views import audit_log_view

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("me/", me_view, name="auth-me"),
    path("logout/", logout_view, name="auth-logout"),
    path("password-reset/", request_password_reset, name="auth-password-reset"),
    path("password-reset/confirm/", confirm_password_reset, name="auth-password-reset-confirm"),
    path("audit-logs/", audit_log_view, name="auth-audit-logs"),
]
