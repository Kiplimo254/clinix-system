from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from appointments.models import Appointment
from accounts.models import Staff
from accounts.permissions import IsClinicStaff


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsClinicStaff])
def today_dashboard(request):
    """
    GET /api/dashboard/today/
    Returns today's appointment stats for the current clinic.
    """
    clinic = request.user.staff.clinic
    today = timezone.localdate()

    todays_appointments = Appointment.objects.filter(
        clinic=clinic,
        scheduled_time__date=today,
    ).select_related("patient", "doctor__user")

    total = todays_appointments.count()
    booked = todays_appointments.filter(status="booked").count()
    checked_in = todays_appointments.filter(status="checked_in").count()
    with_nurse = todays_appointments.filter(status="with_nurse").count()
    with_doctor = todays_appointments.filter(status="with_doctor").count()
    completed = todays_appointments.filter(status="completed").count()
    no_show = todays_appointments.filter(status="no_show").count()
    cancelled = todays_appointments.filter(status="cancelled").count()

    # Upcoming (next 3) booked appointments
    upcoming = todays_appointments.filter(
        status__in=["booked", "checked_in", "with_nurse", "with_doctor"],
        scheduled_time__gte=timezone.now(),
    ).order_by("scheduled_time")[:5]

    from appointments.serializers import AppointmentListSerializer
    upcoming_data = AppointmentListSerializer(upcoming, many=True).data

    # Doctors on duty today
    doctor_ids = todays_appointments.values_list("doctor_id", flat=True).distinct()
    doctors_on_duty = Staff.objects.filter(id__in=doctor_ids).select_related("user")
    from accounts.serializers import StaffSerializer
    doctors_data = StaffSerializer(doctors_on_duty, many=True).data

    return Response({
        "date": str(today),
        "clinic": clinic.name,
        "summary": {
            "total": total,
            "booked": booked,
            "checked_in": checked_in,
            "with_nurse": with_nurse,
            "with_doctor": with_doctor,
            "completed": completed,
            "no_show": no_show,
            "cancelled": cancelled,
        },
        "upcoming_appointments": upcoming_data,
        "doctors_on_duty": doctors_data,
    })
