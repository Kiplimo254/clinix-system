from rest_framework import serializers
from django.utils import timezone
from .models import Appointment
from patients.serializers import PatientListSerializer
from accounts.serializers import StaffSerializer


class AppointmentSerializer(serializers.ModelSerializer):
    patient_detail = PatientListSerializer(source="patient", read_only=True)
    doctor_detail = StaffSerializer(source="doctor", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id", "clinic", "patient", "patient_detail",
            "doctor", "doctor_detail",
            "scheduled_time", "duration_minutes", "reason",
            "status", "is_walk_in", "reminder_sent", "checked_in_at",
            "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "clinic", "reminder_sent", "checked_in_at", "created_by", "created_at", "updated_at"]

    def validate(self, data):
        """Prevent double-booking: no two appointments for the same doctor overlap."""
        doctor = data.get("doctor") or (self.instance and self.instance.doctor)
        scheduled_time = data.get("scheduled_time") or (self.instance and self.instance.scheduled_time)
        duration = data.get("duration_minutes", 30)

        if not doctor or not scheduled_time:
            return data

        # Walk-ins bypass double-booking validation
        if data.get("is_walk_in"):
            return data

        from datetime import timedelta
        end_time = scheduled_time + timedelta(minutes=duration)

        qs = Appointment.objects.filter(
            doctor=doctor,
            status="booked",
            scheduled_time__lt=end_time,
            scheduled_time__gte=scheduled_time - timedelta(minutes=duration),
        )

        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError(
                "This doctor already has an appointment during that time slot."
            )
        return data


class AppointmentListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views / calendar."""
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    patient_phone = serializers.CharField(source="patient.phone", read_only=True)
    doctor_name = serializers.CharField(source="doctor.full_name", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id", "patient", "patient_name", "patient_phone",
            "doctor", "doctor_name",
            "scheduled_time", "duration_minutes", "reason",
            "status", "is_walk_in", "reminder_sent", "checked_in_at",
        ]
