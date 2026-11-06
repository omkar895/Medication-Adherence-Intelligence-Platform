import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.permissions import require_patient
from backend.app.models.models import User, Medication, ScheduleVersion, PatientProfile
from backend.app.schemas.schemas import (
    MedicationCreate,
    MedicationUpdate,
    MedicationRead,
    ScheduleVersionRead,
    ScheduleVersionCreate,
)
from backend.app.services.generator import generate_events_for_schedule

router = APIRouter(prefix="/medications", tags=["medications"])

def map_medication_read(med: Medication, sched: ScheduleVersion | None) -> MedicationRead:
    sched_read = None
    if sched:
        sched_read = ScheduleVersionRead(
            id=sched.id,
            medication_id=sched.medication_id,
            frequency_rule=sched.frequency_rule,
            dose_times=sched.dose_times,
            effective_from=sched.effective_from,
            effective_to=sched.effective_to,
            timezone=sched.timezone,
            response_window_minutes=sched.response_window_minutes,
        )
    return MedicationRead(
        id=med.id,
        patient_id=med.patient_id,
        display_name=med.display_name,
        prescribed_instruction_text=med.prescribed_instruction_text,
        form=med.form,
        start_date=med.start_date,
        end_date=med.end_date,
        notes=med.notes,
        verification_status=med.verification_status,
        verified_at=med.verified_at,
        active=med.active,
        is_synthetic=med.is_synthetic,
        created_at=med.created_at,
        current_schedule=sched_read,
    )

@router.get("", response_model=list[MedicationRead])
def list_medications(
    active_only: bool = False,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    query = db.query(Medication).filter(Medication.patient_id == current_user.id)
    if active_only:
        query = query.filter(Medication.active == True)
    
    meds = query.order_by(Medication.created_at.desc()).all()
    results = []
    for med in meds:
        active_sched = (
            db.query(ScheduleVersion)
            .filter(
                ScheduleVersion.medication_id == med.id,
                ScheduleVersion.effective_to.is_(None),
            )
            .order_by(ScheduleVersion.effective_from.desc())
            .first()
        )
        results.append(map_medication_read(med, active_sched))
    return results

@router.post("", response_model=MedicationRead, status_code=status.HTTP_201_CREATED)
def create_medication(
    req: MedicationCreate,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    tz = profile.timezone if profile else "Asia/Kolkata"

    # Prescribed instruction text is stored strictly separate from reminder settings
    med = Medication(
        patient_id=current_user.id,
        display_name=req.display_name,
        prescribed_instruction_text=req.prescribed_instruction_text,
        form=req.form,
        start_date=req.start_date,
        end_date=req.end_date,
        notes=req.notes,
        verification_status="verified",  # Created and confirmed via UI review wizard
        verified_at=datetime.datetime.now(datetime.timezone.utc),
        active=True,
        is_synthetic=False,
    )
    db.add(med)
    db.flush()

    freq_rule = {"type": req.frequency_type}
    if req.frequency_type == "days_of_week" and req.frequency_days:
        freq_rule["days"] = req.frequency_days

    schedule = ScheduleVersion(
        medication_id=med.id,
        frequency_rule=freq_rule,
        dose_times=req.dose_times,
        effective_from=datetime.datetime.now(datetime.timezone.utc),
        timezone=tz,
        response_window_minutes=360,
        created_by_id=current_user.id,
    )
    db.add(schedule)
    db.commit()
    db.refresh(med)
    db.refresh(schedule)

    # Generate rolling horizon events
    generate_events_for_schedule(db, med, schedule, horizon_days=14)

    return map_medication_read(med, schedule)

@router.get("/{medication_id}", response_model=MedicationRead)
def get_medication(
    medication_id: str,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    med = (
        db.query(Medication)
        .filter(Medication.id == medication_id, Medication.patient_id == current_user.id)
        .first()
    )
    if not med:
        # IDOR prevention: return 404 for cross-tenant access
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")

    sched = (
        db.query(ScheduleVersion)
        .filter(ScheduleVersion.medication_id == med.id, ScheduleVersion.effective_to.is_(None))
        .order_by(ScheduleVersion.effective_from.desc())
        .first()
    )
    return map_medication_read(med, sched)

@router.patch("/{medication_id}", response_model=MedicationRead)
def update_medication(
    medication_id: str,
    req: MedicationUpdate,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    med = (
        db.query(Medication)
        .filter(Medication.id == medication_id, Medication.patient_id == current_user.id)
        .first()
    )
    if not med:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")

    if req.display_name is not None:
        med.display_name = req.display_name
    if req.prescribed_instruction_text is not None:
        med.prescribed_instruction_text = req.prescribed_instruction_text
    if req.form is not None:
        med.form = req.form
    if req.notes is not None:
        med.notes = req.notes
    if req.active is not None:
        med.active = req.active

    db.commit()
    db.refresh(med)

    sched = (
        db.query(ScheduleVersion)
        .filter(ScheduleVersion.medication_id == med.id, ScheduleVersion.effective_to.is_(None))
        .order_by(ScheduleVersion.effective_from.desc())
        .first()
    )
    return map_medication_read(med, sched)

@router.post("/{medication_id}/archive", response_model=MedicationRead)
def archive_medication(
    medication_id: str,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    med = (
        db.query(Medication)
        .filter(Medication.id == medication_id, Medication.patient_id == current_user.id)
        .first()
    )
    if not med:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")

    # Archiving preserves all historical dose events, but marks active=False so no new events generate
    med.active = False
    db.commit()
    db.refresh(med)

    sched = (
        db.query(ScheduleVersion)
        .filter(ScheduleVersion.medication_id == med.id)
        .order_by(ScheduleVersion.effective_from.desc())
        .first()
    )
    return map_medication_read(med, sched)


@router.get("/{medication_id}/schedules", response_model=list[ScheduleVersionRead])
def get_medication_schedules(
    medication_id: str,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    med = (
        db.query(Medication)
        .filter(Medication.id == medication_id, Medication.patient_id == current_user.id)
        .first()
    )
    if not med:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")

    schedules = (
        db.query(ScheduleVersion)
        .filter(ScheduleVersion.medication_id == med.id)
        .order_by(ScheduleVersion.effective_from.desc())
        .all()
    )
    return [
        ScheduleVersionRead(
            id=s.id,
            medication_id=s.medication_id,
            frequency_rule=s.frequency_rule,
            dose_times=s.dose_times,
            effective_from=s.effective_from,
            effective_to=s.effective_to,
            timezone=s.timezone,
            response_window_minutes=s.response_window_minutes,
        )
        for s in schedules
    ]


@router.post("/{medication_id}/schedules", response_model=MedicationRead)
def update_medication_schedule(
    medication_id: str,
    req: ScheduleVersionCreate,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    """
    Creates a new ScheduleVersion (clinical integrity rule: never overwrite past schedule).
    Marks previous schedule effective_to = now, creates new version, and generates future events.
    """
    med = (
        db.query(Medication)
        .filter(Medication.id == medication_id, Medication.patient_id == current_user.id)
        .first()
    )
    if not med:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")

    if not req.dose_times:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one dose time required")

    now = datetime.datetime.now(datetime.timezone.utc)

    # Close previous active schedule
    old_sched = (
        db.query(ScheduleVersion)
        .filter(ScheduleVersion.medication_id == med.id, ScheduleVersion.effective_to.is_(None))
        .first()
    )
    if old_sched:
        old_sched.effective_to = now

    freq_rule = {"type": req.frequency_type}
    if req.frequency_type == "days_of_week" and req.frequency_days:
        freq_rule["days"] = req.frequency_days

    tz = old_sched.timezone if old_sched else "Asia/Kolkata"
    new_schedule = ScheduleVersion(
        medication_id=med.id,
        frequency_rule=freq_rule,
        dose_times=req.dose_times,
        effective_from=now,
        timezone=tz,
        response_window_minutes=360,
        created_by_id=current_user.id,
    )
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)

    # Generate rolling horizon events for new schedule
    generate_events_for_schedule(db, med, new_schedule, horizon_days=14)

    return map_medication_read(med, new_schedule)


