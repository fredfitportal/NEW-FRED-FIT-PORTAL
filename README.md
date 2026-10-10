# FredFit Hub

LOVABLE PROMPT #1 — FINAL
FredFit Portal Foundation

Build the foundation for a web application called FredFit Portal for Fredericksburg Fitness Studio.

IMPORTANT:
This is Phase 1 of a much larger operating system. Do NOT attempt to build the entire application from assumptions. Only build the foundation described below. Future prompts will add scheduling, client documentation, assessments, exercise programming, Medical Exercise, nutrition, recovery services, Apparatix, messaging, memberships, billing, reporting, progress visualization, media uploads, and a client-facing portal.

PRODUCT NAME
The user-facing product name is:

FredFit Portal

The eventual public domain will be:

fredfitportal.com

Internally, this project functions as the Fredericksburg Fitness Studio operating system.

PRODUCT PURPOSE
FredFit Portal will eventually replace multiple disconnected systems used by Fredericksburg Fitness Studio and become the central operating platform for the company.

Fredericksburg Fitness Studio is a relationship-driven fitness, Medical Exercise, Pilates, nutrition, and recovery company.

The platform must support a highly personalized client experience while also improving staff accountability, documentation, communication, scheduling, client continuity, and leadership oversight.

The software should feel warm, premium, personal, modern, and wellness-oriented — NOT like cold hospital software.

V1 PRIORITY
The initial V1 is for FFS employees and leadership only.

A client-facing login and portal will be added later.

However, the data architecture must anticipate future client accounts, client-visible progress dashboards, client messaging, documents, assessment results, exercise programs, nutrition summaries, and videos.

SECURITY / DEVELOPMENT REQUIREMENT
This application may eventually contain protected and sensitive client information.

For this prototype:

USE DUMMY / SYNTHETIC DATA ONLY.

Do not use real client names.

Do not claim the application is HIPAA compliant.

Do not assume the final production environment will use Lovable Cloud for protected health information.

The production system may ultimately be hosted using AWS infrastructure under an existing AWS Business Associate Agreement.

Design the application so that backend/storage services can be replaced or integrated later without rebuilding the frontend or client-record architecture.

Architect for:

secure authentication

granular role-based permissions

audit logging

record history

restricted access to sensitive information

archive/inactive states instead of routine hard deletion

future encrypted file/media storage

future signed/private media access

future AWS deployment

future client authentication

Do not tightly couple the application architecture to one storage provider.

APPLICATION SHELL
Create a responsive, desktop-first employee application with a left navigation.

Primary navigation:

Home

Schedule

Clients

Onboarding

Exercise Programs

Assessments

Services

Messages

Tasks

Team

Reports

Admin

SERVICES NAVIGATION
Under Services, create expandable navigation or sub-navigation for:

Personal Training

Pilates

Medical Exercise

Nutrition

Recovery

Apparatix

Recovery must be designed to support multiple recovery services, including:

Massage Therapy

Assisted Stretching

Do not assume every client participates in every service.

For modules that are not yet built, create polished placeholder pages rather than inventing functionality.

BRANDING / UX
Use FredFit Portal as the visible product name.

The design should communicate:

warmth

personal relationships

health and vitality

premium concierge service

professionalism

optimism

human connection

individualized care

Avoid a sterile medical-record appearance.

Use:

generous white space

rounded cards

excellent typography

clean navigation

subtle depth

polished fitness/wellness visual language

welcoming dashboards

simple data visualization areas

Create a flexible design system so that official FFS colors, logo, typography, photography, and other brand assets can be added later.

USER / STAFF ARCHITECTURE
Create a user/staff architecture supporting these initial role families:

Owner / Administrator

Leadership

Trainer / Pilates Instructor

Medical Exercise Specialist

Registered Dietitian

Recovery Professional

Administrative Staff

Design roles so additional roles can be created later.

Do NOT rely only on role names for authorization.

Create an architecture capable of granular permissions including:

view clients

edit clients

view health information

edit health information

view assessments

create assessments

edit assessments

upload assessment media

view assessment media

view exercise programs

edit exercise programs

view Medical Exercise records

edit Medical Exercise records

view nutrition records

edit nutrition records

view recovery records

edit recovery records

view client communications

participate in client communications

manage scheduling

manage staff

view reports

manage system settings

STAFF RECORD
Create a staff member entity separate from authentication credentials.

A staff record should anticipate:

first name

last name

preferred name

email

phone

employment status

job title

role

hire date

biography

profile photo

credentials

certifications

credential expiration dates

assigned locations

authorized services

active/inactive status

Do not build payroll functionality yet.

CLIENT RECORD
Create the foundational client entity.

For this phase, include:

unique client ID

first name

last name

preferred name

date of birth

email

phone

status

date joined

primary location

assigned primary trainer

assigned RDN

assigned Medical Exercise Specialist

assigned Recovery Professional

general goals

important alerts

internal relationship notes

Do not attempt to create a complete medical record yet.

Health-history architecture will be expanded later.

Design the client record so every future module attaches to the SAME client record rather than creating duplicate client records.

CLIENT SERVICE ENROLLMENT
Create a foundational relationship for client service enrollments.

A client may be enrolled in:

Personal Training

Pilates

Medical Exercise

Nutrition

Recovery

Apparatix

Onboarding or assessment-based services

Each client-service enrollment should be capable of storing:

client

service

status

start date

end date

assigned provider(s)

frequency if applicable

internal notes

active / inactive / completed / pending status

Do not build advanced service workflows yet.

This entity is important because not every client participates in every service.

CLIENT PROFILE SHELL
Create a client profile page with these primary tabs:

Overview

Health & Safety

Assessments

Exercise

Services

Progress

Documents

Notes

Do NOT create permanent tabs for Medical Exercise, Nutrition, Apparatix, or Recovery on every client.

Those should appear dynamically inside the Services area based on the client's actual service enrollments.

OVERVIEW TAB
For this phase, show foundational information such as:

client name

client status

date joined

primary location

primary trainer

assigned specialists

active services

general goals

important alerts

recent activity placeholders

next appointment placeholder

onboarding status placeholder

HEALTH & SAFETY TAB
Create only a placeholder in this phase.

Future content may include:

health history

diagnoses

injuries

medications

precautions

contraindications

physician information

referral information

Do not invent detailed medical fields yet.

ASSESSMENTS TAB
Create a placeholder that anticipates multiple assessment types over time.

Future assessment types may include:

InBody

gait analysis

Functional Movement Screen / FMS

initial physical assessment

Pilates assessment

postural assessment

Medical Exercise assessment

Apparatix assessment

other structured FFS assessments

ASSESSMENT ARCHITECTURE
Create foundational entities capable of supporting:

assessment_types
assessment_instances
assessment_metrics
assessment_results
assessment_media

An assessment instance should eventually support:

client

assessment type

assessment date

assessor

status

overall score where applicable

notes

comparison to prior assessment

An assessment metric/result should eventually support:

metric or movement name

numeric or categorical result

unit

left/right side where applicable

score

observations

graphable flag

display order

Do not build full assessment forms yet.

PROGRESS / GRAPH ARCHITECTURE
The client Progress area must eventually support visual longitudinal progress.

Architect assessment data so repeated measurements can be graphed over time.

Examples may include:

weight

skeletal muscle mass

body fat mass

percent body fat

visceral fat

phase angle

ECW/TBW

FMS composite score

individual FMS movement scores

mobility measures

strength measures

balance measures

Pilates/Apparatix levels

other future assessment outcomes

Do not build advanced charts yet, but ensure repeated measurements are stored historically rather than overwritten.

Every assessment must be treated as a dated assessment instance so FredFit Portal can compare:

Initial Assessment
→ Reassessment
→ Future Reassessment

Do not overwrite prior assessment results.

FUNCTIONAL MOVEMENT SCREEN / VIDEO ARCHITECTURE
Future FMS assessments must support individual movement records rather than only one composite score.

Anticipate these movements:

Deep Squat

Hurdle Step

Inline Lunge

Shoulder Mobility

Active Straight-Leg Raise

Trunk Stability Push-Up

Rotary Stability

Each movement result should be capable of storing:

score

left score where applicable

right score where applicable

pain / clearing-test indicator

practitioner observations

corrective priority

associated video attachment

FredFit Portal will eventually allow a client to view the video associated with an FMS movement alongside that movement's score.

Do not implement the full client-facing FMS interface yet.

MEDIA / FILE ARCHITECTURE
Create a provider-neutral media attachment architecture.

A media record should eventually support:

client

related entity type

related entity ID

assessment

assessment movement/result

storage provider

external file ID or object key

file name

file type

file size

visibility classification

uploaded by

uploaded date

archived status

Do NOT hard-code the architecture specifically to pCloud, AWS S3, or Lovable storage.

The final system may use AWS S3 for protected or identifiable files and videos.

The goal is to allow storage providers to change later without rebuilding the assessment architecture.

EXERCISE TAB
Create a placeholder for future:

current exercise program

previous programs

assigned homework

exercise history

corrective exercises

The main Exercise Programs navigation will later contain:

Exercise Library

Program Templates

Client Programs

Do not build the full exercise-programming engine yet.

SERVICES TAB
Display the client's actual service enrollments dynamically.

Examples:

Personal Training — Active
Pilates — Active
Medical Exercise — Referral Pending
Nutrition — Completed
Recovery — Active
Apparatix — Inactive

Only relevant services should appear.

PROGRESS TAB
Create a polished placeholder designed for future:

progress graphs

assessment comparisons

functional outcomes

milestones

goal progress

movement improvements

qualitative wins

The future client-facing experience should be capable of showing both quantitative and qualitative progress.

Example future qualitative wins:

reduced discomfort climbing stairs

improved posture

improved core activation

improved balance

increased strength

improved movement confidence

Do not fabricate these for demo clients unless they are clearly labeled fictional demo content.

HOME DASHBOARD
Create the initial dashboard framework.

Include cards/areas for:

Today's Schedule

Needs Attention

Client Follow-Up

Reassessments Due

Medical Exercise

Staff

Recent Activity

Quick Actions

Use dummy information only.

The dashboard architecture should support future role-based differences.

Example:

Owner / leadership:
organization-wide information

Individual practitioner:
their schedule, clients, notes due, messages, tasks, and reassessments

SCHEDULING ARCHITECTURE
FredFit Portal is intended eventually to replace Fresha.

Do not build the full scheduling engine yet.

However, create a scheduling foundation capable of eventually supporting:

services

providers

locations

resources

appointments

recurring appointments

availability

attendance

cancellations

no-shows

late cancellations

waitlists

memberships

packages

account credits

reminders

appointment documentation requirements

Keep financial/billing features out of this phase.

DOCUMENTATION ARCHITECTURE
Every completed service appointment will eventually create an appropriate documentation requirement.

Future requirements:

Personal Training:
brief session note after every session

Pilates:
brief session note after every session

Medical Exercise:
structured session note after every session

Massage:
SOAP note after every session

Nutrition:
full dietitian session summary that can later be delivered securely to the client through FredFit Portal

Do not build all note forms yet.

Create the architecture so a completed appointment can later generate a documentation task.

COMMUNICATION ARCHITECTURE
FredFit Portal will eventually contain all client-to-staff communication.

FFS clients should be able to message their assigned practitioners inside the portal.

Employees should not need to provide personal cell phone numbers to clients.

Client communication must remain owned and retained by Fredericksburg Fitness Studio.

Future architecture should support:

conversations
conversation_members
messages
message_attachments

Leadership/authorized administrators must eventually be capable of appropriate oversight.

Conversation history should remain with the client record even if an employee leaves FFS or the client is reassigned.

Do not build the client-facing messaging system yet.

DATABASE FOUNDATION
Create a clean relational data model.

At minimum, anticipate or create as appropriate:

users
staff_members
roles
permissions
role_permissions
user_permissions
clients
client_staff_assignments
client_service_enrollments
locations
services
staff_services
staff_locations
staff_credentials
tasks
notifications
audit_log
assessment_types
assessment_instances
assessment_metrics
assessment_results
media_attachments

Also architect for future:

appointments
recurring_appointments
attendance
session_notes
soap_notes
nutrition_notes
client_summaries
exercise_library
programs
program_exercises
client_programs
conversations
conversation_members
messages
message_attachments
documents

Do not over-engineer future modules in this first phase.

Use appropriate:

primary keys

foreign keys

timestamps

created_by

updated_by

archived/inactive states

relationship tables

historical records

AUDIT ARCHITECTURE
Create an audit_log foundation capable of eventually recording:

user

action

entity type

entity ID

timestamp

summary

previous value where appropriate

new value where appropriate

Do not expose a complex audit interface yet.

DATA SAFETY
Never hard-delete important client or staff records through normal user interface actions.

Use archive/inactive states.

Maintain clear separation between:

authentication account
staff profile
client record

A staff member may have a login account.

A client will eventually have a login account.

Authentication identity must therefore NOT be synonymous with a staff member record.

DUMMY DATA
Create several clearly fictional staff members representing different roles.

Create approximately 8–10 fictional clients with varied:

statuses

service enrollments

staff assignments

locations

onboarding status

Do not use real Fredericksburg Fitness Studio client or employee names.

Clearly identify the environment as demo/development data.

ADMIN FOUNDATION
Create an Admin area shell where authorized administrators can eventually manage:

locations

services

roles

permissions

staff access

system settings

assessment types

documentation templates

For this phase, basic viewing/editing of locations, services, and roles is sufficient if appropriate.

QUALITY REQUIREMENTS
Before completing this phase:

Confirm navigation works.

Confirm client records open correctly.

Confirm staff records open correctly.

Confirm client-to-staff assignments work.

Confirm client service enrollments display correctly.

Confirm irrelevant services do not clutter every client profile.

Confirm placeholder modules do not generate errors.

Confirm the interface is responsive.

Confirm no real client or employee information has been used.

Review the database architecture for duplicate or conflicting entities.

Confirm historical assessment architecture does not overwrite previous results.

Confirm media architecture is storage-provider neutral.

Confirm authentication identity is separate from staff/client profile entities.

Do not invent business rules that were not specified.

Do not automatically proceed into the next development phase.

At the end, provide a concise summary of:

what was built

database entities created

authentication/authorization architecture

client-service architecture

assessment architecture

media/storage architecture

assumptions made

anything needing clarification before Phase 2

ADD TO LOVABLE PROMPT #1 — SCHEDULING, CREDITS & SUPERBILLS

SCHEDULING IS A CORE REQUIREMENT

FredFit Portal is intended to replace Fresha.

Scheduling is not optional or merely informational. It is a foundational operational component because client balances, makeup eligibility, Apparatix credits, attendance history, documentation requirements, and future superbills depend upon accurate appointment records.

Architect the scheduling system so every appointment can eventually store:

client

service

provider

location

appointment date

start time

end time

duration

recurring appointment relationship

appointment status

attendance status

cancellation date/time

cancellation notice duration

no-show status

late-cancel status

membership/package relationship

account-credit relationship

documentation requirement

completed-service status

billing/superbill eligibility where applicable

Do not build the complete scheduling user experience in Phase 1, but treat appointments and attendance as core database entities rather than placeholders.

CLIENT MAKEUP / CREDIT LEDGER

FredFit Portal must eventually show an accurate client credit balance.

Do not store only a single editable number such as "3 makeups remaining."

Create a transaction/ledger architecture so every credit has a history.

Anticipate:

client_credits
credit_transactions

A credit transaction should eventually support:

client

credit type

amount

date created

reason

originating appointment

originating cancellation

service/category restrictions

expiration date if applicable

redeemed appointment

created by

status

notes

The system should be capable of calculating the current available balance from transaction history.

CREDIT TYPES

At minimum, anticipate:

Personal Training Makeup

Pilates Makeup

Medical Exercise Makeup if applicable

Apparatix Credit

General Account Credit

Other configurable credit types

Do not assume all credits are interchangeable.

The system must support rules restricting a credit to a particular service or category.

APPARATIX CREDIT TRACKING

FredFit Portal must eventually be able to answer immediately:

"How many Apparatix credits does this client currently have?"

The client profile should eventually show:

Apparatix Membership
Current frequency
Upcoming reservations
Available Apparatix credits
Credit history
Credits used
Credits earned
Expiration status if applicable

When appropriate business rules are configured later, cancellations with sufficient notice may generate a defined account/Apparatix credit.

Do NOT hard-code cancellation rules during Phase 1 unless specifically instructed.

Create a configurable rule architecture so FFS leadership can later change:

required cancellation notice

value of credit

eligible service

expiration

whether the credit is transferable to another FFS service

maximum balances if applicable

MAKEUP TRACKING

FredFit Portal must eventually allow staff to answer:

How many makeups does this client have?

Why did they receive each makeup?

When was each makeup earned?

Has it been used?

What appointment used it?

Does it expire?

What service can it be used for?

The client should eventually be able to see an appropriate simplified version of their available credits from the client portal.

Leadership/staff should see the full transaction history.

SUPERBILL ARCHITECTURE

FredFit Portal must eventually generate superbills for eligible services.

Superbills should be generated from structured client, provider, service, appointment, and billing information rather than manually recreating the document each time.

Create foundational architecture anticipating:

superbills
superbill_items
provider_billing_profiles
client_insurance_information
diagnosis_codes
procedure_codes

Do not populate real patient information or real billing claims in the development environment.

A future superbill should be capable of containing appropriate fields such as:

client name

client date of birth

client address where required

provider name

provider credentials

provider NPI where applicable

business/practice name

practice address

tax identification information where appropriate

date of service

service description

procedure/CPT code

diagnosis/ICD-10 code where appropriate

units

fee charged

amount paid where applicable

superbill number

issue date

provider signature/attestation if required

Do not invent procedure codes, diagnosis codes, reimbursement rules, or insurance requirements.

The architecture must allow authorized staff to configure approved codes and billing information later.

SUPERBILL GENERATION RULES

A superbill should eventually be generated only when the service/appointment meets FFS-defined eligibility requirements.

Architect for a workflow similar to:

Scheduled Appointment
→ Appointment Completed
→ Required Documentation Completed
→ Billing Information Verified
→ Eligible for Superbill
→ Superbill Generated
→ Stored in Client Record
→ Available in Client Portal

Do not automatically implement this business rule yet; create the relationships needed to support it later.

CLIENT ACCESS TO SUPERBILLS

When the client-facing portal is built, clients must be able to securely access their own superbills.

Anticipate a client section such as:

Documents
→ Superbills

Clients should eventually be able to view/download superbills by:

date of service

provider

service type

date range

Staff should be able to view superbill status from the internal client record.

SUPERBILL RECORD HISTORY

Generated superbills should not be silently overwritten.

Architect for:

draft

finalized

voided/corrected

replacement version

Maintain an audit history showing when the superbill was generated and by whom.

If a finalized superbill is corrected later, preserve the historical record and create an appropriate corrected/replacement version rather than overwriting the original.

CLIENT PROFILE — ADD FINANCIAL/SCHEDULING SUMMARY

On the client Overview page, anticipate a concise section showing:

Upcoming Appointment
Regular Schedule
Active Membership/Service
Available Makeups
Available Apparatix Credits
Other Account Credits
Outstanding Documentation or administrative items if appropriate

Do not expose sensitive internal financial information unnecessarily.

ADMIN SETTINGS — ADD

The future Admin area should support configuration of:

cancellation policies

makeup-credit rules

Apparatix-credit rules

credit expiration rules

services eligible for superbills

provider billing profiles

approved procedure codes

approved diagnosis-code workflows

superbill templates

organization billing information

DATABASE FOUNDATION — ADD OR ANTICIPATE

appointments
recurring_appointments
appointment_status_history
attendance
client_credits
credit_transactions
memberships
client_memberships
packages
client_packages
superbills
superbill_items
provider_billing_profiles
client_insurance_information
procedure_codes
diagnosis_codes

IMPORTANT DATA PRINCIPLE

Do not calculate client entitlement from an editable text field.

Scheduling history, cancellation history, memberships, packages, makeups, Apparatix credits, and account credits must be represented as structured records with transaction history so FredFit Portal can accurately explain how a client's current balance was calculated.   GOOGLE WORKSPACE / VIRTUAL RDN INTEGRATION

Fredericksburg Fitness Studio uses its business Google Workspace environment for virtual Registered Dietitian appointments.

All Registered Dietitian appointments are currently virtual.

FredFit Portal should be architected to integrate with Google Workspace, particularly:

Google Calendar

Google Meet

FredFit Portal must remain the authoritative scheduling system.

Do NOT design Google Calendar as the primary database for appointments.

Future workflow:

FredFit Portal RDN Appointment Created
→ Create or synchronize corresponding Google Calendar event
→ Generate Google Meet meeting link
→ Store Google Calendar event ID in FredFit Portal
→ Store Google Meet URL in FredFit Portal
→ Make meeting information available to authorized staff
→ Later make the Meet link available securely to the client through the client portal

If an appointment is rescheduled or canceled in FredFit Portal, the corresponding Google Calendar event should eventually be updated or canceled rather than generating duplicate calendar events.

ARCHITECTURE REQUIREMENTS

An appointment should be capable of storing:

virtual / in-person appointment type

external calendar provider

external calendar event ID

virtual meeting provider

virtual meeting URL

virtual meeting ID where applicable

synchronization status

last synchronized timestamp

synchronization error/status information

Design integrations so other calendar or virtual-meeting providers could be supported in the future without restructuring the appointment entity.

RDN APPOINTMENTS

Registered Dietitian appointments should support:

virtual appointment designation

assigned RDN

client

date/time

duration

Google Calendar synchronization

Google Meet link

appointment status

attendance

documentation requirement

client summary requirement

superbill eligibility where applicable

Future RDN workflow:

Appointment Scheduled
→ Google Calendar / Meet Created
→ Client Receives Portal Access to Meeting Link
→ Appointment Occurs
→ Appointment Marked Complete
→ RDN Session Summary Required
→ Summary Saved to Client Record
→ Approved Client-Facing Summary Published to Client Portal
→ Superbill Generated if the service meets configured eligibility requirements

Do not build the complete Google Workspace integration during Phase 1 unless specifically required to establish the architecture.

Do not use real Google credentials or production client information in the development environment.

Prepare the application so Google OAuth/API credentials can later be configured securely through environment variables or protected secrets rather than hard-coded into application code.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fredfit-flow.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2cd78054-c720-4de3-bd2c-022e2a047ef2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
