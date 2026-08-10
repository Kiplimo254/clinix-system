from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Staff
from .serializers import StaffSerializer, MeSerializer
from accounts.permissions import IsClinicStaff


class LoginView(TokenObtainPairView):
    """
    POST /api/auth/login/
    Returns access + refresh JWT tokens.
    """
    permission_classes = [AllowAny]


class RefreshView(TokenRefreshView):
    """POST /api/auth/refresh/"""
    permission_classes = [AllowAny]


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    """GET /api/auth/me/ — returns current user's staff profile."""
    try:
        staff = request.user.staff
    except Staff.DoesNotExist:
        return Response({"detail": "No staff profile found."}, status=404)
    serializer = MeSerializer(staff)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """POST /api/auth/logout/ — blacklists the refresh token."""
    try:
        refresh_token = request.data["refresh"]
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({"detail": "Logged out successfully."})
    except Exception:
        return Response({"detail": "Invalid token."}, status=400)
