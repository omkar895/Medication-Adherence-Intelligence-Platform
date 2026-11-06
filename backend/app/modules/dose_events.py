import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.permissions import require_patient
from backend.app.models.models import (
    User,
    DoseEvent,
    DoseEventCorrection,
    ReminderAttempt,
    Medication,
    ScheduleVersion,
    ConsentGrant,
    CaregiverNotification,
)
from backend.app.schemas.schemas import (
    DoseEventRead,
    DoseEventResponse,
    DoseEventSnoozeRequest,
    DoseEventCorrectionCreate,
    DoseEventBatchSyncRequest,
)

router = APIRouter(tags=["dose-events"])

def map_dose_event(ev: DoseEvent, med: Medication | None = None) -> DoseEventRead:
    return DoseEventRead(
        id=ev.id,
        schedule_version_id=ev.schedule_version_id,
        medication_id=ev.medication_id,
        medication_name=med.display_name if med else (ev.medication.display_name if ev.medication else "Medication"),
        patient_id=ev.patient_id,
        scheduled_at=ev.scheduled_at,
        status=ev.status,
        responded_at=ev.responded_at,
        response_source=ev.response_source,
        reason_code=ev.reason_code,
        is_late=ev.is_late,
        idempotency_key=ev.idempotency_key,
        sync_status=ev.sync_status,
        is_synthetic=ev.medication.is_synthetic if ev.medication else False,
    )

@router.get("/dose-events/today", response_model=list[DoseEventRead])
def get_today_dose_events(
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    now = datetime.datetime.now(datetime.timezone.utc)
    start_of_day = datetime.datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=datetime.timezone.utc)
    end_of_day = start_of_day + datetime.timedelta(days=1)

    events = (
        db.query(DoseEvent, Medication)
        .join(Medication, DoseEvent.medication_id == Medication.id)
        .filter(
            DoseEvent.patient_id == current_user.id,
            DoseEvent.scheduled_at >= start_of_day,
            DoseEvent.scheduled_at < end_of_day,
        )
        .order_by(DoseEvent.scheduled_at.asc())
        .all()
    )

    return [map_dose_event(ev, med) for ev, med in events]

@router.get("/dose-events", response_model=list[DoseEventRead])
def list_dose_events(
    medication_id: str | None = None,
    status_filter: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    query = (
        db.query(DoseEvent, Medication)
        .join(Medication, DoseEvent.medication_id == Medication.id)
        .filter(DoseEvent.patient_id == current_user.id)
    )

    if medication_id:
        query = query.filter(DoseEvent.medication_id == medication_id)
    if status_filter:
        query = query.filter(DoseEvent.status == status_filter)
    if start_date:
        s_dt = datetime.datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        query = query.filter(DoseEvent.scheduled_at >= s_dt)
    if end_date:
        e_dt = datetime.datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        query = query.filter(DoseEvent.scheduled_at <= e_dt)

    events = (
        query.order_by(DoseEvent.scheduled_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [map_dose_event(ev, med) for ev, med in events]

@router.get("/dose-events/{event_id}", response_model=DoseEventRead)
def get_dose_event(
    event_id: str,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    item = (
        db.query(DoseEvent, Medication)
        .join(Medication, DoseEvent.medication_id == Medication.id)
        .filter(DoseEvent.id == event_id, DoseEvent.patient_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dose event not found")
    
    return map_dose_event(item[0], item[1])

@router.post("/dose-events/{event_id}/response", response_model=DoseEventRead)
def record_dose_response(
    event_id: str,
    req: DoseEventResponse,
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    event = (
        db.query(DoseEvent)
        .filter(DoseEvent.id == event_id, DoseEvent.patient_id == current_user.id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dose event not found")

    # Validate allowed outcomes: 'taken' or 'not_taken' (snooze is handled separately)
    if req.outcome not in ["taken", "not_taken"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Outcome must be 'taken' or 'not_taken'. Snooze is a reminder action.",
        )

    # Idempotent response check: if already responded with same outcome, return idempotently
    if event.status == req.outcome:
        return map_dose_event(event)

    now = datetime.datetime.now(datetime.timezone.utc)
    
    # Check if late (if responded past response window or past scheduled time + 6h)
    sched = db.query(ScheduleVersion).filter(ScheduleVersion.id == event.schedule_version_id).first()
    window_minutes = sched.response_window_minutes if sched else 360
    sched_at = event.scheduled_at
    if sched_at.tzinfo is None:
        sched_at = sched_at.replace(tzinfo=datetime.timezone.utc)
    is_late = now > (sched_at + datetime.timedelta(minutes=window_minutes))

    event.status = req.outcome
    event.responded_at = now
    event.response_source = req.source or "patient_web"
    event.response_actor_id = current_user.id
    event.reason_code = req.reason_code
    event.is_late = is_late
    if idempotency_key:
        event.idempotency_key = idempotency_key

    # If skipped/not_taken, check if caregiver has notification alert enabled
    if req.outcome == "not_taken":
        grants = (
            db.query(ConsentGrant)
            .filter(
                ConsentGrant.patient_id == event.patient_id,
                ConsentGrant.revoked_at.is_(None),
            )
            .all()
        )
        for grant in grants:
            scopes = grant.scopes or []
            alert_prefs = grant.alert_preferences or {}
            if "notifications" in scopes and alert_prefs.get("skipped_event"):
                notif = CaregiverNotification(
                    consent_grant_id=grant.id,
                    dose_event_id=event.id,
                    type="skipped_event",
                    delivery_status="delivered",
                    text=f"Dose marked as not taken for {event.medication.display_name} scheduled at {event.scheduled_at.strftime('%Y-%m-%d %H:%M UTC')}.",
                )
                db.add(notif)

    db.commit()
    db.refresh(event)
    return map_dose_event(event)

@router.post("/dose-events/{event_id}/snooze")
def snooze_reminder(
    event_id: str,
    req: DoseEventSnoozeRequest,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    event = (
        db.query(DoseEvent)
        .filter(DoseEvent.id == event_id, DoseEvent.patient_id == current_user.id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dose event not found")

    # Snooze changes the reminder timing only, NOT the dose outcome or schedule
    now = datetime.datetime.now(datetime.timezone.utc)
    snooze_until = now + datetime.timedelta(minutes=req.snooze_minutes)

    attempt = ReminderAttempt(
        dose_event_id=event.id,
        attempted_at=now,
        channel="in_app_simulation",
        delivery_status="attempted",
        snooze_until=snooze_until,
    )
    db.add(attempt)
    db.commit()

    return {
        "message": f"Reminder snoozed for {req.snooze_minutes} minutes.",
        "snooze_until": snooze_until.isoformat(),
        "dose_event_id": event.id,
        "status": event.status,
    }

@router.post("/dose-events/{event_id}/correction", response_model=DoseEventRead)
def correct_dose_event(
    event_id: str,
    req: DoseEventCorrectionCreate,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    event = (
        db.query(DoseEvent)
        .filter(DoseEvent.id == event_id, DoseEvent.patient_id == current_user.id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dose event not found")

    if req.new_status not in ["taken", "not_taken", "unresolved"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")

    previous_status = event.status
    correction = DoseEventCorrection(
        dose_event_id=event.id,
        previous_status=previous_status,
        new_status=req.new_status,
        reason=req.reason,
        actor_id=current_user.id,
    )
    db.add(correction)

    event.status = req.new_status
    event.responded_at = datetime.datetime.now(datetime.timezone.utc)
    event.response_source = "patient_correction"

    db.commit()
    db.refresh(event)
    return map_dose_event(event)

@router.post("/sync/dose-events")
def batch_sync_dose_events(
    req: DoseEventBatchSyncRequest,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    """
    Offline sync endpoint:
    Safe retry with idempotency keys. Conflicts never silently overwrite patient-confirmed taken events.
    """
    synced_count = 0
    conflicts = 0

    for item in req.events:
        # Check by idempotency key or schedule occurrence
        existing = (
            db.query(DoseEvent)
            .filter(
                DoseEvent.patient_id == current_user.id,
                DoseEvent.idempotency_key == item.idempotency_key,
            )
            .first()
        )
        if not existing and item.id:
            existing = (
                db.query(DoseEvent)
                .filter(DoseEvent.id == item.id, DoseEvent.patient_id == current_user.id)
                .first()
            )

        if existing:
            # Rule: Never silently overwrite a patient-confirmed Taken event with unconfirmed
            if existing.status == "taken" and item.status != "taken":
                conflicts += 1
                continue
            existing.status = item.status
            existing.responded_at = item.responded_at or datetime.datetime.now(datetime.timezone.utc)
            existing.sync_status = "synced"
            existing.response_source = "offline_sync"
            synced_count += 1
        else:
            # New event from offline queue
            new_event = DoseEvent(
                schedule_version_id=item.schedule_version_id,
                medication_id=item.medication_id,
                patient_id=current_user.id,
                scheduled_at=item.scheduled_at,
                status=item.status,
                responded_at=item.responded_at or datetime.datetime.now(datetime.timezone.utc),
                response_source="offline_sync",
                response_actor_id=current_user.id,
                reason_code=item.reason_code,
                idempotency_key=item.idempotency_key,
                sync_status="synced",
            )
            db.add(new_event)
            synced_count += 1

    db.commit()
    return {
        "status": "success",
        "synced_count": synced_count,
        "conflicts": conflicts,
    }
