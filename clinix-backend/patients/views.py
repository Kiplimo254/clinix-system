import json
from django.http import HttpResponse
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Patient
from .serializers import PatientSerializer, PatientListSerializer
from accounts.permissions import ClinicScopedMixin, IsClinicStaff, IsAdmin


class PatientViewSet(ClinicScopedMixin, viewsets.ModelViewSet):
    """
    GET    /api/patients/?search=<name_or_phone>
    POST   /api/patients/
    GET    /api/patients/<id>/
    PATCH  /api/patients/<id>/
    GET    /api/patients/<id>/export/    — admin: full data export (JSON)
    POST   /api/patients/<id>/anonymise/ — admin: GDPR/DPA erasure
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

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated, IsAdmin])
    def export(self, request, pk=None):
        """GET /api/patients/<id>/export/ — return patient's full data as JSON download."""
        patient = self.get_object()
        serializer = PatientSerializer(patient)
        data = serializer.data

        # Include visit history
        from visits.models import VisitRecord
        from visits.serializers import VisitRecordSerializer
        visits = VisitRecord.objects.filter(
            appointment__patient=patient
        ).select_related("appointment", "created_by__user")
        data["visit_history"] = VisitRecordSerializer(
            visits, many=True, context={"request": request}
        ).data

        response = HttpResponse(
            json.dumps(data, indent=2, default=str),
            content_type="application/json",
        )
        response["Content-Disposition"] = (
            f'attachment; filename="patient_{patient.patient_id}_export.json"'
        )
        return response

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdmin])
    def anonymise(self, request, pk=None):
        """
        POST /api/patients/<id>/anonymise/
        Anonymises PII fields. Historical visit records remain for audit/clinical purposes.
        """
        patient = self.get_object()
        pid = patient.patient_id
        patient.first_name = "ANONYMISED"
        patient.last_name = pid
        patient.phone = ""
        patient.national_id = ""
        patient.email = ""
        patient.dob = None
        patient.save()
        return Response(
            {"detail": f"Patient {pid} has been anonymised. Clinical records are preserved."},
            status=status.HTTP_200_OK,
        )

