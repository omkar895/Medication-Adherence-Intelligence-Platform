# Antigravity Prompt Pack: Medication Adherence Intelligence Platform (PS-05)

Based on the PS-05 PRD (v1.0, 6 Nov 2026) and the Idea to Deployment workflow template.

## How to use this pack

Paste the prompts into Antigravity in order. Each one reads earlier files and writes one file, so the agent works from written decisions and not from chat history. Start a fresh conversation for each phase and move on only when the “Done when” line is true. Planning mode suits Phases 2, 5, 6, 7 and 9. Fast mode is fine for 0 and 8.

Your PRD already exists, so three things differ from the template:

- Phases 1, 2, 3 and 5 sharpen the PRD instead of starting from a blank page. The prompts tell the agent not to interview you unless it is blocked.
- The PRD’s own delivery phases (Foundation, Core loop, Support, Intelligence, Pilot readiness) set the task order in Phase 7.
- Build the hackathon demo scope from PRD §11 first: one patient, 2 to 3 synthetic medications, reminder simulation, dashboard, one insight, and the caregiver consent flow. P1 features stay stretch.

Your four decisions: go/no-go after Phase 2, MVP scope after Phase 3, plan review after Phase 7, final testing before Phase 10. Antigravity’s free plan has weekly rate limits, so keep tasks small and keep Gemini CLI or OpenCode ready as a backup.

## Phase 0: Repo and rules

Create an empty repo. Save the PRD as `docs/source/PS-05-PRD.md` and the workflow template as `docs/source/workflow-template.md`, then run:

```
Create the structure below and nothing else: AGENTS.md, docs/ (01-problem.md through 10-feedback.md as empty files, plus decisions.md, source/ and references/), src/, tests/.

Write AGENTS.md using the rules in docs/source/workflow-template.md (Stage 9, “Rules for AGENTS.md”). Then add a safety section built from docs/source/PS-05-PRD.md sections 5, 8 and 10:
- This product is not clinical guidance. Never calculate or suggest a replacement dose, a late dose, a changed time or stopping a medicine. Direct medication questions to a clinician or pharmacist.
- A reminder sent is not a dose taken. Scheduled, reminder attempted, delivered, acknowledged, taken, not taken and unresolved are separate states. Unresolved is never shown as taken or as not taken.
- Taken means self-reported, never “verified”.
- Caregiver access is opt-in, scoped, revocable and enforced on the server. Tests must cover unauthorized access.
- Synthetic data only, labeled as synthetic. No real patient information anywhere.
- Copy tone: no guilt, blame, streaks or alarming language for missed or unresolved doses.
- Insights are rule-based and explainable. No generative model decides dose timing, reads ambiguous prescriptions or gives clinical advice.
- Store timestamps in UTC and keep the patient’s IANA time zone. Dose-event writes use idempotency keys.

Keep AGENTS.md under 80 lines. Ask me before adding anything else.
```

Done when: AGENTS.md exists and both source files sit in `docs/source/`.

## Phase 1: Problem

Output: `docs/01-problem.md`

```
Read docs/source/PS-05-PRD.md sections 1 to 4. Act as a skeptical product strategist. Do not interview me unless something blocks you. Take answers from the PRD and mark each as “from PRD” or “assumed”.

Write docs/01-problem.md with the user (patient and caregiver), the pain, how often it happens, what they do today, what it costs them, and a two-sentence problem statement that names no feature. Then suggest three different solutions, including one that needs little or no software (for example a printed log plus a family check-in call). List the riskiest assumption for each.

Finish with the one claim in PRD sections 1 and 2 you would most want evidence for.
```

Done when: you can state the problem in two sentences without describing a feature.

## Phase 2: Research

Output: `docs/02-research.md`. Decision point: go/no-go.

```
Using docs/01-problem.md and PRD section 13, research existing options: Medisafe, MyTherapy, CareClinic, Dosecast, and manual workarounds (pill boxes, phone alarms, family WhatsApp check-ins). For each, record target user, pricing, strengths and weaknesses.

Collect real complaints from app store reviews, forums and communities, with a link for each. Prefer complaints from India where you can find them. Group them into patterns and rank by how often they appear. Do not invent quotes, numbers or study details. Mark anything unverified.

The PRD cites a Medisafe usability study (n=30) and several literature reviews without full references. Try to find them and mark each verified or unverified.

Finish with a recommendation to build, change direction or stop, and a one-line reason a patient would switch. Test the PRD’s claim that the connected loop (schedule → reminder → response → pattern insight → consent-based support) is the real differentiator.
```

Done when: you have linked evidence, a go/no-go decision and a one-line reason someone would switch.

## Phase 3: Scope

Output: `docs/03-scope.md`. Decision point: MVP scope.

```
Using docs/01-problem.md, docs/02-research.md and PRD sections 6, 7 and 11, define the single core flow that delivers the main value. Start from this hypothesis and change it if the evidence says so: sign up → add medication → verify schedule → get reminder → record Taken, Skipped or Snooze → see history and dashboard → optionally invite a caregiver with scoped consent.

Break the flow into features and sub-features using the PRD IDs (FR-01 to FR-17). Sort everything into MVP, Later and Never with a reason for each. Produce two cuts: “Hackathon demo” (PRD section 11) and “Full MVP” (all P0).

Challenge anything in either cut that the core flow can work without. In particular, argue for or against FR-09 caregiver notifications, medication-wise dashboards in FR-07, and offline sync in the demo.

Predictive AI, complex prescription interpretation, EHR integration, emergency escalation and clinician workflows go in Later or Never.
```

Done when: one person can complete the whole core flow using only the MVP features.

## Phase 4: Design

Output: `docs/04-design.md`, plus screenshots in `docs/references/`

Before the prompt, add 3 to 5 reference screenshots. A medication app (Medisafe or MyTherapy), a banking app for clear numbers, and a messaging app for notification previews work well. Stitch is optional for generating key screens.

```
Using docs/03-scope.md and PRD sections 4, 5 and 7, list every screen in the core flow. For each, define the default, empty, loading and error states. For the reminder and sync screens, also define the offline state and the notification-permission-blocked state.

Review the images in docs/references/ and write a short design direction covering layout, type, color, spacing and tone. For each reference, say what to borrow and what to avoid.

Hold to the PRD design rules: calm and high contrast, one primary action per reminder, large touch targets, dynamic text sizing, screen reader labels, status shown by text or icon and not color alone, language choice in settings, usable on low-end Android and slow networks. Status labels use the PRD vocabulary: Taken, Not taken, Unresolved, Snoozed, Late.

Write sample copy for the reminder, the missed-dose message, a caregiver alert and the consent screen. Check each for guilt, urgency or dose advice.

Screens I expect: onboarding and permissions, Today (home), add medication (details, schedule, verify), reminder response, history, adherence dashboard, insight detail, caregiver invite and consent, caregiver summary, settings. Add or cut as needed and say why.
```

Done when: every step in the core flow has a screen and all its states are defined.

## Phase 5: PRD and architecture

Output: `docs/05-prd.md` and `docs/06-architecture.md`

```
Using docs/01 to docs/04 and docs/source/PS-05-PRD.md, write docs/05-prd.md as a trimmed, build-ready PRD: goals, non-goals, user stories, numbered functional requirements (keep the PRD’s FR IDs), non-functional requirements (privacy, security, accessibility, offline, performance, time zones) and success metrics. Every requirement must be testable. Write the dose event state model and the definitions of adherence rate, unresolved and caregiver scope as explicit rules.

Then write docs/06-architecture.md: stack, data model (start from the PRD section 9 entities), routes or APIs, authentication, third-party services, hosting, environment variables, and the offline sync and idempotency approach. Compare two stack options and recommend one:
A) The PRD stack: Flutter (Android first), FastAPI, PostgreSQL, FCM and local notifications.
B) A lighter option you propose for a hackathon timeline.
Judge them on reminder reliability on a locked low-end Android phone, offline logging, time to a working demo and free-tier limits. Check current free-plan limits before relying on them.

List open questions instead of guessing. Start with PRD section 14: product name, target condition, Android-only or cross-platform, response-window rules (needs pharmacist review), languages, clinician dashboard or PDF export, data region and retention.
```

Done when: a developer could start building without asking what the product should do. You pick the stack and answer the open questions yourself.

## Phase 6: Test plan

Output: `docs/07-test-plan.md`

```
Using docs/05-prd.md and docs/06-architecture.md, write acceptance criteria in Given/When/Then for every requirement. Add failure, edge and security cases. Label each test unit, integration, end-to-end or manual, map it to a requirement ID and flag any requirement without a test.

Cover these PRD cases explicitly:
- Status: a delivered or opened reminder never creates a Taken event. No response leaves the event Unresolved. Unresolved is never counted as Taken or Not taken.
- Responses: duplicate taps and sync retries create one event. A late response is marked Late and keeps the original scheduled time. Snooze changes reminder timing only. Every response stores timestamp, actor, source and schedule version.
- Schedules: editing creates a new version and past events keep their old version. Changing a reminder preference does not change the prescribed instruction text. An unverified schedule cannot activate. Archiving keeps history.
- Time: DST changes, time-zone changes and midnight boundaries.
- Offline: log offline, sync later, no duplicates, no silent overwrite of a patient-confirmed event.
- Dashboard: numerator, denominator, exclusions and date range are shown and match a hand-calculated seeded dataset.
- Insights: each links to specific event IDs and a date range. None appears below the evidence threshold (default 4 comparable events across 2 weeks). Wording never states a cause.
- Consent: no access before the caregiver accepts. Scope is enforced field by field. Revocation blocks the next request and active sessions. Consent changes are audit logged. Caregiver A cannot read patient B’s data. Alerts fire only for enabled types.
- Safety copy: an automated check fails the build if app copy contains dose-change or make-up-dose advice.
- Accessibility (manual): screen reader labels, 200% text size, status not shown by color alone.
```

Done when: every MVP requirement has at least one test and every risky requirement has a failure case.

## Phase 7: Task breakdown

Output: `docs/08-tasks.md`. Decision point: plan review before any build.

```
Using docs/05-prd.md, docs/06-architecture.md and docs/07-test-plan.md, create docs/08-tasks.md as an ordered list. Each task must fit one reviewable pull request and list its requirements, tests, dependencies and definition of done. Start with Task 0, the deployed walking skeleton. Prefer end-to-end slices over separate backend and frontend phases. Flag tasks that need human approval.

Follow the PRD delivery phases for order: Foundation (auth, profile, medication, schedule versions), Core loop (dose events, local reminders, snooze, history, offline queue), Support (caregiver invite, consent, authorized summary), Intelligence (aggregates and one rule-based pattern with evidence), then accessibility and security checks.

Put the unauthorized-access tests in the same task as the consent code, not later. Tasks touching the database schema, authentication, permissions or dependencies need approval and must say so. Keep P1 items (OCR, refill tracking, PDF export, patient-reported reasons) after the demo-ready task and mark them stretch.

Add a task that seeds clearly labeled synthetic demo data: one patient, 2 to 3 medications.
```

Done when: every MVP requirement maps to a task and every task maps to a test.

## Phase 8: Walking skeleton

Output: a live staging URL and a working CI/CD pipeline

```
Complete Task 0 from docs/08-tasks.md. Set up the repo, stack, linting, type checks, test runner, CI and staging deployment. Add one page that reads a value from the database and one automated smoke test. Add a health check route, separate staging and production databases, and a migration process that can be run repeatedly. Do not build product features yet.

List any accounts or secrets I must set up myself. Never ask me to paste secrets into chat.
```

Done when: a small commit reaches the staging URL without any manual steps.

## Phase 9: Build loop

Output: merged pull requests and an updated `docs/08-tasks.md`. Repeat for each task.

### Builder prompt

```
Read AGENTS.md. Pick the next unblocked task in docs/08-tasks.md and complete only that task. Show the failing tests first, then implement the change. Run all checks, fix any failures within the retry limit, and open a pull request that lists the requirements covered, test results, and anything you are unsure about.
```

### Reviewer prompt

Run this in a new conversation so the reviewer starts without the builder’s assumptions.

```
Review this pull request against the linked requirements and test plan. Do not fix anything. Check for missing requirements, weakened tests, security issues, data leaks between users, unhandled failures and changes outside the task’s scope. Also check for: app copy that gives dose or timing advice, any place Unresolved is treated as Taken or Not taken, caregiver data reachable without current consent, real-looking patient data in seeds, and consent or permission checks done only in the UI. Report problems by severity and finish with APPROVE or REQUEST CHANGES.
```

### Add-ons for high-risk tasks

Append the matching line to the builder prompt.

- Dose events and reminders: Treat the state model in docs/05-prd.md as fixed. Write the tests for status separation, idempotency and late responses first and show them before coding.
- Schedule versions: Prescribed instruction text and reminder settings are stored separately. An edit creates a new version and never rewrites past events.
- Caregiver consent: Write the unauthorized-access and revocation tests first. Enforce scope on the server for every request. List each scope and what it exposes, in plain language, for the consent screen.
- Insights: Implement as deterministic SQL or Python rules. No language model. Each insight stores its evidence event IDs and date range, and stays hidden below the evidence threshold.
- Offline sync: Never overwrite a patient-confirmed event silently. Keep the correction history and test the conflict case.

Done when: all MVP tasks are merged and all automated tests pass on staging.

## Phase 10: Release

Output: a demo or pilot-ready release and `docs/09-release.md`

```
Prepare this product for a demo and a pilot-readiness review. Audit it against docs/05-prd.md, the checklist in docs/09-release.md and the PRD’s “Definition of MVP done”:
1. A patient can create and verify a medication schedule.
2. A scheduled reminder fires and its attempt and status are recorded accurately.
3. Taken, Not taken and Snooze work, and Unresolved stays distinct.
4. History and adherence figures trace to dose events and show the date range and denominator.
5. A patient can invite a caregiver, grant scoped consent and revoke it.
6. Caregiver access is enforced server-side and tested against unauthorized access.
7. Schedules and dose logging work offline and sync without duplicates.
8. No feature changes treatment or gives missed-dose advice.
9. Accessibility, privacy and security checks are done for the demo or pilot scope.

Also check: all seeded data is labeled synthetic, no secrets are in the repo, dependencies are scanned for known issues, forms validate input, error tracking and uptime alerts work, backups are on and a restore has been tested, and rollback steps are written and tried.

Report each item as pass, fail or needs manual check, with evidence. Do not deploy. Give me the deployment and rollback steps.
```

Manual checks you must do yourself: the full core flow on a real low-end Android phone with battery saver on and notifications blocked, then on a desktop browser. Some free database plans have no automatic backups, so set up your own and test a restore. Do not use real patient data until you have had a legal and security review under the Indian data protection rules in force (PRD section 10).

Done when: you have completed the core flow on the release build and the rollback plan is ready.

## Phase 11: Learn

Output: `docs/10-feedback.md`, plus updated scope and tasks

The PRD’s research plan gives the inputs: 5 to 8 usability tests, 8 to 12 patient interviews, 4 to 6 caregiver interviews, 3 to 5 clinician or pharmacist reviews, and a low- and mid-range Android device test.

```
Here are the usability results, device test notes, pharmacist or clinician feedback and analytics from this period: [data]. Separate what users did from what they said. Find where people drop out: schedule setup, reminder response, caregiver invitation. Report unresolved dose rate, confirmation rate and reminder reliability by device, with denominators. Note which insights were dismissed or marked useful, and whether any copy was read as medical advice. Rank the top 3 problems by impact and recommend what to fix, what to build and what to ignore. Update docs/03-scope.md only after I approve.
```

Done when: the next tasks are chosen from evidence and added to `docs/08-tasks.md`.
