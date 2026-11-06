import datetime
from pydantic import BaseModel, Field

# Auth
class UserRegister(BaseModel):
    display_name: str
    email: str
    password: str
    role: str = "patient"  # patient or caregiver
    locale: str = "en"

class UserLogin(BaseModel):
    email: str
    password: str

class FirebaseLoginRequest(BaseModel):
    id_token: str
    role: str = "patient"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    display_name: str
    role: str

class UserRead(BaseModel):
    id: str
    display_name: str
    email: str | None
    role: str
    locale: str

# Profile
class PatientProfileUpdate(BaseModel):
    timezone: str | None = None
    reminder_preferences: dict | None = None
    accessibility_preferences: dict | None = None

class PatientProfileRead(BaseModel):
    id: str
    user_id: str
    timezone: str
    reminder_preferences: dict
    accessibility_preferences: dict

# Medication
class MedicationCreate(BaseModel):
    display_name: str
    prescribed_instruction_text: str
    form: str | None = "tablet"
    start_date: str
    end_date: str | None = None
    notes: str | None = None
    dose_times: list[str] = ["08:00"]
    frequency_type: str = "daily"
    frequency_days: list[str] | None = None

class MedicationUpdate(BaseModel):
    display_name: str | None = None
    prescribed_instruction_text: str | None = None
    form: str | None = None
    notes: str | None = None
    active: bool | None = None

class ScheduleVersionRead(BaseModel):
    id: str
    medication_id: str
    frequency_rule: dict
    dose_times: list[str]
    effective_from: datetime.datetime
    effective_to: datetime.datetime | None
    timezone: str
    response_window_minutes: int

class MedicationRead(BaseModel):
    id: str
    patient_id: str
    display_name: str
    prescribed_instruction_text: str
    form: str | None
    start_date: str
    end_date: str | None
    notes: str | None
    verification_status: str
    verified_at: datetime.datetime | None
    active: bool
    is_synthetic: bool
    created_at: datetime.datetime
    current_schedule: ScheduleVersionRead | None = None

# Dose Events
class DoseEventResponse(BaseModel):
    outcome: str = Field(..., description="taken or not_taken (snooze is a reminder action)")
    reason_code: str | None = None
    source: str = "patient_web"

class DoseEventSnoozeRequest(BaseModel):
    snooze_minutes: int = 15

class DoseEventCorrectionCreate(BaseModel):
    new_status: str
    reason: str

class DoseEventRead(BaseModel):
    id: str
    schedule_version_id: str
    medication_id: str
    medication_name: str | None = None
    patient_id: str
    scheduled_at: datetime.datetime
    status: str
    responded_at: datetime.datetime | None
    response_source: str | None
    reason_code: str | None
    is_late: bool
    idempotency_key: str
    sync_status: str
    is_synthetic: bool = False

class DoseEventSyncItem(BaseModel):
    id: str | None = None
    schedule_version_id: str
    medication_id: str
    scheduled_at: datetime.datetime
    status: str
    responded_at: datetime.datetime | None = None
    idempotency_key: str
    reason_code: str | None = None

class DoseEventBatchSyncRequest(BaseModel):
    events: list[DoseEventSyncItem]

# Analytics & Dashboard
class PeriodSummaryResponse(BaseModel):
    period: str
    start_date: str
    end_date: str
    S: int = Field(..., description="Total eligible scheduled doses in period")
    T: int = Field(..., description="Confirmed taken count")
    N: int = Field(..., description="Not taken (skipped) count")
    U: int = Field(..., description="Unresolved count")
    confirmed_pct: float | None = Field(None, description="T / S * 100 or null if S=0")
    not_taken_pct: float | None = Field(None, description="N / S * 100 or null if S=0")
    unresolved_pct: float | None = Field(None, description="U / S * 100 or null if S=0")
    outcome_coverage_pct: float | None = Field(None, description="(T + N) / S * 100 or null if S=0")
    sync_pending_count: int = 0
    small_sample_warning: bool = False

class MedicationSummaryResponse(BaseModel):
    medication_id: str
    display_name: str
    S: int
    T: int
    N: int
    U: int
    confirmed_pct: float | None

class InsightRead(BaseModel):
    id: str
    rule_id: str
    medication_id: str | None
    medication_name: str | None
    evidence_event_ids: list[str]
    date_range: dict
    generated_at: datetime.datetime
    dismissed: bool = False
    useful: bool | None = None
    description: str

class InsightFeedbackRequest(BaseModel):
    useful: bool

# Caregiver & Consent
class CaregiverInviteRequest(BaseModel):
    contact: str  # email or phone
    scopes: list[str] = [
        "medication_names",
        "schedule_summary",
        "dose_status_summary",
        "dose_history",
        "adherence_dashboard",
        "notifications",
    ]
    alert_preferences: dict = {
        "unresolved_summary": True,
        "skipped_event": True,
        "adherence_summary": False,
    }

class CaregiverInviteAcceptRequest(BaseModel):
    token: str

class ConsentGrantRead(BaseModel):
    id: str
    patient_id: str
    patient_name: str | None = None
    caregiver_id: str
    caregiver_name: str | None = None
    scopes: list[str]
    alert_preferences: dict
    granted_at: datetime.datetime
    revoked_at: datetime.datetime | None

class ConsentGrantUpdate(BaseModel):
    scopes: list[str] | None = None
    alert_preferences: dict | None = None

class CaregiverNotificationRead(BaseModel):
    id: str
    type: str
    created_at: datetime.datetime
    text: str

class AuditEventRead(BaseModel):
    id: str
    action: str
    resource_type: str
    resource_id: str
    timestamp: datetime.datetime
    outcome: str
