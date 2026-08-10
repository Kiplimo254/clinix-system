from django.contrib import admin
from .models import Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ["full_name", "phone", "gender", "dob", "clinic", "created_at"]
    list_filter = ["gender", "clinic"]
    search_fields = ["first_name", "last_name", "phone", "national_id", "email"]
    raw_id_fields = ["clinic"]
