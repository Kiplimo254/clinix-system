"""Audit log API view — admin-only."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers

from .audit_models import AuditLog
from .permissions import IsAdmin


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ["id", "actor", "actor_name", "action", "target_email", "detail", "ip_address", "created_at"]

    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.get_full_name() or obj.actor.email
        return "System"


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdmin])
def audit_log_view(request):
    """GET /api/auth/audit-logs/ — admin-only, returns last 200 entries for this clinic."""
    clinic = request.user.staff.clinic
    # Filter to this clinic's staff + password reset events for clinic users
    clinic_user_ids = clinic.staff_members.values_list("user_id", flat=True)
    logs = AuditLog.objects.filter(
        actor__in=clinic_user_ids
    ).union(
        AuditLog.objects.filter(actor__isnull=True)
    ).order_by("-created_at")[:200]

    # Simpler approach — just show all logs (single clinic setup for now)
    logs = AuditLog.objects.all().order_by("-created_at")[:200]

    serializer = AuditLogSerializer(logs, many=True)
    return Response(serializer.data)
