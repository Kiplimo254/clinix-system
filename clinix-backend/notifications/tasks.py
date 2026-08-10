"""
SMS Reminder Celery Task.
Runs every 30 minutes via Celery Beat.
Sends Africa's Talking SMS for appointments in the next 24h and 2h windows.
"""
import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone
from django.conf import settings

logger = logging.getLogger(__name__)


def _get_sms_service():
    """Initialise Africa's Talking SMS service."""
    import africastalking
    africastalking.initialize(
        username=settings.AT_USERNAME,
        api_key=settings.AT_API_KEY,
    )
    return africastalking.SMS


def _format_reminder_message(appointment):
    doctor_name = appointment.doctor.user.get_full_name()
    clinic_name = appointment.clinic.name
    scheduled = timezone.localtime(appointment.scheduled_time)
    date_str = scheduled.strftime("%A, %d %b %Y")
    time_str = scheduled.strftime("%I:%M %p")
    return (
        f"Reminder: You have an appointment with Dr. {doctor_name} at {clinic_name} "
        f"on {date_str} at {time_str}. "
        f"Please arrive 10 minutes early. Reply CANCEL to cancel."
    )


@shared_task(bind=True, max_retries=3)
def send_appointment_reminders(self):
    """
    Check for appointments in the next 24h and 2h windows
    with reminder_sent=False, send SMS, mark as sent.
    """
    from appointments.models import Appointment

    now = timezone.now()
    windows = [
        ("24h", now + timedelta(hours=22), now + timedelta(hours=26)),
        ("2h",  now + timedelta(hours=1),  now + timedelta(hours=3)),
    ]

    total_sent = 0

    for label, window_start, window_end in windows:
        appointments = Appointment.objects.filter(
            scheduled_time__gte=window_start,
            scheduled_time__lte=window_end,
            status__in=["booked", "checked_in"],
            reminder_sent=False,
            patient__phone__isnull=False,
        ).select_related("patient", "doctor__user", "clinic").exclude(patient__phone="")

        for appt in appointments:
            phone = appt.patient.phone
            if not phone.startswith("+"):
                # Assume Kenya — prepend +254, strip leading 0
                phone = "+254" + phone.lstrip("0")

            message = _format_reminder_message(appt)

            try:
                sms = _get_sms_service()
                response = sms.send(message, [phone])
                logger.info(
                    "[SMS %s] Sent reminder to %s for appointment %s: %s",
                    label, phone, appt.id, response,
                )
                appt.reminder_sent = True
                appt.save(update_fields=["reminder_sent"])
                total_sent += 1
            except Exception as exc:
                logger.error(
                    "[SMS %s] Failed to send reminder to %s for appointment %s: %s",
                    label, phone, appt.id, exc,
                )

    logger.info("[SMS] Done. %d reminders sent.", total_sent)
    return {"sent": total_sent}
