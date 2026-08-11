from rest_framework import serializers
from django.utils import timezone
from .models import VisitRecord, Payment, DiagnosisAccessRequest
from appointments.serializers import AppointmentListSerializer
from accounts.serializers import StaffSerializer


class VitalsSerializer(serializers.Serializer):
    """Structured vitals input for the vitals JSONField."""
    bp = serializers.CharField(max_length=20, required=False, allow_blank=True)
    temp = serializers.CharField(max_length=10, required=False, allow_blank=True)
    weight = serializers.CharField(max_length=10, required=False, allow_blank=True)
    height = serializers.CharField(max_length=10, required=False, allow_blank=True)
    pulse = serializers.CharField(max_length=10, required=False, allow_blank=True)
    spo2 = serializers.CharField(max_length=10, required=False, allow_blank=True)


class VisitRecordSerializer(serializers.ModelSerializer):
    appointment_detail = AppointmentListSerializer(source="appointment", read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = VisitRecord
        fields = [
            "id", "appointment", "appointment_detail",
            "triage_priority", "vitals", "triage_notes", "diagnosis", "prescription", "notes",
            "follow_up_date",
            "created_by", "created_by_name", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def validate(self, data):
        request = self.context.get("request")
        if request:
            role = request.user.staff.role
            # Diagnosis/prescription are doctor-only fields
            if "diagnosis" in data or "prescription" in data:
                if role not in ("doctor", "admin"):
                    raise serializers.ValidationError(
                        "Only doctors can record diagnosis and prescriptions."
                    )
        return data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if request and instance.appointment_id:
            patient_id = instance.appointment.patient_id
            from .permissions import can_view_diagnosis
            if not can_view_diagnosis(request, patient_id):
                data["diagnosis"] = ""
                data["prescription"] = ""
        return data


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "visit", "amount", "method", "reference", "recorded_by", "paid_at"]
        read_only_fields = ["id", "recorded_by", "paid_at"]


class DiagnosisAccessRequestSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source="requested_by.full_name", read_only=True)
    approved_by_name = serializers.SerializerMethodField()
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = DiagnosisAccessRequest
        fields = [
            "id", "patient", "patient_name",
            "requested_by", "requested_by_name",
            "approved_by", "approved_by_name",
            "reason", "status", "is_active",
            "approved_at", "expires_at", "created_at",
        ]
        read_only_fields = ["id", "requested_by", "approved_by", "status", "approved_at", "expires_at", "created_at"]

    def get_approved_by_name(self, obj):
        return obj.approved_by.full_name if obj.approved_by else None


class DiagnosisAccessApproveSerializer(serializers.Serializer):
    """Doctor approves a request using their email and password/PIN."""
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True)
    expiry_minutes = serializers.IntegerField(default=15, min_value=5, max_value=60)

