import datetime
from sqlalchemy.orm import Session
from backend.app.models.models import DoseEvent, ScheduleVersion, ConsentGrant, CaregiverNotification, Medication

def sweep_unresolved_events(db: Session) -> int:
    """
    Marks past scheduled events as 'unresolved' when the response window expires.
    Default response window: 6 hours (or per schedule version).
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    
    # Query scheduled events
    candidates = (
        db.query(DoseEvent, ScheduleVersion, Medication)
        .join(ScheduleVersion, DoseEvent.schedule_version_id == ScheduleVersion.id)
        .join(Medication, DoseEvent.medication_id == Medication.id)
        .filter(DoseEvent.status == "scheduled")
        .all()
    )

    count = 0
    for event, schedule, med in candidates:
        window_minutes = schedule.response_window_minutes or 360
        sched_at = event.scheduled_at
        if sched_at.tzinfo is None:
            sched_at = sched_at.replace(tzinfo=datetime.timezone.utc)
        cutoff = sched_at + datetime.timedelta(minutes=window_minutes)
        if now > cutoff:
            event.status = "unresolved"
            event.responded_at = now
            event.response_source = "system_sweeper"
            count += 1

            # Check for caregiver alert preferences
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
                if "notifications" in scopes and alert_prefs.get("unresolved_summary"):
                    notif = CaregiverNotification(
                        consent_grant_id=grant.id,
                        dose_event_id=event.id,
                        type="unresolved_summary",
                        delivery_status="delivered",
                        text=f"No response recorded for {med.display_name} scheduled at {event.scheduled_at.strftime('%Y-%m-%d %H:%M UTC')}.",
                    )
                    db.add(notif)

    if count > 0:
        db.commit()
    return count
