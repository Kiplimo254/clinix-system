"""
Clinix URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),

    # Auth
    path("api/auth/", include("accounts.urls")),

    # Clinic signup
    path("api/clinics/", include("clinics.urls")),

    # Staff
    path("api/staff/", include("accounts.staff_urls")),

    # Patients
    path("api/patients/", include("patients.urls")),

    # Appointments
    path("api/appointments/", include("appointments.urls")),

    # Visits & Diagnosis access
    path("api/", include("visits.urls")),

    # Dashboard
    path("api/dashboard/", include("dashboard.urls")),

    # Staffing
    path("api/", include("staffing.urls")),

    # Inventory
    path("api/inventory/", include("inventory.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
