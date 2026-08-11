"""Helpers for setting and clearing JWT httpOnly cookies."""
from django.conf import settings


def _cookie_kwargs(max_age: int) -> dict:
    return {
        "max_age": max_age,
        "httponly": True,
        "secure": settings.JWT_COOKIE_SECURE,
        "samesite": settings.JWT_COOKIE_SAMESITE,
        "path": "/",
    }


def set_auth_cookies(response, access_token: str, refresh_token: str) -> None:
    access_lifetime = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
    refresh_lifetime = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())

    response.set_cookie("access_token", access_token, **_cookie_kwargs(access_lifetime))
    response.set_cookie("refresh_token", refresh_token, **_cookie_kwargs(refresh_lifetime))


def clear_auth_cookies(response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
