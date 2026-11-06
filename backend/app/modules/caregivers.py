import datetime
import uuid
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.permissions import get_current_user, require_patient, require_caregiver
from backend.app.core.security import hash_token
from backend.app.models.models import (
    User,
    CareRelationship,
    Invitation,
    ConsentGrant,
    CaregiverNotification,
    AuditEvent,
)
from backend.app.schemas.schemas import (
    CaregiverInviteRequest,
    CaregiverInviteAcceptRequest,
    ConsentGrantRead,
    ConsentGrantUpdate,
    CaregiverNotificationRead,
)

router = APIRouter(tags=["caregivers-and-consent"])

@router.post("/caregivers/invitations")
def create_caregiver_invitation(
    req: CaregiverInviteRequest,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    now = datetime.datetime.now(datetime.timezone.utc)
    # Generate clean, user-friendly 6-character code e.g. CARE-4921
    short_suffix = uuid.uuid4().hex[:6].upper()
    raw_token = f"CARE-{short_suffix}"
    token_hash = hash_token(raw_token)
    contact_hash = hash_token(req.contact.strip())

    # Create care relationship in pending status
    rel = CareRelationship(
        patient_id=current_user.id,
        caregiver_id=None,
        invitee_contact_hash=contact_hash,
        status="pending",
        invited_at=now,
    )
    db.add(rel)
    db.flush()

    invitation = Invitation(
        relationship_id=rel.id,
        token_hash=token_hash,
        raw_token=raw_token,
        expires_at=now + datetime.timedelta(days=7),
    )
    db.add(invitation)
    db.flush()

    audit = AuditEvent(
        actor_id=current_user.id,
        action="create_caregiver_invitation",
        resource_type="invitation",
        resource_id=invitation.id,
        timestamp=now,
        outcome="success",
    )
    db.add(audit)
    db.commit()

    # Pre-generate helpful WhatsApp and Mailto share links
    contact_str = req.contact.strip()
    digits_only = "".join(ch for ch in contact_str if ch.isdigit())
    
    share_msg = f"Hello! {current_user.display_name} has invited you as an authorized caregiver on MAIP. Please connect using Invitation Code: {raw_token} at http://localhost:8000"
    encoded_msg = urllib.parse.quote(share_msg)

    whatsapp_link = None
    if digits_only and len(digits_only) >= 10:
        whatsapp_link = f"https://wa.me/{digits_only}?text={encoded_msg}"
    else:
        whatsapp_link = f"https://wa.me/?text={encoded_msg}"

    mailto_link = None
    if "@" in contact_str:
        mailto_link = f"mailto:{contact_str}?subject=Caregiver%20Access%20Invitation&body={encoded_msg}"

    return {
        "invitation_id": invitation.id,
        "invite_token": raw_token,
        "expires_at": invitation.expires_at.isoformat(),
        "scopes": req.scopes,
        "contact": req.contact,
        "whatsapp_link": whatsapp_link,
        "mailto_link": mailto_link,
        "share_message": share_msg,
        "status": "pending",
    }

@router.post("/caregivers/invitations/accept")
def accept_caregiver_invitation(
    req: CaregiverInviteAcceptRequest,
    current_user: User = Depends(require_caregiver),
    db: Session = Depends(get_db),
):
    now = datetime.datetime.now(datetime.timezone.utc)
    token_hash = hash_token(req.token.strip())

    invitation = (
        db.query(Invitation)
        .filter(Invitation.token_hash == token_hash)
        .first()
    )
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invitation code",
        )
    if invitation.used_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation has already been used",
        )
    exp_at = invitation.expires_at
    if exp_at.tzinfo is None:
        exp_at = exp_at.replace(tzinfo=datetime.timezone.utc)
    if exp_at < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation has expired",
        )

    rel = db.query(CareRelationship).filter(CareRelationship.id == invitation.relationship_id).first()
    if not rel or rel.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Relationship is no longer in pending status",
        )

    rel.caregiver_id = current_user.id
    rel.status = "accepted"
    rel.accepted_at = now
    invitation.used_at = now

    # Create active ConsentGrant with default scopes
    grant = ConsentGrant(
        patient_id=rel.patient_id,
        caregiver_id=current_user.id,
        scopes=[
            "medication_names",
            "schedule_summary",
            "dose_status_summary",
            "dose_history",
            "adherence_dashboard",
            "notifications",
        ],
        alert_preferences={
            "unresolved_summary": True,
            "skipped_event": True,
            "adherence_summary": False,
        },
        granted_at=now,
        updated_at=now,
        revoked_at=None,
    )
    db.add(grant)
    db.flush()

    audit = AuditEvent(
        actor_id=current_user.id,
        action="accept_caregiver_invitation",
        resource_type="consent_grant",
        resource_id=grant.id,
        timestamp=now,
        outcome="success",
    )
    db.add(audit)
    db.commit()

    return {
        "message": "Caregiver relationship and consent grant successfully activated",
        "patient_id": rel.patient_id,
        "consent_grant_id": grant.id,
        "scopes": grant.scopes,
    }

@router.get("/caregivers")
def list_caregivers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns active and pending caregivers for patient, or active patient assignments for caregiver.
    """
    if current_user.role == "patient":
        grants = (
            db.query(ConsentGrant, User)
            .join(User, ConsentGrant.caregiver_id == User.id)
            .filter(ConsentGrant.patient_id == current_user.id)
            .all()
        )
        active_list = []
        for g, cg in grants:
            active_list.append({
                "consent_id": g.id,
                "caregiver_id": cg.id,
                "caregiver_name": cg.display_name,
                "caregiver_email": cg.email,
                "scopes": g.scopes,
                "alert_preferences": g.alert_preferences,
                "is_revoked": g.revoked_at is not None,
                "granted_at": g.granted_at.isoformat(),
            })

        pending_invitations = (
            db.query(Invitation, CareRelationship)
            .join(CareRelationship, Invitation.relationship_id == CareRelationship.id)
            .filter(CareRelationship.patient_id == current_user.id, Invitation.used_at.is_(None))
            .all()
        )
        pending_list = []
        for inv, rel in pending_invitations:
            pending_list.append({
                "invitation_id": inv.id,
                "raw_token": inv.raw_token,
                "expires_at": inv.expires_at.isoformat(),
                "invited_at": rel.invited_at.isoformat(),
            })

        return {"active_caregivers": active_list, "pending_invitations": pending_list}

    else:
        # Caregiver view: list granted patients
        grants = (
            db.query(ConsentGrant, User)
            .join(User, ConsentGrant.patient_id == User.id)
            .filter(ConsentGrant.caregiver_id == current_user.id, ConsentGrant.revoked_at.is_(None))
            .all()
        )
        shared_patients = []
        for g, pt in grants:
            shared_patients.append({
                "patient_id": pt.id,
                "patient_name": pt.display_name,
                "scopes": g.scopes,
                "granted_at": g.granted_at.isoformat(),
            })
        return {"shared_patients": shared_patients}

@router.get("/consent", response_model=list[ConsentGrantRead])
def list_consent_grants(
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    grants = (
        db.query(ConsentGrant, User)
        .join(User, ConsentGrant.caregiver_id == User.id)
        .filter(ConsentGrant.patient_id == current_user.id)
        .all()
    )
    results = []
    for g, cg in grants:
        results.append(
            ConsentGrantRead(
                id=g.id,
                patient_id=g.patient_id,
                patient_name=current_user.display_name,
                caregiver_id=g.caregiver_id,
                caregiver_name=cg.display_name,
                scopes=g.scopes or [],
                alert_preferences=g.alert_preferences or {},
                granted_at=g.granted_at,
                revoked_at=g.revoked_at,
            )
        )
    return results

@router.put("/consent/{consent_id}", response_model=ConsentGrantRead)
def update_consent_grant(
    consent_id: str,
    req: ConsentGrantUpdate,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    grant = (
        db.query(ConsentGrant)
        .filter(ConsentGrant.id == consent_id, ConsentGrant.patient_id == current_user.id)
        .first()
    )
    if not grant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consent grant not found")
    if grant.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot modify a revoked consent grant")

    now = datetime.datetime.now(datetime.timezone.utc)
    if req.scopes is not None:
        grant.scopes = req.scopes
    if req.alert_preferences is not None:
        grant.alert_preferences = req.alert_preferences
    grant.updated_at = now

    audit = AuditEvent(
        actor_id=current_user.id,
        action="update_consent_scopes",
        resource_type="consent_grant",
        resource_id=grant.id,
        timestamp=now,
        outcome="success",
    )
    db.add(audit)
    db.commit()
    db.refresh(grant)

    cg = db.query(User).filter(User.id == grant.caregiver_id).first()
    return ConsentGrantRead(
        id=grant.id,
        patient_id=grant.patient_id,
        patient_name=current_user.display_name,
        caregiver_id=grant.caregiver_id,
        caregiver_name=cg.display_name if cg else "Caregiver",
        scopes=grant.scopes or [],
        alert_preferences=grant.alert_preferences or {},
        granted_at=grant.granted_at,
        revoked_at=grant.revoked_at,
    )


@router.delete("/consent/{consent_id}")
def delete_consent_and_remove_caregiver(
    consent_id: str,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    grant = (
        db.query(ConsentGrant)
        .filter(ConsentGrant.id == consent_id, ConsentGrant.patient_id == current_user.id)
        .first()
    )
    if not grant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consent grant not found")

    # Sever care relationship
    db.query(CareRelationship).filter(
        CareRelationship.patient_id == grant.patient_id,
        CareRelationship.caregiver_id == grant.caregiver_id,
    ).delete(synchronize_session=False)

    db.delete(grant)
    db.commit()
    return {"status": "success", "message": "Caregiver disconnected and removed completely."}


@router.post("/consent/{consent_id}/revoke", response_model=ConsentGrantRead)
def revoke_consent(
    consent_id: str,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    """
    Server-side immediate revocation.
    Next caregiver request will be rejected immediately with 403.
    """
    grant = (
        db.query(ConsentGrant)
        .filter(ConsentGrant.id == consent_id, ConsentGrant.patient_id == current_user.id)
        .first()
    )
    if not grant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consent grant not found")

    now = datetime.datetime.now(datetime.timezone.utc)
    grant.revoked_at = now

    # Also update relationship status
    rel = (
        db.query(CareRelationship)
        .filter(
            CareRelationship.patient_id == grant.patient_id,
            CareRelationship.caregiver_id == grant.caregiver_id,
        )
        .first()
    )
    if rel:
        rel.status = "revoked"

    audit = AuditEvent(
        actor_id=current_user.id,
        action="revoke_consent",
        resource_type="consent_grant",
        resource_id=grant.id,
        timestamp=now,
        outcome="success",
    )
    db.add(audit)
    db.commit()
    db.refresh(grant)

    cg = db.query(User).filter(User.id == grant.caregiver_id).first()
    return ConsentGrantRead(
        id=grant.id,
        patient_id=grant.patient_id,
        patient_name=current_user.display_name,
        caregiver_id=grant.caregiver_id,
        caregiver_name=cg.display_name if cg else "Caregiver",
        scopes=grant.scopes or [],
        alert_preferences=grant.alert_preferences or {},
        granted_at=grant.granted_at,
        revoked_at=grant.revoked_at,
    )


@router.delete("/invitations/{invitation_id}")
@router.delete("/caregivers/invitations/{invitation_id}")
def cancel_pending_invitation(
    invitation_id: str,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    """
    Allows a patient to cancel a pending invitation code.
    """
    inv = db.query(Invitation).filter(Invitation.id == invitation_id).first()
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")
    rel = db.query(CareRelationship).filter(CareRelationship.id == inv.relationship_id).first()
    if not rel or rel.patient_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to cancel this invitation")

    db.delete(inv)
    db.delete(rel)
    db.commit()
    return {"status": "success", "message": "Pending invitation cancelled successfully."}


@router.delete("/caregiver/patients/{patient_id}")
def caregiver_disconnect_patient(
    patient_id: str,
    current_user: User = Depends(require_caregiver),
    db: Session = Depends(get_db),
):
    """
    Allows a caregiver to cleanly disconnect from a patient relationship.
    Revokes the consent grant and removes the relationship.
    """
    grants = (
        db.query(ConsentGrant)
        .filter(ConsentGrant.patient_id == patient_id, ConsentGrant.caregiver_id == current_user.id)
        .all()
    )
    now = datetime.datetime.now(datetime.timezone.utc)
    for g in grants:
        g.revoked_at = now

    rel = (
        db.query(CareRelationship)
        .filter(CareRelationship.patient_id == patient_id, CareRelationship.caregiver_id == current_user.id)
        .first()
    )
    if rel:
        db.delete(rel)

    db.commit()
    return {"status": "success", "message": "Successfully disconnected from patient."}


@router.get("/caregiver-notifications", response_model=list[CaregiverNotificationRead])
def list_caregiver_notifications(
    current_user: User = Depends(require_caregiver),
    db: Session = Depends(get_db),
):
    # Retrieve notifications linked to active grants for this caregiver
    notifs = (
        db.query(CaregiverNotification)
        .join(ConsentGrant, CaregiverNotification.consent_grant_id == ConsentGrant.id)
        .filter(
            ConsentGrant.caregiver_id == current_user.id,
            ConsentGrant.revoked_at.is_(None),
        )
        .order_by(CaregiverNotification.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        CaregiverNotificationRead(
            id=n.id,
            type=n.type,
            created_at=n.created_at,
            text=n.text,
        )
        for n in notifs
    ]

