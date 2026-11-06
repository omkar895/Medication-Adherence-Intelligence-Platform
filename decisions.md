# Decisions log
| ID | Date | Decision | Status | Rationale / notes |
|---|---|---|---|---|
| D-001 | 2026-11-06 | Reminders are not the differentiator; honest outcome record + consent control + explainable insight are | Accepted | PRD §1.4, research |
| D-002 | 2026-11-06 | Hackathon client = React PWA (Option B) instead of Flutter | Accepted | 2 codebases vs 3; PWA background reminders unreliable → demo uses simulation and discloses limit |
| D-003 | 2026-11-06 | Modular-monolith FastAPI + SQLite/PostgreSQL | Accepted | Zero-config local development, standard SQL models |
| D-004 | 2026-11-06 | No generative AI in MVP; deterministic rules only | Accepted | Safety guardrails |
| D-005 | 2026-11-06 | Managed auth bootstrap with JWT & secure password hashing | Accepted | Standalone self-contained security |
| D-006 | 2026-11-06 | Caregiver scope checked in DB each request, not in token | Accepted | Immediate server-side revocation |
| D-007 | 2026-11-06 | R1 thresholds: ≥4 events, ≥2 weeks, ≥3 unresolved, 28-day window | Accepted | Fully implemented and covered by unit tests |
| D-008 | 2026-11-06 | Default response window: earlier of next dose or 6 h | Accepted | Sweeper implementation |
| D-009 | 2026-11-06 | Hosting region, retention & deletion policy | Accepted | Account deletion request flow enabled |
| D-010 | 2026-11-06 | DST: local wall-clock; gap → next valid minute; overlap → first occurrence | Accepted | Test T-13 |
| D-011 | 2026-11-06 | Clinical Ledger Design System with IBM Plex / clean mono numbers | Accepted | 04-design.md compliance |
| D-012 | 2026-11-06 | Cross-tenant access returns 404 (not 403) for patient APIs | Accepted | Avoid ID enumeration |
