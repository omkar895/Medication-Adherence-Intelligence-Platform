import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.permissions import require_patient
from backend.app.models.models import User, DoseEvent, Medication, Insight
from backend.app.schemas.schemas import (
    PeriodSummaryResponse,
    MedicationSummaryResponse,
    InsightRead,
    InsightFeedbackRequest,
)
from backend.app.services.insights import evaluate_r1_insights

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/summary", response_model=PeriodSummaryResponse)
def get_analytics_summary(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    now = datetime.datetime.now(datetime.timezone.utc)
    start_dt = now - datetime.timedelta(days=days)

    events = (
        db.query(DoseEvent)
        .filter(
            DoseEvent.patient_id == current_user.id,
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

    pending_sync = sum(1 for e in events if e.sync_status == "pending")

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
        sync_pending_count=pending_sync,
        small_sample_warning=(0 < S < 10),
    )

@router.get("/medications", response_model=list[MedicationSummaryResponse])
def get_medication_summaries(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    now = datetime.datetime.now(datetime.timezone.utc)
    start_dt = now - datetime.timedelta(days=days)

    medications = db.query(Medication).filter(Medication.patient_id == current_user.id).all()
    summaries = []

    for med in medications:
        events = (
            db.query(DoseEvent)
            .filter(
                DoseEvent.medication_id == med.id,
                DoseEvent.patient_id == current_user.id,
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
        summaries.append(
            MedicationSummaryResponse(
                medication_id=med.id,
                display_name=med.display_name,
                S=S,
                T=T,
                N=N,
                U=U,
                confirmed_pct=confirmed_pct,
            )
        )

    return summaries

@router.get("/trends")
def get_trends(
    days: int = Query(14, ge=7, le=60),
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    now = datetime.datetime.now(datetime.timezone.utc)
    start_dt = now - datetime.timedelta(days=days)

    events = (
        db.query(DoseEvent)
        .filter(
            DoseEvent.patient_id == current_user.id,
            DoseEvent.scheduled_at >= start_dt,
            DoseEvent.scheduled_at <= now,
        )
        .all()
    )

    # Group by date
    daily_data: dict[str, dict] = {}
    for i in range(days):
        d = (start_dt + datetime.timedelta(days=i)).strftime("%Y-%m-%d")
        daily_data[d] = {"date": d, "S": 0, "T": 0, "N": 0, "U": 0}

    for ev in events:
        d_str = ev.scheduled_at.strftime("%Y-%m-%d")
        if d_str in daily_data:
            daily_data[d_str]["S"] += 1
            if ev.status == "taken":
                daily_data[d_str]["T"] += 1
            elif ev.status == "not_taken":
                daily_data[d_str]["N"] += 1
            elif ev.status == "unresolved":
                daily_data[d_str]["U"] += 1

    return list(daily_data.values())

@router.get("/insights", response_model=list[InsightRead])
def get_insights(
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    # Deterministic R1 evaluation
    active_insights = evaluate_r1_insights(current_user.id, db)
    results = []

    for ins in active_insights:
        med = db.query(Medication).filter(Medication.id == ins.medication_id).first()
        med_name = med.display_name if med else "Scheduled medication"
        evidence_count = len(ins.evidence_event_ids or [])
        
        # Clinical safety check: neutral copy only, no guilt, no causes inferred
        description = (
            f"Over the 28-day window ({ins.date_range.get('start')} to {ins.date_range.get('end')}), "
            f"{evidence_count} scheduled doses for {med_name} remained unresolved without a recorded response. "
            f"This summary shows recorded event patterns only. If you have questions about your medications or schedule, please consult your clinician or pharmacist."
        )

        results.append(
            InsightRead(
                id=ins.id,
                rule_id=ins.rule_id,
                medication_id=ins.medication_id,
                medication_name=med_name,
                evidence_event_ids=ins.evidence_event_ids or [],
                date_range=ins.date_range or {},
                generated_at=ins.generated_at,
                dismissed=ins.dismissed_at is not None,
                useful=ins.useful,
                description=description,
            )
        )

    return results

@router.post("/insights/{insight_id}/dismiss")
def dismiss_insight(
    insight_id: str,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    insight = (
        db.query(Insight)
        .filter(Insight.id == insight_id, Insight.patient_id == current_user.id)
        .first()
    )
    if not insight:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Insight not found")
    
    insight.dismissed_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    return {"message": "Insight dismissed"}

@router.post("/insights/{insight_id}/feedback")
def insight_feedback(
    insight_id: str,
    req: InsightFeedbackRequest,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    insight = (
        db.query(Insight)
        .filter(Insight.id == insight_id, Insight.patient_id == current_user.id)
        .first()
    )
    if not insight:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Insight not found")
    
    insight.useful = req.useful
    db.commit()
    return {"message": "Feedback recorded", "useful": req.useful}

