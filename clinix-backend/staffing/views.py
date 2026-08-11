from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Shift, Leave
from .serializers import ShiftSerializer, LeaveSerializer
from accounts.permissions import ClinicScopedMixin, IsAdmin, IsClinicStaff

class ShiftViewSet(ClinicScopedMixin, viewsets.ModelViewSet):
    serializer_class = ShiftSerializer
    permission_classes = [IsClinicStaff]
    queryset = Shift.objects.all()

    @action(detail=True, methods=['post'])
    def check_in(self, request, pk=None):
        shift = self.get_object()
        shift.status = 'checked_in'
        shift.checked_in_at = timezone.now()
        shift.save()
        return Response(self.get_serializer(shift).data)

    @action(detail=True, methods=['post'])
    def check_out(self, request, pk=None):
        shift = self.get_object()
        shift.status = 'completed'
        shift.checked_out_at = timezone.now()
        shift.save()
        return Response(self.get_serializer(shift).data)


class LeaveViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveSerializer
    permission_classes = [IsClinicStaff]
    queryset = Leave.objects.all()

    def get_queryset(self):
        user = self.request.user
        return Leave.objects.filter(staff__clinic=user.staff.clinic)

    def perform_create(self, serializer):
        serializer.save(staff=self.request.user.staff)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def approve(self, request, pk=None):
        leave = self.get_object()
        leave.approved_by = request.user.staff
        leave.save()
        return Response(self.get_serializer(leave).data)
