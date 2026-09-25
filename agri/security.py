"""Minimal CSRF protection for plain HTML POST forms (no extra dependencies)."""

import hmac
import secrets

from flask import abort, request, session

TOKEN_KEY = "_csrf_token"
FIELD_NAME = "csrf_token"


def csrf_token() -> str:
    """Return this session's CSRF token, creating it on first use."""
    token = session.get(TOKEN_KEY)
    if not token:
        token = secrets.token_urlsafe(32)
        session[TOKEN_KEY] = token
    return token


def check_csrf() -> None:
    sent = request.form.get(FIELD_NAME) or request.headers.get("X-CSRF-Token", "")
    expected = session.get(TOKEN_KEY, "")
    if not expected or not sent or not hmac.compare_digest(sent, expected):
        abort(400, description="Your session expired. Please reload the page and try again.")


def init_app(app) -> None:
    app.jinja_env.globals["csrf_token"] = csrf_token
    app.jinja_env.globals["csrf_field_name"] = FIELD_NAME

    @app.before_request
    def _protect_writes():
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            check_csrf()
