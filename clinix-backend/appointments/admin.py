from django.contrib import admin
from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ["patient", "doctor", "scheduled_time", "status", "reminder_sent", "clinic"]
    list_filter = ["status", "reminder_sent", "clinic"]
    search_fields = ["patient__first_name", "patient__last_name", "doctor__user__first_name"]
    raw_id_fields = ["clinic", "patient", "doctor", "created_by"]
    date_hierarchy = "scheduled_time"
