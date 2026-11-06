import datetime
import random
from sqlalchemy.orm import Session
from backend.app.models.models import (
    User,
    PatientProfile,
    Medication,
    ScheduleVersion,
    DoseEvent,
    ReminderAttempt,
    CareRelationship,
    Invitation,
    ConsentGrant,
    AuditEvent,
)
from backend.app.core.security import get_password_hash, hash_token

DEMO_PATIENT_EMAIL = "patient.demo@maip.local"
DEMO_CAREGIVER_EMAIL = "caregiver.demo@maip.local"
DEMO_PASSWORD = "Password123!"

def seed_synthetic_data(db: Session, force: bool = False):
    existing_patient = db.query(User).filter(User.email == DEMO_PATIENT_EMAIL).first()
    if existing_patient and not force:
        return

    # Clear previous synthetic data if force
    if existing_patient and force:
        db.query(User).filter(User.email.in_([DEMO_PATIENT_EMAIL, DEMO_CAREGIVER_EMAIL])).delete(synchronize_session=False)
        db.commit()

    # 1. Demo Patient User
    patient = User(
        auth_subject="patient_synthetic_01",
        display_name="Anita Sharma (Demo)",
        email=DEMO_PATIENT_EMAIL,
        phone="+919876543210",
        role="patient",
        locale="en",
        password_hash=get_password_hash(DEMO_PASSWORD),
    )
    db.add(patient)
    db.flush()

    patient_profile = PatientProfile(
        user_id=patient.id,
        timezone="Asia/Kolkata",
        reminder_preferences={
            "quiet_hours_start": "22:00",
            "quiet_hours_end": "07:00",
            "snooze_interval_minutes": 15,
            "max_repeats": 3,
        },
        accessibility_preferences={
            "text_size": "standard",
            "high_contrast": False,
        },
    )
    db.add(patient_profile)

    # 2. Demo Caregiver User
    caregiver = User(
        auth_subject="caregiver_synthetic_01",
        display_name="Rahul Sharma (Caregiver Demo)",
        email=DEMO_CAREGIVER_EMAIL,
        phone="+919876543211",
        role="caregiver",
        locale="en",
        password_hash=get_password_hash(DEMO_PASSWORD),
    )
    db.add(caregiver)
    db.flush()

    # 3. Medications (3 synthetic chronic medications)
    med1 = Medication(
        patient_id=patient.id,
        display_name="Amlodipine 5mg",
        prescribed_instruction_text="Take 1 tablet daily in the morning after breakfast for blood pressure management.",
        form="tablet",
        start_date="2026-09-01",
        verification_status="verified",
        verified_at=datetime.datetime(2026, 9, 1, 8, 0, tzinfo=datetime.timezone.utc),
        active=True,
        is_synthetic=True,
    )
    med2 = Medication(
        patient_id=patient.id,
        display_name="Metformin 500mg",
        prescribed_instruction_text="Take 1 tablet twice daily with meals (morning and evening) for glycemic control.",
        form="tablet",
        start_date="2026-09-01",
        verification_status="verified",
        verified_at=datetime.datetime(2026, 9, 1, 8, 0, tzinfo=datetime.timezone.utc),
        active=True,
        is_synthetic=True,
    )
    med3 = Medication(
        patient_id=patient.id,
        display_name="Atorvastatin 10mg",
        prescribed_instruction_text="Take 1 tablet at night before bed for lipid management.",
        form="tablet",
        start_date="2026-09-15",
        verification_status="verified",
        verified_at=datetime.datetime(2026, 9, 15, 20, 0, tzinfo=datetime.timezone.utc),
        active=True,
        is_synthetic=True,
    )
    db.add_all([med1, med2, med3])
    db.flush()

    # 4. Schedule Versions
    now = datetime.datetime.now(datetime.timezone.utc)
    effective_start = now - datetime.timedelta(days=42)

    sched1 = ScheduleVersion(
        medication_id=med1.id,
        frequency_rule={"type": "daily"},
        dose_times=["08:00"],
        effective_from=effective_start,
        timezone="Asia/Kolkata",
        response_window_minutes=360,
        created_by_id=patient.id,
    )
    sched2 = ScheduleVersion(
        medication_id=med2.id,
        frequency_rule={"type": "daily"},
        dose_times=["08:00", "20:00"],
        effective_from=effective_start,
        timezone="Asia/Kolkata",
        response_window_minutes=360,
        created_by_id=patient.id,
    )
    sched3 = ScheduleVersion(
        medication_id=med3.id,
        frequency_rule={"type": "daily"},
        dose_times=["21:30"],
        effective_from=effective_start,
        timezone="Asia/Kolkata",
        response_window_minutes=360,
        created_by_id=patient.id,
    )
    db.add_all([sched1, sched2, sched3])
    db.flush()

    # 5. Generate ~6 weeks of dose events (past 42 days up to today + 3 future days)
    random.seed(42)  # Deterministic seed

    schedule_tuples = [
        (sched1, med1, ["08:00"]),
        (sched2, med2, ["08:00", "20:00"]),
        (sched3, med3, ["21:30"]),
    ]

    for day_offset in range(-42, 4):
        target_day = (now + datetime.timedelta(days=day_offset)).date()
        weekday_name = target_day.strftime("%A")

        for sched, med, times in schedule_tuples:
            for t_str in times:
                hr, mn = map(int, t_str.split(":"))
                sched_dt = datetime.datetime(
                    target_day.year, target_day.month, target_day.day, hr, mn, tzinfo=datetime.timezone.utc
                )
                idempotency_key = f"synthetic_{sched.id}_{sched_dt.isoformat()}"

                if day_offset > 0:
                    status = "scheduled"
                    resp_at = None
                    src = None
                elif day_offset == 0 and sched_dt > now:
                    status = "scheduled"
                    resp_at = None
                    src = None
                else:
                    # Past days:
                    # In order to trigger R1 pattern naturally for Metformin 20:00 on Thursdays & Fridays:
                    if med.id == med2.id and hr == 20 and weekday_name in ["Thursday", "Friday"] and day_offset < -5:
                        status = "unresolved"
                        resp_at = sched_dt + datetime.timedelta(hours=6)
                        src = "system_sweeper"
                    else:
                        r = random.random()
                        if r < 0.82:
                            status = "taken"
                            resp_at = sched_dt + datetime.timedelta(minutes=random.randint(5, 45))
                            src = "patient_web"
                        elif r < 0.90:
                            status = "not_taken"
                            resp_at = sched_dt + datetime.timedelta(minutes=random.randint(10, 60))
                            src = "patient_web"
                        else:
                            status = "unresolved"
                            resp_at = sched_dt + datetime.timedelta(hours=6)
                            src = "system_sweeper"

                ev = DoseEvent(
                    schedule_version_id=sched.id,
                    medication_id=med.id,
                    patient_id=patient.id,
                    scheduled_at=sched_dt,
                    status=status,
                    responded_at=resp_at,
                    response_source=src,
                    response_actor_id=patient.id if src == "patient_web" else None,
                    is_late=False,
                    idempotency_key=idempotency_key,
                    sync_status="synced",
                )
                db.add(ev)
                db.flush()

                # Add a simulated reminder attempt
                if status != "scheduled" or day_offset == 0:
                    attempt = ReminderAttempt(
                        dose_event_id=ev.id,
                        attempted_at=sched_dt,
                        channel="in_app_simulation",
                        delivery_status="delivered",
                    )
                    db.add(attempt)

    # 6. Care Relationship & Active Consent Grant
    rel = CareRelationship(
        patient_id=patient.id,
        caregiver_id=caregiver.id,
        invitee_contact_hash=hash_token(DEMO_CAREGIVER_EMAIL),
        status="accepted",
        invited_at=now - datetime.timedelta(days=30),
        accepted_at=now - datetime.timedelta(days=29),
    )
    db.add(rel)
    db.flush()

    raw_token = "DEMO-INVITE-TOKEN-2026"
    inv = Invitation(
        relationship_id=rel.id,
        token_hash=hash_token(raw_token),
        raw_token=raw_token,
        expires_at=now + datetime.timedelta(days=7),
        used_at=now - datetime.timedelta(days=29),
    )
    db.add(inv)

    grant = ConsentGrant(
        patient_id=patient.id,
        caregiver_id=caregiver.id,
        scopes=[
            "medication_names",
            "schedule_summary",
            "dose_status_summary",
            "dose_history",
            "adherence_dashboard",
            "notifications",
        ],
        alert_preferences={
            "unresolved_summary": True,
            "skipped_event": True,
            "adherence_summary": False,
        },
        granted_at=now - datetime.timedelta(days=29),
        updated_at=now - datetime.timedelta(days=29),
        revoked_at=None,
    )
    db.add(grant)
    db.flush()

    # 7. Initial Audit log
    audit = AuditEvent(
        actor_id=patient.id,
        action="grant_consent",
        resource_type="consent_grant",
        resource_id=grant.id,
        timestamp=now - datetime.timedelta(days=29),
        outcome="success",
    )
    db.add(audit)

    db.commit()
