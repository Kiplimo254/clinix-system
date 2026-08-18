from django.db import models
from django.utils import timezone
from datetime import timedelta
from appointments.models import Appointment
from accounts.models import Staff


class VisitRecord(models.Model):
    """Clinical notes recorded by the doctor/nurse during a visit."""

    PRIORITY_CHOICES = [
        ("routine", "Routine"),
        ("urgent", "Urgent"),
        ("emergency", "Emergency"),
    ]

    OUTCOME_CHOICES = [
        ("pending", "Pending"),
        ("discharged", "Discharged"),
        ("admitted", "Admitted"),
        ("referred", "Referred"),
    ]

    appointment = models.OneToOneField(
        Appointment, on_delete=models.CASCADE, related_name="visit_record"
    )
    triage_priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="routine")
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
    follow_up_date = models.DateField(null=True, blank=True)
    
    # Outcomes
    outcome = models.CharField(max_length=20, choices=OUTCOME_CHOICES, default="pending")
    referral_hospital = models.CharField(max_length=255, blank=True)
    admission_ward = models.CharField(max_length=255, blank=True)

    created_by = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Visit: {self.appointment}"

from django.db.models.signals import post_save
from django.dispatch import receiver
from datetime import datetime, time
from django.utils import timezone

@receiver(post_save, sender=VisitRecord)
def auto_book_follow_up(sender, instance, created, **kwargs):
    """Auto-create a booked appointment if a follow_up_date is set."""
    if not instance.follow_up_date:
        return

    # Check if a follow-up appointment already exists for this date and patient and doctor
    start_of_day = timezone.make_aware(datetime.combine(instance.follow_up_date, time.min))
    end_of_day = timezone.make_aware(datetime.combine(instance.follow_up_date, time.max))
    
    exists = Appointment.objects.filter(
        patient=instance.appointment.patient,
        doctor=instance.appointment.doctor,
        scheduled_time__range=(start_of_day, end_of_day)
    ).exists()

    if not exists:
        # Default to 9:00 AM for follow-ups, receptionist can reschedule later
        scheduled_time = timezone.make_aware(datetime.combine(instance.follow_up_date, time(9, 0)))
        Appointment.objects.create(
            clinic=instance.appointment.clinic,
            patient=instance.appointment.patient,
            doctor=instance.appointment.doctor,
            scheduled_time=scheduled_time,
            duration_minutes=30,
            reason="Follow-up visit",
            status="booked",
            created_by=instance.created_by,
        )


@receiver(post_save, sender=VisitRecord)
def auto_create_invoice(sender, instance, created, **kwargs):
    """Auto-create an unpaid invoice when a visit record is created."""
    if created:
        Invoice.objects.create(visit=instance)


class Invoice(models.Model):
    STATUS_CHOICES = [
        ("unpaid", "Unpaid"),
        ("partially_paid", "Partially Paid"),
        ("paid", "Paid"),
    ]
    visit = models.OneToOneField(VisitRecord, on_delete=models.CASCADE, related_name="invoice")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="unpaid")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Invoice for {self.visit}"

    @property
    def total_amount(self):
        return sum(item.total_price for item in self.items.all())

    @property
    def amount_paid(self):
        return sum(payment.amount for payment in self.payments.all())

    @property
    def balance(self):
        return self.total_amount - self.amount_paid


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="items")
    description = models.CharField(max_length=255)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity}x {self.description} @ {self.unit_price}"

    @property
    def total_price(self):
        return self.quantity * self.unit_price


class Payment(models.Model):
    """Payment recorded against an invoice."""

    METHOD_CHOICES = [
        ("cash", "Cash"),
        ("mpesa", "M-Pesa"),
        ("card", "Card"),
        ("insurance", "Insurance"),
    ]

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    reference = models.CharField(max_length=100, blank=True)  # M-Pesa transaction ID etc.
    recorded_by = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True)
    paid_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"KES {self.amount} ({self.method}) — {self.invoice}"


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
