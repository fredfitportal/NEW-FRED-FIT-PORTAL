# FredFit Portal Roadmap

## Approved Phase 1
- Production migration architecture is approved. Phase 1 foundation and shared scheduling are in progress using fictional data only.
- Pre-implementation checklist (BAA, HIPAA eligibility, internal policies, counsel review) must be completed by Jessie before any production migration begins.

## In progress — demo data only
- Universal assessment template builder (expanded answer types, bilateral, scoring, reference ranges, conditional logic, media, notes, outcomes, versioning).
- Continue building and testing scheduling, client profiles, calendar, recurring appointments, Apparatix capacity, make-up workflows, and operational functionality using fictitious/demo data only.
- No real client-identifiable information may be entered in Preview or moved to any backend.

## Scheduling — next gaps (from the 2026-09-15 gap analysis)
- P0 remaining: show blocked time/internal meetings on the calendar; print/export day sheets; client search inside the calendar.
- P1 remaining: add/remove participants on a shared series, change service scope, mark one-off trainer substitutions, combined trainer schedule view.

## Done
- Recurring-series foundation: persistent series definition (pattern, provider, location, participants, status, anchor/effective dates), "this occurrence" vs "this and future" editing, automatic generation of future occurrences from the current pattern, pause/resume, end-schedule-from-date (administrative, no make-up credits), append-only series change audit.
- Olivia Lowery deactivated (removed from booking and the active roster); her past demo sessions remain intact.
- Assessment, Reassessment & Quarterly Results Review engine: versioned template library (10 templates), client-specific assigned plans, completion/finalization, quarterly cycles, virtual Quarterly Results Review workflow, leadership work queue at /assessments, longitudinal comparison, service-placement documentation, persistent client summary header, 3-step Apparatix onboarding pathway, role-based assessment permissions. Demo data only.
- Leadership-only Team management: add/edit staff, activate/deactivate, role/title, services, locations, weekly availability. Olivia Lowery and Kim Beardsley added as Personal Trainers.
- Make-up credit system: 24-hour cancellation policy, 90-day expiration, issuance, redemption, release, forfeiture, audit trail, client profile count + ledger UI.
- Professional calendar, scheduling, attendance, staff roster, service catalog, capacity intelligence.
- Production migration architecture and compliance checklist documented.

## Explicitly not happening now
- No real client data is migrated or entered.

- [x] Tasks / Action Items system with permission-controlled visibility (owner-level sees all; leadership/staff see own + shared)

- [x] Fix recurring single-occurrence provider override atomically across every move path
- [x] Inspect and safely remove the persisted October 5 duplicate on Jeffrey Smith’s schedule without resetting synthetic data
- [ ] Phase 1 shared backend build
  - [x] Cloud enabled; identity/roles/audit foundation schema
  - [x] Scheduling schema (locations, resources, services, staff, availability, clients, appointments, participants, series, blocked time, classes) with RLS, audit triggers, realtime
  - [x] Email/password sign-in enabled
  - [x] Individual email/password sign-in screen and protected staff-only portal routes
  - [ ] Invitation acceptance wired to real accounts
  - [ ] Executive accounts for Jennifer and Jessie
  - [ ] Move Schedule/Team/Clients screens from browser storage to the shared database
  - [ ] Realtime calendar sync + side-by-side account testing
  - [ ] Google sign-in (needs your decision + credentials)
