from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InventoryItemViewSet, InventoryTransactionViewSet

router = DefaultRouter()
router.register(r'items', InventoryItemViewSet, basename='inventoryitem')
router.register(r'transactions', InventoryTransactionViewSet, basename='inventorytransaction')

urlpatterns = [
    path('', include(router.urls)),
]
