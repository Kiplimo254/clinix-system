from django.db import models
from clinics.models import Clinic
from accounts.models import Staff

class Shift(models.Model):
    STATUS_CHOICES = [
        ("scheduled", "Scheduled"), ("checked_in", "Checked In"),
        ("completed", "Completed"), ("no_show", "No Show"),
    ]
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE)
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE)
    shift_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="scheduled")
    checked_in_at = models.DateTimeField(null=True, blank=True)
    checked_out_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Leave(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.CharField(max_length=255, blank=True)
    approved_by = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True, blank=True, related_name="leave_approvals")
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def is_approved(self):
        return self.approved_by is not None

    def __str__(self):
        return f"{self.staff.full_name}: {self.start_date} – {self.end_date}"

