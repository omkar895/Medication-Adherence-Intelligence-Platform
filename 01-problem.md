# 01 — Problem

> Status: DRAFT from the supplied PS-05 brief and PRD v1.0/v2.0. The user-research fields below are **hypotheses** — no interviews have been conducted. Validate with the discovery plan in 02-research.md.

## Summary table
| Field | Value |
|---|---|
| User | People managing recurring prescribed medication (chronic conditions) and, optionally, a family caregiver they choose |
| Pain | Alarms remind but don't record what happened. Missed/unresolved doses are hard to see or discuss. Caregiver support is either absent or too invasive |
| Frequency | Every scheduled dose, daily or multiple times a day |
| Current workaround (hypothesis) | Phone alarms, pill organisers, paper notes, memory, asking family |
| Cost | Missed doses go unrecorded; clinician conversations rely on recall; caregivers either blind or over-monitoring. *(Clinical cost not quantified here — do not claim outcomes.)* |
| Not the problem | Diagnosing, prescribing, advising on doses |

## Problem statement (two sentences, no feature)
Patients managing recurring medication cannot easily keep a trustworthy record of what actually happened at each scheduled dose, so neither they nor the people supporting them can see real patterns. Existing approaches either stop at the alarm or expose too much, leaving patients without control over who sees their information.

## Three candidate solutions
| # | Solution | Software need | Riskiest assumption |
|---|---|---|---|
| A | Printable weekly dose chart + monthly summary template (paper/spreadsheet) | None | Patients will fill it in consistently; no reminders |
| B | Reminder + explicit outcome-logging app with history and explainable summaries (chosen) | Medium | Patients will tap a response often enough for records to be meaningful |
| C | Full care platform with clinician portal, pharmacy and EHR integration | Very high | Clinicians/pharmacies will integrate; regulatory burden is manageable |

## Assumptions that must hold for B
1. Patients will tap Taken/Skipped when reminded (outcome coverage is high enough to be useful).
2. Reminders can be delivered reliably enough on the target devices (low/mid-range Android, battery policies).
3. Patients want some caregiver visibility but with granular, revocable control.
4. Descriptive pattern summaries are useful without clinical advice.
5. Patients will manually enter schedules from prescriptions without excessive friction.

## Done-when check
Problem stated in two sentences without describing a feature: ✅
