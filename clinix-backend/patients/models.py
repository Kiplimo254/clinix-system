from django.db import models
from clinics.models import Clinic


class Patient(models.Model):
    """A patient registered at a clinic."""

    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
    ]

    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="patients")
    patient_id = models.CharField(max_length=20, unique=True, blank=True, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, db_index=True)
    dob = models.DateField(null=True, blank=True)
    national_id = models.CharField(max_length=20, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    emergency_contact_name = models.CharField(max_length=150, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["last_name", "first_name"]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Auto-generate patient_id after first save (pk is available)
        if not self.patient_id:
            self.patient_id = f"PAT-{self.pk:05d}"
            Patient.objects.filter(pk=self.pk).update(patient_id=self.patient_id)

    def __str__(self):
        return f"{self.patient_id} — {self.first_name} {self.last_name} ({self.phone})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def age(self):
        if self.dob:
            from datetime import date
            today = date.today()
            return today.year - self.dob.year - (
                (today.month, today.day) < (self.dob.month, self.dob.day)
            )
        return None
