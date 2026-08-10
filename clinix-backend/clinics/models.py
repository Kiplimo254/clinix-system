from django.db import models
from django.contrib.auth.models import User


class Clinic(models.Model):
    """Represents one clinic/hospital using the system."""

    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)  # e.g. clinix.app/sunrise-clinic
    location = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    owner = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="owned_clinic"
    )
    is_active = models.BooleanField(default=True)  # suspend non-paying clinics later
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
