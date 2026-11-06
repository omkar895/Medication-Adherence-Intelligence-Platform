import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.permissions import require_patient
from backend.app.models.models import User, DoseEvent, ReminderAttempt, PatientProfile

router = APIRouter(prefix="/reminders", tags=["reminders"])

class SimulateReminderRequest(BaseModel):
    dose_event_id: str

@router.post("/simulate")
def simulate_reminder(
    req: SimulateReminderRequest,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    event = (
        db.query(DoseEvent)
        .filter(DoseEvent.id == req.dose_event_id, DoseEvent.patient_id == current_user.id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dose event not found")

    now = datetime.datetime.now(datetime.timezone.utc)
    
    # Crucial clinical guardrail: Reminder attempt does NOT change the dose outcome
    attempt = ReminderAttempt(
        dose_event_id=event.id,
        attempted_at=now,
        channel="in_app_simulation",
        delivery_status="delivered",
    )
    db.add(attempt)
    db.commit()

    return {
        "message": "Reminder simulated successfully",
        "attempt_id": attempt.id,
        "delivery_status": attempt.delivery_status,
        "dose_event_id": event.id,
        "dose_outcome": event.status,  # still scheduled
    }

@router.get("/diagnostics")
def get_diagnostics(
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    reminder_prefs = profile.reminder_preferences if profile else {}

    now_local = datetime.datetime.now()
    now_time_str = now_local.strftime("%H:%M")
    quiet_start = reminder_prefs.get("quiet_hours_start", "22:00")
    quiet_end = reminder_prefs.get("quiet_hours_end", "07:00")

    is_quiet_hours = False
    if quiet_start > quiet_end:
        is_quiet_hours = now_time_str >= quiet_start or now_time_str <= quiet_end
    else:
        is_quiet_hours = quiet_start <= now_time_str <= quiet_end

    return {
        "system_status": "operational",
        "background_notifications_disclaimer": "PWA reminder simulation active. Background push notifications on battery-restricted Android require app to be running or open.",
        "in_quiet_hours": is_quiet_hours,
        "quiet_hours_window": f"{quiet_start} - {quiet_end}",
        "snooze_interval_minutes": reminder_prefs.get("snooze_interval_minutes", 15),
        "max_repeats": reminder_prefs.get("max_repeats", 3),
        "timezone": profile.timezone if profile else "Asia/Kolkata",
    }
