from django.db import models
from clinics.models import Clinic
from visits.models import VisitRecord
from accounts.models import Staff

class InventoryItem(models.Model):
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    unit = models.CharField(max_length=50)
    quantity_on_hand = models.IntegerField(default=0)
    reorder_level = models.IntegerField(default=10)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class InventoryTransaction(models.Model):
    REASON_CHOICES = [
        ("dispensed", "Dispensed"), ("restock", "Restock"),
        ("adjustment", "Adjustment"), ("expired", "Expired/Disposed"),
    ]
    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE)
    visit = models.ForeignKey(VisitRecord, null=True, blank=True, on_delete=models.SET_NULL)
    change = models.IntegerField()
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    recorded_by = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
