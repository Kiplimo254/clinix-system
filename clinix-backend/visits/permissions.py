"""Field-level access helpers for clinical data."""
from django.utils import timezone

from .models import DiagnosisAccessRequest


def can_view_diagnosis(request, patient_id) -> bool:
    """True if the requester may see diagnosis/prescription for this patient."""
    if not request.user.is_authenticated or not hasattr(request.user, "staff"):
        return False

    role = request.user.staff.role
    if role in ("doctor", "nurse", "admin"):
        return True

    if role == "receptionist":
        return DiagnosisAccessRequest.objects.filter(
            patient_id=patient_id,
            requested_by=request.user.staff,
            status="approved",
            expires_at__gt=timezone.now(),
        ).exists()

    return False
