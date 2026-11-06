# 03 — Scope

## Core flow (one journey)
Register → Add medication → Verify & confirm schedule → Reminder → Record outcome (Taken / Skipped / Snooze / left Unresolved) → Review history → See metrics + one insight → (Optional) share with caregiver → Revoke.

## Feature sort
| Feature | Sub-features | Bucket | Reason |
|---|---|---|---|
| Auth & profile | Register, login, logout, language, timezone, text size | MVP | Needed for any private data |
| Medication records | Add/edit/archive, prescribed text separate, verification status | MVP | Core |
| Schedules | Versioned; once daily, multiple daily, selected weekdays | MVP | History integrity |
| Reminders | In-app reminder + **simulation**, quiet hours, snooze, repeat cap, permission status | MVP | Core loop (simulation acceptable for hackathon) |
| Dose logging | Taken, Skipped, Snooze, Unresolved, late flag, idempotent, correction trail | MVP | Core |
| History | Today/7d/30d/custom, filters, event detail | MVP | Transparency |
| Dashboard | Today overview, T/N/U counts, denominators, daily+weekly trend | MVP | Core |
| Insight | **One** deterministic rule (R1) + evidence list + dismiss/useful | MVP (demo) | Differentiator; PRD lists P1 but demo requires one |
| Caregiver | Invite, accept, scopes, caregiver dashboard, revoke, audit | MVP | Differentiator |
| Caregiver notifications | Opt-in; unresolved/skipped alerts; rate-limited | MVP (in-app log; email/push simulated) | PRD P0 |
| Offline | Cached meds/schedule, queued dose responses, sync status | MVP | PRD P0 |
| Other insight rules (R2–R5) | Weekday, period change, snooze, reasons | Later | Needs data volume |
| Patient-reported reasons | Optional reason on Skip | Later (low cost; add if time) | P1 |
| Prescription OCR | Image → candidate fields | Later | Untrusted, high risk |
| Refill tracking | Stock estimate | Later | P1 |
| PDF export | Date-bounded report | Later | P1 |
| Voice, predictive risk | — | Later (P2) | Needs validation/governance |
| Clinician portal, pharmacy/EHR | — | Never (this release) | Out of scope |
| Dose advice, missed-dose compensation, generative-AI recommendations, emergency escalation | — | **Never** | Clinical safety |
| Streaks / gamification / shame mechanics | — | Never | Conflicts with respectful tone |

## Challenged items
- Real push/FCM: **Later** — simulation + in-app suffices for demo; real delivery needs device testing.
- Caregiver email/SMS delivery: simulated with an in-app notification log.
- Social login/MFA: Later.

## Done when
One person can complete the whole core flow using only MVP features: ✅ (verified in test M01 once built).
