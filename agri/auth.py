"""Farmer and buyer accounts: registration, login, session helpers."""

import functools

from flask import (
    Blueprint,
    flash,
    g,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from werkzeug.security import check_password_hash, generate_password_hash

from .constants import CATEGORIES
from .db import execute, query

bp = Blueprint("auth", __name__)


# --------------------------------------------------------------------------
# session plumbing
# --------------------------------------------------------------------------
def load_logged_in_user() -> None:
    user_id = session.get("user_id")
    if user_id is None:
        g.user = None
    else:
        g.user = query(
            "SELECT * FROM users WHERE id = ?", (user_id,), one=True
        )
        if g.user is None:
            session.clear()


def login_required(view):
    @functools.wraps(view)
    def wrapped(*args, **kwargs):
        if g.user is None:
            flash("Please sign in to continue.", "warning")
            return redirect(url_for("auth.login", next=request.path))
        return view(*args, **kwargs)

    return wrapped


def farmer_required(view):
    """Sales tools are farmer-only."""

    @functools.wraps(view)
    @login_required
    def wrapped(*args, **kwargs):
        if g.user["role"] != "farmer":
            flash("Only farmer accounts can manage listings and sales.", "error")
            return redirect(url_for("market.home"))
        return view(*args, **kwargs)

    return wrapped


def init_app(app) -> None:
    app.before_request(load_logged_in_user)

    @app.context_processor
    def inject_user():
        return {"current_user": g.get("user")}


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------
def _errors_for_registration(form) -> dict:
    errors = {}
    name = (form.get("name") or "").strip()
    email = (form.get("email") or "").strip().lower()
    password = form.get("password") or ""
    confirm = form.get("confirm") or ""
    role = (form.get("role") or "farmer").strip()

    if len(name) < 2:
        errors["name"] = "Enter your full name."
    if "@" not in email or "." not in email.split("@")[-1]:
        errors["email"] = "Enter a valid email address."
    elif query("SELECT id FROM users WHERE email = ?", (email,), one=True):
        errors["email"] = "An account with this email already exists."
    if len(password) < 8:
        errors["password"] = "Use at least 8 characters."
    elif password != confirm:
        errors["confirm"] = "Passwords do not match."
    if role not in {"farmer", "buyer"}:
        errors["role"] = "Choose an account type."
    return errors


def _form_values() -> dict:
    """Keep what the user typed so the form can be re-rendered."""
    return {
        key: request.form.get(key, "")
        for key in (
            "name",
            "email",
            "phone",
            "farm_name",
            "village",
            "district",
            "state",
            "role",
        )
    }


# --------------------------------------------------------------------------
# routes
# --------------------------------------------------------------------------
@bp.route("/register", methods=("GET", "POST"))
def register():
    if g.user is not None:
        return redirect(url_for("market.dashboard"))

    if request.method == "POST":
        errors = _errors_for_registration(request.form)
        if errors:
            for message in dict.fromkeys(errors.values()):
                flash(message, "error")
            return render_template(
                "auth/register.html", errors=errors, values=_form_values()
            ), 400

        role = request.form.get("role", "farmer")
        user_id = execute(
            """
            INSERT INTO users (role, name, email, phone, password_hash,
                               farm_name, village, district, state)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                role,
                request.form["name"].strip(),
                request.form["email"].strip().lower(),
                (request.form.get("phone") or "").strip() or None,
                generate_password_hash(request.form["password"]),
                (request.form.get("farm_name") or "").strip() or None,
                (request.form.get("village") or "").strip() or None,
                (request.form.get("district") or "").strip() or None,
                (request.form.get("state") or "").strip() or None,
            ),
        )
        session.clear()
        session["user_id"] = user_id
        flash("Welcome aboard! Your account is ready.", "success")
        return redirect(url_for("market.dashboard"))

    return render_template(
        "auth/register.html", errors={}, values={"role": request.args.get("role", "farmer")}
    )


@bp.route("/login", methods=("GET", "POST"))
def login():
    if g.user is not None:
        return redirect(url_for("market.dashboard"))

    if request.method == "POST":
        email = (request.form.get("email") or "").strip().lower()
        password = request.form.get("password") or ""
        user = query("SELECT * FROM users WHERE email = ?", (email,), one=True)
        if user is None or not check_password_hash(user["password_hash"], password):
            flash("Incorrect email or password.", "error")
            return render_template("auth/login.html", email=email), 401

        session.clear()
        session["user_id"] = user["id"]
        flash(f"Signed in as {user['name']}.", "success")
        next_url = request.args.get("next") or request.form.get("next")
        if next_url and next_url.startswith("/") and not next_url.startswith("//"):
            return redirect(next_url)
        return redirect(url_for("market.dashboard"))

    return render_template("auth/login.html", email=request.args.get("email", ""))


@bp.post("/logout")
def logout():
    session.clear()
    flash("You have been signed out.", "success")
    return redirect(url_for("market.home"))
