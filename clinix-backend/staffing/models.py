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
    approved_by = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True, related_name="leave_approvals")
