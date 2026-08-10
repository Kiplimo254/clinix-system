from django.db import models
from django.contrib.auth.models import User
from clinics.models import Clinic


class Staff(models.Model):
    """A member of clinic staff with a specific role."""

    ROLE_CHOICES = [
        ("admin", "Admin"),
        ("doctor", "Doctor"),
        ("nurse", "Nurse"),
        ("receptionist", "Receptionist"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="staff")
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="staff_members")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    specialty = models.CharField(max_length=100, blank=True)  # doctors only
    phone = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["user__last_name", "user__first_name"]
        verbose_name_plural = "staff"

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.role}) — {self.clinic.name}"

    @property
    def full_name(self):
        return self.user.get_full_name()

    @property
    def email(self):
        return self.user.email
