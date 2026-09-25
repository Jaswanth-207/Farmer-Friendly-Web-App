"""End-to-end tests for the farmer marketplace."""

from tests.conftest import csrf_token, login


def product(client, name="Test Tomatoes"):
    """Create a listing through the real form and return its id."""
    token = csrf_token(client, "/products/new")
    response = client.post(
        "/products/new",
        data={
            "csrf_token": token,
            "name": name,
            "category": "Vegetables",
            "unit": "kg",
            "quantity_available": "200",
            "price_per_unit": "30",
            "harvest_date": "2026-03-01",
            "district": "Nashik",
            "description": "Test lot",
        },
        follow_redirects=True,
    )
    assert response.status_code == 200
    with client.application.app_context():
        from agri.db import query

        row = query("SELECT id FROM products WHERE name = ?", (name,), one=True)
    return row["id"]


def stock_of(app, product_id):
    with app.app_context():
        from agri.db import query

        return query(
            "SELECT quantity_available FROM products WHERE id = ?", (product_id,), one=True
        )["quantity_available"]


# --------------------------------------------------------------------------
# public pages
# --------------------------------------------------------------------------
def test_home_page_lists_benchmark_prices(client):
    response = client.get("/")
    assert response.status_code == 200
    assert b"What the market is paying" in response.data


def test_marketplace_shows_seeded_listings(client):
    response = client.get("/marketplace")
    assert response.status_code == 200
    assert b"Tomatoes" in response.data


# --------------------------------------------------------------------------
# auth
# --------------------------------------------------------------------------
def test_post_without_csrf_token_is_rejected(client):
    response = client.post("/login", data={"email": "ramesh@demo.com", "password": "demo1234"})
    assert response.status_code == 400


def test_login_rejects_wrong_password(client):
    response = login(client, password="wrong-password")
    assert response.status_code == 401
    assert b"Incorrect email or password" in response.data


def test_register_creates_farmer_account(client):
    token = csrf_token(client, "/register")
    response = client.post(
        "/register",
        data={
            "csrf_token": token,
            "role": "farmer",
            "name": "New Farmer",
            "email": "new@example.com",
            "password": "strongpass1",
            "confirm": "strongpass1",
            "district": "Nashik",
        },
        follow_redirects=True,
    )
    assert response.status_code == 200
    assert b"Namaste, New" in response.data


def test_register_rejects_short_password_and_duplicate_email(client):
    token = csrf_token(client, "/register")
    short = client.post(
        "/register",
        data={
            "csrf_token": token,
            "role": "farmer",
            "name": "Short Pass",
            "email": "short@example.com",
            "password": "abc",
            "confirm": "abc",
        },
    )
    assert short.status_code == 400

    duplicate = client.post(
        "/register",
        data={
            "csrf_token": csrf_token(client, "/register"),
            "role": "farmer",
            "name": "Copy Cat",
            "email": "ramesh@demo.com",
            "password": "strongpass1",
            "confirm": "strongpass1",
        },
    )
    assert duplicate.status_code == 400
    assert b"already exists" in duplicate.data


def test_logout_clears_session(farmer_client):
    token = csrf_token(farmer_client, "/dashboard")
    response = farmer_client.post(
        "/logout", data={"csrf_token": token}, follow_redirects=True
    )
    assert response.status_code == 200
    assert b"Signed out" in response.data or b"been signed out" in response.data
    assert farmer_client.get("/dashboard").status_code == 302


# --------------------------------------------------------------------------
# listings
# --------------------------------------------------------------------------
def test_farmer_can_create_and_see_a_listing(farmer_client):
    product(farmer_client, "Nashik Grapes")
    response = farmer_client.get("/products")
    assert b"Nashik Grapes" in response.data


def test_buyer_cannot_reach_farmer_tools(buyer_client):
    response = buyer_client.get("/dashboard", follow_redirects=False)
    assert response.status_code == 302
    assert "/marketplace" in response.headers["Location"] or "/" in response.headers["Location"]


def test_farmer_cannot_edit_another_farmers_listing(farmer_client):
    # Listing 11+ belongs to the second demo farmer (Anita).
    with farmer_client.application.app_context():
        from agri.db import query

        other = query(
            """
            SELECT p.id FROM products p
            JOIN users u ON u.id = p.farmer_id
            WHERE u.email = 'anita@demo.com'
            LIMIT 1
            """,
            one=True,
        )
    assert farmer_client.get(f"/products/{other['id']}/edit").status_code == 404


def test_dashboard_flags_an_underpriced_listing(farmer_client):
    # 8/kg is below any plausible market or peer benchmark for vegetables.
    token = csrf_token(farmer_client, "/products/new")
    farmer_client.post(
        "/products/new",
        data={
            "csrf_token": token,
            "name": "Underpriced Chilli",
            "category": "Vegetables",
            "unit": "kg",
            "quantity_available": "100",
            "price_per_unit": "8",
            "district": "Nashik",
        },
        follow_redirects=True,
    )
    response = farmer_client.get("/dashboard")
    assert b"you may be underselling" in response.data
    assert b"Underpriced Chilli" in response.data


def test_listing_validation_rejects_bad_price(farmer_client):
    token = csrf_token(farmer_client, "/products/new")
    response = farmer_client.post(
        "/products/new",
        data={
            "csrf_token": token,
            "name": "Bad Price",
            "category": "Vegetables",
            "unit": "kg",
            "quantity_available": "10",
            "price_per_unit": "0",
        },
    )
    assert response.status_code == 400
    assert b"greater than zero" in response.data


# --------------------------------------------------------------------------
# sales tracking
# --------------------------------------------------------------------------
def sale_payload(product_id, **overrides):
    data = {
        "product_id": str(product_id),
        "quantity": "20",
        "unit_price": "30",
        "buyer_name": "Test Buyer",
        "ordered_at": "2026-03-10",
        "status": "completed",
    }
    data.update(overrides)
    return data


def test_recording_a_sale_deducts_stock(farmer_client):
    product_id = product(farmer_client, "Sale Test Produce")
    before = stock_of(farmer_client.application, product_id)
    token = csrf_token(farmer_client, "/sales/new")
    response = farmer_client.post(
        "/sales/new",
        data={**sale_payload(product_id), "csrf_token": token},
        follow_redirects=True,
    )
    assert response.status_code == 200
    assert stock_of(farmer_client.application, product_id) == before - 20


def test_sale_cannot_exceed_available_stock(farmer_client):
    product_id = product(farmer_client, "Small Lot")
    before = stock_of(farmer_client.application, product_id)
    token = csrf_token(farmer_client, "/sales/new")
    response = farmer_client.post(
        "/sales/new",
        data={**sale_payload(product_id, quantity="9999"), "csrf_token": token},
    )
    assert response.status_code == 400
    assert stock_of(farmer_client.application, product_id) == before


def test_pending_sale_holds_stock_until_confirmed(farmer_client):
    product_id = product(farmer_client, "Pending Produce")
    before = stock_of(farmer_client.application, product_id)
    token = csrf_token(farmer_client, "/sales/new")
    farmer_client.post(
        "/sales/new",
        data={**sale_payload(product_id, status="pending"), "csrf_token": token},
        follow_redirects=True,
    )
    assert stock_of(farmer_client.application, product_id) == before

    with farmer_client.application.app_context():
        from agri.db import query

        order = query(
            "SELECT id FROM orders WHERE product_id = ? ORDER BY id DESC LIMIT 1",
            (product_id,),
            one=True,
        )
    confirm_token = csrf_token(farmer_client, "/sales")
    farmer_client.post(
        f"/sales/{order['id']}/status",
        data={"csrf_token": confirm_token, "status": "confirmed"},
        follow_redirects=True,
    )
    assert stock_of(farmer_client.application, product_id) == before - 20


def test_cancelling_a_confirmed_sale_returns_stock(farmer_client):
    product_id = product(farmer_client, "Cancel Produce")
    before = stock_of(farmer_client.application, product_id)
    token = csrf_token(farmer_client, "/sales/new")
    farmer_client.post(
        "/sales/new",
        data={**sale_payload(product_id), "csrf_token": token},
        follow_redirects=True,
    )
    assert stock_of(farmer_client.application, product_id) == before - 20

    with farmer_client.application.app_context():
        from agri.db import query

        order = query(
            "SELECT id FROM orders WHERE product_id = ? ORDER BY id DESC LIMIT 1",
            (product_id,),
            one=True,
        )
    cancel_token = csrf_token(farmer_client, "/sales")
    farmer_client.post(
        f"/sales/{order['id']}/status",
        data={"csrf_token": cancel_token, "status": "cancelled"},
        follow_redirects=True,
    )
    assert stock_of(farmer_client.application, product_id) == before


def test_sales_ledger_and_csv_export(farmer_client):
    assert farmer_client.get("/sales").status_code == 200
    csv_response = farmer_client.get("/sales/export.csv")
    assert csv_response.status_code == 200
    assert csv_response.mimetype == "text/csv"
    assert b"Produce" in csv_response.data


# --------------------------------------------------------------------------
# buyer flow
# --------------------------------------------------------------------------
def test_buyer_order_creates_pending_order(buyer_client):
    response = buyer_client.get("/marketplace/1")
    assert response.status_code == 200
    token = csrf_token(buyer_client, "/marketplace/1")
    placed = buyer_client.post(
        "/marketplace/1/order",
        data={"csrf_token": token, "quantity": "5", "phone": "9800000000"},
        follow_redirects=True,
    )
    assert placed.status_code == 200
    assert b"Order placed" in placed.data

    with buyer_client.application.app_context():
        from agri.db import query

        order = query(
            "SELECT * FROM orders WHERE buyer_id IS NOT NULL ORDER BY id DESC LIMIT 1", one=True
        )
    assert order["status"] == "pending"
    assert order["channel"] == "marketplace"
    assert order["quantity"] == 5


# --------------------------------------------------------------------------
# market trends
# --------------------------------------------------------------------------
def test_trends_page_renders_chart_container(client):
    response = client.get("/trends?category=Vegetables&months=12")
    assert response.status_code == 200
    assert b"price-chart" in response.data


def test_trends_page_compares_farmer_prices(farmer_client):
    response = farmer_client.get("/trends")
    assert response.status_code == 200
    assert b"Your prices vs the benchmark" in response.data


def test_price_api_returns_series(client):
    payload = client.get("/api/prices?category=Vegetables&months=12").get_json()
    assert payload["category"] == "Vegetables"
    assert len(payload["months"]) == 12
    assert payload["series"], "expected at least one market series"
    assert payload["series"][0]["points"][0]["month"] == payload["months"][0]
    assert payload["latest"] > 0


def test_summary_api_covers_every_category(client):
    payload = client.get("/api/summary?months=12").get_json()
    categories = {row["category"] for row in payload["categories"]}
    assert {"Vegetables", "Fruits", "Grains"} <= categories


def test_price_api_falls_back_to_default_window(client):
    payload = client.get("/api/prices?months=not-a-number").get_json()
    assert len(payload["months"]) == 12


def test_seasonality_api_returns_twelve_months(client):
    payload = client.get("/api/seasonality?category=Fruits&months=24").get_json()
    assert payload["seasonality"]["available"] is True
    assert len(payload["seasonality"]["points"]) == 12
