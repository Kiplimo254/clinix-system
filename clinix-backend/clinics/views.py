from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import ClinicSignupSerializer, ClinicSerializer
from accounts.permissions import IsAdmin


class ClinicSignupView(APIView):
    """
    POST /api/clinics/signup/
    Public endpoint — creates Clinic + owner Staff (admin role) atomically.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ClinicSignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        clinic, user = serializer.save()

        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "message": f"Clinic '{clinic.name}' created successfully.",
                "clinic": ClinicSerializer(clinic).data,
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class ClinicDetailView(APIView):
    """GET/PATCH /api/clinics/me/ — current user's clinic info."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        clinic = request.user.staff.clinic
        return Response(ClinicSerializer(clinic).data)

    def patch(self, request):
        clinic = request.user.staff.clinic
        serializer = ClinicSerializer(clinic, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
