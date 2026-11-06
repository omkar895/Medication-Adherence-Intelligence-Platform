# 08 — Tasks
Each task = one reviewable PR, vertical slice. 🔒 = human approval required (schema/auth/permissions/deps/prod).

| ID | Task | Reqs | Tests | Depends | Approval | Status |
|---|---|---|---|---|---|---|
| 0 | Walking skeleton: repo, FastAPI + React, SQLite/Postgres, health route, smoke test, AGENTS.md | NFR-08 | smoke | — | 🔒 hosting, deps | ✅ Done |
| 1 | Auth + user/profile bootstrap, protected routes, roles | FR-01 | T-01–05 | 0 | 🔒 auth | ✅ Done |
| 2 | Core schema migration + synthetic seed script + audit helper | NFR-04 | T-64 | 1 | 🔒 schema | ✅ Done |
| 3 | Patient profile & onboarding (language, tz, text size) | FR-02 | T-06 | 1 | | ✅ Done |
| 4 | Medication add/edit/archive with review & verification wizard | FR-03 | T-07–10,15 | 2 | | ✅ Done |
| 5 | Schedule versions + event generator (DST policy) | FR-04 | T-11–14 | 4 | 🔒 | ✅ Done |
| 6 | Today ledger + response sheet: Taken / Skipped (idempotent, late flag) | FR-06 | T-22,23,26,27 | 5 | | ✅ Done |
| 7 | Unresolved sweeper + corrections trail | FR-06 | T-24,28,29 | 6 | | ✅ Done |
| 8 | Reminder simulation + snooze + quiet hours + max repeats + diagnostics | FR-05 | T-16–21,25 | 6 | | ✅ Done |
| 9 | History (filters, pagination, event detail, empty states) | FR-07 | T-30–32 | 7 | | ✅ Done |
| 10 | Analytics summary + trends + per-med; disclosures | FR-08 | T-33–37 | 9 | | ✅ Done |
| 11 | Offline queue + sync endpoint + status UI | FR-14 | T-53–56 | 6 | | ✅ Done |
| 12 | Insight rule R1 + evidence view + dismiss/useful | FR-09 | T-38–41,65 | 10 | | ✅ Done |
| 13 | Caregiver invitation + acceptance + consent scopes (patient side) | FR-10,FR-13 | T-42–44,51 | 2,1 | 🔒 permissions | ✅ Done |
| 14 | Shared read API + caregiver dashboard with scope enforcement | FR-11 | T-45–47,57,60 | 13 | 🔒 permissions | ✅ Done |
| 15 | Revocation (server enforced) + audit + UI | FR-13 | T-50,52 | 14 | 🔒 | ✅ Done |
| 16 | Caregiver notifications (in-app log, rate limit, opt-in) | FR-12 | T-48,49 | 15 | | ✅ Done |
| 17 | Security hardening: rate limits, headers, log scan, admin isolation, deletion request | NFR-01,02 | T-58–61 | 16 | 🔒 | ✅ Done |
| 18 | Accessibility + responsive + copy lint pass | NFR-05 | T-63,65,66,M-02/03 | 12,16 | | ✅ Done |
| 19 | Performance check on seeded data | NFR-03 | T-62 | 18 | | ✅ Done |
| 20 | Release prep: backups/restore, rollback, docs | — | 09-release checklist | 19 | 🔒 prod | ✅ Done |

Backlog (not in MVP): R2–R5 insights, reasons UI, OCR, refill, PDF, FCM/native reminders, Flutter client, clinician report.
Done when: every MVP FR maps to a task and every task to a test ✅
