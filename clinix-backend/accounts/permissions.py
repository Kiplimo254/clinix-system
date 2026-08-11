from rest_framework.permissions import BasePermission, SAFE_METHODS


# ─── Multi-Tenant Mixin ───────────────────────────────────────────────────────

class ClinicScopedMixin:
    """
    Mixin for ViewSets that automatically filters all querysets by the
    logged-in user's clinic. Add this as the FIRST base class.

    Usage:
        class PatientViewSet(ClinicScopedMixin, viewsets.ModelViewSet):
            ...
    """

    def get_clinic(self):
        return self.request.user.staff.clinic

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(clinic=self.get_clinic())

    def perform_create(self, serializer):
        serializer.save(clinic=self.get_clinic())


# ─── Role Permissions ─────────────────────────────────────────────────────────

def _is_active_staff(user):
    return (
        user.is_authenticated
        and user.is_active
        and hasattr(user, "staff")
        and user.staff.is_active
    )


class IsAdmin(BasePermission):
    """Only clinic admins."""
    def has_permission(self, request, view):
        return _is_active_staff(request.user) and request.user.staff.role == "admin"


class IsDoctor(BasePermission):
    """Only doctors."""
    def has_permission(self, request, view):
        return _is_active_staff(request.user) and request.user.staff.role == "doctor"


class IsNurse(BasePermission):
    """Only nurses."""
    def has_permission(self, request, view):
        return _is_active_staff(request.user) and request.user.staff.role == "nurse"


class IsReceptionist(BasePermission):
    """Only receptionists."""
    def has_permission(self, request, view):
        return _is_active_staff(request.user) and request.user.staff.role == "receptionist"


class IsDoctorOrNurse(BasePermission):
    """Doctors or nurses."""
    def has_permission(self, request, view):
        return _is_active_staff(request.user) and request.user.staff.role in ("doctor", "nurse")


class IsAdminOrDoctor(BasePermission):
    """Admins or doctors."""
    def has_permission(self, request, view):
        return _is_active_staff(request.user) and request.user.staff.role in ("admin", "doctor")


class IsActiveStaff(BasePermission):
    """Authenticated staff whose account is still active."""
    message = "This staff account has been deactivated."

    def has_permission(self, request, view):
        return _is_active_staff(request.user)


class IsClinicStaff(IsActiveStaff):
    """Any authenticated, active clinic staff member (all roles)."""
    pass


class CanCheckIn(BasePermission):
    """Receptionist or admin can check patients in."""
    def has_permission(self, request, view):
        return _is_active_staff(request.user) and request.user.staff.role in ("receptionist", "admin", "nurse")


class CanRecordPayment(BasePermission):
    """Receptionist or admin can record payments."""
    def has_permission(self, request, view):
        return _is_active_staff(request.user) and request.user.staff.role in ("receptionist", "admin")
