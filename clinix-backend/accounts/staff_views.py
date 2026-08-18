from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Staff
from .serializers import StaffSerializer, StaffInviteSerializer
from accounts.permissions import IsAdmin, IsClinicStaff
from accounts.audit_models import AuditLog


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

        AuditLog.objects.create(
            actor=request.user,
            action="staff_created",
            target_email=staff.user.email,
            detail=f"Role: {staff.role}",
        )

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

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_active = instance.is_active
        old_role = instance.role

        response = super().partial_update(request, *args, **kwargs)
        instance.refresh_from_db()

        # Audit is_active changes
        if "is_active" in request.data:
            new_active = instance.is_active
            if old_active and not new_active:
                AuditLog.objects.create(
                    actor=request.user,
                    action="staff_deactivated",
                    target_email=instance.user.email,
                    detail=f"Deactivated by {request.user.get_full_name()}",
                )
            elif not old_active and new_active:
                AuditLog.objects.create(
                    actor=request.user,
                    action="staff_reactivated",
                    target_email=instance.user.email,
                    detail=f"Reactivated by {request.user.get_full_name()}",
                )

        # Audit role changes
        if "role" in request.data and instance.role != old_role:
            AuditLog.objects.create(
                actor=request.user,
                action="staff_role_changed",
                target_email=instance.user.email,
                detail=f"Role changed from {old_role} to {instance.role}",
            )

        return response

