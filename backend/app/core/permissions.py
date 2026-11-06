from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import datetime
from backend.app.core.database import get_db
from backend.app.core.security import decode_access_token
from backend.app.models.models import User, ConsentGrant

security_bearer = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalid or expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload["sub"]
    if payload.get("firebase"):
        email = payload.get("email")
        user = (
            db.query(User)
            .filter((User.auth_subject == f"firebase:{user_id}") | (User.email == email))
            .first()
        )
        if not user:
            # Auto-provision new Firebase user
            display_name = payload.get("name") or (email.split("@")[0] if email else "Patient User")
            user = User(
                auth_subject=f"firebase:{user_id}",
                display_name=display_name,
                email=email,
                role="patient",
                locale="en",
                password_hash="FIREBASE_MANAGED_AUTH",
            )
            db.add(user)
            db.flush()
            profile = PatientProfile(user_id=user.id)
            db.add(profile)
            db.commit()
            db.refresh(user)
    else:
        user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def require_patient(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can perform this action",
        )
    return current_user

def require_caregiver(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "caregiver":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only caregivers can perform this action",
        )
    return current_user

def check_caregiver_consent(
    patient_id: str,
    required_scope: str,
    current_user: User,
    db: Session,
) -> ConsentGrant:
    """
    Every caregiver request checks the database for an active, un-revoked consent grant.
    Revocation therefore takes effect immediately on the next request.
    """
    grant = (
        db.query(ConsentGrant)
        .filter(
            ConsentGrant.patient_id == patient_id,
            ConsentGrant.caregiver_id == current_user.id,
            ConsentGrant.revoked_at.is_(None),
        )
        .first()
    )
    if not grant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access ended or not granted by patient",
        )
    
    scopes = grant.scopes or []
    if required_scope not in scopes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Scope '{required_scope}' is not granted under active consent",
        )
    
    return grant

