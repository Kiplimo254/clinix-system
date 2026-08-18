"""
Audit log model — tracks logins, logouts, staff changes.
"""
from django.db import models
from django.contrib.auth.models import User


class AuditLog(models.Model):
    ACTION_CHOICES = [
        ("login_success", "Login Success"),
        ("login_failed", "Login Failed"),
        ("login_locked", "Account Locked"),
        ("logout", "Logout"),
        ("staff_created", "Staff Created"),
        ("staff_deactivated", "Staff Deactivated"),
        ("staff_reactivated", "Staff Reactivated"),
        ("staff_role_changed", "Staff Role Changed"),
        ("password_reset_requested", "Password Reset Requested"),
        ("password_reset_completed", "Password Reset Completed"),
        ("diagnosis_access_requested", "Diagnosis Access Requested"),
        ("diagnosis_access_approved", "Diagnosis Access Approved"),
        ("diagnosis_access_revoked", "Diagnosis Access Revoked"),
    ]

    actor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_actions"
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    target_email = models.CharField(max_length=255, blank=True)
    detail = models.CharField(max_length=500, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.created_at:%Y-%m-%d %H:%M}] {self.action} — {self.target_email}"
