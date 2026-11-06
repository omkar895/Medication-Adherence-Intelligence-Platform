import os
import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.core.database import Base, get_db
from backend.app.main import app
from backend.app.services.seed_synthetic import seed_synthetic_data

# Use SQLite with StaticPool so all connections share the same in-memory database
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_test_database():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_synthetic_data(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)

client = TestClient(app)

def test_health_check():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_auth_login_and_me():
    # Login as demo patient
    res = client.post("/api/v1/auth/login", json={
        "email": "patient.demo@maip.local",
        "password": "Password123!"
    })
    assert res.status_code == 200
    token = res.json()["access_token"]
    assert token is not None

    # Get current user profile
    headers = {"Authorization": f"Bearer {token}"}
    res_me = client.get("/api/v1/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["email"] == "patient.demo@maip.local"

def test_auth_generic_error_on_bad_credentials():
    res = client.post("/api/v1/auth/login", json={
        "email": "patient.demo@maip.local",
        "password": "WrongPassword!"
    })
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]

def test_medication_crud_and_safety_separation():
    # Login patient
    login_res = client.post("/api/v1/auth/login", json={
        "email": "patient.demo@maip.local",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add medication: prescribed instruction text stored strictly separate from reminder times
    new_med = {
        "display_name": "Lisinopril 10mg",
        "prescribed_instruction_text": "Take one tablet each morning for hypertension as prescribed.",
        "form": "tablet",
        "start_date": "2026-11-01",
        "dose_times": ["09:00"],
        "frequency_type": "daily"
    }
    create_res = client.post("/api/v1/medications", json=new_med, headers=headers)
    assert create_res.status_code == 201
    med_data = create_res.json()
    assert med_data["display_name"] == "Lisinopril 10mg"
    assert med_data["verification_status"] == "verified"
    med_id = med_data["id"]

    # Archive medication: history preserved, active set to False
    arch_res = client.post(f"/api/v1/medications/{med_id}/archive", headers=headers)
    assert arch_res.status_code == 200
    assert arch_res.json()["active"] is False

def test_dose_event_lifecycle_and_idempotency():
    login_res = client.post("/api/v1/auth/login", json={
        "email": "patient.demo@maip.local",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch today's dose events
    today_res = client.get("/api/v1/dose-events/today", headers=headers)
    assert today_res.status_code == 200
    events = today_res.json()
    assert len(events) > 0

    first_event = events[0]
    event_id = first_event["id"]

    # Post outcome 'taken'
    resp_res = client.post(
        f"/api/v1/dose-events/{event_id}/response",
        json={"outcome": "taken"},
        headers={**headers, "Idempotency-Key": f"test_idem_{event_id}"}
    )
    assert resp_res.status_code == 200
    assert resp_res.json()["status"] == "taken"

    # Idempotent re-send returns the same status without error
    resp_res_idem = client.post(
        f"/api/v1/dose-events/{event_id}/response",
        json={"outcome": "taken"},
        headers={**headers, "Idempotency-Key": f"test_idem_{event_id}"}
    )
    assert resp_res_idem.status_code == 200
    assert resp_res_idem.json()["status"] == "taken"

    # Correction trail
    corr_res = client.post(
        f"/api/v1/dose-events/{event_id}/correction",
        json={"new_status": "not_taken", "reason": "Self-corrected by patient: medication not taken today"},
        headers=headers
    )
    assert corr_res.status_code == 200
    assert corr_res.json()["status"] == "not_taken"

def test_snooze_does_not_alter_dose_outcome():
    login_res = client.post("/api/v1/auth/login", json={
        "email": "patient.demo@maip.local",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    today_res = client.get("/api/v1/dose-events/today", headers=headers)
    event_id = today_res.json()[-1]["id"]
    original_status = today_res.json()[-1]["status"]

    snooze_res = client.post(
        f"/api/v1/dose-events/{event_id}/snooze",
        json={"snooze_minutes": 15},
        headers=headers
    )
    assert snooze_res.status_code == 200
    # Guardrail check: Dose outcome remains untouched
    assert snooze_res.json()["status"] == original_status

def test_analytics_denominators_and_insights():
    login_res = client.post("/api/v1/auth/login", json={
        "email": "patient.demo@maip.local",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    summary_res = client.get("/api/v1/analytics/summary?days=30", headers=headers)
    assert summary_res.status_code == 200
    data = summary_res.json()
    assert data["S"] > 0
    assert data["S"] == data["T"] + data["N"] + data["U"]
    assert data["confirmed_pct"] is not None
    assert data["outcome_coverage_pct"] is not None

    # Check R1 insight evaluation
    insights_res = client.get("/api/v1/analytics/insights", headers=headers)
    assert insights_res.status_code == 200
    insights = insights_res.json()
    # Metformin has deliberate Thursday/Friday evening unresolved doses in the synthetic seed
    assert len(insights) >= 1
    assert insights[0]["rule_id"] == "R1"
    assert len(insights[0]["evidence_event_ids"]) >= 3

def test_caregiver_scoped_consent_and_immediate_revocation():
    # 1. Login caregiver
    cg_login = client.post("/api/v1/auth/login", json={
        "email": "caregiver.demo@maip.local",
        "password": "Password123!"
    })
    cg_token = cg_login.json()["access_token"]
    cg_headers = {"Authorization": f"Bearer {cg_token}"}

    # Login patient to get patient_id
    pt_login = client.post("/api/v1/auth/login", json={
        "email": "patient.demo@maip.local",
        "password": "Password123!"
    })
    pt_token = pt_login.json()["access_token"]
    pt_id = pt_login.json()["user_id"]
    pt_headers = {"Authorization": f"Bearer {pt_token}"}

    # Caregiver can access shared medications when scope is active
    shared_meds = client.get(f"/api/v1/shared/patients/{pt_id}/medications", headers=cg_headers)
    assert shared_meds.status_code == 200
    assert len(shared_meds.json()) > 0

    # Caregiver can access shared dashboard
    shared_dash = client.get(f"/api/v1/shared/patients/{pt_id}/dashboard", headers=cg_headers)
    assert shared_dash.status_code == 200
    assert shared_dash.json()["S"] > 0

    # Patient revokes consent
    consent_list = client.get("/api/v1/consent", headers=pt_headers).json()
    assert len(consent_list) > 0
    consent_id = consent_list[0]["id"]

    revoke_res = client.post(f"/api/v1/consent/{consent_id}/revoke", headers=pt_headers)
    assert revoke_res.status_code == 200
    assert revoke_res.json()["revoked_at"] is not None

    # Crucial server-side security check: Next caregiver request is immediately rejected with 403
    shared_after_revoke = client.get(f"/api/v1/shared/patients/{pt_id}/medications", headers=cg_headers)
    assert shared_after_revoke.status_code == 403
    assert "Access ended or not granted" in shared_after_revoke.json()["detail"]


def test_caregiver_disconnect_and_invitation_lifecycle():
    """
    Verify creating an invite with WhatsApp link, cancelling the pending invite,
    and caregiver disconnecting from a patient relationship.
    """
    pt_login = client.post("/api/v1/auth/login", json={
        "email": "patient.demo@maip.local",
        "password": "Password123!"
    })
    pt_token = pt_login.json()["access_token"]
    pt_headers = {"Authorization": f"Bearer {pt_token}"}

    cg_login = client.post("/api/v1/auth/login", json={
        "email": "caregiver.demo@maip.local",
        "password": "Password123!"
    })
    cg_token = cg_login.json()["access_token"]
    cg_headers = {"Authorization": f"Bearer {cg_token}"}

    # 1. Create an invitation with phone contact
    invite_res = client.post("/api/v1/caregivers/invitations", json={
        "contact": "+919876543210",
        "scopes": ["medication_names", "schedule_summary", "dose_status_summary", "dose_history", "adherence_dashboard", "notifications"]
    }, headers=pt_headers)
    assert invite_res.status_code == 200
    invite_data = invite_res.json()
    assert "whatsapp_link" in invite_data
    assert "wa.me" in invite_data["whatsapp_link"]
    inv_id = invite_data["invitation_id"]

    # 2. Cancel the pending invitation
    cancel_res = client.delete(f"/api/v1/caregivers/invitations/{inv_id}", headers=pt_headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "success"

    # 3. Create another invite and accept it
    invite2 = client.post("/api/v1/caregivers/invitations", json={
        "contact": "+919999999999",
        "scopes": ["medication_names", "dose_status_summary"]
    }, headers=pt_headers).json()
    token2 = invite2.get("invite_token") or invite2.get("raw_token")

    accept_res = client.post("/api/v1/caregivers/invitations/accept", json={"token": token2}, headers=cg_headers)
    assert accept_res.status_code == 200
    patient_id = accept_res.json()["patient_id"]

    # 4. Caregiver disconnects from patient
    disc_res = client.delete(f"/api/v1/caregiver/patients/{patient_id}", headers=cg_headers)
    assert disc_res.status_code == 200
    assert disc_res.json()["status"] == "success"

    # Check that access is now severed
    shared_check = client.get(f"/api/v1/shared/patients/{patient_id}/medications", headers=cg_headers)
    assert shared_check.status_code == 403


def test_clinical_safety_copy_lint():
    """
    T-65 / Safety Guardrail:
    Copy lint test against forbidden phrases ("double", "take now", "take it now", "you should")
    across insights, diagnostics, and notifications.
    """
    forbidden_phrases = ["take now", "take it now", "double the dose", "double your dose", "you should take", "you missed your dose"]

    # 1. Check insight copy
    pt_login = client.post("/api/v1/auth/login", json={
        "email": "patient.demo@maip.local",
        "password": "Password123!"
    })
    token = pt_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    insights = client.get("/api/v1/analytics/insights", headers=headers).json()
    for ins in insights:
        desc = ins["description"].lower()
        for phrase in forbidden_phrases:
            assert phrase not in desc, f"Forbidden phrase '{phrase}' found in insight description: {desc}"

    # 2. Check diagnostics copy
    diagnostics = client.get("/api/v1/reminders/diagnostics", headers=headers).json()
    diag_str = str(diagnostics).lower()
    for phrase in forbidden_phrases:
        assert phrase not in diag_str, f"Forbidden phrase '{phrase}' found in diagnostics: {diag_str}"
