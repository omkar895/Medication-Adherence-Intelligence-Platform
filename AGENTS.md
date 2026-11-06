# Project rules — Medication Adherence Intelligence Platform (MAIP, working title)

Read first: docs/05-prd.md, docs/06-architecture.md, docs/08-tasks.md.
Read other docs only when the current task needs them (04-design.md for any UI work; 07-test-plan.md for tests).

## Process
- Work on one task at a time, on its own branch.
- Write or confirm the failing tests before writing the code.
- A task is done only when linting, type checks, and all tests pass.
- Do not delete, skip, or weaken a test without flagging it and explaining why.
- After 3 failed attempts at the same problem, stop and report what you tried.
- Put new ideas in the backlog. Do not add them to the current task.
- Never commit secrets. Never ask the human to paste secrets into chat.
- After each task, update docs/08-tasks.md and record decisions in docs/decisions.md.
- Ask for human approval before changing: database schema, authentication, permissions/consent logic, dependencies, and before any production deploy.

## Clinical safety guardrails (release blockers — never violate)
1. Never calculate, suggest, or display a replacement/compensating dose after a missed dose.
2. Never change dose, frequency, duration, or medication choice. Reminder timing is a separate object from prescribed text.
3. A reminder sent/delivered/opened is NEVER a taken dose. Only an explicit patient "Taken" is.
4. Label patient-confirmed intake as "self-reported", never "verified".
5. Never infer WHY a dose was missed. Only show patient-entered reasons or neutral counts.
6. OCR output (P1) is untrusted until a human verifies it. No auto-activation of schedules.
7. UI copy must be neutral: no guilt, streak pressure, or urgency claims. Medication questions → "ask your clinician or pharmacist".
8. No generative AI in the MVP. Insights are deterministic rules with visible evidence.

## Engineering rules
- Every query touching patient data is scoped by authenticated patient_id (or by an ACTIVE consent grant for caregivers). Never filter on the client.
- Consent is checked against the database on every caregiver request. Do not trust token claims for scope.
- Timestamps stored in UTC; keep patient IANA time zone; never rewrite historical events on zone change.
- Dose-event writes are idempotent (idempotency key). One canonical event per (schedule_version_id, scheduled_at).
- Every metric shows date range, numerator, denominator. Denominator 0 → show "No scheduled doses", never 0%.
- Demo/seed data is labelled SYNTHETIC in UI and DB.
- No fake buttons: every interactive element has real behavior or is visibly marked "Not available yet".
- No PII or health content in application logs.
