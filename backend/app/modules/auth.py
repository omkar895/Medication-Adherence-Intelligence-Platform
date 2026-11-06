from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import verify_password, get_password_hash, create_access_token
from backend.app.core.permissions import get_current_user
from backend.app.models.models import User, PatientProfile
from backend.app.schemas.schemas import UserRegister, UserLogin, TokenResponse, UserRead, FirebaseLoginRequest
from backend.app.core.security import decode_firebase_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=TokenResponse)
def register(req: UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists - generic message to avoid enumeration
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration could not be completed. Please check your credentials or try logging in.",
        )
    
    user = User(
        auth_subject=req.email,
        display_name=req.display_name,
        email=req.email,
        role=req.role,
        locale=req.locale,
        password_hash=get_password_hash(req.password),
    )
    db.add(user)
    db.flush()

    if req.role == "patient":
        profile = PatientProfile(
            user_id=user.id,
            timezone="Asia/Kolkata",
            reminder_preferences={
                "quiet_hours_start": "22:00",
                "quiet_hours_end": "07:00",
                "snooze_interval_minutes": 15,
                "max_repeats": 3,
            },
            accessibility_preferences={
                "text_size": "standard",
                "high_contrast": False,
            },
        )
        db.add(profile)

    db.commit()

    token = create_access_token(subject=user.id, role=user.role)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        display_name=user.display_name,
        role=user.role,
    )

@router.post("/login", response_model=TokenResponse)
def login(req: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    # Generic error for invalid credentials
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    token = create_access_token(subject=user.id, role=user.role)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        display_name=user.display_name,
        role=user.role,
    )

@router.post("/firebase-login", response_model=TokenResponse)
def firebase_login(req: FirebaseLoginRequest, db: Session = Depends(get_db)):
    payload = decode_firebase_token(req.id_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Firebase ID token",
        )

    uid = payload.get("sub")
    email = payload.get("email")
    name = payload.get("name") or (email.split("@")[0] if email else "Firebase User")

    user = (
        db.query(User)
        .filter((User.auth_subject == f"firebase:{uid}") | (User.email == email))
        .first()
    )

    if not user:
        user = User(
            auth_subject=f"firebase:{uid}",
            display_name=name,
            email=email,
            role=req.role,
            locale="en",
            password_hash="FIREBASE_MANAGED_AUTH",
        )
        db.add(user)
        db.flush()

        if user.role == "patient":
            profile = PatientProfile(
                user_id=user.id,
                timezone="Asia/Kolkata",
                reminder_preferences={
                    "quiet_hours_start": "22:00",
                    "quiet_hours_end": "07:00",
                    "snooze_interval_minutes": 15,
                    "max_repeats": 3,
                },
                accessibility_preferences={
                    "text_size": "standard",
                    "high_contrast": False,
                },
            )
            db.add(profile)
        db.commit()
        db.refresh(user)

    token = create_access_token(subject=user.id, role=user.role)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        display_name=user.display_name,
        role=user.role,
    )

@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return UserRead(
        id=current_user.id,
        display_name=current_user.display_name,
        email=current_user.email,
        role=current_user.role,
        locale=current_user.locale,
    )

