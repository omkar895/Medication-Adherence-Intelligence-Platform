# 04 — Design

## Product personality
Calm, plain-spoken, trustworthy — like a well-kept paper medication log, not a wellness app. No gamification, no guilt.

## Design direction: "Clinical ledger" (editorial + instrument)
**Why:** the product's value is an *honest record*. Dose events are presented as ledger rows (time · medication · status) with explicit statuses and visible numerators/denominators. This suits low-digital-confidence users (one list, one action) and gives caregivers a dense, scannable table.

**Borrow:** banking-app number hierarchy (clear counts); paper chart rows; printed-timetable clarity.
**Avoid:** gradient hero, purple/blue mesh, glassmorphism, card-in-card, rounded-2xl everywhere, pill spam, confetti, streak flames, fake charts, decorative blobs, bounce animation.

## Tokens
**Typography** (max 2 families): `IBM Plex Sans` (UI/body) + `IBM Plex Mono` (times, counts, IDs). Fallbacks: system-ui / ui-monospace.
| Role | Size / weight |
|---|---|
| Display number (counts) | 40 / 600 mono |
| Page title | 28 / 600 |
| Section heading | 20 / 600 |
| Body | 18 / 400 (base ≥ 18 for patient app; scales with OS text size) |
| Secondary | 16 / 400 |
| Metadata / label | 14 / 500, uppercase tracking +0.04em only for labels |
**Spacing:** 4-pt base (4/8/12/16/24/32/48). **Grid:** mobile 4-col, 16 gutters; caregiver web 12-col, max 1200, sidebar 240.
**Radius:** 4px controls, 0–2px table rows. No shadows except focus ring and one overlay shadow.
**Touch targets:** ≥ 48×48 px primary actions; 56 px height for Taken/Skipped/Snooze.

**Colour (light; dark variant required, contrast ≥ 4.5:1 text, 3:1 UI):**
| Token | Light | Use |
|---|---|---|
| paper | #F7F5F0 | background |
| surface | #FFFFFF | rows/sheets |
| ink | #1B1F23 | text |
| ink-muted | #4A5159 | secondary text |
| rule | #D9D5CA | dividers |
| accent | #0F5C5A (deep teal) | primary actions, links |
| status-taken | #1E6B3A | + ✓ glyph + "Taken" |
| status-notTaken | #8A2D2D | + ✕ glyph + "Not taken" |
| status-unresolved | #7A5A00 | + dashed ring + "Unresolved" |
| status-snoozed | #3B4A8A | + clock glyph + "Snoozed" |
| status-scheduled | ink-muted | + hollow circle + "Scheduled" |
**Status is never colour-only** — always glyph + word. Unresolved is visually distinct from Not taken (dashed vs solid) and uses neutral amber, not alarm red.

**Iconography:** outline icons (Lucide), 24 px, no icon-in-rounded-square wrappers.
**Motion:** 120–180 ms opacity/position only for state changes (row status update, sheet open). No bounce. Respect `prefers-reduced-motion` (disable all transitions).

## Layouts
- **Patient (mobile-first):** bottom nav (Home · Medications · Insights · Caregivers · Profile). Home = single-column "Today ledger" with next dose pinned on top. Response happens in a bottom sheet with three equal-weight buttons.
- **Patient (tablet/desktop):** two-pane — ledger left, detail/evidence panel right.
- **Caregiver (web):** left sidebar nav (Overview · Shared Medication · Adherence History · Notifications · Account); full-width data table; consent banner showing exactly what is shared.
- Sync/connectivity state: persistent thin status line under header (Online / Offline / Syncing n / Sync failed — Retry).

## Screens and states
| Screen | Default | Empty | Loading | Error / special |
|---|---|---|---|---|
| Welcome | logo, Sign up, Log in, Privacy | — | button spinner | auth service error banner |
| Sign up / Login | form | — | submit spinner | field-level errors; generic auth failure (no account enumeration); session-expired screen |
| Onboarding | name, language, timezone, text size, notification explainer | — | — | skip optional; notification permission asked only after explainer |
| Home | greeting, date, next dose, T/N/U counts, today ledger | "No medications yet — Add your first" | skeleton rows | offline banner; sync error; "reminders may be blocked" diagnostics |
| Medication list | active + archived tabs, search | empty + Add | skeleton | retry |
| Add medication (wizard) | 1 Details → 2 Prescribed text → 3 Reminder times → 4 Review & verify → 5 Confirm | — | saving | validation; "ambiguous field" flag blocks Confirm until acknowledged |
| Medication detail | info, schedule versions, events | "No events yet" | skeleton | archived read-only |
| Reminder response (sheet) | med name, scheduled time, [Taken] [Skipped] [Snooze]; late label if after window | — | optimistic + "Saving…" | offline → "Saved on this device, will sync"; duplicate tap ignored |
| History | segmented range + filters, ledger list | "No events in this period" / "No events match filters" + Clear | skeleton | retry |
| Event detail | schedule version ref, status, timestamps, source, late flag, reason, correction trail | — | — | — |
| Insights | period selector, metrics with n/d, daily/weekly chart, insight list | "Not enough records yet (need ≥4 comparable events over ≥2 weeks)" | skeleton | retry; zero-denominator → "No scheduled doses in this period" |
| Insight evidence | list of supporting events + dates | — | — | — |
| Caregivers | connected, pending, scopes summary | "No caregivers. Sharing is off." | skeleton | invite errors |
| Invite wizard | contact → scopes (each with plain explanation) → alerts → summary → send | — | sending | duplicate invite / expired |
| Revoke confirm | lists exactly what access ends | — | — | server failure → remain "active" with retry (never show revoked unless server confirms) |
| Caregiver dashboard | consent banner, authorised summaries, table | "Nothing shared yet" / scope-specific empties | skeleton | **403 → "Access ended or not granted"** (no data) |
| Profile/Settings | personal, language, accessibility, notifications, timezone, security, privacy, delete account | — | — | timezone-change notice: "Past records keep their original time." |

## Copy rules
- Neutral: "No response recorded" not "You missed your dose."
- Unresolved ≠ Not taken; explain on first view.
- Footer on metrics: "Based on what was recorded in this app. Self-reported, not clinically verified."
- Never: "take it now", "double", "skip next", "you should".

## Accessibility checklist
Screen-reader labels on every control and status; focus order; visible 3px focus ring; dynamic type to 200%; form errors announced; no timeouts on response sheet; dark mode; language switch (EN + one Indian language scaffolded — final list is an open decision).

## Done when
Every core-flow step has a screen and all states are defined: ✅
