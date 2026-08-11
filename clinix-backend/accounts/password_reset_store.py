"""
In-memory token store for password resets.
For production replace with a DB-backed or Redis-backed cache.
"""
from django.utils import timezone

_store: dict = {}


def store_token(email: str, token: str) -> None:
    _store[email.lower()] = {"token": token, "created_at": timezone.now()}


def get_token_data(email: str) -> dict | None:
    return _store.get(email.lower())


def delete_token(email: str) -> None:
    _store.pop(email.lower(), None)
