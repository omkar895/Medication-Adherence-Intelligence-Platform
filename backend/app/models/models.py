import datetime
import uuid
from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
    Index,
    JSON,
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    auth_subject = Column(String(255), unique=True, index=True, nullable=False)
    display_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(50), nullable=True)
    role = Column(String(50), nullable=False, default="patient")  # patient, caregiver, admin
    locale = Column(String(10), default="en")
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))

    patient_profile = relationship("PatientProfile", back_populates="user", uselist=False)
    medications = relationship("Medication", back_populates="patient", cascade="all, delete-orphan")
    dose_events = relationship("DoseEvent", back_populates="patient", foreign_keys="DoseEvent.patient_id")
    audit_events = relationship("AuditEvent", back_populates="actor")


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    timezone = Column(String(100), default="Asia/Kolkata", nullable=False)
    reminder_preferences = Column(
        JSON,
        default=lambda: {
            "quiet_hours_start": "22:00",
            "quiet_hours_end": "07:00",
            "snooze_interval_minutes": 15,
            "max_repeats": 3,
        },
    )
    accessibility_preferences = Column(
        JSON,
        default=lambda: {
            "text_size": "standard",  # standard, large, extra-large
            "high_contrast": False,
        },
    )

    user = relationship("User", back_populates="patient_profile")


class Medication(Base):
    __tablename__ = "medications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    patient_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    # Prescribed instruction text is stored strictly separate from reminder timing/preferences
    prescribed_instruction_text = Column(Text, nullable=False)
    form = Column(String(100), nullable=True)  # tablet, capsule, liquid, inhaler, etc.
    start_date = Column(String(50), nullable=False)
    end_date = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    verification_status = Column(String(50), default="pending", nullable=False)  # pending, verified
    verified_at = Column(DateTime(timezone=True), nullable=True)
    active = Column(Boolean, default=True, nullable=False)
    is_synthetic = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))

    patient = relationship("User", back_populates="medications")
    schedules = relationship("ScheduleVersion", back_populates="medication", cascade="all, delete-orphan")
    dose_events = relationship("DoseEvent", back_populates="medication", cascade="all, delete-orphan")


class ScheduleVersion(Base):
    __tablename__ = "schedule_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    medication_id = Column(String(36), ForeignKey("medications.id", ondelete="CASCADE"), nullable=False, index=True)
    # frequency_rule: {"type": "daily"} or {"type": "days_of_week", "days": ["mon", "wed", "fri"]}
    frequency_rule = Column(JSON, nullable=False)
    # dose_times: list of HH:MM strings, e.g. ["08:00", "20:00"]
    dose_times = Column(JSON, nullable=False)
    effective_from = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    effective_to = Column(DateTime(timezone=True), nullable=True)
    timezone = Column(String(100), default="Asia/Kolkata", nullable=False)
    response_window_minutes = Column(Integer, default=360, nullable=False)  # default 6h
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    medication = relationship("Medication", back_populates="schedules")
    dose_events = relationship("DoseEvent", back_populates="schedule_version")


class DoseEvent(Base):
    __tablename__ = "dose_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    schedule_version_id = Column(String(36), ForeignKey("schedule_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    medication_id = Column(String(36), ForeignKey("medications.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=False, index=True)
    # Status: scheduled, taken, not_taken, unresolved (snooze is an action on reminder, NOT an outcome)
    status = Column(String(50), default="scheduled", nullable=False, index=True)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    response_source = Column(String(100), nullable=True)  # patient_web, offline_sync, system_sweeper
    response_actor_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    reason_code = Column(String(255), nullable=True)  # patient-entered only
    is_late = Column(Boolean, default=False, nullable=False)
    idempotency_key = Column(String(255), nullable=False, index=True)
    sync_status = Column(String(50), default="synced", nullable=False)  # synced, pending

    __table_args__ = (
        UniqueConstraint("schedule_version_id", "scheduled_at", name="uq_schedule_occurrence"),
        UniqueConstraint("patient_id", "idempotency_key", name="uq_patient_idempotency"),
        Index("idx_patient_scheduled", "patient_id", "scheduled_at"),
    )

    medication = relationship("Medication", back_populates="dose_events")
    schedule_version = relationship("ScheduleVersion", back_populates="dose_events")
    patient = relationship("User", foreign_keys=[patient_id])
    corrections = relationship("DoseEventCorrection", back_populates="dose_event", cascade="all, delete-orphan")
    reminders = relationship("ReminderAttempt", back_populates="dose_event", cascade="all, delete-orphan")


class DoseEventCorrection(Base):
    __tablename__ = "dose_event_corrections"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    dose_event_id = Column(String(36), ForeignKey("dose_events.id", ondelete="CASCADE"), nullable=False, index=True)
    previous_status = Column(String(50), nullable=False)
    new_status = Column(String(50), nullable=False)
    reason = Column(Text, nullable=False)
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    dose_event = relationship("DoseEvent", back_populates="corrections")


class ReminderAttempt(Base):
    __tablename__ = "reminder_attempts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    dose_event_id = Column(String(36), ForeignKey("dose_events.id", ondelete="CASCADE"), nullable=False, index=True)
    attempted_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    channel = Column(String(50), default="in_app_simulation", nullable=False)
    delivery_status = Column(String(50), default="attempted", nullable=False)  # attempted, delivered, failed, unknown
    snooze_until = Column(DateTime(timezone=True), nullable=True)
    provider_reference = Column(String(255), nullable=True)

    dose_event = relationship("DoseEvent", back_populates="reminders")


class CareRelationship(Base):
    __tablename__ = "care_relationships"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    patient_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    caregiver_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    invitee_contact_hash = Column(String(255), nullable=False)
    status = Column(String(50), default="pending", nullable=False)  # pending, accepted, expired, revoked
    invited_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    relationship_id = Column(String(36), ForeignKey("care_relationships.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(255), unique=True, index=True, nullable=False)
    raw_token = Column(String(255), nullable=False)  # preserved for demo retrieval
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)


class ConsentGrant(Base):
    __tablename__ = "consent_grants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    patient_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    caregiver_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # Allowed scopes: medication_names, schedule_summary, dose_status_summary, dose_history, adherence_dashboard, notifications
    scopes = Column(JSON, nullable=False)
    alert_preferences = Column(
        JSON,
        default=lambda: {
            "unresolved_summary": True,
            "skipped_event": True,
            "adherence_summary": False,
        },
    )
    granted_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_active_consent", "patient_id", "caregiver_id", "revoked_at"),
    )


class CaregiverNotification(Base):
    __tablename__ = "caregiver_notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    consent_grant_id = Column(String(36), ForeignKey("consent_grants.id", ondelete="CASCADE"), nullable=False, index=True)
    dose_event_id = Column(String(36), ForeignKey("dose_events.id", ondelete="SET NULL"), nullable=True)
    type = Column(String(50), nullable=False)  # unresolved_summary, skipped_event, adherence_summary
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    delivery_status = Column(String(50), default="delivered", nullable=False)
    text = Column(Text, nullable=False)  # neutral copy only!


class Insight(Base):
    __tablename__ = "insights"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    patient_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_id = Column(String(50), default="R1", nullable=False)
    medication_id = Column(String(36), ForeignKey("medications.id", ondelete="CASCADE"), nullable=True)
    evidence_event_ids = Column(JSON, nullable=False)  # list of dose event IDs
    date_range = Column(JSON, nullable=False)  # {"start": "...", "end": "..."}
    generated_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    dismissed_at = Column(DateTime(timezone=True), nullable=True)
    useful = Column(Boolean, nullable=True)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False)  # grant_consent, revoke_consent, view_shared, etc.
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(255), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    outcome = Column(String(50), nullable=False)  # success, denied, failure

    actor = relationship("User", back_populates="audit_events")
