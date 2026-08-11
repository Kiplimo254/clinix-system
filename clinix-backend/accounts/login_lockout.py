"""
Login rate limiting and account lockout via Django cache.
Works with any cache backend (no ttl() required).
"""
from datetime import timedelta

from django.core.cache import cache
from django.utils import timezone

MAX_ATTEMPTS = 5
LOCKOUT_SECONDS = 15 * 60  # 15 minutes


def _fail_key(email: str) -> str:
    return f"login_fail:{email.lower()}"


def _lock_key(email: str) -> str:
    return f"login_lock:{email.lower()}"


def is_locked(email: str) -> bool:
    expiry = cache.get(_lock_key(email))
    if expiry is None:
        return False
    if timezone.now() >= expiry:
        cache.delete(_lock_key(email))
        return False
    return True


def get_lockout_remaining(email: str) -> int:
    """Seconds remaining on lockout, or 0 if not locked."""
    expiry = cache.get(_lock_key(email))
    if expiry is None:
        return 0
    remaining = (expiry - timezone.now()).total_seconds()
    return max(int(remaining), 0)


def record_failed_attempt(email: str) -> int:
    """Record a failed login. Returns remaining attempts before lockout."""
    fail_key = _fail_key(email)
    attempts = cache.get(fail_key, 0) + 1
    cache.set(fail_key, attempts, LOCKOUT_SECONDS)

    if attempts >= MAX_ATTEMPTS:
        cache.set(
            _lock_key(email),
            timezone.now() + timedelta(seconds=LOCKOUT_SECONDS),
            LOCKOUT_SECONDS,
        )
        cache.delete(fail_key)
        return 0

    return MAX_ATTEMPTS - attempts


def clear_failed_attempts(email: str) -> None:
    cache.delete(_fail_key(email))
    cache.delete(_lock_key(email))
