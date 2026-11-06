# 09 — Release checklist
Status for each item: PASS / FAIL / NEEDS MANUAL CHECK — all currently **NOT STARTED**.

## Engineering
- [ ] All automated tests pass (unit, integration, e2e)
- [ ] Manual tests M-01…M-05 pass on a real Android phone and desktop browser
- [ ] Patient isolation proven (T-57); caregiver scope + revocation proven (T-45, T-50)
- [ ] Idempotency & offline sync proven (T-26, T-54)
- [ ] Dependency + code scan clean for known issues
- [ ] Input validation, file/size limits (if uploads exist)
- [ ] Production secrets set in host; none in repo
- [ ] Migrations run from empty DB; separate staging/prod databases
- [ ] Health check + error tracking + uptime alert
## Safety & compliance
- [ ] Copy lint passes; clinical guardrails in AGENTS.md verified
- [ ] Reminder limitations disclosed in-app (PWA reminders not guaranteed)
- [ ] Synthetic data clearly labelled; **no real patient data** unless governance approved
- [ ] Privacy policy & terms in place
- [ ] Qualified legal/security review for India (DPDP Act and rules in force, health-data obligations, consent, retention, breach response, clinical-software/medical-device classification) **before any real-patient use** — this repo is not legal advice
- [ ] Clinician/pharmacist review of response-window semantics and copy
## Operations
- [ ] DB backups enabled and a **restore tested**
- [ ] Rollback steps written and rehearsed
- [ ] Data retention & deletion policy decided (D-009)
## Deploy / rollback (to complete in Task 20)
Deploy: tag → CI green → deploy to staging → smoke → human approval → promote migrations then app.
Rollback: redeploy previous image; down-migrate only if migration marked reversible; restore backup if data issue.
## Done when
Core flow completed on production by a person and rollback plan ready.
