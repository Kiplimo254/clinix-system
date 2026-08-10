from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Staff
from .serializers import StaffSerializer, StaffInviteSerializer
from accounts.permissions import IsAdmin, IsClinicStaff


class StaffInviteView(APIView):
    """
    POST /api/staff/invite/
    Admin-only: creates a new staff User + Staff record.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        serializer = StaffInviteSerializer(
            data=request.data,
            context={"clinic": request.user.staff.clinic}
        )
        serializer.is_valid(raise_exception=True)
        staff = serializer.save()
        return Response(
            StaffSerializer(staff).data,
            status=status.HTTP_201_CREATED,
        )


class StaffListView(generics.ListAPIView):
    """GET /api/staff/ — list all staff in the clinic."""
    serializer_class = StaffSerializer
    permission_classes = [IsAuthenticated, IsClinicStaff]

    def get_queryset(self):
        clinic = self.request.user.staff.clinic
        qs = Staff.objects.filter(clinic=clinic).select_related("user")
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)
        return qs


class StaffDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/staff/<id>/"""
    serializer_class = StaffSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return Staff.objects.filter(
            clinic=self.request.user.staff.clinic
        ).select_related("user")
