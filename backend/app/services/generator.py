import datetime
from sqlalchemy.orm import Session
from backend.app.models.models import Medication, ScheduleVersion, DoseEvent

def generate_events_for_schedule(
    db: Session,
    medication: Medication,
    schedule: ScheduleVersion,
    start_date: datetime.date | None = None,
    horizon_days: int = 14,
):
    """
    Generates dose events for an active schedule version.
    Events are stored in UTC with unique (schedule_version_id, scheduled_at).
    """
    if not medication.active or medication.verification_status != "verified":
        return

    today = datetime.datetime.now(datetime.timezone.utc).date()
    start = start_date or today
    dose_times = schedule.dose_times or ["08:00"]
    freq_rule = schedule.frequency_rule or {"type": "daily"}

    for d in range(horizon_days):
        day_date = start + datetime.timedelta(days=d)
        weekday_name = day_date.strftime("%a").lower()  # mon, tue, etc.

        if freq_rule.get("type") == "days_of_week":
            allowed_days = [day.lower()[:3] for day in freq_rule.get("days", [])]
            if weekday_name not in allowed_days:
                continue

        for time_str in dose_times:
            parts = time_str.split(":")
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0

            # Store in UTC
            scheduled_dt = datetime.datetime(
                day_date.year, day_date.month, day_date.day, hour, minute, tzinfo=datetime.timezone.utc
            )

            # Idempotency key
            idempotency_key = f"{schedule.id}_{scheduled_dt.isoformat()}"

            # Check if event already exists
            existing = (
                db.query(DoseEvent)
                .filter(
                    DoseEvent.schedule_version_id == schedule.id,
                    DoseEvent.scheduled_at == scheduled_dt,
                )
                .first()
            )
            if not existing:
                event = DoseEvent(
                    schedule_version_id=schedule.id,
                    medication_id=medication.id,
                    patient_id=medication.patient_id,
                    scheduled_at=scheduled_dt,
                    status="scheduled",
                    idempotency_key=idempotency_key,
                    sync_status="synced",
                )
                db.add(event)
    
    db.commit()

