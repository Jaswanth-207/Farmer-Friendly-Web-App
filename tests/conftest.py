"""Shared test fixtures: an isolated database per test, seeded with demo data."""

import re

import pytest

from agri import create_app
from agri.db import init_db
from agri.seed import seed

TOKEN_PATTERN = re.compile(r'name="csrf_token" value="([^"]+)"')


@pytest.fixture
def app(tmp_path):
    app = create_app(
        {
            "TESTING": True,
            "AUTO_INIT": False,
            "SECRET_KEY": "testing-secret",
            "DATABASE": str(tmp_path / "test.sqlite"),
        }
    )
    with app.app_context():
        init_db()
        seed()
    yield app


@pytest.fixture
def client(app):
    return app.test_client()


def csrf_token(client, path="/login"):
    """Pull a CSRF token out of a rendered form."""
    html = client.get(path).get_data(as_text=True)
    match = TOKEN_PATTERN.search(html)
    return match.group(1) if match else ""


def login(client, email="ramesh@demo.com", password="demo1234"):
    token = csrf_token(client, "/login")
    return client.post(
        "/login",
        data={"email": email, "password": password, "csrf_token": token},
        follow_redirects=True,
    )


@pytest.fixture
def farmer_client(client):
    login(client)
    return client


@pytest.fixture
def buyer_client(app):
    client = app.test_client()
    login(client, email="sunita@demo.com")
    return client
