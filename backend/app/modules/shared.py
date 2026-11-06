import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.permissions import require_caregiver, check_caregiver_consent
from backend.app.models.models import (
    User,
    Medication,
    ScheduleVersion,
    DoseEvent,
)
from backend.app.schemas.schemas import PeriodSummaryResponse

router = APIRouter(prefix="/shared/patients/{patient_id}", tags=["caregiver-shared-read"])

@router.get("/medications")
def get_shared_medications(
    patient_id: str,
    current_user: User = Depends(require_caregiver),
    db: Session = Depends(get_db),
):
    # Enforce scope 'medication_names'
    check_caregiver_consent(patient_id, "medication_names", current_user, db)

    meds = db.query(Medication).filter(Medication.patient_id == patient_id, Medication.active == True).all()
    return [
        {
            "id": m.id,
            "display_name": m.display_name,
            "form": m.form,
            "is_synthetic": m.is_synthetic,
        }
        for m in meds
    ]

@router.get("/schedule-summary")
def get_shared_schedule_summary(
    patient_id: str,
    current_user: User = Depends(require_caregiver),
    db: Session = Depends(get_db),
):
    # Enforce scope 'schedule_summary'
    check_caregiver_consent(patient_id, "schedule_summary", current_user, db)

    meds = db.query(Medication).filter(Medication.patient_id == patient_id, Medication.active == True).all()
    summaries = []
    for m in meds:
        sched = (
            db.query(ScheduleVersion)
            .filter(ScheduleVersion.medication_id == m.id, ScheduleVersion.effective_to.is_(None))
            .order_by(ScheduleVersion.effective_from.desc())
            .first()
        )
        if sched:
            summaries.append({
                "medication_id": m.id,
                "display_name": m.display_name,
                "dose_times": sched.dose_times,
                "frequency_rule": sched.frequency_rule,
            })
    return summaries

@router.get("/dose-status-summary")
def get_shared_dose_status_summary(
    patient_id: str,
    current_user: User = Depends(require_caregiver),
    db: Session = Depends(get_db),
):
    # Enforce scope 'dose_status_summary'
    check_caregiver_consent(patient_id, "dose_status_summary", current_user, db)

    now = datetime.datetime.now(datetime.timezone.utc)
    start_of_day = datetime.datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=datetime.timezone.utc)
    end_of_day = start_of_day + datetime.timedelta(days=1)

    today_events = (
        db.query(DoseEvent, Medication)
        .join(Medication, DoseEvent.medication_id == Medication.id)
        .filter(
            DoseEvent.patient_id == patient_id,
            DoseEvent.scheduled_at >= start_of_day,
            DoseEvent.scheduled_at < end_of_day,
        )
        .all()
    )

    S = len(today_events)
    T = sum(1 for e, _ in today_events if e.status == "taken")
    N = sum(1 for e, _ in today_events if e.status == "not_taken")
    U = sum(1 for e, _ in today_events if e.status == "unresolved")

    return {
        "date": start_of_day.strftime("%Y-%m-%d"),
        "total_scheduled": S,
        "taken": T,
        "not_taken": N,
        "unresolved": U,
    }

@router.get("/dose-history")
def get_shared_dose_history(
    patient_id: str,
    limit: int = Query(30, ge=1, le=100),
    current_user: User = Depends(require_caregiver),
    db: Session = Depends(get_db),
):
    # Enforce scope 'dose_history'
    check_caregiver_consent(patient_id, "dose_history", current_user, db)

    events = (
        db.query(DoseEvent, Medication)
        .join(Medication, DoseEvent.medication_id == Medication.id)
        .filter(DoseEvent.patient_id == patient_id)
        .order_by(DoseEvent.scheduled_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": ev.id,
            "medication_name": med.display_name,
            "scheduled_at": ev.scheduled_at.isoformat(),
            "status": ev.status,
            "responded_at": ev.responded_at.isoformat() if ev.responded_at else None,
            "is_late": ev.is_late,
        }
        for ev, med in events
    ]

@router.get("/dashboard", response_model=PeriodSummaryResponse)
def get_shared_dashboard(
    patient_id: str,
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(require_caregiver),
    db: Session = Depends(get_db),
):
    # Enforce scope 'adherence_dashboard'
    check_caregiver_consent(patient_id, "adherence_dashboard", current_user, db)

    now = datetime.datetime.now(datetime.timezone.utc)
    start_dt = now - datetime.timedelta(days=days)

    events = (
        db.query(DoseEvent)
        .filter(
            DoseEvent.patient_id == patient_id,
            DoseEvent.scheduled_at >= start_dt,
            DoseEvent.scheduled_at <= now,
        )
        .all()
    )

    S = len(events)
    T = sum(1 for e in events if e.status == "taken")
    N = sum(1 for e in events if e.status == "not_taken")
    U = sum(1 for e in events if e.status == "unresolved")

    confirmed_pct = round((T / S) * 100, 1) if S > 0 else None
    not_taken_pct = round((N / S) * 100, 1) if S > 0 else None
    unresolved_pct = round((U / S) * 100, 1) if S > 0 else None
    outcome_coverage_pct = round(((T + N) / S) * 100, 1) if S > 0 else None

    return PeriodSummaryResponse(
        period=f"Last {days} days",
        start_date=start_dt.strftime("%Y-%m-%d"),
        end_date=now.strftime("%Y-%m-%d"),
        S=S,
        T=T,
        N=N,
        U=U,
        confirmed_pct=confirmed_pct,
        not_taken_pct=not_taken_pct,
        unresolved_pct=unresolved_pct,
        outcome_coverage_pct=outcome_coverage_pct,
        sync_pending_count=0,
        small_sample_warning=(0 < S < 10),
    )
