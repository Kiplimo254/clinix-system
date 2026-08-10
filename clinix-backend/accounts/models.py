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
    staff_id = models.CharField(max_length=20, unique=True, blank=True, db_index=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    specialty = models.CharField(max_length=100, blank=True)  # doctors only
    phone = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["user__last_name", "user__first_name"]
        verbose_name_plural = "staff"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Auto-generate staff_id after first save (pk is available)
        if not self.staff_id:
            self.staff_id = f"STF-{self.pk:05d}"
            Staff.objects.filter(pk=self.pk).update(staff_id=self.staff_id)

    def __str__(self):
        return f"{self.staff_id} — {self.user.get_full_name()} ({self.role}) — {self.clinic.name}"

    @property
    def full_name(self):
        return self.user.get_full_name()

    @property
    def email(self):
        return self.user.email

