from django.utils import timezone
from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import VisitRecord, Payment, DiagnosisAccessRequest
from .serializers import (
    VisitRecordSerializer,
    PaymentSerializer,
    DiagnosisAccessRequestSerializer,
    DiagnosisAccessApproveSerializer,
)
from accounts.permissions import (
    ClinicScopedMixin,
    IsClinicStaff,
    IsDoctorOrNurse,
    IsAdminOrDoctor,
    CanRecordPayment,
)


class VisitRecordViewSet(viewsets.ModelViewSet):
    """
    POST   /api/visit-records/
    GET    /api/visit-records/<id>/
    PATCH  /api/visit-records/<id>/
    GET    /api/visit-records/?patient=<id>   — history for a patient
    """
    queryset = VisitRecord.objects.select_related(
        "appointment__patient", "appointment__doctor__user", "created_by__user"
    )
    serializer_class = VisitRecordSerializer
    permission_classes = [IsAuthenticated, IsClinicStaff]

    def get_queryset(self):
        qs = self.queryset.filter(
            appointment__clinic=self.request.user.staff.clinic
        )
        patient_id = self.request.query_params.get("patient")
        if patient_id:
            qs = qs.filter(appointment__patient_id=patient_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user.staff)

    def perform_update(self, serializer):
        serializer.save()

    @action(detail=False, methods=["get"], url_path=r"patient/(?P<patient_id>\d+)/history")
    def patient_history(self, request, patient_id=None):
        """GET /api/visit-records/patient/<patient_id>/history/"""
        qs = self.get_queryset().filter(
            appointment__patient_id=patient_id
        ).order_by("-appointment__scheduled_time")
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class PaymentViewSet(viewsets.ModelViewSet):
    """POST /api/payments/"""
    queryset = Payment.objects.select_related("visit__appointment__patient", "recorded_by__user")
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, CanRecordPayment]

    def get_queryset(self):
        return self.queryset.filter(
            visit__appointment__clinic=self.request.user.staff.clinic
        )

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user.staff)


class DiagnosisAccessRequestViewSet(viewsets.ModelViewSet):
    """
    POST   /api/diagnosis-access-requests/            — receptionist requests
    POST   /api/diagnosis-access-requests/<id>/approve/  — doctor approves
    """
    queryset = DiagnosisAccessRequest.objects.select_related(
        "patient", "requested_by__user", "approved_by__user"
    )
    serializer_class = DiagnosisAccessRequestSerializer
    permission_classes = [IsAuthenticated, IsClinicStaff]

    def get_queryset(self):
        return self.queryset.filter(
            patient__clinic=self.request.user.staff.clinic
        )

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user.staff)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdminOrDoctor])
    def approve(self, request, pk=None):
        """POST /api/diagnosis-access-requests/<id>/approve/"""
        access_request = self.get_object()

        if access_request.status != "pending":
            return Response(
                {"detail": "This request has already been processed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = DiagnosisAccessApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Verify the approving doctor's password
        approving_staff = request.user.staff
        if not request.user.check_password(serializer.validated_data["password"]):
            return Response(
                {"detail": "Incorrect password. Access not granted."},
                status=status.HTTP_403_FORBIDDEN,
            )

        access_request.approve(
            approving_staff,
            expiry_minutes=serializer.validated_data["expiry_minutes"],
        )

        return Response(
            DiagnosisAccessRequestSerializer(access_request).data,
            status=status.HTTP_200_OK,
        )
