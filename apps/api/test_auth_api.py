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
    res1 = client.get("/api/auth/me")
    assert res1.status_code == 401

    res2 = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid_token_123"})
    assert res2.status_code == 401
    print("test_get_current_session_unauthorized PASSED")

def test_staff_login_provisioning_and_management():
    tok_mgr = make_token("Manager")
    unique_email = f"john_{int(time.time())}@hotelflora.com"

    # 1. AC-1 & AC-2: Admin provisions new staff with portal login access
    create_res = client.post("/api/staff", json={
        "name": "John Doe",
        "email": unique_email,
        "phone": "+91 9876543210",
        "role": "Front Desk",
        "designation": "Desk Agent",
        "enable_login": True,
        "password": "password123"
    }, headers={"Authorization": f"Bearer {tok_mgr}"})
    
    assert create_res.status_code == 200, f"Staff create failed: {create_res.text}"
    staff_data = create_res.json()
    staff_id = staff_data["id"]
    assert staff_data["enable_login"] is True
    assert staff_data["email"] == unique_email

    # 2. AC-3 & AC-4: Staff can immediately log in and has correct role
    login_res = client.post("/api/hotelflora/auth/login", json={
        "email": unique_email,
        "password": "password123"
    })
    assert login_res.status_code == 200, f"Login failed for new staff: {login_res.text}"
    login_data = login_res.json()
    assert login_data["user"]["role"] == "Front Desk"
    assert login_data["user"]["email"] == unique_email

    # 3. AC-7: Duplicate email validation returns 400
    dup_res = client.post("/api/staff", json={
        "name": "Duplicate John",
        "email": unique_email,
        "role": "Front Desk",
        "enable_login": True,
        "password": "password123"
    }, headers={"Authorization": f"Bearer {tok_mgr}"})
    assert dup_res.status_code == 400, f"Expected 400 for duplicate email, got: {dup_res.status_code}"

    # 4. AC-6: Admin resets staff password
    update_pw_res = client.patch(f"/api/staff/{staff_id}", json={
        "password": "newpassword456"
    }, headers={"Authorization": f"Bearer {tok_mgr}"})
    assert update_pw_res.status_code == 200

    # Old password fails
    old_pw_login = client.post("/api/hotelflora/auth/login", json={
        "email": unique_email,
        "password": "password123"
    })
    assert old_pw_login.status_code == 401

    # New password succeeds
    new_pw_login = client.post("/api/hotelflora/auth/login", json={
        "email": unique_email,
        "password": "newpassword456"
    })
    assert new_pw_login.status_code == 200

    # 5. AC-5: Deactivation (setting status to Inactive revokes login access)
    deact_res = client.patch(f"/api/staff/{staff_id}", json={
        "status": "Inactive"
    }, headers={"Authorization": f"Bearer {tok_mgr}"})
    assert deact_res.status_code == 200

    inactive_login = client.post("/api/hotelflora/auth/login", json={
        "email": unique_email,
        "password": "newpassword456"
    })
    assert inactive_login.status_code == 401

    # Reactivate staff
    react_res = client.patch(f"/api/staff/{staff_id}", json={
        "status": "Active"
    }, headers={"Authorization": f"Bearer {tok_mgr}"})
    assert react_res.status_code == 200

    react_login = client.post("/api/hotelflora/auth/login", json={
        "email": unique_email,
        "password": "newpassword456"
    })
    assert react_login.status_code == 200

    # 6. Role Restriction: Housekeeping role forbidden from modifying staff
    tok_hk = make_token("Housekeeping")
    hk_create = client.post("/api/staff", json={
        "name": "Unauthorized Staff",
        "role": "Housekeeping"
    }, headers={"Authorization": f"Bearer {tok_hk}"})
    assert hk_create.status_code == 403

    # 7. Staff Deletion revokes login access immediately
    del_res = client.delete(f"/api/staff/{staff_id}", headers={"Authorization": f"Bearer {tok_mgr}"})
    assert del_res.status_code == 200

    deleted_login = client.post("/api/hotelflora/auth/login", json={
        "email": unique_email,
        "password": "newpassword456"
    })
    assert deleted_login.status_code == 401

    print("test_staff_login_provisioning_and_management PASSED")

def test_role_protection_settings():
    tok_mgr = make_token("Manager")
    res1 = client.patch("/api/hotelflora/settings", json={"short_name": "Flora"}, headers={"Authorization": f"Bearer {tok_mgr}"})
    assert res1.status_code == 200

    tok_fd = make_token("Front Desk")
    res2 = client.patch("/api/hotelflora/settings", json={"short_name": "Flora"}, headers={"Authorization": f"Bearer {tok_fd}"})
    assert res2.status_code == 403
    assert res2.json()["detail"] == "Permission denied for role: Front Desk"
    print("test_role_protection_settings PASSED")

def test_role_protection_admin_users():
    tok_owner = make_token("Owner")
    unique_email = f"admin_{int(time.time())}@hotelflora.com"
    res1 = client.post("/api/hotelflora/admin-users", json={"email": unique_email, "name": "New Admin", "role": "Manager"}, headers={"Authorization": f"Bearer {tok_owner}"})
    assert res1.status_code == 200

    tok_hk = make_token("Housekeeping")
    res2 = client.post("/api/hotelflora/admin-users", json={"email": "bad@hotelflora.com", "name": "Bad", "role": "Manager"}, headers={"Authorization": f"Bearer {tok_hk}"})
    assert res2.status_code == 403
    assert res2.json()["detail"] == "Permission denied for role: Housekeeping"
    print("test_role_protection_admin_users PASSED")

def test_role_protection_expenses():
    tok_acc = make_token("Accountant")
    res1 = client.post("/api/hotelflora/expenses", json={"expense_type": "Operational", "category": "Utilities", "amount": 150.0, "payment_mode": "UPI", "description": "Electric Bill"}, headers={"Authorization": f"Bearer {tok_acc}"})
    assert res1.status_code == 200

    tok_fd = make_token("Front Desk")
    res2 = client.post("/api/hotelflora/expenses", json={"expense_type": "Operational", "category": "Utilities", "amount": 150.0, "payment_mode": "UPI", "description": "Electric Bill"}, headers={"Authorization": f"Bearer {tok_fd}"})
    assert res2.status_code == 403
    assert res2.json()["detail"] == "Permission denied for role: Front Desk"
    print("test_role_protection_expenses PASSED")

def test_role_protection_bookings():
    tok_fd = make_token("Front Desk")
    res1 = client.post("/api/bookings", json={"room_id": "r_hotelflora_101", "guest_name": "John Doe", "check_in": "2026-10-01T10:00:00Z", "check_out": "2026-10-05T10:00:00Z", "total_price": 5000.0}, headers={"Authorization": f"Bearer {tok_fd}"})
    assert res1.status_code in [200, 400, 409, 422] and res1.status_code != 403

    tok_hk = make_token("Housekeeping")
    res2 = client.post("/api/bookings", json={"room_id": "r_hotelflora_101", "guest_name": "John Doe", "check_in": "2026-10-01T10:00:00Z", "check_out": "2026-10-05T10:00:00Z", "total_price": 5000.0}, headers={"Authorization": f"Bearer {tok_hk}"})
    assert res2.status_code == 403
    assert res2.json()["detail"] == "Permission denied for role: Housekeeping"
    print("test_role_protection_bookings PASSED")

def test_role_protection_housekeeping():
    tok_hk = make_token("Housekeeping")
    res1 = client.patch("/api/rooms/r_hotelflora_101/housekeeping", json={"status": "Clean"}, headers={"Authorization": f"Bearer {tok_hk}"})
    assert res1.status_code in [200, 404] and res1.status_code != 403

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
    test_staff_login_provisioning_and_management()
    test_role_protection_settings()
    test_role_protection_admin_users()
    test_role_protection_expenses()
    test_role_protection_bookings()
    test_role_protection_housekeeping()
    print("ALL AUTH, STAFF CREDENTIAL PROVISIONING, AND ROLE PROTECTION TESTS PASSED!")
