from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.database import Base, engine, get_db
from backend.app.models.models import *  # Ensure all models are registered
from backend.app.modules import auth, profile, medications, dose_events, reminders, analytics, caregivers, shared
from backend.app.services.seed_synthetic import seed_synthetic_data
from backend.app.services.sweeper import sweep_unresolved_events

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema
    Base.metadata.create_all(bind=engine)
    
    # Auto-seed synthetic dataset for testing & demo
    db = next(get_db())
    try:
        seed_synthetic_data(db)
        sweep_unresolved_events(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Include routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(profile.router, prefix=settings.API_V1_STR)
app.include_router(medications.router, prefix=settings.API_V1_STR)
app.include_router(dose_events.router, prefix=settings.API_V1_STR)
app.include_router(reminders.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(caregivers.router, prefix=settings.API_V1_STR)
app.include_router(shared.router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": "demo",
        "database": "connected",
    }

@app.post("/api/v1/dev/sweep")
def trigger_unresolved_sweep(db: Session = Depends(get_db)):
    """Triggers the unresolved dose sweeper on-demand."""
    swept_count = sweep_unresolved_events(db)
    return {"status": "success", "unresolved_swept_count": swept_count}

@app.post("/api/v1/dev/seed")
def trigger_reseed(db: Session = Depends(get_db)):
    """Forces re-seeding of synthetic demo data."""
    seed_synthetic_data(db, force=True)
    sweep_unresolved_events(db)
    return {"status": "success", "message": "Synthetic demo dataset reseeded"}

@app.post("/api/v1/dev/clear-all")
def clear_all_data(db: Session = Depends(get_db)):
    """Wipes all demo/synthetic records for clean real-time clinical use."""
    db.query(DoseEventCorrection).delete()
    db.query(ReminderAttempt).delete()
    db.query(CaregiverNotification).delete()
    db.query(DoseEvent).delete()
    db.query(Insight).delete()
    db.query(ConsentGrant).delete()
    db.query(Invitation).delete()
    db.query(CareRelationship).delete()
    db.query(ScheduleVersion).delete()
    db.query(Medication).delete()
    db.commit()
    return {"status": "success", "message": "Demo data wiped. Real-time ledger is clean."}

# Serve frontend production bundle if built
import os
from fastapi.staticfiles import StaticFiles

if os.path.exists("web/dist"):
    app.mount("/", StaticFiles(directory="web/dist", html=True), name="web_dist")
