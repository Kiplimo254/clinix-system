from django.db import models
from django.utils import timezone
from datetime import timedelta
from appointments.models import Appointment
from accounts.models import Staff


class VisitRecord(models.Model):
    """Clinical notes recorded by the doctor/nurse during a visit."""

    appointment = models.OneToOneField(
        Appointment, on_delete=models.CASCADE, related_name="visit_record"
    )
    vitals = models.JSONField(
        default=dict,
        blank=True,
        help_text=(
            "e.g. {'bp': '120/80', 'temp': '37.2', 'weight': '65', 'pulse': '72'}"
        ),
    )
    triage_notes = models.TextField(blank=True)       # nurse records
    diagnosis = models.TextField(blank=True)           # doctor records
    prescription = models.TextField(blank=True)        # doctor records
    notes = models.TextField(blank=True)               # general notes
    created_by = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Visit: {self.appointment}"


class Payment(models.Model):
    """Payment recorded for a clinic visit."""

    METHOD_CHOICES = [
        ("cash", "Cash"),
        ("mpesa", "M-Pesa"),
        ("card", "Card"),
        ("insurance", "Insurance"),
    ]

    visit = models.ForeignKey(VisitRecord, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    reference = models.CharField(max_length=100, blank=True)  # M-Pesa transaction ID etc.
    recorded_by = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True)
    paid_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"KES {self.amount} ({self.method}) — {self.visit}"


class DiagnosisAccessRequest(models.Model):
    """
    Allows a receptionist to temporarily access full patient record
    (incl. diagnosis/prescription) after doctor approval.
    """

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("denied", "Denied"),
        ("expired", "Expired"),
    ]

    patient = models.ForeignKey(
        "patients.Patient", on_delete=models.CASCADE, related_name="access_requests"
    )
    requested_by = models.ForeignKey(
        Staff, on_delete=models.CASCADE, related_name="access_requests"
    )
    approved_by = models.ForeignKey(
        Staff,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approvals",
    )
    reason = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    approved_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"Access request by {self.requested_by.full_name} "
            f"for {self.patient.full_name} [{self.status}]"
        )

    def approve(self, approving_staff, expiry_minutes=15):
        """Approve this request and set expiry window."""
        now = timezone.now()
        self.approved_by = approving_staff
        self.approved_at = now
        self.expires_at = now + timedelta(minutes=expiry_minutes)
        self.status = "approved"
        self.save()

    @property
    def is_active(self):
        """True if approved and not yet expired."""
        if self.status != "approved":
            return False
        if self.expires_at and timezone.now() > self.expires_at:
            return False
        return True
