"""
Password reset via email token.
For development: token is returned in the API response (and logged).
For production: wire EMAIL_BACKEND to a real SMTP service.
"""
import secrets
import logging
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .password_reset_store import store_token, get_token_data, delete_token

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([AllowAny])
def request_password_reset(request):
    """
    POST /api/auth/password-reset/
    Body: { "email": "..." }
    Generates a reset token and emails it to the user.
    In dev mode the token is also returned in the response body.
    """
    email = request.data.get("email", "").strip().lower()
    if not email:
        return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        # Don't reveal whether email exists — return 200 anyway
        return Response({"detail": "If that email is registered, a reset link has been sent."})

    token = secrets.token_urlsafe(32)
    store_token(email, token)

    reset_link = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/reset-password?token={token}&email={email}"

    # Attempt to send email — stub if no mail backend configured
    try:
        send_mail(
            subject="Clinix — Password Reset",
            message=(
                f"Hello {user.get_full_name()},\n\n"
                f"Click the link below to reset your password. It expires in 30 minutes.\n\n"
                f"{reset_link}\n\n"
                f"If you did not request this, ignore this email."
            ),
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@clinix.app"),
            recipient_list=[email],
            fail_silently=True,
        )
    except Exception as exc:
        logger.warning("Password reset email failed to send: %s", exc)

    logger.info("Password reset token for %s: %s", email, token)

    response_data = {"detail": "If that email is registered, a reset link has been sent."}

    # In development expose the token for testing
    if getattr(settings, "DEBUG", False):
        response_data["dev_token"] = token
        response_data["dev_link"] = reset_link

    return Response(response_data)


@api_view(["POST"])
@permission_classes([AllowAny])
def confirm_password_reset(request):
    """
    POST /api/auth/password-reset/confirm/
    Body: { "email": "...", "token": "...", "new_password": "..." }
    """
    email = request.data.get("email", "").strip().lower()
    token = request.data.get("token", "").strip()
    new_password = request.data.get("new_password", "")

    if not email or not token or not new_password:
        return Response(
            {"detail": "email, token and new_password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(new_password) < 8:
        return Response(
            {"detail": "Password must be at least 8 characters."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    token_data = get_token_data(email)
    if not token_data or token_data["token"] != token:
        return Response(
            {"detail": "Invalid or expired reset token."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Check expiry (30 minutes)
    created_at = token_data["created_at"]
    if timezone.now() - created_at > timedelta(minutes=30):
        delete_token(email)
        return Response(
            {"detail": "Reset token has expired. Please request a new one."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response({"detail": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()
    delete_token(email)

    logger.info("Password reset completed for user %s", email)
    return Response({"detail": "Password has been reset successfully. Please log in."})
