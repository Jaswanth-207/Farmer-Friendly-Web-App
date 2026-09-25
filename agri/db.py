"""Thin SQLite layer: one connection per request, plus small query helpers."""

import sqlite3
from pathlib import Path

import click
from flask import current_app, g

SCHEMA_PATH = Path(__file__).with_name("schema.sql")


def get_db() -> sqlite3.Connection:
    """Return the connection bound to the current request/app context."""
    if "db" not in g:
        g.db = sqlite3.connect(
            current_app.config["DATABASE"],
            detect_types=sqlite3.PARSE_DECLTYPES,
        )
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(exc=None) -> None:
    db = g.pop("db", None)
    if db is not None:
        db.close()


def query(sql: str, args=(), one: bool = False):
    """Run a SELECT and return sqlite3.Row objects (or a single row)."""
    cur = get_db().execute(sql, args)
    rows = cur.fetchall()
    cur.close()
    return (rows[0] if rows else None) if one else rows


def scalar(sql: str, args=(), default=0):
    row = query(sql, args, one=True)
    if row is None or row[0] is None:
        return default
    return row[0]


def execute(sql: str, args=()) -> int:
    """Run a write statement and return the new rowid."""
    db = get_db()
    cur = db.execute(sql, args)
    db.commit()
    lastrowid = cur.lastrowid
    cur.close()
    return lastrowid


def init_db() -> None:
    """(Re)create every table from schema.sql."""
    db = get_db()
    db.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    db.commit()


def ensure_initialized() -> None:
    """Create + seed the database on first run so the app is demo-ready."""
    database = Path(current_app.config["DATABASE"])
    database.parent.mkdir(parents=True, exist_ok=True)
    has_users = query(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users'",
        one=True,
    )
    if not has_users:
        init_db()
    if scalar("SELECT COUNT(*) FROM users") == 0:
        from .seed import seed

        seed()


@click.command("init-db")
def init_db_command() -> None:
    """Create empty tables."""
    init_db()
    click.echo("Initialised the database.")


@click.command("seed-db")
def seed_db_command() -> None:
    """Load the demo dataset (wipes existing rows)."""
    from .seed import seed

    init_db()
    seed()
    click.echo("Seeded the demo dataset.")


@click.command("reset-db")
def reset_db_command() -> None:
    """Drop everything, recreate the schema and reseed."""
    init_db()
    from .seed import seed

    seed()
    click.echo("Database reset.")


def init_app(app) -> None:
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db_command)
    app.cli.add_command(seed_db_command)
    app.cli.add_command(reset_db_command)
