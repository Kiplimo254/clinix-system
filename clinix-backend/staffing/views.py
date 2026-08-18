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

    @action(detail=False, methods=['get'])
    def available_dates(self, request):
        """
        GET /api/shifts/available_dates/?staff=<id>
        Returns shift dates where the given staff member has a scheduled/checked-in shift.
        Used by the calendar to grey-out unavailable dates.
        """
        staff_id = request.query_params.get('staff')
        if not staff_id:
            return Response({'detail': 'staff param required.'}, status=400)
        shifts = self.get_queryset().filter(
            staff_id=staff_id,
            status__in=['scheduled', 'checked_in'],
        ).values_list('shift_date', flat=True)
        return Response({'available_dates': list(shifts)})

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
        # Leave has no direct clinic FK — filter through staff__clinic
        return Leave.objects.filter(
            staff__clinic=self.request.user.staff.clinic
        ).select_related('staff__user', 'approved_by__user')

    def perform_create(self, serializer):
        serializer.save(staff=self.request.user.staff)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def approve(self, request, pk=None):
        leave = self.get_object()
        if leave.approved_by:
            return Response({'detail': 'Leave already approved.'}, status=status.HTTP_400_BAD_REQUEST)
        leave.approved_by = request.user.staff
        leave.approved_at = timezone.now()
        leave.save()
        return Response(self.get_serializer(leave).data)

