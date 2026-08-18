from django.utils import timezone
from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import VisitRecord, Payment, DiagnosisAccessRequest, Invoice, InvoiceItem
from .serializers import (
    VisitRecordSerializer,
    PaymentSerializer,
    DiagnosisAccessRequestSerializer,
    DiagnosisAccessApproveSerializer,
    InvoiceSerializer,
    InvoiceItemSerializer,
)
from accounts.permissions import (
    ClinicScopedMixin,
    IsClinicStaff,
    IsDoctorOrNurse,
    IsAdminOrDoctor,
    CanRecordPayment,
)
from accounts.audit_models import AuditLog


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


class InvoiceViewSet(viewsets.ModelViewSet):
    """GET /api/invoices/, POST /api/invoices/"""
    queryset = Invoice.objects.select_related("visit__appointment__patient").prefetch_related("items", "payments")
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, IsClinicStaff]

    def get_queryset(self):
        qs = self.queryset.filter(
            visit__appointment__clinic=self.request.user.staff.clinic
        )
        visit_id = self.request.query_params.get("visit")
        if visit_id:
            qs = qs.filter(visit_id=visit_id)
        return qs


class InvoiceItemViewSet(viewsets.ModelViewSet):
    """GET /api/invoice-items/, POST /api/invoice-items/"""
    queryset = InvoiceItem.objects.select_related("invoice")
    serializer_class = InvoiceItemSerializer
    permission_classes = [IsAuthenticated, IsClinicStaff]


class PaymentViewSet(viewsets.ModelViewSet):
    """POST /api/payments/"""
    queryset = Payment.objects.select_related("invoice__visit__appointment__patient", "recorded_by__user")
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, CanRecordPayment]

    def get_queryset(self):
        qs = self.queryset.filter(
            invoice__visit__appointment__clinic=self.request.user.staff.clinic
        )
        invoice_id = self.request.query_params.get("invoice")
        if invoice_id:
            qs = qs.filter(invoice_id=invoice_id)
        return qs

    def perform_create(self, serializer):
        payment = serializer.save(recorded_by=self.request.user.staff)
        # Update invoice status automatically based on payments
        invoice = payment.invoice
        if invoice.balance <= 0:
            invoice.status = "paid"
        elif invoice.amount_paid > 0:
            invoice.status = "partially_paid"
        invoice.save()


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
        instance = serializer.save(requested_by=self.request.user.staff)
        AuditLog.objects.create(
            actor=self.request.user,
            action="diagnosis_access_requested",
            target_email=self.request.user.email,
            detail=f"Patient ID {instance.patient_id} — reason: {instance.reason or 'none'}",
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsClinicStaff])
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

        from django.contrib.auth import authenticate
        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]
        
        # Authenticate the doctor
        approving_user = authenticate(username=email, password=password)
        if not approving_user or not hasattr(approving_user, "staff"):
            return Response(
                {"detail": "Invalid doctor credentials."},
                status=status.HTTP_403_FORBIDDEN,
            )
            
        approving_staff = approving_user.staff
        
        # Verify it's a doctor or admin from the same clinic
        if approving_staff.clinic != request.user.staff.clinic:
            return Response(
                {"detail": "Staff member belongs to a different clinic."},
                status=status.HTTP_403_FORBIDDEN,
            )
            
        if approving_staff.role not in ["doctor", "admin"]:
            return Response(
                {"detail": "Only doctors or admins can approve diagnosis access."},
                status=status.HTTP_403_FORBIDDEN,
            )

        access_request.approve(
            approving_staff,
            expiry_minutes=serializer.validated_data["expiry_minutes"],
        )

        AuditLog.objects.create(
            actor=approving_user,
            action="diagnosis_access_approved",
            target_email=access_request.requested_by.user.email,
            detail=(
                f"Patient ID {access_request.patient_id} — "
                f"approved by {approving_staff.full_name} for "
                f"{serializer.validated_data['expiry_minutes']}min"
            ),
        )

        return Response(
            DiagnosisAccessRequestSerializer(access_request).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsClinicStaff])
    def revoke(self, request, pk=None):
        """POST /api/diagnosis-access-requests/<id>/revoke/"""
        if request.user.staff.role != "admin":
            return Response(
                {"detail": "Only admins can revoke access."},
                status=status.HTTP_403_FORBIDDEN,
            )
            
        access_request = self.get_object()
        if access_request.status != "approved":
            return Response(
                {"detail": "Only approved requests can be revoked."},
                status=status.HTTP_400_BAD_REQUEST,
            )
            
        access_request.status = "expired"
        access_request.expires_at = timezone.now()
        access_request.save()

        AuditLog.objects.create(
            actor=request.user,
            action="diagnosis_access_revoked",
            target_email=access_request.requested_by.user.email,
            detail=f"Patient ID {access_request.patient_id} — revoked by admin",
        )

        return Response(
            DiagnosisAccessRequestSerializer(access_request).data,
            status=status.HTTP_200_OK,
        )
