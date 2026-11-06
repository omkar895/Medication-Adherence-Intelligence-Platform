# 06 — Architecture

## Stack options
| | **A — As in PRD** | **B — Hackathon-pragmatic (recommended)** |
|---|---|---|
| Patient client | Flutter (Android) | React + TypeScript + Vite **PWA**, mobile-first |
| Caregiver client | React web | Same React codebase, role-based routes |
| Backend | FastAPI | FastAPI (modular monolith) |
| DB | PostgreSQL | PostgreSQL |
| Offline | SQLite/Isar queue | IndexedDB queue + service worker |
| Reminders | Native scheduled notifications (reliable) | In-app + **reminder simulation** (web background notifications are NOT reliable, esp. iOS / battery-restricted Android) |
| Codebases | 3 | 2 |
| Pros | Best real reminder reliability; matches PRD | Fastest to a complete, demoable loop; one UI system |
| Cons | 3 stacks to ship, slower for hackathon | Real background reminders not guaranteed; must be disclosed |
**Recommendation: B for the hackathon**, with the reminder subsystem behind an interface so a Flutter/native client can replace the PWA for any pilot. *Flagged for human approval (decisions D-002).* Do not claim dependable background reminders in the demo.

## Modules (backend/app/modules)
auth · users · medications · schedules · dose_events · reminders · analytics · caregivers · consent · notifications · audit. (reports later.)
```
backend/app/{main.py, core/{config,security,permissions}.py, modules/*, database/, tests/}
backend/migrations/  (Alembic)
web/src/{components,pages,layouts,features,services,hooks,types,utils}
```

## Auth
Managed auth recommended (avoid hand-rolled credential code). Options: Supabase Auth / Auth0 / Clerk **[open: D-005]**. Backend verifies JWT, maps `auth_subject`→users row. Caregiver scope is **never** read from the token; every caregiver request does a DB lookup for an active, un-revoked consent grant covering the requested resource. Revocation therefore takes effect on the next request. Short access-token TTL (≤15 min).

## Data model (PostgreSQL)
UUID PKs; timestamps `timestamptz` UTC.
| Table | Key columns / constraints |
|---|---|
| users | id, auth_subject UNIQUE, display_name, email NULL, phone NULL, role enum(patient,caregiver,admin), locale |
| patient_profiles | id, user_id FK UNIQUE, timezone (IANA), reminder_preferences jsonb, accessibility_preferences jsonb |
| medications | id, patient_id FK, display_name, prescribed_instruction_text, form NULL, start_date, end_date NULL, notes NULL, verification_status enum(pending,verified), verified_at NULL, active bool, is_synthetic bool |
| schedule_versions | id, medication_id FK, frequency_rule jsonb, dose_times jsonb, effective_from, effective_to NULL, timezone, response_window_minutes, created_by FK; **EXCLUDE overlapping ranges per medication** |
| dose_events | id, schedule_version_id FK, medication_id FK, patient_id FK, scheduled_at, status enum(scheduled,taken,not_taken,unresolved), responded_at NULL, response_source, response_actor_id NULL, reason_code NULL, is_late bool, idempotency_key, sync_status; **UNIQUE(schedule_version_id, scheduled_at)**; **UNIQUE(patient_id, idempotency_key)**; INDEX(patient_id, scheduled_at) |
| dose_event_corrections | id, dose_event_id FK, previous_status, new_status, reason, actor_id, created_at (append-only) |
| reminder_attempts | id, dose_event_id FK, attempted_at, channel, delivery_status enum(attempted,delivered,failed,unknown), snooze_until NULL, provider_reference NULL |
| care_relationships | id, patient_id, caregiver_id NULL, invitee_contact_hash, status enum(pending,accepted,expired,revoked), invited_at, accepted_at NULL |
| invitations | id, relationship_id FK, token_hash, expires_at, used_at NULL |
| consent_grants | id, patient_id, caregiver_id, scopes jsonb, alert_preferences jsonb, granted_at, updated_at, revoked_at NULL |
| caregiver_notifications | id, consent_grant_id, dose_event_id NULL, type, created_at, delivery_status, text |
| insights | id, patient_id, rule_id, medication_id NULL, evidence_event_ids jsonb, date_range jsonb, generated_at, dismissed_at NULL, useful bool NULL |
| audit_events | id, actor_id, action, resource_type, resource_id, timestamp, outcome (append-only) |
Scopes: `medication_names`, `schedule_summary`, `dose_status_summary`, `dose_history`, `adherence_dashboard`, `notifications`.
Seeds: synthetic demo patient + 3 meds (morning, evening, custom) + ~6 weeks of events incl. taken / not_taken / unresolved / snoozed; all flagged `is_synthetic`.
Authorization at data layer: all repository functions take an explicit `AuthContext`; optional Postgres RLS **[proposed hardening]**.

## Background jobs (APScheduler or a worker container)
1. Event generator: rolling 14-day horizon per active schedule version (idempotent via UNIQUE constraint).
2. Unresolved sweeper: marks scheduled events past response window as `unresolved`.
3. Reminder dispatcher: simulation/in-app attempts; honours quiet hours, max repeats.
4. Caregiver notifier: evaluates enabled rules after a response/sweep; rate-limited.
5. Insight generator: runs R1 on demand + nightly.

## API (/api/v1) — summary
Auth: register, login, logout, refresh, forgot-password (or provider-delegated).
Profile: GET/PUT /profile, /profile/preferences.
Medications: GET/POST /medications; GET/PATCH /medications/{id}; POST /{id}/archive.
Schedules: GET/POST /medications/{id}/schedules; GET /schedules/{id}.
Dose events: GET /dose-events (paginated, filters); GET /dose-events/today; GET /dose-events/{id}; POST /{id}/response (header `Idempotency-Key`); POST /{id}/correction; POST /sync/dose-events (batch).
Reminders: POST /dev/simulate-reminder (demo only); POST /dose-events/{id}/snooze.
Analytics: GET /analytics/summary|trends|medications|insights; POST /analytics/insights/{id}/dismiss|feedback.
Caregivers/consent: POST /caregivers/invitations; GET /caregivers; POST /caregivers/invitations/{id}/accept; GET /consent; PUT /consent/{id}; POST /consent/{id}/revoke.
Caregiver read API (separate router `/api/v1/shared/patients/{patient_id}/…`): medications, schedule-summary, dose-events, dashboard, notifications — each checks active consent + specific scope.
Errors: RFC 7807-style problem JSON; no stack traces; 404 vs 403 policy: cross-tenant access returns 404.
Rate limits: auth, invitations, dose response, shared reads.

## Analytics definitions
S = eligible scheduled events in period (excludes cancelled/superseded, includes unresolved); T, N, U as v2.0. Return `{period, S, T, N, U, pct fields or null when S=0, sync_pending_count}`.

## Security
Input validation (Pydantic); CORS allow-list; secure headers; HTTPS only; secrets via env; dependency audit in CI; audit log append-only; no health data in logs; invitation tokens hashed; account deletion workflow.

## Hosting / env
Docker Compose for local; staging on a managed host with managed Postgres (**check free-tier limits and backup availability before relying on them; production needs backups + tested restore**). Env vars: `DATABASE_URL`, `AUTH_ISSUER`, `AUTH_AUDIENCE`, `AUTH_JWKS_URL`, `APP_ENV`, `CORS_ORIGINS`, `SECRET_KEY`, `INVITE_TTL_HOURS`, `SIMULATION_ENABLED`, `SENTRY_DSN` (optional).

## Testing
Pytest (unit + integration with real Postgres), Vitest, Playwright e2e (incl. offline + revoke), axe accessibility checks, load smoke (k6 or locust) for NFR-03.

## Risks
Web reminder unreliability; DST edge cases; consent leakage via aggregates (apply scope checks in analytics queries); offline conflict semantics; auth provider free-tier limits.
