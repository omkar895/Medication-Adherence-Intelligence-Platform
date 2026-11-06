from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.permissions import get_current_user
from backend.app.models.models import User, PatientProfile, AuditEvent
from backend.app.schemas.schemas import PatientProfileRead, PatientProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])

@router.get("", response_model=PatientProfileRead)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        profile = PatientProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return PatientProfileRead(
        id=profile.id,
        user_id=profile.user_id,
        timezone=profile.timezone,
        reminder_preferences=profile.reminder_preferences or {},
        accessibility_preferences=profile.accessibility_preferences or {},
    )

@router.put("", response_model=PatientProfileRead)
def update_profile(
    req: PatientProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        profile = PatientProfile(user_id=current_user.id)
        db.add(profile)

    if req.timezone is not None:
        # Note: Timezone change NEVER rewrites historical events
        profile.timezone = req.timezone
    if req.reminder_preferences is not None:
        profile.reminder_preferences = req.reminder_preferences
    if req.accessibility_preferences is not None:
        profile.accessibility_preferences = req.accessibility_preferences

    db.commit()
    db.refresh(profile)
    return PatientProfileRead(
        id=profile.id,
        user_id=profile.user_id,
        timezone=profile.timezone,
        reminder_preferences=profile.reminder_preferences or {},
        accessibility_preferences=profile.accessibility_preferences or {},
    )

@router.post("/delete-request")
def request_account_deletion(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Log deletion request audit event
    audit = AuditEvent(
        actor_id=current_user.id,
        action="request_account_deletion",
        resource_type="user",
        resource_id=current_user.id,
        outcome="success",
    )
    db.add(audit)
    db.commit()
    return {"message": "Account deletion request received and scheduled for processing."}

