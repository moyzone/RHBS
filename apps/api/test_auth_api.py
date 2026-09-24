import sys
import os
import jwt
import time
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(__file__))
sys.path.append(os.path.join(os.path.dirname(__file__), '../../packages'))

from main import app, JWT_SECRET
from init_db import initialize_database

client = TestClient(app)

def setup_module():
    initialize_database()

def make_token(role: str, user_id: str = "u_test", tenant_id: str = "hotelflora"):
    payload = {
        "user_id": user_id,
        "tenant_id": tenant_id,
        "role": role,
        "name": f"Test {role}",
        "email": f"test_{role.lower().replace(' ', '')}@{tenant_id}.com",
        "exp": int(time.time()) + 3600
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def test_login_success():
    response = client.post("/api/hotelflora/auth/login", json={
        "email": "sarah@hotelflora.com",
        "password": "password123"
    })
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert "token" in data or "access_token" in data
    token = data.get("token") or data.get("access_token")
    
    # Decode and verify token payload
    payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    assert payload["user_id"] == "user_123"
    assert payload["tenant_id"] == "hotelflora"
    assert payload["role"] == "Front Desk"
    assert payload["name"] == "Sarah Connor"
    assert payload["email"] == "sarah@hotelflora.com"
    assert "exp" in payload
    assert isinstance(payload["exp"], int)
    print("test_login_success PASSED")

def test_login_invalid_password():
    response = client.post("/api/hotelflora/auth/login", json={
        "email": "sarah@hotelflora.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"
    print("test_login_invalid_password PASSED")

def test_login_nonexistent_email():
    response = client.post("/api/hotelflora/auth/login", json={
        "email": "nonexistent@hotelflora.com",
        "password": "password123"
    })
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"
    print("test_login_nonexistent_email PASSED")

def test_login_wrong_tenant():
    # Sarah belongs to hotelflora, not demo
    response = client.post("/api/demo/auth/login", json={
        "email": "sarah@hotelflora.com",
        "password": "password123"
    })
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"
    print("test_login_wrong_tenant PASSED")

def test_get_current_session_success():
    login_res = client.post("/api/hotelflora/auth/login", json={
        "email": "sarah@hotelflora.com",
        "password": "password123"
    })
    token = login_res.json()["token"]
    
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert "user" in data
    assert data["user"]["email"] == "sarah@hotelflora.com"
    assert data["user"]["tenant_id"] == "hotelflora"
    assert "tenant" in data
    assert data["tenant"]["id"] == "hotelflora"
    print("test_get_current_session_success PASSED")

def test_get_current_session_unauthorized():
    # Without header
    res1 = client.get("/api/auth/me")
    assert res1.status_code == 401

    # With invalid header
    res2 = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid_token_123"})
    assert res2.status_code == 401
    print("test_get_current_session_unauthorized PASSED")

def test_role_protection_settings():
    # Manager allowed
    tok_mgr = make_token("Manager")
    res1 = client.patch("/api/hotelflora/settings", json={"short_name": "Flora"}, headers={"Authorization": f"Bearer {tok_mgr}"})
    assert res1.status_code == 200

    # Front Desk forbidden
    tok_fd = make_token("Front Desk")
    res2 = client.patch("/api/hotelflora/settings", json={"short_name": "Flora"}, headers={"Authorization": f"Bearer {tok_fd}"})
    assert res2.status_code == 403
    assert res2.json()["detail"] == "Permission denied for role: Front Desk"
    print("test_role_protection_settings PASSED")

def test_role_protection_admin_users():
    # Owner allowed
    tok_owner = make_token("Owner")
    unique_email = f"admin_{int(time.time())}@hotelflora.com"
    res1 = client.post("/api/hotelflora/admin-users", json={"email": unique_email, "name": "New Admin", "role": "Manager"}, headers={"Authorization": f"Bearer {tok_owner}"})
    assert res1.status_code == 200

    # Housekeeping forbidden
    tok_hk = make_token("Housekeeping")
    res2 = client.post("/api/hotelflora/admin-users", json={"email": "bad@hotelflora.com", "name": "Bad", "role": "Manager"}, headers={"Authorization": f"Bearer {tok_hk}"})
    assert res2.status_code == 403
    assert res2.json()["detail"] == "Permission denied for role: Housekeeping"
    print("test_role_protection_admin_users PASSED")


def test_role_protection_expenses():
    # Accountant allowed
    tok_acc = make_token("Accountant")
    res1 = client.post("/api/hotelflora/expenses", json={"expense_type": "Operational", "category": "Utilities", "amount": 150.0, "payment_mode": "UPI", "description": "Electric Bill"}, headers={"Authorization": f"Bearer {tok_acc}"})
    assert res1.status_code == 200

    # Front Desk forbidden
    tok_fd = make_token("Front Desk")
    res2 = client.post("/api/hotelflora/expenses", json={"expense_type": "Operational", "category": "Utilities", "amount": 150.0, "payment_mode": "UPI", "description": "Electric Bill"}, headers={"Authorization": f"Bearer {tok_fd}"})
    assert res2.status_code == 403
    assert res2.json()["detail"] == "Permission denied for role: Front Desk"
    print("test_role_protection_expenses PASSED")

def test_role_protection_bookings():
    # Front Desk allowed
    tok_fd = make_token("Front Desk")
    res1 = client.post("/api/bookings", json={"room_id": "r_hotelflora_101", "guest_name": "John Doe", "check_in": "2026-10-01T10:00:00Z", "check_out": "2026-10-05T10:00:00Z", "total_price": 5000.0}, headers={"Authorization": f"Bearer {tok_fd}"})
    assert res1.status_code in [200, 400, 409, 422] and res1.status_code != 403

    # Housekeeping forbidden
    tok_hk = make_token("Housekeeping")
    res2 = client.post("/api/bookings", json={"room_id": "r_hotelflora_101", "guest_name": "John Doe", "check_in": "2026-10-01T10:00:00Z", "check_out": "2026-10-05T10:00:00Z", "total_price": 5000.0}, headers={"Authorization": f"Bearer {tok_hk}"})
    assert res2.status_code == 403
    assert res2.json()["detail"] == "Permission denied for role: Housekeeping"
    print("test_role_protection_bookings PASSED")

def test_role_protection_housekeeping():
    # Housekeeping allowed
    tok_hk = make_token("Housekeeping")
    res1 = client.patch("/api/rooms/r_hotelflora_101/housekeeping", json={"status": "Clean"}, headers={"Authorization": f"Bearer {tok_hk}"})
    assert res1.status_code in [200, 404] and res1.status_code != 403

    # Accountant forbidden
    tok_acc = make_token("Accountant")
    res2 = client.patch("/api/rooms/r_hotelflora_101/housekeeping", json={"status": "Clean"}, headers={"Authorization": f"Bearer {tok_acc}"})
    assert res2.status_code == 403
    assert res2.json()["detail"] == "Permission denied for role: Accountant"
    print("test_role_protection_housekeeping PASSED")

if __name__ == "__main__":
    setup_module()
    test_login_success()
    test_login_invalid_password()
    test_login_nonexistent_email()
    test_login_wrong_tenant()
    test_get_current_session_success()
    test_get_current_session_unauthorized()
    test_role_protection_settings()
    test_role_protection_admin_users()
    test_role_protection_expenses()
    test_role_protection_bookings()
    test_role_protection_housekeeping()
    print("ALL AUTH & ROLE PROTECTION TESTS PASSED!")
