from django.db import models
from clinics.models import Clinic
from patients.models import Patient
from accounts.models import Staff


class Appointment(models.Model):
    """A scheduled visit between a patient and a doctor."""

    STATUS_CHOICES = [
        ("booked", "Booked"),
        ("checked_in", "Checked In"),
        ("with_nurse", "With Nurse"),
        ("with_doctor", "With Doctor"),
        ("completed", "Completed"),
        ("no_show", "No Show"),
        ("cancelled", "Cancelled"),
    ]

    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="appointments")
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="appointments")
    doctor = models.ForeignKey(
        Staff,
        on_delete=models.CASCADE,
        related_name="appointments",
        limit_choices_to={"role": "doctor"},
    )
    scheduled_time = models.DateTimeField(db_index=True)
    duration_minutes = models.PositiveIntegerField(default=30)
    reason = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="booked")
    is_walk_in = models.BooleanField(default=False)
    reminder_sent = models.BooleanField(default=False)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    triage_nurse = models.ForeignKey(
        Staff,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="triaged_appointments",
        limit_choices_to={"role": "nurse"},
    )
    triage_started_at = models.DateTimeField(null=True, blank=True)
    seen_by_doctor_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        Staff,
        on_delete=models.SET_NULL,
        null=True,
        related_name="appointments_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["scheduled_time"]

    def __str__(self):
        return (
            f"{self.patient.full_name} → Dr. {self.doctor.full_name} "
            f"@ {self.scheduled_time:%Y-%m-%d %H:%M}"
        )
