from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.contrib.auth import authenticate

from .models import Staff
from .serializers import MeSerializer
from .permissions import IsClinicStaff, IsActiveStaff
from .cookies import set_auth_cookies, clear_auth_cookies
from .login_lockout import (
    is_locked,
    get_lockout_remaining,
    record_failed_attempt,
    clear_failed_attempts,
)


class LoginRateThrottle(AnonRateThrottle):
    rate = "10/minute"


class LoginView(APIView):
    """
    POST /api/auth/login/
    Authenticates staff and sets JWT tokens as httpOnly cookies.
    """
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        email = request.data.get("username") or request.data.get("email", "")
        password = request.data.get("password", "")

        if not email or not password:
            return Response(
                {"detail": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if is_locked(email):
            remaining = get_lockout_remaining(email)
            minutes = max(1, remaining // 60)
            return Response(
                {"detail": f"Account temporarily locked. Try again in {minutes} minute(s)."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        user = authenticate(username=email, password=password)
        if user is None:
            remaining = record_failed_attempt(email)
            if remaining == 0:
                return Response(
                    {"detail": "Too many failed attempts. Account locked for 15 minutes."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            return Response(
                {"detail": f"Invalid email or password. {remaining} attempt(s) remaining."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"detail": "This account has been deactivated."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            staff = user.staff
        except Staff.DoesNotExist:
            return Response(
                {"detail": "No staff profile found for this account."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not staff.is_active:
            return Response(
                {"detail": "This staff account has been deactivated."},
                status=status.HTTP_403_FORBIDDEN,
            )

        clear_failed_attempts(email)

        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)

        response = Response(
            {"detail": "Login successful.", "user": MeSerializer(staff).data},
            status=status.HTTP_200_OK,
        )
        set_auth_cookies(response, access, str(refresh))
        return response


class RefreshView(TokenRefreshView):
    """
    POST /api/auth/refresh/
    Reads refresh token from httpOnly cookie (or request body as fallback).
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get("refresh_token") or request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "Refresh token not provided."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = self.get_serializer(data={"refresh": refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        access = serializer.validated_data["access"]
        new_refresh = serializer.validated_data.get("refresh")

        response = Response({"detail": "Token refreshed."}, status=status.HTTP_200_OK)
        set_auth_cookies(
            response,
            access,
            new_refresh or refresh_token,
        )
        return response


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsActiveStaff])
def me_view(request):
    """GET /api/auth/me/ — returns current user's staff profile."""
    try:
        staff = request.user.staff
    except Staff.DoesNotExist:
        return Response({"detail": "No staff profile found."}, status=404)
    serializer = MeSerializer(staff)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([AllowAny])
def logout_view(request):
    """POST /api/auth/logout/ — blacklists refresh token and clears cookies."""
    refresh_token = request.COOKIES.get("refresh_token") or request.data.get("refresh")
    if refresh_token:
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass

    response = Response({"detail": "Logged out successfully."})
    clear_auth_cookies(response)
    return response
