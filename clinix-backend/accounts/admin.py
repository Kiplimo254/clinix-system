from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin
from .models import Staff


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ["full_name", "role", "clinic", "phone", "is_active", "created_at"]
    list_filter = ["role", "clinic", "is_active"]
    search_fields = ["user__first_name", "user__last_name", "user__email", "phone"]
    raw_id_fields = ["user", "clinic"]
