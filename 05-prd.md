# 05 — PRD (condensed, build-facing)

Source of truth for intent: PRD v1.0 (PS-05) and v2.0. This file is the numbered, testable version. Items labelled **[PROPOSED]** are implementation decisions awaiting review.

## 1. Goals
1. Accurate medication records from verified prescription text.
2. Reliable reminders and one-tap outcomes.
3. Transparent history and metrics with visible denominators.
4. Deterministic, evidence-backed insights.
5. Patient-controlled, revocable caregiver sharing.
6. Offline logging with safe sync.

## 2. Non-goals
Diagnose; prescribe; recommend dose/frequency changes; advise on missed doses; infer intake from passive data; contact emergency services; clinician portal; generative-AI recommendations; predictive scoring; claim clinical outcomes.

## 3. Roles
Patient · Caregiver (scoped, consented) · Platform admin (no routine health-content access) · Clinician (future, read-only reports; not in MVP).

## 4. User stories
- As a patient I add a medication from my prescription and confirm the schedule so reminders match what I was prescribed.
- As a patient I tap Taken/Skipped/Snooze so my record is accurate.
- As a patient I see counts with their denominators so I understand my history.
- As a patient I choose exactly what a caregiver sees and can revoke at any time.
- As a caregiver I see only what was shared with me.
- As a patient with poor connectivity I can still log a dose.

## 5. Functional requirements (IDs match v2.0)

### P0
| ID | Requirement (testable) |
|---|---|
| FR-01 | Register/login/logout/forgot-password for patient and caregiver roles; protected routes reject unauthenticated access; expired sessions force re-login; auth errors don't reveal account existence. |
| FR-02 | Profile: name, language, IANA timezone, text size, reminder prefs (quiet hours, snooze interval, max repeats); account-deletion request. Timezone change never rewrites past events. |
| FR-03 | Medication CRUD: name, prescribed instruction text (separate from reminder prefs), form, start/end date, notes, verification status, active/archived. Archive preserves history; archived meds generate no new events. |
| FR-04 | Schedule versions: once daily, multiple daily, selected weekdays, custom recurrence; effective_from; review → confirm activates; every edit creates a new version; past events keep their version reference; schedule never inferred from the medication name. DST policy defined **[PROPOSED]**: local wall-clock time; non-existent local time → next valid minute; repeated hour → first occurrence. |
| FR-05 | Reminders: in-app + simulation (MVP); permission/diagnostic status shown; quiet hours, snooze, max-repeat respected; each attempt stored separately from the dose outcome; failure never changes outcome. |
| FR-06 | Dose events: one canonical record per scheduled occurrence; responses Taken / Skipped(Not taken) / Snooze (reminder action only); Unresolved set by system after response window cutoff; stores timestamps, actor, source, schedule version; late flag; duplicate/idempotent; corrections keep audit trail. |
| FR-07 | History: Today / Yesterday / 7d / 30d / custom; filter by medication & status; event detail traces to schedule version; pagination; empty states. |
| FR-08 | Dashboard: today overview; period summary; T/N/U counts; metrics: Confirmed = T/S, Not-taken = N/S, Unresolved = U/S, Outcome coverage = (T+N)/S; always show period, numerator, denominator; S=0 → no percentage; small-sample label; data-gap/sync disclosure; daily + weekly + per-medication views. |
| FR-10 | Caregiver invite: contact, granular scopes, summary, pending/accepted/expired/revoked states; caregiver must authenticate and accept; invitation single-use, expiring **[PROPOSED 7 days]**. |
| FR-11 | Caregiver dashboard shows only data within active scopes; read-only; denied on any unshared resource. |
| FR-12 | Caregiver notifications: off by default; only enabled types (unresolved summary, skipped event, adherence summary); rate-limited; neutral text; failures logged; stop on revoke. |
| FR-13 | Consent: view/edit scopes, alert prefs, revoke; revocation enforced server-side immediately on next request; audit events for grant/update/revoke. |
| FR-14 | Offline: cached active meds/schedules; queue dose responses with idempotency key; statuses Online/Offline/Syncing/Failed/Synced; conflicts never silently overwrite patient-confirmed events. |

### P1 (included in MVP only where noted)
| ID | Requirement |
|---|---|
| FR-09 | Insight rules. **MVP: R1 only.** R1 = for a (medication, weekday, time-of-day bucket), over a rolling 28-day window, require ≥4 comparable scheduled events across ≥2 calendar weeks; surface if unresolved events ≥ 3 **[PROPOSED threshold, configurable, not clinical]**. Show counts, dates, evidence events, dismiss, mark useful. R2–R5 later. |
| FR-15 OCR · FR-16 Refill · FR-17 PDF | Later. |

## 6. Dose-event state model
Scheduled → (ReminderAttempted → Delivered? → Acknowledged?) are *reminder* facts stored in `reminder_attempts`. Dose **outcome** status ∈ {scheduled, taken, not_taken, unresolved}. Snooze is an action recorded on the reminder timeline, not an outcome.
Transitions: scheduled→taken | not_taken | unresolved(system at cutoff). unresolved→taken | not_taken (late response, flagged). Corrections: taken↔not_taken via correction record with reason; original retained.
Response window default **[PROPOSED]**: unresolved at the earlier of next scheduled dose of same medication or 6 h after scheduled time; late responses still allowed.

## 7. Non-functional requirements
| ID | Requirement |
|---|---|
| NFR-01 | Security: TLS; encrypted at rest; resource-level authz; IDOR tests; rate limit auth + sensitive endpoints; secrets outside repo; audit sensitive actions. |
| NFR-02 | Privacy: minimal data; opt-in sharing; revocation; deletion workflow; no ads/sale; no PII in logs. |
| NFR-03 | Performance targets (to validate, not measured): dashboard / list / dose response < 2 s with demo load; paginated history; indexed queries. |
| NFR-04 | Reliability: no duplicate events; offline persistence; safe retry; notification attempts recorded. |
| NFR-05 | Accessibility: WCAG 2.2 AA target; ≥48 px targets; screen-reader labels; dynamic text; non-colour status. |
| NFR-06 | Compatibility: Android Chrome (last 2 major), desktop Chrome/Edge/Firefox/Safari latest 2 **[PROPOSED]**. |
| NFR-07 | Scalability: indexed, paginated; modular monolith. |
| NFR-08 | Maintainability: typed schemas, migrations, tests, API docs, structured logs, decisions log. |

## 8. Success metrics
North star: weekly scheduled-dose **outcome coverage** (record completeness, not adherence). Supporting: confirmation rate, unresolved rate, reminder reliability (where telemetry exists), setup completion, caregiver activation (opt-in), week-4 retention, insight usefulness, sync success. No clinical-outcome claims.

## 9. Feature specification template (applies to every FR)
Purpose · interaction · inputs · output · business logic · validation · error/loading/empty states · permission. Screen-level states live in 04-design.md; API contracts in 06-architecture.md.

## 10. Open questions (do not guess)
Product name; age range / target conditions; Android-native vs PWA (see decisions D-002); languages; response-window semantics (clinician/pharmacist review); hosting region & retention; managed auth provider; clinician dashboard vs PDF; feasibility of any real-patient pilot.
