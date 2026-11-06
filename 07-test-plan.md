# 07 — Test plan
Type: U=unit · I=integration · E=end-to-end · M=manual · P=performance · S=security

## Authentication / profile (FR-01, FR-02)
| ID | Req | Given / When / Then | Type |
|---|---|---|---|
| T-01 | FR-01 | Given valid details, when patient registers, then account + session created and onboarding shown | I/E |
| T-02 | FR-01 | Given existing email, when registering again, then rejected without leaking extra info | I |
| T-03 | FR-01 | Given wrong password and unknown email, then identical generic error | I |
| T-04 | FR-01 | Given expired token, when calling protected API, then 401 and session-expired screen | I/E |
| T-05 | FR-01 | Given no token, when opening protected route, then redirect to login | E |
| T-06 | FR-02 | Given events in Asia/Kolkata, when timezone changed, then historical events keep original local display time and UTC value | I |

## Medication & schedule (FR-03, FR-04)
| T-07 | FR-03 | Create medication with valid fields → saved as pending until confirmed | I |
| T-08 | FR-03 | Confirm review → verification_status=verified, schedule activated, future events generated | I/E |
| T-09 | FR-03 | Missing required field / invalid dates → field errors, nothing saved | U/I |
| T-10 | FR-03 | Archive medication → no new events generated; history intact | I |
| T-11 | FR-04 | Edit schedule → new version; old events still reference old version | I |
| T-12 | FR-04 | Edit near an existing event → past/current event not rewritten | I |
| T-13 | FR-04 | DST spring-forward & fall-back day → correct events, no duplicates, none lost | U |
| T-14 | FR-04 | Reminder prefs changed → prescribed_instruction_text unchanged | I |
| T-15 | FR-03 | Ambiguous flag unresolved → Confirm disabled | E |

## Reminders & dose events (FR-05, FR-06)
| T-16 | FR-05 | Simulated reminder at time → attempt row created, outcome still `scheduled` | I |
| T-17 | FR-05 | Reminder delivered/acknowledged → status is NOT taken | U |
| T-18 | FR-05 | Quiet hours → no attempt during window | U |
| T-19 | FR-05 | Max repeats reached → no further attempts | U |
| T-20 | FR-05 | Notification failure → failure recorded; outcome unchanged | I |
| T-21 | FR-05 | Permission denied → diagnostics message shown | E |
| T-22 | FR-06 | Select Taken → status taken, responded_at/source/actor stored | I/E |
| T-23 | FR-06 | Select Skipped → not_taken (distinct from unresolved) | I/E |
| T-24 | FR-06 | No response by cutoff → unresolved | U/I |
| T-25 | FR-06 | Snooze → reminder rescheduled; schedule & outcome unchanged | I |
| T-26 | FR-06 | Duplicate tap / same Idempotency-Key → one event, same response | I |
| T-27 | FR-06 | Late response → is_late true; scheduled_at unchanged | I |
| T-28 | FR-06 | Correction → new row in corrections; original retained | I |
| T-29 | FR-06 | Unresolved event then Taken → allowed, flagged late | I |

## History & analytics (FR-07, FR-08, FR-09)
| T-30 | FR-07 | Filters medication + status + range → only matching events | I |
| T-31 | FR-07 | Event detail shows schedule version id & timestamps | E |
| T-32 | FR-07 | Empty period / no match → correct empty states | E |
| T-33 | FR-08 | S=40,T=30,N=5,U=5 → 75 / 12.5 / 12.5 / 87.5 % with numerators/denominators | U |
| T-34 | FR-08 | S=0 → no percentage, "No scheduled doses" | U |
| T-35 | FR-08 | Unresolved included in S, never excluded; cancelled/superseded excluded per policy | U |
| T-36 | FR-08 | Pending-sync events → data-gap disclosure shown | E |
| T-37 | FR-08 | Per-medication numbers sum to overall | U |
| T-38 | FR-09 | 4 comparable events over ≥2 weeks with ≥3 unresolved → R1 insight with evidence ids | U |
| T-39 | FR-09 | 3 events or 1 week → no insight; "not enough records" | U |
| T-40 | FR-09 | Insight text contains no cause/advice (copy lint test against forbidden phrases) | U |
| T-41 | FR-09 | Dismiss / mark useful persisted | I |

## Caregiver & consent (FR-10–13)
| T-42 | FR-10 | Invite created pending; no data access | I |
| T-43 | FR-10 | Pending/expired/reused token → access denied | I |
| T-44 | FR-10 | Caregiver authenticates + accepts → access limited to scopes | I/E |
| T-45 | FR-11 | Request outside scope (e.g. history without `dose_history`) → 403 | I/S |
| T-46 | FR-11 | Aggregates respect scope (dashboard not leaked via summary endpoint) | I/S |
| T-47 | FR-11 | Caregiver write attempts on meds/schedules → rejected | I/S |
| T-48 | FR-12 | Notifications default off; only enabled types fire | I |
| T-49 | FR-12 | Alert rate limit enforced; text has no urgency/clinical claims | U |
| T-50 | FR-13 | Revoke → next caregiver request 403 (same token); notifications stop; audit row | I/S/E |
| T-51 | FR-13 | Permission edit audited; narrowing scope takes effect immediately | I |
| T-52 | FR-13 | Revoke fails server-side → UI still shows active + retry | E |

## Offline (FR-14)
| T-53 | FR-14 | Offline Taken → queued Pending Sync, visible | E |
| T-54 | FR-14 | Reconnect → synced once; retry after dropped response → no duplicate | I/E |
| T-55 | FR-14 | Server has conflicting correction → no silent overwrite; conflict surfaced | I |
| T-56 | FR-14 | Cached meds/schedule viewable offline | E |

## Security / NFR
| T-57 | NFR-01 | Patient A requests Patient B's medication/event/insight IDs → 404, no data | I/S |
| T-58 | NFR-01 | Auth endpoint rate limit triggers | I/S |
| T-59 | NFR-01 | Logs contain no health content (log scan in test) | I/S |
| T-60 | NFR-01 | Admin role cannot read patient medication content | I/S |
| T-61 | NFR-02 | Account deletion request flow works end to end | I |
| T-62 | NFR-03 | Dashboard/list/response p95 < 2 s on seeded demo data | P |
| T-63 | NFR-05 | axe: zero critical violations on all screens; status never colour-only | E |
| T-64 | NFR-04 | Migrations repeatable from empty DB; seed repeatable | I |
| T-65 | Safety | Copy lint: forbidden phrases ("double", "take now", "you should") absent in UI strings & notifications | U |
| T-66 | Safety | Synthetic data labelled in UI | E |

## Manual
| ID | Scenario | Expected |
|---|---|---|
| M-01 | Complete full core flow on a phone, no help | Every action reachable/readable |
| M-02 | Screen reader (TalkBack) through response sheet | All controls and statuses announced |
| M-03 | 200% text size, dark mode | No clipping, contrast OK |
| M-04 | Low/mid Android device offline logging | Works; sync on reconnect |
| M-05 | Caregiver revoke while caregiver page open | Next action shows access ended |

## Coverage map
Every P0 FR/NFR above has ≥1 test; FR-15/16/17 (Later) intentionally untested/unflagged. **Flag:** FR-02 deletion beyond request flow and NFR-06 browser matrix rely on M-tests.
