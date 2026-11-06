import datetime
from collections import defaultdict
from sqlalchemy.orm import Session
from backend.app.models.models import DoseEvent, Insight, Medication

def get_time_bucket(hour: int) -> str:
    if 5 <= hour < 12:
        return "Morning (05:00 - 12:00)"
    elif 12 <= hour < 17:
        return "Afternoon (12:00 - 17:00)"
    elif 17 <= hour < 22:
        return "Evening (17:00 - 22:00)"
    else:
        return "Night (22:00 - 05:00)"

def evaluate_r1_insights(patient_id: str, db: Session) -> list[Insight]:
    """
    R1 Rule:
    Over a rolling 28-day window, for each (medication, weekday, time-of-day bucket):
    - Requires >= 4 comparable scheduled events
    - Across >= 2 distinct calendar weeks
    - Surfaces if unresolved events >= 3
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    window_start = now - datetime.timedelta(days=28)

    events = (
        db.query(DoseEvent)
        .filter(
            DoseEvent.patient_id == patient_id,
            DoseEvent.scheduled_at >= window_start,
            DoseEvent.scheduled_at <= now,
        )
        .all()
    )

    # Group by (medication_id, weekday_name, time_bucket)
    grouped: dict[tuple, list[DoseEvent]] = defaultdict(list)
    for ev in events:
        weekday = ev.scheduled_at.strftime("%A")
        bucket = get_time_bucket(ev.scheduled_at.hour)
        grouped[(ev.medication_id, weekday, bucket)].append(ev)

    created_or_updated = []
    for (med_id, weekday, bucket), ev_list in grouped.items():
        total_count = len(ev_list)
        # Check distinct calendar weeks
        weeks = {ev.scheduled_at.isocalendar()[:2] for ev in ev_list}
        unresolved_events = [ev for ev in ev_list if ev.status == "unresolved"]
        unresolved_count = len(unresolved_events)

        if total_count >= 4 and len(weeks) >= 2 and unresolved_count >= 3:
            # Check if active insight already exists
            existing = (
                db.query(Insight)
                .filter(
                    Insight.patient_id == patient_id,
                    Insight.rule_id == "R1",
                    Insight.medication_id == med_id,
                    Insight.dismissed_at.is_(None),
                )
                .first()
            )
            evidence_ids = [ev.id for ev in unresolved_events]
            date_range = {
                "start": window_start.strftime("%Y-%m-%d"),
                "end": now.strftime("%Y-%m-%d"),
            }

            if not existing:
                insight = Insight(
                    patient_id=patient_id,
                    rule_id="R1",
                    medication_id=med_id,
                    evidence_event_ids=evidence_ids,
                    date_range=date_range,
                )
                db.add(insight)
                created_or_updated.append(insight)
            else:
                existing.evidence_event_ids = evidence_ids
                existing.date_range = date_range
                created_or_updated.append(existing)

    db.commit()

    # Query all non-dismissed insights
    return (
        db.query(Insight)
        .filter(Insight.patient_id == patient_id, Insight.dismissed_at.is_(None))
        .all()
    )
