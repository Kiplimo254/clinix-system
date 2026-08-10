from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import filters

from .models import Appointment
from .serializers import AppointmentSerializer, AppointmentListSerializer
from accounts.permissions import ClinicScopedMixin, IsClinicStaff, CanCheckIn


class AppointmentViewSet(ClinicScopedMixin, viewsets.ModelViewSet):
    """
    GET    /api/appointments/?doctor=<id>&date=<YYYY-MM-DD>
    POST   /api/appointments/
    PATCH  /api/appointments/<id>/
    POST   /api/appointments/<id>/check-in/
    """
    queryset = Appointment.objects.select_related("patient", "doctor__user", "clinic")
    permission_classes = [IsAuthenticated, IsClinicStaff]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["scheduled_time", "status"]
    ordering = ["scheduled_time"]

    def get_serializer_class(self):
        if self.action == "list":
            return AppointmentListSerializer
        return AppointmentSerializer

    def get_queryset(self):
        qs = super().get_queryset()

        # Filter by doctor
        doctor_id = self.request.query_params.get("doctor")
        if doctor_id:
            qs = qs.filter(doctor_id=doctor_id)

        # Filter by date (YYYY-MM-DD)
        date_str = self.request.query_params.get("date")
        if date_str:
            qs = qs.filter(scheduled_time__date=date_str)

        # Filter by status
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        # Filter today's appointments
        if self.request.query_params.get("today") == "1":
            qs = qs.filter(scheduled_time__date=timezone.localdate())

        # Filter by patient
        patient_id = self.request.query_params.get("patient")
        if patient_id:
            qs = qs.filter(patient_id=patient_id)

        return qs

    def perform_create(self, serializer):
        serializer.save(
            clinic=self.get_clinic(),
            created_by=self.request.user.staff,
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, CanCheckIn])
    def check_in(self, request, pk=None):
        """POST /api/appointments/<id>/check-in/"""
        appointment = self.get_object()
        if appointment.status != "booked":
            return Response(
                {"detail": f"Cannot check in an appointment with status '{appointment.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        appointment.status = "checked_in"
        appointment.checked_in_at = timezone.now()
        appointment.save()
        serializer = AppointmentSerializer(appointment, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsClinicStaff])
    def mark_no_show(self, request, pk=None):
        """POST /api/appointments/<id>/mark-no-show/"""
        appointment = self.get_object()
        appointment.status = "no_show"
        appointment.save()
        return Response({"detail": "Marked as no-show."})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsClinicStaff])
    def cancel(self, request, pk=None):
        """POST /api/appointments/<id>/cancel/"""
        appointment = self.get_object()
        if appointment.status in ("completed", "no_show"):
            return Response(
                {"detail": "Cannot cancel a completed or no-show appointment."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        appointment.status = "cancelled"
        appointment.save()
        return Response({"detail": "Appointment cancelled."})
