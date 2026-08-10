from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import Patient
from .serializers import PatientSerializer, PatientListSerializer
from accounts.permissions import ClinicScopedMixin, IsClinicStaff


class PatientViewSet(ClinicScopedMixin, viewsets.ModelViewSet):
    """
    GET    /api/patients/?search=<name_or_phone>
    POST   /api/patients/
    GET    /api/patients/<id>/
    PATCH  /api/patients/<id>/
    """
    queryset = Patient.objects.all()
    permission_classes = [IsAuthenticated, IsClinicStaff]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["first_name", "last_name", "phone", "national_id", "email"]
    ordering_fields = ["last_name", "first_name", "created_at"]
    ordering = ["last_name"]

    def get_serializer_class(self):
        if self.action == "list":
            return PatientListSerializer
        return PatientSerializer
