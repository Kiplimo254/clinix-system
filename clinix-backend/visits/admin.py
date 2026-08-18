from django.contrib import admin
from .models import VisitRecord, Payment, DiagnosisAccessRequest, Invoice, InvoiceItem


@admin.register(VisitRecord)
class VisitRecordAdmin(admin.ModelAdmin):
    list_display = ["appointment", "created_by", "created_at"]
    search_fields = ["appointment__patient__first_name", "appointment__patient__last_name", "diagnosis"]
    raw_id_fields = ["appointment", "created_by"]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["visit", "status", "total_amount", "amount_paid", "balance", "created_at"]
    list_filter = ["status"]
    raw_id_fields = ["visit"]


@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    list_display = ["invoice", "description", "quantity", "unit_price"]
    raw_id_fields = ["invoice"]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["invoice", "amount", "method", "recorded_by", "paid_at"]
    list_filter = ["method"]
    raw_id_fields = ["invoice", "recorded_by"]


@admin.register(DiagnosisAccessRequest)
class DiagnosisAccessRequestAdmin(admin.ModelAdmin):
    list_display = ["patient", "requested_by", "approved_by", "status", "expires_at", "created_at"]
    list_filter = ["status"]
    raw_id_fields = ["patient", "requested_by", "approved_by"]
