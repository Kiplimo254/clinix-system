from django.db import models
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import InventoryItem, InventoryTransaction
from .serializers import InventoryItemSerializer, InventoryTransactionSerializer
from accounts.permissions import ClinicScopedMixin, IsClinicStaff

class InventoryItemViewSet(ClinicScopedMixin, viewsets.ModelViewSet):
    serializer_class = InventoryItemSerializer
    permission_classes = [IsClinicStaff]
    queryset = InventoryItem.objects.all()

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        items = self.get_queryset().filter(quantity_on_hand__lte=models.F('reorder_level'))
        return Response(self.get_serializer(items, many=True).data)

    @action(detail=True, methods=['post'])
    def restock(self, request, pk=None):
        item = self.get_object()
        quantity = int(request.data.get('quantity', 0))
        if quantity <= 0:
            return Response({'detail': 'Quantity must be positive.'}, status=status.HTTP_400_BAD_REQUEST)
        
        item.quantity_on_hand += quantity
        item.save()
        
        InventoryTransaction.objects.create(
            item=item,
            change=quantity,
            reason='restock',
            recorded_by=request.user.staff
        )
        return Response(self.get_serializer(item).data)

    @action(detail=True, methods=['post'])
    def dispense(self, request, pk=None):
        item = self.get_object()
        quantity = int(request.data.get('quantity', 0))
        visit_id = request.data.get('visit_id')
        
        if quantity <= 0:
            return Response({'detail': 'Quantity must be positive.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if item.quantity_on_hand < quantity:
            return Response({'detail': 'Not enough stock.'}, status=status.HTTP_400_BAD_REQUEST)
            
        item.quantity_on_hand -= quantity
        item.save()
        
        InventoryTransaction.objects.create(
            item=item,
            change=-quantity,
            reason='dispensed',
            visit_id=visit_id,
            recorded_by=request.user.staff
        )
        
        # Auto-create invoice item if applicable
        if visit_id and item.unit_cost:
            from visits.models import InvoiceItem, VisitRecord
            try:
                visit = VisitRecord.objects.get(id=visit_id)
                if hasattr(visit, 'invoice'):
                    InvoiceItem.objects.create(
                        invoice=visit.invoice,
                        description=f"{item.name} ({quantity} {item.unit})",
                        quantity=quantity,
                        unit_price=item.unit_cost
                    )
            except VisitRecord.DoesNotExist:
                pass

        return Response(self.get_serializer(item).data)


class InventoryTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InventoryTransactionSerializer
    permission_classes = [IsClinicStaff]

    def get_queryset(self):
        user = self.request.user
        return InventoryTransaction.objects.filter(item__clinic=user.staff.clinic)
