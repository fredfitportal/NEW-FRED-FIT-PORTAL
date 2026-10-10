# FredFit: Shared Production Backend — Full Architecture, Phase 1 = Scheduling

## 1. Why this is needed

Everything in the portal today is stored in the browser of whoever entered it. That is why Jessie can see Bill's Pilates session and Jennifer cannot. There is no shared database, no real accounts, no security rules and no syncing. This plan replaces that foundation.

The whole architecture is designed up front so nothing built in Phase 1 has to be torn out later. Only Phase 1 gets implemented first.

## 2. Full system map (designed now, built in stages)

All 45 record types move to the shared database eventually. Only the last calendar view and filter choices stay in the browser.

- People & access: staff, staff locations, service qualifications, weekly availability, schedule exceptions, accounts, invitations, permission overrides.
- Scheduling: appointments, participants, status history, recurring series and changes, blocked time, class sessions and participants, rooms/resources, scheduling overrides.
- Clients: client records, staff assignments, program/service enrollments, leads and discovery calls, onboarding.
- Money & policy: make-up credits and transactions, payments, services catalog, booking configuration.
- Clinical (later, PHI): assessments and templates, quarterly cycles, results reviews, recommendations, documents, food logs, intake forms.
- Operations: tasks, notifications, audit log.

Phase 1 builds the first two groups plus clients, locations and services — no clinical or payment data.

## 3. Phase 1 database schema

Core tables and how they connect:

```text
auth account ─1:1─ profile ─1:1─ staff
                     └─ user_roles (role per person, separate table)
                     └─ permission_overrides (per-person toggles)

locations ──< rooms_resources
locations ──< staff_locations >── staff
services ──< staff_services (qualifications/credentials) >── staff
staff ──< staff_availability (weekday hours per location)
staff ──< staff_schedule_exceptions (time off, one-off hours)

clients ──< client_staff_assignments >── staff
clients ──< client_service_enrollments >── services

recurring_series ──< appointments >── appointment_participants >── clients
appointments ── service, provider (staff), location, room/resource
appointments ──< appointment_status_history
recurring_series ──< series_changes (pattern edits, pauses, moves)
blocked_time ── staff and/or room, date range, reason
class_sessions ── service, provider, location, room, capacity
class_sessions ──< class_participants >── clients
scheduling_overrides — administrative override of a conflict, with reason

audit_log — every create/update/delete on the tables above
```

Every table carries created_by, created_at, updated_by, updated_at. Capacity lives on the service/class (Partner 2, Trio 3, class capacity), exactly as designed now. All existing scheduling rules — recurring series, "this occurrence only" moves, this-and-future edits, pause/resume, participant-level pause, conflict checks, make-up credit rules — are preserved and moved behind server-side functions; the rules do not change.

## 4. Authentication

- Invitation only. Jennifer or Jessie create the staff record, then send an invite; the person sets their own password and their account links to that existing staff record — never a duplicate.
- Email and password, optionally Google sign-in (decision 1).
- Employment status and account status stay separate: an account can be disabled while all history remains.
- No self-registration, no shared logins. The demo user switcher only exists in the development environment.

## 5. Roles and what each can do

| Role | Calendar | Clients | Staff | Admin |
|---|---|---|---|---|
| Executive (Jennifer, Jessie) | view/create/edit/cancel all, override conflicts | full | full, invites, permissions | full |
| Leadership | view all, create/edit/cancel all | view all, edit | view directory, edit assigned areas | no permission admin |
| Scheduling / Operations | view all, create/edit/cancel all, override conflicts | view all, edit contact/scheduling fields | view directory | none |
| Trainer | view all (shared calendar), create/edit own sessions; cancel own | view assigned clients only | view directory | none |
| Clinical / RDN | view all, manage own sessions | view assigned clients, clinical notes (later phase) | view directory | none |
| Client (designed, dormant) | own appointments only | own record only | none | none |

Hard deletes are reserved to Executive; everyone else archives or cancels, so history survives. Per-person toggles can add or remove individual abilities on top of a role, and only Jennifer and Jessie can change roles or toggles.

## 6. Security (RLS), conceptually

Row Level Security on every table; nothing is publicly readable.

- Role is read from the database, never from anything the browser sends.
- Scheduling tables: any signed-in staff member with calendar access reads all appointments at both locations — this is the shared calendar. Writes require scheduling permission or ownership of the session.
- Client records: executives, leadership and operations see all; trainers and clinical staff see assigned clients only.
- Clinical tables (later): assigned practitioner, clinical staff and executives only.
- Tasks keep today's privacy rules exactly.
- Audit log: written only by database triggers, readable by executives; nobody can edit or delete it.
- Administrative overrides are permitted but always recorded with who and why.

## 7. Audit history

Database triggers — not app code — write an audit row on every insert, update and delete: who, when, which record, what action, previous and new values, and the reason where one was given. Reschedules, cancellations, no-shows, series edits and permission changes are all captured, and the app cannot bypass it. Appointment status history stays as its own readable timeline on the appointment.

## 8. Shared calendar and live updates

One calendar across Cowan and William Street, filtered by location, room and team — visibility is never limited by who created the record. Live subscriptions on appointments, participants and series push another user's booking, move or cancellation onto everyone's calendar within a second or two, with a refresh-on-focus safety net.

## 9. Existing browser data

Production starts clean: real staff, real locations, services and rooms entered deliberately; real clients added once the compliance items in section 12 are cleared. The 156 fictional clients and ~500 synthetic sessions load into the development environment so testing continues unchanged. Nothing is silently copied out of anyone's browser; if a genuinely needed record only exists in one browser, it is re-entered deliberately.

## 10. Environments

Two separate databases. Development holds fictional data and is what preview builds use; Production holds real data and is what the published site uses. Real client information is never entered into development.

## 11. Backup and recovery

Daily automatic backups with point-in-time recovery on Production, a written restore procedure, and a restore drill completed before any real client data is entered. Development is disposable.

## 12. PHI and HIPAA — what must be settled before later phases

Authentication, RLS and encryption do not make the system HIPAA compliant. Before any client health information is stored, these must be resolved as business matters:

- A signed Business Associate Agreement with the hosting/database provider, and confirmation the plan tier permits PHI.
- BAAs or exclusion for every third party that could touch client data: email delivery, file storage, error/analytics logging, any AI service, scheduling exports.
- Logging review — audit logs and error logs must not capture health details in plain text, and log retention must be defined.
- Backup handling: encrypted backups, defined retention, restricted restore access.
- Written policies: access control, minimum necessary, workforce training, device and password rules, breach response, termination procedure.
- Legal review of client consent forms and privacy notice.

Phase 1 stores no health information, so it can proceed while this work happens. Clinical phases stay blocked until you confirm it is complete.

## 13. Screens affected in Phase 1

Changing underneath, same look and workflow: Schedule (all views), appointment details and forms, Group Classes, Sellable Capacity, Clients roster and profile basics, Team roster and profile, availability editor, Business Config for locations/rooms/services.

New or changed visibly: a real sign-in screen, invitation acceptance, the demo user switcher removed from production, small "live updated" behaviour on the calendar.

Unchanged in Phase 1: Assessments, Tasks, Onboarding, Leads, food logs, payments, public booking — they keep working off browser storage until their own phase.

## 14. Implementation order within Phase 1

1. Enable the backend, create both environments, schema, RLS and audit triggers.
2. Accounts, roles, permissions; invite Jennifer and Jessie; sign-in and invitation screens.
3. Locations, rooms, services, staff records, qualifications, availability, exceptions.
4. Clients and program assignments.
5. Appointments, participants, statuses, recurring series, blocked time, classes — scheduling logic moved server-side.
6. Realtime, then side-by-side testing with real accounts (executive, leadership, scheduler, trainer, clinical) in separate browsers: same session visible to all, a booking appearing live for another user, a trainer unable to reach an unassigned client by typing the address, disabled account losing access with history intact, correct audit rows for create, move and cancel.
7. Cutover: published site points at Production.

## 15. Decisions I need from you

1. Sign-in: password only, or password plus Google?
2. Who gets accounts in Phase 1 — Jennifer and Jessie only, or the whole team at once?
3. Do real clients get entered in Phase 1, or should Phase 1 use staff/scheduling only until the BAA work is done?
4. Client portal role: design it dormant now (recommended) or leave it out?
5. Is the BAA and policy work already underway, or should everything clinical stay blocked until you say otherwise?
