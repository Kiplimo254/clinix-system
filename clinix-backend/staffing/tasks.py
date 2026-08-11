"""
Staffing Celery tasks.
- Auto-detect shift no-shows (runs every 30 min via Celery Beat).
"""
import logging
from django.utils import timezone
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task
def flag_shift_no_shows():
    """
    Flag shifts as no_show if:
    - shift_date is today
    - status is still 'scheduled'
    - start_time has passed by more than 30 minutes
    """
    from .models import Shift
    from datetime import timedelta, datetime

    now = timezone.localtime(timezone.now())
    today = now.date()
    threshold = (now - timedelta(minutes=30)).time()

    overdue = Shift.objects.filter(
        shift_date=today,
        status="scheduled",
        start_time__lte=threshold,
    )

    count = overdue.update(status="no_show")
    if count:
        logger.info("[Staffing] Flagged %d shift(s) as no_show", count)
    return {"no_shows_flagged": count}
