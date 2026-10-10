/**
 * DEMO / DEVELOPMENT DATA ONLY.
 *
 * Every person, credential, appointment and note below is synthetic and
 * fictional. No real Fredericksburg Fitness Studio client or employee
 * information is used anywhere in this environment.
 */

import type {
  Appointment,
  AppointmentStatusHistory,
  BlockedTime,
  AssessmentInstance,
  AssessmentMetric,
  AssessmentResult,
  AssessmentType,
  AuditLogEntry,
  Client,
  ClientMembership,
  ClientServiceEnrollment,
  ClientStaffAssignment,
  Conversation,
  CreditRule,
  CreditTransaction,
  CreditType,
  ClassParticipant,
  ClassSession,
  FormTemplate,
  Location,
  LocationResource,
  MakeupCredit,
  MediaAttachment,
  Membership,
  Message,
  Permission,
  PermissionKey,
  ProviderBillingProfile,
  RecurringAppointment,
  Role,
  RolePermission,
  ScheduleException,
  PublicBookingConfig,
  ServiceResourceRequirement,
  StaffAvailability,
  Service,
  ServiceAgreement,
  StaffCredential,
  StaffMember,
  Superbill,
  Task,
  UserAccount,
} from "./types";

const NOW = "2026-08-30T12:00:00.000Z";

function meta(id: string) {
  return { id, createdAt: NOW, updatedAt: NOW, archivedAt: null };
}

/* ---------------------------- permissions --------------------------- */

export const PERMISSIONS: Permission[] = [
  { key: "clients.view", label: "View clients", group: "Clients", description: "See client records and rosters." },
  { key: "clients.edit", label: "Edit clients", group: "Clients", description: "Create and update client records." },
  { key: "health.view", label: "View health information", group: "Health", description: "See health & safety information." },
  { key: "health.edit", label: "Edit health information", group: "Health", description: "Maintain health & safety information." },
  { key: "assessments.view", label: "View assessments", group: "Assessments", description: "See assessment instances and results." },
  { key: "assessments.create", label: "Create assessments", group: "Assessments", description: "Start a new dated assessment instance." },
  { key: "assessments.edit", label: "Edit assessments", group: "Assessments", description: "Amend assessment results." },
  { key: "assessments.finalize", label: "Finalize / sign assessments", group: "Assessments", description: "Sign completed assessments so they become part of the permanent record." },
  { key: "assessment_templates.manage", label: "Manage assessment templates", group: "Assessments", description: "Create, edit, activate and version assessment templates." },
  { key: "reassessments.manage", label: "Manage reassessment cycles", group: "Assessments", description: "Run quarterly reassessment cycles and results reviews." },
  { key: "assessment_media.upload", label: "Upload assessment media", group: "Assessments", description: "Attach movement video and imagery." },
  { key: "assessment_media.view", label: "View assessment media", group: "Assessments", description: "View attached assessment media." },
  { key: "programs.view", label: "View exercise programs", group: "Exercise", description: "See programs and homework." },
  { key: "programs.edit", label: "Edit exercise programs", group: "Exercise", description: "Build and assign programs." },
  { key: "medical_exercise.view", label: "View Medical Exercise records", group: "Medical Exercise", description: "See Medical Exercise documentation." },
  { key: "medical_exercise.edit", label: "Edit Medical Exercise records", group: "Medical Exercise", description: "Document Medical Exercise sessions." },
  { key: "nutrition.view", label: "View nutrition records", group: "Nutrition", description: "See dietitian documentation." },
  { key: "nutrition.edit", label: "Edit nutrition records", group: "Nutrition", description: "Document nutrition sessions." },
  { key: "recovery.view", label: "View recovery records", group: "Recovery", description: "See massage and stretching records." },
  { key: "recovery.edit", label: "Edit recovery records", group: "Recovery", description: "Document recovery sessions." },
  { key: "communications.view", label: "View client communications", group: "Communication", description: "Oversight of client conversations." },
  { key: "communications.participate", label: "Participate in communications", group: "Communication", description: "Message clients in the portal." },
  { key: "scheduling.manage", label: "Manage scheduling", group: "Scheduling", description: "Book, move and cancel appointments." },
  { key: "credits.view", label: "View credits", group: "Entitlements", description: "See makeup and account credit balances." },
  { key: "credits.manage", label: "Manage credits", group: "Entitlements", description: "Grant, redeem and adjust credits." },
  { key: "billing.view", label: "View billing & superbills", group: "Billing", description: "See superbill status and history." },
  { key: "billing.manage", label: "Manage billing & superbills", group: "Billing", description: "Generate and finalize superbills." },
  { key: "staff.manage", label: "Manage staff", group: "Administration", description: "Maintain staff records and access." },
  { key: "reports.view", label: "View reports", group: "Administration", description: "Access organizational reporting." },
  { key: "settings.manage", label: "Manage system settings", group: "Administration", description: "Configure the platform." },
];

const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

/* ------------------------------- roles ------------------------------ */

export const ROLES: Role[] = [
  { ...meta("role-owner"), key: "owner", name: "Owner / Administrator", description: "Full organizational access.", isSystem: true },
  { ...meta("role-leadership"), key: "leadership", name: "Leadership", description: "Organization-wide oversight without system administration.", isSystem: true },
  { ...meta("role-trainer"), key: "trainer", name: "Trainer / Pilates Instructor", description: "Delivers personal training and Pilates.", isSystem: false },
  { ...meta("role-mes"), key: "medical_exercise_specialist", name: "Medical Exercise Specialist", description: "Delivers Medical Exercise programming.", isSystem: false },
  { ...meta("role-rdn"), key: "dietitian", name: "Registered Dietitian", description: "Delivers virtual nutrition care.", isSystem: false },
  { ...meta("role-recovery"), key: "recovery_professional", name: "Recovery Professional", description: "Massage therapy and assisted stretching.", isSystem: false },
  { ...meta("role-admin-staff"), key: "administrative_staff", name: "Administrative Staff", description: "Front desk, scheduling and client coordination.", isSystem: false },
  { ...meta("role-limited"), key: "limited", name: "Limited / Read-only", description: "Views their own calendar and basic client information. No editing.", isSystem: false },
];

const grant = (roleId: string, keys: PermissionKey[]): RolePermission[] =>
  keys.map((permission) => ({ roleId, permission }));

export const ROLE_PERMISSIONS: RolePermission[] = [
  ...grant("role-owner", ALL_PERMISSION_KEYS),
  ...grant("role-leadership", [
    "clients.view", "clients.edit", "health.view", "assessments.view", "assessments.finalize",
    "assessment_templates.manage", "reassessments.manage", "programs.view",
    "medical_exercise.view", "nutrition.view", "recovery.view", "communications.view",
    "scheduling.manage", "credits.view", "credits.manage", "billing.view", "reports.view", "staff.manage",
  ]),
  ...grant("role-trainer", [
    "clients.view", "health.view", "assessments.view", "assessments.create", "assessments.edit",
    "assessments.finalize", "assessment_media.upload", "assessment_media.view", "programs.view", "programs.edit",
    "communications.participate", "credits.view",
  ]),
  ...grant("role-mes", [
    "clients.view", "health.view", "health.edit", "assessments.view", "assessments.create",
    "assessments.edit", "assessments.finalize", "assessment_media.upload", "assessment_media.view", "programs.view",
    "programs.edit", "medical_exercise.view", "medical_exercise.edit", "communications.participate",
  ]),
  ...grant("role-rdn", [
    "clients.view", "health.view", "nutrition.view", "nutrition.edit", "assessments.view",
    "assessments.create", "assessments.edit", "assessments.finalize",
    "communications.participate", "billing.view",
  ]),
  ...grant("role-recovery", [
    "clients.view", "health.view", "recovery.view", "recovery.edit", "communications.participate",
  ]),
  ...grant("role-admin-staff", [
    "clients.view", "clients.edit", "scheduling.manage", "credits.view", "communications.participate", "billing.view",
  ]),
];

/* ----------------------------- locations ---------------------------- */

export const LOCATIONS: Location[] = [
  { ...meta("loc-cowan"), name: "2541 Cowan Blvd", addressLine1: "2541 Cowan Blvd", city: "Fredericksburg", state: "VA", postalCode: "22401", phone: "(540) 555-0100", isActive: true },
  { ...meta("loc-william"), name: "541 William Street", addressLine1: "541 William Street", city: "Fredericksburg", state: "VA", postalCode: "22401", phone: "(540) 555-0120", isActive: true },
  { ...meta("loc-virtual"), name: "Virtual (Google Meet)", addressLine1: "\u2014", city: "\u2014", state: "VA", postalCode: "\u2014", isActive: true },
  { ...meta("loc-phone"), name: "Phone call (we call you)", addressLine1: "\u2014", city: "\u2014", state: "VA", postalCode: "\u2014", isActive: true },
  { ...meta("loc-in-home"), name: "In Home / Client Location", addressLine1: "Client address on file", city: "\u2014", state: "VA", postalCode: "\u2014", isActive: true },
];

/**
 * Canonical rooms / resources. FFS has confirmed the William Street Pilates
 * Studio; Cowan Blvd rooms have NOT been provided, so nothing permanent is
 * invented — leadership configures them in Business Configuration.
 */
export const LOCATION_RESOURCES: LocationResource[] = [
  { ...meta("res-cowan-studio-1"), locationId: "loc-cowan", name: "Studio 1", kind: "exclusive", capacity: 1, displayOrder: 1, isActive: true },
  { ...meta("res-cowan-studio-2"), locationId: "loc-cowan", name: "Studio 2", kind: "exclusive", capacity: 1, displayOrder: 2, isActive: true },
  { ...meta("res-cowan-apparatix"), locationId: "loc-cowan", name: "Apparatix Area", kind: "capacity", capacity: 6, displayOrder: 3, isActive: true },
  { ...meta("res-cowan-recovery"), locationId: "loc-cowan", name: "Recovery Room", kind: "exclusive", capacity: 1, displayOrder: 4, isActive: true },
  { ...meta("res-cowan-consult"), locationId: "loc-cowan", name: "Consultation Room", kind: "exclusive", capacity: 1, displayOrder: 5, isActive: true },
  { ...meta("res-cowan-demo-floor"), locationId: "loc-cowan", name: "Main Training Floor", kind: "capacity", capacity: 6, displayOrder: 6, isActive: true },
  { ...meta("res-william-pilates"), locationId: "loc-william", name: "Pilates Room", kind: "exclusive", capacity: 1, displayOrder: 1, isActive: true, notes: "Confirmed FFS resource." },
  { ...meta("res-william-treatment"), locationId: "loc-william", name: "Treatment Room 1", kind: "exclusive", capacity: 1, displayOrder: 2, isActive: true },
  { ...meta("res-william-treatment-2"), locationId: "loc-william", name: "Treatment Room 2", kind: "exclusive", capacity: 1, displayOrder: 3, isActive: true },
];

/* ------------------------------ services ---------------------------- */

export const SERVICES: Service[] = [
  { ...meta("svc-pt"), name: "Private PT", category: "personal_training", defaultDurationMinutes: 60, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "session_note", superbillPossible: false, subCategory: "Private PT", sessionFormat: "individual", clientCapacity: 1, displayOrder: 1, isActive: true },
  { ...meta("svc-pt-partner"), name: "Partner PT", category: "personal_training", defaultDurationMinutes: 60, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "session_note", superbillPossible: false, subCategory: "Partner PT", sessionFormat: "partner", clientCapacity: 2, displayOrder: 2, isActive: true },
  { ...meta("svc-pt-trio"), name: "Trio PT", category: "personal_training", defaultDurationMinutes: 60, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "session_note", superbillPossible: false, subCategory: "Trio PT", sessionFormat: "trio", clientCapacity: 3, displayOrder: 3, isActive: true },
  { ...meta("svc-mes"), name: "Medical Exercise", category: "medical_exercise", defaultDurationMinutes: 60, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "structured_session_note", superbillPossible: true, sessionFormat: "individual", clientCapacity: 1, displayOrder: 4, isActive: true },
  { ...meta("svc-pilates"), name: "Private Pilates", category: "pilates", defaultDurationMinutes: 55, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "session_note", superbillPossible: false, subCategory: "Private Pilates", sessionFormat: "individual", clientCapacity: 1, displayOrder: 5, isActive: true },
  { ...meta("svc-pilates-partner"), name: "Partner Pilates", category: "pilates", defaultDurationMinutes: 55, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "session_note", superbillPossible: false, subCategory: "Partner Pilates", sessionFormat: "partner", clientCapacity: 2, displayOrder: 6, isActive: true },
  { ...meta("svc-nutrition"), name: "Nutrition Therapy (Virtual)", category: "nutrition", defaultDurationMinutes: 45, deliveryMode: "virtual", isVirtualByDefault: true, requiresDocumentation: true, documentationType: "nutrition_summary", superbillPossible: true, sessionFormat: "individual", displayOrder: 7, isActive: true },
  { ...meta("svc-massage"), name: "Massage Therapy", category: "recovery", defaultDurationMinutes: 60, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "soap_note", superbillPossible: false, subCategory: "Massage Therapy", sessionFormat: "individual", displayOrder: 8, isActive: true },
  { ...meta("svc-stretch"), name: "Assisted Stretching", category: "recovery", defaultDurationMinutes: 30, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "session_note", superbillPossible: false, subCategory: "Assisted Stretching", sessionFormat: "individual", displayOrder: 9, isActive: true },
  { ...meta("svc-apparatix"), name: "Apparatix (up to 6 people)", category: "apparatix", defaultDurationMinutes: 50, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "session_note", superbillPossible: false, isGroupClass: true, classCapacity: 6, sessionFormat: "group", clientCapacity: 6, displayOrder: 10, isActive: true },
  { ...meta("svc-apparatix-plus"), name: "Apparatix Plus (up to 6 people)", category: "apparatix", defaultDurationMinutes: 50, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "session_note", superbillPossible: false, subCategory: "Apparatix Plus", isGroupClass: true, classCapacity: 6, sessionFormat: "group", clientCapacity: 6, displayOrder: 11, isActive: true },
  { ...meta("svc-apparatix-assessment"), name: "Apparatix Assessment", category: "apparatix", defaultDurationMinutes: 60, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "assessment_report", superbillPossible: false, sessionFormat: "individual", displayOrder: 12, isActive: true },
  { ...meta("svc-discovery"), name: "Discovery Call", category: "onboarding", defaultDurationMinutes: 30, deliveryMode: "virtual", isVirtualByDefault: true, requiresDocumentation: false, superbillPossible: false, subCategory: "Discovery Call", makeupEligible: false, countsTowardCapacity: false, displayOrder: 13, isActive: true },
  { ...meta("svc-ob-inbody"), name: "InBody Analysis", category: "onboarding", defaultDurationMinutes: 30, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "assessment_report", superbillPossible: false, sessionFormat: "individual", displayOrder: 14, isActive: true },
  { ...meta("svc-gait"), name: "Gait Analysis", category: "onboarding", defaultDurationMinutes: 30, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "assessment_report", superbillPossible: false, sessionFormat: "individual", displayOrder: 15, isActive: true },
  { ...meta("svc-ob-physical"), name: "Initial Physical Assessment / FMS", category: "onboarding", defaultDurationMinutes: 60, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "assessment_report", superbillPossible: false, sessionFormat: "individual", displayOrder: 16, isActive: true },
  { ...meta("svc-ipa-fall"), name: "Initial Physical Assessment / Fall Risk Screening", category: "onboarding", defaultDurationMinutes: 60, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "assessment_report", superbillPossible: false, sessionFormat: "individual", displayOrder: 17, isActive: true },
  { ...meta("svc-ipa-wheelchair"), name: "Initial Physical Assessment / Wheelchair", category: "onboarding", defaultDurationMinutes: 60, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "assessment_report", superbillPossible: false, sessionFormat: "individual", displayOrder: 18, isActive: true },
  { ...meta("svc-ob-corrective"), name: "Corrective Exercise", category: "onboarding", defaultDurationMinutes: 60, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "structured_session_note", superbillPossible: false, sessionFormat: "individual", displayOrder: 19, isActive: true },
  { ...meta("svc-ob-pilates"), name: "Pilates Assessment", category: "onboarding", defaultDurationMinutes: 55, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "assessment_report", superbillPossible: false, sessionFormat: "individual", displayOrder: 20, isActive: true },
  { ...meta("svc-ob-rdn"), name: "Final RDN Consult + Program Recommendations", category: "onboarding", defaultDurationMinutes: 60, deliveryMode: "virtual", isVirtualByDefault: true, requiresDocumentation: true, documentationType: "nutrition_summary", superbillPossible: true, sessionFormat: "individual", displayOrder: 21, isActive: true },
  { ...meta("svc-quarterly-assessment"), name: "Quarterly Assessment", category: "onboarding", defaultDurationMinutes: 60, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "assessment_report", superbillPossible: false, sessionFormat: "individual", displayOrder: 22, isActive: true },
  { ...meta("svc-mobility"), name: "Mobility", category: "personal_training", defaultDurationMinutes: 45, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "session_note", superbillPossible: false, subCategory: "Mobility", sessionFormat: "individual", displayOrder: 23, isActive: true },
  { ...meta("svc-wws"), name: "Weekend Workout Series (up to 6 people)", category: "personal_training", defaultDurationMinutes: 60, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "session_note", superbillPossible: false, subCategory: "Weekend Workout Series", isGroupClass: true, classCapacity: 6, sessionFormat: "group", clientCapacity: 6, displayOrder: 24, isActive: true },
  { ...meta("svc-adv-wws"), name: "Advanced Weekend Workout Series (up to 6 people)", category: "personal_training", defaultDurationMinutes: 60, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "session_note", superbillPossible: false, subCategory: "Advanced Weekend Workout Series", isGroupClass: true, classCapacity: 6, sessionFormat: "group", clientCapacity: 6, displayOrder: 25, isActive: true },
  { ...meta("svc-quarterly-checkin"), name: "Quarterly Check-In (Virtual)", category: "onboarding", defaultDurationMinutes: 30, deliveryMode: "virtual", isVirtualByDefault: true, requiresDocumentation: false, superbillPossible: false, countsTowardCapacity: false, displayOrder: 26, isActive: true },
  { ...meta("svc-inhome-pt"), name: "In Home Private PT", category: "personal_training", defaultDurationMinutes: 60, deliveryMode: "in_home", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "session_note", superbillPossible: false, subCategory: "In Home", sessionFormat: "individual", displayOrder: 27, isActive: true },
  { ...meta("svc-inhome-mes"), name: "In Home Medical Exercise", category: "medical_exercise", defaultDurationMinutes: 60, deliveryMode: "in_home", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "structured_session_note", superbillPossible: true, subCategory: "In Home", sessionFormat: "individual", displayOrder: 28, isActive: true },
  /* Retired catalog entries \u2014 kept inactive so historical appointments and
     enrollments never lose their original service relationship. */
  { ...meta("svc-pilates-trio"), name: "Trio Pilates (retired)", category: "pilates", defaultDurationMinutes: 55, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "session_note", superbillPossible: false, displayOrder: 900, isActive: false },
  { ...meta("svc-onboarding"), name: "Onboarding & Initial Assessment (retired)", category: "onboarding", defaultDurationMinutes: 75, deliveryMode: "in_person", isVirtualByDefault: false, requiresDocumentation: true, documentationType: "assessment_report", superbillPossible: false, displayOrder: 901, isActive: false },
];

/* ------------------------------- staff ------------------------------ */

export const STAFF: StaffMember[] = [
  { ...meta("staff-8"), firstName: "Jennifer", lastName: "Scherer", email: "jennifer.scherer@demo.fredfitportal.com", jobTitle: "Founder / CEO", roleId: "role-owner", employmentStatus: "full_time", hireDate: "2015-01-05", weeklyHours: 40, contractedWeeklyCapacityHours: 20, primaryLocationId: "loc-cowan", displayOrder: 1, isBookable: true, biography: "Founder and CEO. Leads Apparatix assessments and registered dietitian onboarding consults.", isActive: true },
  { ...meta("staff-1"), firstName: "Jessica", lastName: "Domi", email: "jessica.domi@demo.fredfitportal.com", jobTitle: "President", roleId: "role-owner", employmentStatus: "full_time", hireDate: "2016-03-01", weeklyHours: 50, contractedWeeklyCapacityHours: 20, primaryLocationId: "loc-cowan", displayOrder: 2, isBookable: true, biography: "President. Oversees studio operations, growth and client experience.", isActive: true },
  { ...meta("staff-2"), firstName: "Jennifer", lastName: "Sawyer", email: "jennifer.sawyer@demo.fredfitportal.com", jobTitle: "Director of Staff Development", roleId: "role-leadership", employmentStatus: "full_time", hireDate: "2018-06-11", weeklyHours: 30, contractedWeeklyCapacityHours: 15, primaryLocationId: "loc-cowan", displayOrder: 3, isBookable: true, biography: "Leads staff development, coaching standards and programming quality.", isActive: true },
  { ...meta("staff-7"), firstName: "Meagan", lastName: "Freiwald", email: "meagan.freiwald@demo.fredfitportal.com", jobTitle: "Director of Client Engagement and Team Culture", roleId: "role-leadership", employmentStatus: "full_time", hireDate: "2019-07-15", weeklyHours: 35, contractedWeeklyCapacityHours: 15, primaryLocationId: "loc-cowan", displayOrder: 4, isBookable: true, biography: "Leads client engagement, onboarding experience and team culture.", isActive: true },
  { ...meta("staff-9"), firstName: "Samantha", lastName: "Kaval", preferredName: "Sam", email: "samantha.kaval@demo.fredfitportal.com", jobTitle: "Senior Health Promotion Specialist", roleId: "role-mes", employmentStatus: "full_time", hireDate: "2021-04-04", weeklyHours: 45, contractedWeeklyCapacityHours: 30, primaryLocationId: "loc-cowan", displayOrder: 5, isBookable: true, biography: "Medical exercise, corrective exercise and post-rehabilitation programming.", isActive: true },
  { ...meta("staff-10"), firstName: "Kim", lastName: "Weir", email: "kim.weir@demo.fredfitportal.com", jobTitle: "Recovery Specialist", roleId: "role-recovery", employmentStatus: "part_time", hireDate: "2022-05-02", weeklyHours: 30, contractedWeeklyCapacityHours: 24, primaryLocationId: "loc-william", displayOrder: 6, isBookable: true, biography: "Massage therapy and assisted stretching.", isActive: true },
  { ...meta("staff-3"), firstName: "Zara", lastName: "Nti-Brew", email: "zara.ntibrew@demo.fredfitportal.com", jobTitle: "Personal Trainer / Administrative Assistant", roleId: "role-trainer", employmentStatus: "full_time", hireDate: "2020-01-20", weeklyHours: 40, contractedWeeklyCapacityHours: 25, primaryLocationId: "loc-cowan", displayOrder: 7, isBookable: true, biography: "Personal training, Pilates support and front-desk coordination.", isActive: true },
  { ...meta("staff-11"), firstName: "John", lastName: "Johnson", email: "john.johnson@demo.fredfitportal.com", jobTitle: "Personal Trainer", roleId: "role-trainer", employmentStatus: "part_time", hireDate: "2021-02-15", weeklyHours: 10, contractedWeeklyCapacityHours: 8, primaryLocationId: "loc-william", displayOrder: 8, isBookable: true, biography: "Personal training at William Street and Cowan Blvd.", isActive: true },
  { ...meta("staff-5"), firstName: "Paula", lastName: "Colson", email: "paula.colson@demo.fredfitportal.com", jobTitle: "Personal Trainer", roleId: "role-trainer", employmentStatus: "part_time", hireDate: "2023-03-06", weeklyHours: 15, contractedWeeklyCapacityHours: 12, primaryLocationId: "loc-cowan", displayOrder: 9, isBookable: true, biography: "Personal training at Cowan Blvd.", isActive: true },
  { ...meta("staff-4"), firstName: "Jeff", lastName: "Smith", email: "jeff.smith@demo.fredfitportal.com", jobTitle: "Personal Trainer", roleId: "role-trainer", employmentStatus: "part_time", hireDate: "2024-01-08", weeklyHours: 3, contractedWeeklyCapacityHours: 3, primaryLocationId: "loc-cowan", displayOrder: 10, isBookable: true, biography: "Personal training at Cowan Blvd.", isActive: true },
  { ...meta("staff-12"), firstName: "Olivia", lastName: "Lowery", email: "olivia.lowery@demo.fredfitportal.com", jobTitle: "Personal Trainer", roleId: "role-trainer", employmentStatus: "part_time", hireDate: "2026-09-03", weeklyHours: 20, contractedWeeklyCapacityHours: 16, primaryLocationId: "loc-cowan", displayOrder: 11, isBookable: true, biography: "Personal training at Cowan Blvd.", isActive: true },
  { ...meta("staff-13"), firstName: "Kim", lastName: "Beardsley", email: "kim.beardsley@demo.fredfitportal.com", jobTitle: "Personal Trainer", roleId: "role-trainer", employmentStatus: "part_time", hireDate: "2026-09-03", weeklyHours: 20, contractedWeeklyCapacityHours: 16, primaryLocationId: "loc-cowan", displayOrder: 12, isBookable: true, biography: "Personal training at Cowan Blvd.", isActive: true },
];

export const STAFF_CREDENTIALS: StaffCredential[] = [
  { ...meta("cred-1"), staffId: "staff-3", name: "NASM-CPT", issuingBody: "NASM", identifier: "DEMO-00231", issuedOn: "2019-11-02", expiresOn: "2027-11-02" },
  { ...meta("cred-2"), staffId: "staff-3", name: "Comprehensive Pilates Certification", issuingBody: "Demo Pilates Institute", issuedOn: "2020-04-18", expiresOn: null },
  { ...meta("cred-3"), staffId: "staff-9", name: "Medical Exercise Specialist", issuingBody: "Demo METI", identifier: "DEMO-MES-887", issuedOn: "2021-08-01", expiresOn: "2026-11-30" },
  { ...meta("cred-4"), staffId: "staff-8", name: "Registered Dietitian Nutritionist", issuingBody: "CDR (demo)", identifier: "DEMO-RD-4412", issuedOn: "2018-01-10", expiresOn: "2027-05-31" },
  { ...meta("cred-5"), staffId: "staff-10", name: "Licensed Massage Therapist", issuingBody: "VA Board (demo)", identifier: "DEMO-LMT-1290", issuedOn: "2022-03-22", expiresOn: "2026-10-15" },
];

export const STAFF_LOCATIONS = [
  { staffId: "staff-4", locationId: "loc-cowan" },
  { staffId: "staff-5", locationId: "loc-cowan" },
  { staffId: "staff-1", locationId: "loc-cowan" },
  { staffId: "staff-2", locationId: "loc-cowan" },
  { staffId: "staff-3", locationId: "loc-cowan" },
  { staffId: "staff-3", locationId: "loc-william" },
  { staffId: "staff-9", locationId: "loc-cowan" },
  { staffId: "staff-8", locationId: "loc-virtual" },
  { staffId: "staff-10", locationId: "loc-william" },
  { staffId: "staff-7", locationId: "loc-cowan" },
  { staffId: "staff-8", locationId: "loc-william" },
  { staffId: "staff-8", locationId: "loc-cowan" },
  { staffId: "staff-9", locationId: "loc-cowan" },
  { staffId: "staff-10", locationId: "loc-cowan" },
  { staffId: "staff-11", locationId: "loc-william" },
  { staffId: "staff-11", locationId: "loc-cowan" },
  { staffId: "staff-12", locationId: "loc-cowan" },
  { staffId: "staff-13", locationId: "loc-cowan" },
];

export const STAFF_SERVICES = [
  { staffId: "staff-3", serviceId: "svc-pt" },
  { staffId: "staff-3", serviceId: "svc-pt-partner" },
  { staffId: "staff-3", serviceId: "svc-pt-trio" },
  { staffId: "staff-3", serviceId: "svc-mobility" },
  { staffId: "staff-3", serviceId: "svc-wws" },
  { staffId: "staff-3", serviceId: "svc-adv-wws" },
  { staffId: "staff-3", serviceId: "svc-pilates" },
  { staffId: "staff-3", serviceId: "svc-pilates-partner" },
  { staffId: "staff-3", serviceId: "svc-ob-pilates" },
  { staffId: "staff-3", serviceId: "svc-apparatix" },
  { staffId: "staff-3", serviceId: "svc-discovery" },
  { staffId: "staff-3", serviceId: "svc-quarterly-checkin" },
  { staffId: "staff-9", serviceId: "svc-pt" },
  { staffId: "staff-9", serviceId: "svc-pt-partner" },
  { staffId: "staff-9", serviceId: "svc-pt-trio" },
  { staffId: "staff-9", serviceId: "svc-mobility" },
  { staffId: "staff-9", serviceId: "svc-wws" },
  { staffId: "staff-9", serviceId: "svc-adv-wws" },
  { staffId: "staff-9", serviceId: "svc-mes" },
  { staffId: "staff-9", serviceId: "svc-inhome-mes" },
  { staffId: "staff-9", serviceId: "svc-inhome-pt" },
  { staffId: "staff-9", serviceId: "svc-ob-inbody" },
  { staffId: "staff-9", serviceId: "svc-gait" },
  { staffId: "staff-9", serviceId: "svc-ob-physical" },
  { staffId: "staff-9", serviceId: "svc-ipa-fall" },
  { staffId: "staff-9", serviceId: "svc-ipa-wheelchair" },
  { staffId: "staff-9", serviceId: "svc-ob-corrective" },
  { staffId: "staff-9", serviceId: "svc-quarterly-assessment" },
  { staffId: "staff-8", serviceId: "svc-nutrition" },
  { staffId: "staff-8", serviceId: "svc-ob-rdn" },
  { staffId: "staff-8", serviceId: "svc-apparatix" },
  { staffId: "staff-8", serviceId: "svc-apparatix-plus" },
  { staffId: "staff-8", serviceId: "svc-apparatix-assessment" },
  { staffId: "staff-8", serviceId: "svc-discovery" },
  { staffId: "staff-8", serviceId: "svc-quarterly-checkin" },
  { staffId: "staff-1", serviceId: "svc-discovery" },
  { staffId: "staff-1", serviceId: "svc-quarterly-checkin" },
  { staffId: "staff-1", serviceId: "svc-pt" },
  { staffId: "staff-2", serviceId: "svc-pt" },
  { staffId: "staff-2", serviceId: "svc-pt-partner" },
  { staffId: "staff-2", serviceId: "svc-mobility" },
  { staffId: "staff-2", serviceId: "svc-discovery" },
  { staffId: "staff-7", serviceId: "svc-discovery" },
  { staffId: "staff-7", serviceId: "svc-quarterly-checkin" },
  { staffId: "staff-10", serviceId: "svc-massage" },
  { staffId: "staff-10", serviceId: "svc-stretch" },
  { staffId: "staff-11", serviceId: "svc-pt" },
  { staffId: "staff-11", serviceId: "svc-pt-partner" },
  { staffId: "staff-11", serviceId: "svc-mobility" },
  { staffId: "staff-11", serviceId: "svc-inhome-pt" },
  { staffId: "staff-5", serviceId: "svc-pt" },
  { staffId: "staff-5", serviceId: "svc-pt-partner" },
  { staffId: "staff-5", serviceId: "svc-mobility" },
  { staffId: "staff-4", serviceId: "svc-pt" },
  { staffId: "staff-4", serviceId: "svc-mobility" },
  { staffId: "staff-12", serviceId: "svc-pt" },
  { staffId: "staff-12", serviceId: "svc-pt-partner" },
  { staffId: "staff-12", serviceId: "svc-mobility" },
  { staffId: "staff-13", serviceId: "svc-pt" },
  { staffId: "staff-13", serviceId: "svc-pt-partner" },
  { staffId: "staff-13", serviceId: "svc-mobility" },
];

export const USER_ACCOUNTS: UserAccount[] = STAFF.map((s, i) => ({
  ...meta(`user-${i + 1}`),
  email: s.email,
  subjectType: "staff" as const,
  subjectId: s.id,
  status: "active" as const,
  lastLoginAt: NOW,
  mfaEnabled: i < 2,
  authProvider: "demo",
}));

/* ------------------------------ clients ----------------------------- */

type ClientSeed = Omit<Client, keyof ReturnType<typeof meta>> & { id: string };

const clientSeeds: ClientSeed[] = [
  { id: "cl-1", clientNumber: "FFS-1001", firstName: "Marisol", lastName: "Vega", preferredName: "Mari", dateOfBirth: "1979-04-12", email: "marisol.vega@example.com", phone: "(540) 555-0201", status: "active", dateJoined: "2023-02-06", primaryLocationId: "loc-cowan", goals: "Rebuild lower-body strength and stay consistent with 3 sessions per week.", alerts: ["Prior right knee surgery — demo note"], relationshipNotes: "Demo content. Prefers morning sessions; travels for work every other month.", onboardingStatus: "complete" },
  { id: "cl-2", clientNumber: "FFS-1002", firstName: "Grant", lastName: "Ashby", dateOfBirth: "1965-11-30", email: "grant.ashby@example.com", phone: "(540) 555-0202", status: "active", dateJoined: "2021-09-14", primaryLocationId: "loc-cowan", goals: "Maintain mobility and manage low-back discomfort.", alerts: ["Physician referral on file — demo"], relationshipNotes: "Demo content. Enjoys detailed explanations of programming.", onboardingStatus: "complete" },
  { id: "cl-3", clientNumber: "FFS-1003", firstName: "Ingrid", lastName: "Solberg", preferredName: "Inge", dateOfBirth: "1990-07-22", email: "ingrid.solberg@example.com", status: "active", dateJoined: "2024-05-02", primaryLocationId: "loc-william", goals: "Postural improvement and return to running.", alerts: [], relationshipNotes: "Demo content. Responds best to short check-in messages.", onboardingStatus: "complete" },
  { id: "cl-4", clientNumber: "FFS-1004", firstName: "Desmond", lastName: "Pryor", dateOfBirth: "1958-01-09", email: "desmond.pryor@example.com", phone: "(540) 555-0204", status: "active", dateJoined: "2022-03-18", primaryLocationId: "loc-cowan", goals: "Balance, fall prevention and confidence on stairs.", alerts: ["Balance precaution — demo", "Uses hearing aids — demo"], relationshipNotes: "Demo content. Attends with spouse on Fridays.", onboardingStatus: "complete" },
  { id: "cl-5", clientNumber: "FFS-1005", firstName: "Talia", lastName: "Boone", dateOfBirth: "1995-09-03", email: "talia.boone@example.com", phone: "(540) 555-0205", status: "onboarding", dateJoined: "2026-08-12", primaryLocationId: "loc-cowan", goals: "General conditioning; new to structured training.", alerts: [], relationshipNotes: "Demo content. Initial assessment scheduled.", onboardingStatus: "in_progress" },
  { id: "cl-6", clientNumber: "FFS-1006", firstName: "Nadia", lastName: "Okonkwo", dateOfBirth: "1983-12-17", email: "nadia.okonkwo@example.com", status: "active", dateJoined: "2023-10-09", primaryLocationId: "loc-william", goals: "Nutrition consistency plus Pilates for core strength.", alerts: [], relationshipNotes: "Demo content. Virtual nutrition visits only.", onboardingStatus: "complete" },
  { id: "cl-7", clientNumber: "FFS-1007", firstName: "Rowan", lastName: "Casteel", dateOfBirth: "2001-06-25", email: "rowan.casteel@example.com", status: "paused", dateJoined: "2024-11-01", primaryLocationId: "loc-cowan", goals: "Return to training after seasonal travel.", alerts: [], relationshipNotes: "Demo content. Membership paused through September.", onboardingStatus: "complete" },
  { id: "cl-8", clientNumber: "FFS-1008", firstName: "Beatrix", lastName: "Lunden", preferredName: "Bea", dateOfBirth: "1972-02-28", email: "beatrix.lunden@example.com", phone: "(540) 555-0208", status: "active", dateJoined: "2020-08-24", primaryLocationId: "loc-cowan", goals: "Apparatix progression and shoulder mobility.", alerts: ["Shoulder mobility restriction — demo"], relationshipNotes: "Demo content. Long-tenured member; strong referral source.", onboardingStatus: "complete" },
  { id: "cl-9", clientNumber: "FFS-1009", firstName: "Hollis", lastName: "Meier", dateOfBirth: "1988-05-14", email: "hollis.meier@example.com", status: "prospect", dateJoined: "2026-08-25", primaryLocationId: "loc-william", goals: "Exploring Medical Exercise following physician conversation.", alerts: ["Awaiting referral paperwork — demo"], relationshipNotes: "Demo content. Consultation completed; referral pending.", onboardingStatus: "not_started" },
  { id: "cl-10", clientNumber: "FFS-1010", firstName: "Junia", lastName: "Trafford", dateOfBirth: "1969-10-06", email: "junia.trafford@example.com", status: "inactive", dateJoined: "2019-04-30", primaryLocationId: "loc-cowan", goals: "Completed nutrition program; open to returning.", alerts: [], relationshipNotes: "Demo content. Archived from active roster, record retained.", onboardingStatus: "complete" },
];

export const CLIENTS: Client[] = clientSeeds.map((c) => ({ ...meta(c.id), ...c }));

export const CLIENT_STAFF_ASSIGNMENTS: ClientStaffAssignment[] = [
  { ...meta("csa-1"), clientId: "cl-1", staffId: "staff-3", assignmentRole: "primary_trainer", startDate: "2023-02-06", isActive: true },
  { ...meta("csa-2"), clientId: "cl-1", staffId: "staff-10", assignmentRole: "recovery_professional", startDate: "2023-06-01", isActive: true },
  { ...meta("csa-3"), clientId: "cl-2", staffId: "staff-9", assignmentRole: "medical_exercise_specialist", startDate: "2021-09-14", isActive: true },
  { ...meta("csa-4"), clientId: "cl-2", staffId: "staff-2", assignmentRole: "primary_trainer", startDate: "2021-09-14", isActive: true },
  { ...meta("csa-5"), clientId: "cl-3", staffId: "staff-3", assignmentRole: "primary_trainer", startDate: "2024-05-02", isActive: true },
  { ...meta("csa-6"), clientId: "cl-4", staffId: "staff-9", assignmentRole: "medical_exercise_specialist", startDate: "2022-03-18", isActive: true },
  { ...meta("csa-7"), clientId: "cl-4", staffId: "staff-3", assignmentRole: "pilates_instructor", startDate: "2022-06-01", isActive: true },
  { ...meta("csa-8"), clientId: "cl-5", staffId: "staff-7", assignmentRole: "care_coordinator", startDate: "2026-08-12", isActive: true },
  { ...meta("csa-9"), clientId: "cl-6", staffId: "staff-8", assignmentRole: "dietitian", startDate: "2023-10-09", isActive: true },
  { ...meta("csa-10"), clientId: "cl-6", staffId: "staff-3", assignmentRole: "pilates_instructor", startDate: "2023-11-02", isActive: true },
  { ...meta("csa-11"), clientId: "cl-7", staffId: "staff-3", assignmentRole: "primary_trainer", startDate: "2024-11-01", isActive: true },
  { ...meta("csa-12"), clientId: "cl-8", staffId: "staff-3", assignmentRole: "primary_trainer", startDate: "2020-08-24", isActive: true },
  { ...meta("csa-13"), clientId: "cl-8", staffId: "staff-10", assignmentRole: "recovery_professional", startDate: "2021-01-11", isActive: true },
  { ...meta("csa-14"), clientId: "cl-9", staffId: "staff-9", assignmentRole: "medical_exercise_specialist", startDate: "2026-08-25", isActive: true },
  { ...meta("csa-15"), clientId: "cl-10", staffId: "staff-8", assignmentRole: "dietitian", startDate: "2019-04-30", endDate: "2021-02-01", isActive: false },
];

export const CLIENT_SERVICE_ENROLLMENTS: ClientServiceEnrollment[] = [
  { ...meta("cse-1"), clientId: "cl-1", serviceId: "svc-pt", status: "active", startDate: "2023-02-06", providerStaffIds: ["staff-3"], frequency: "3x / week", notes: "Demo enrollment." },
  { ...meta("cse-2"), clientId: "cl-1", serviceId: "svc-massage", status: "active", startDate: "2023-06-01", providerStaffIds: ["staff-10"], frequency: "1x / month" },
  { ...meta("cse-3"), clientId: "cl-2", serviceId: "svc-mes", status: "active", startDate: "2021-09-14", providerStaffIds: ["staff-9"], frequency: "2x / week" },
  { ...meta("cse-4"), clientId: "cl-2", serviceId: "svc-stretch", status: "active", startDate: "2024-01-08", providerStaffIds: ["staff-10"], frequency: "2x / month" },
  { ...meta("cse-5"), clientId: "cl-3", serviceId: "svc-pt", status: "active", startDate: "2024-05-02", providerStaffIds: ["staff-3"], frequency: "2x / week" },
  { ...meta("cse-6"), clientId: "cl-3", serviceId: "svc-pilates", status: "active", startDate: "2024-08-19", providerStaffIds: ["staff-3"], frequency: "1x / week" },
  { ...meta("cse-7"), clientId: "cl-4", serviceId: "svc-mes", status: "active", startDate: "2022-03-18", providerStaffIds: ["staff-9"], frequency: "2x / week" },
  { ...meta("cse-8"), clientId: "cl-4", serviceId: "svc-pilates", status: "active", startDate: "2022-06-01", providerStaffIds: ["staff-3"], frequency: "1x / week" },
  { ...meta("cse-9"), clientId: "cl-5", serviceId: "svc-onboarding", status: "pending", startDate: "2026-08-12", providerStaffIds: ["staff-7"] },
  { ...meta("cse-10"), clientId: "cl-6", serviceId: "svc-nutrition", status: "active", startDate: "2023-10-09", providerStaffIds: ["staff-8"], frequency: "1x / month (virtual)" },
  { ...meta("cse-11"), clientId: "cl-6", serviceId: "svc-pilates", status: "active", startDate: "2023-11-02", providerStaffIds: ["staff-3"], frequency: "1x / week" },
  { ...meta("cse-12"), clientId: "cl-7", serviceId: "svc-pt", status: "inactive", startDate: "2024-11-01", providerStaffIds: ["staff-3"], notes: "Paused — demo." },
  { ...meta("cse-13"), clientId: "cl-8", serviceId: "svc-apparatix", status: "active", startDate: "2021-02-01", providerStaffIds: ["staff-3"], frequency: "4 credits / month" },
  { ...meta("cse-14"), clientId: "cl-8", serviceId: "svc-pt", status: "active", startDate: "2020-08-24", providerStaffIds: ["staff-3"], frequency: "1x / week" },
  { ...meta("cse-15"), clientId: "cl-8", serviceId: "svc-massage", status: "active", startDate: "2021-01-11", providerStaffIds: ["staff-10"], frequency: "1x / month" },
  { ...meta("cse-16"), clientId: "cl-9", serviceId: "svc-mes", status: "referral_pending", startDate: "2026-08-25", providerStaffIds: ["staff-9"] },
  { ...meta("cse-17"), clientId: "cl-10", serviceId: "svc-nutrition", status: "completed", startDate: "2019-05-10", endDate: "2021-02-01", providerStaffIds: ["staff-8"] },
];

/* ---------------------------- scheduling ---------------------------- */

const TODAY = "2026-08-31";

/**
 * Recurring series. Frequency values are distinct on purpose — "every 4 weeks"
 * and "monthly" are not the same thing at FFS.
 */
export const RECURRING_APPOINTMENTS: RecurringAppointment[] = [
  { ...meta("rec-1"), clientId: "cl-1", serviceId: "svc-pt", providerStaffId: "staff-3", locationId: "loc-cowan", frequency: "weekly", weekday: 1, startTime: "07:00", durationMinutes: 60, startDate: "2023-02-06", endDate: null, status: "active", serviceAgreementId: "sa-1", isActive: true, notes: "Standing Monday morning PT (demo)." },
  { ...meta("rec-2"), clientId: "cl-3", serviceId: "svc-pilates", providerStaffId: "staff-3", locationId: "loc-william", frequency: "every_other_week", weekday: 1, startTime: "16:00", durationMinutes: 55, startDate: "2024-05-13", endDate: null, status: "active", isActive: true },
  { ...meta("rec-3"), clientId: "cl-8", serviceId: "svc-apparatix", providerStaffId: "staff-3", locationId: "loc-cowan", frequency: "weekly", weekday: 1, startTime: "13:00", durationMinutes: 50, startDate: "2021-02-01", endDate: null, status: "active", serviceAgreementId: "sa-2", isActive: true },
  { ...meta("rec-4"), clientId: "cl-6", serviceId: "svc-nutrition", providerStaffId: "staff-8", locationId: "loc-virtual", frequency: "every_4_weeks", weekday: 1, startTime: "11:00", durationMinutes: 45, startDate: "2026-02-02", endDate: null, status: "active", isActive: true, notes: "Virtual RDN follow-up every 4 weeks (demo)." },
  { ...meta("rec-5"), clientId: "cl-4", serviceId: "svc-mes", providerStaffId: "staff-9", locationId: "loc-cowan", frequency: "monthly", startTime: "08:30", durationMinutes: 60, startDate: "2026-03-02", endDate: null, status: "active", isActive: true, notes: "Monthly medical exercise review (demo)." },
  { ...meta("rec-6"), clientId: "cl-2", serviceId: "svc-mes", providerStaffId: "staff-9", locationId: "loc-cowan", frequency: "custom", customPattern: "Two visits per month, dates agreed with client", startTime: "09:00", durationMinutes: 60, startDate: "2025-11-03", endDate: null, status: "active", isActive: true },
  { ...meta("rec-7"), clientId: "cl-10", serviceId: "svc-massage", providerStaffId: "staff-10", locationId: "loc-cowan", frequency: "every_4_weeks", weekday: 4, startTime: "15:00", durationMinutes: 60, startDate: "2026-01-08", endDate: null, status: "paused", isActive: false, notes: "Paused at client request (demo)." },
];

/**
 * Membership / service agreement commitments. A 12-month agreement can renew
 * without ever limiting or rewriting the recurring schedule.
 */
export const SERVICE_AGREEMENTS: ServiceAgreement[] = [
  { ...meta("sa-1"), clientId: "cl-1", serviceId: "svc-pt", name: "Personal Training — 12-month agreement", startDate: "2023-02-06", initialCommitmentMonths: 12, autoRenew: true, renewalStatus: "renewed", currentTermStart: "2026-02-06", currentTermEnd: "2027-02-05", status: "active" },
  { ...meta("sa-2"), clientId: "cl-8", serviceId: "svc-apparatix", name: "Apparatix — 12-month agreement", startDate: "2021-02-01", initialCommitmentMonths: 12, autoRenew: true, renewalStatus: "renewed", currentTermStart: "2026-02-01", currentTermEnd: "2027-01-31", status: "active" },
  { ...meta("sa-3"), clientId: "cl-3", serviceId: "svc-pilates", name: "Pilates — 12-month agreement", startDate: "2025-10-01", initialCommitmentMonths: 12, autoRenew: false, renewalStatus: "pending_renewal", currentTermStart: "2025-10-01", currentTermEnd: "2026-09-30", status: "active" },
];

export const APPOINTMENTS: Appointment[] = [
  /* Today */
  { ...meta("apt-1"), clientId: "cl-1", serviceId: "svc-pt", providerStaffId: "staff-3", locationId: "loc-cowan", resourceName: "Training Floor A", recurringAppointmentId: "rec-1", serviceAgreementId: "sa-1", date: TODAY, startTime: "07:00", endTime: "08:00", durationMinutes: 60, status: "confirmed", attendanceStatus: "pending", documentationRequired: true, documentationStatus: "pending", superbillRequestStatus: "not_requested", appointmentType: "in_person", syncStatus: "not_synced" },
  { ...meta("apt-2"), clientId: "cl-4", serviceId: "svc-mes", providerStaffId: "staff-9", locationId: "loc-cowan", resourceName: "Medical Exercise Room", recurringAppointmentId: "rec-5", date: TODAY, startTime: "08:30", endTime: "09:30", durationMinutes: 60, status: "confirmed", attendanceStatus: "pending", documentationRequired: true, documentationStatus: "pending", superbillRequestStatus: "not_requested", appointmentType: "in_person", syncStatus: "not_synced" },
  { ...meta("apt-3"), clientId: "cl-6", serviceId: "svc-nutrition", providerStaffId: "staff-8", locationId: "loc-virtual", recurringAppointmentId: "rec-4", date: TODAY, startTime: "11:00", endTime: "11:45", durationMinutes: 45, status: "scheduled", attendanceStatus: "pending", documentationRequired: true, documentationStatus: "pending", superbillRequestStatus: "not_requested", appointmentType: "virtual", externalCalendarProvider: "google", externalCalendarEventId: "demo-gcal-evt-88213", virtualMeetingProvider: "google_meet", virtualMeetingUrl: "https://meet.google.com/demo-abc-defg", virtualMeetingId: "demo-abc-defg", syncStatus: "synced", lastSyncedAt: NOW },
  { ...meta("apt-4"), clientId: "cl-8", serviceId: "svc-apparatix", providerStaffId: "staff-3", locationId: "loc-cowan", resourceName: "Apparatix Studio", recurringAppointmentId: "rec-3", serviceAgreementId: "sa-2", redeemedCreditTransactionId: "cx-3", date: TODAY, startTime: "13:00", endTime: "13:50", durationMinutes: 50, status: "scheduled", attendanceStatus: "pending", documentationRequired: true, documentationStatus: "pending", superbillRequestStatus: "not_requested", appointmentType: "in_person", syncStatus: "not_synced" },
  { ...meta("apt-5"), clientId: "cl-3", serviceId: "svc-pilates", providerStaffId: "staff-3", locationId: "loc-william", resourceName: "Reformer 2", recurringAppointmentId: "rec-2", serviceAgreementId: "sa-3", date: TODAY, startTime: "16:00", endTime: "16:55", durationMinutes: 55, status: "scheduled", attendanceStatus: "pending", documentationRequired: true, documentationStatus: "pending", superbillRequestStatus: "not_requested", appointmentType: "in_person", syncStatus: "not_synced" },
  { ...meta("apt-11"), clientId: "cl-10", serviceId: "svc-stretch", providerStaffId: "staff-10", locationId: "loc-cowan", resourceName: "Recovery Suite", date: TODAY, startTime: "17:30", endTime: "18:00", durationMinutes: 30, status: "scheduled", attendanceStatus: "pending", documentationRequired: true, documentationStatus: "pending", superbillRequestStatus: "not_requested", appointmentType: "in_person", syncStatus: "not_synced" },

  /* Recent history — attended, cancelled, late cancelled, no show */
  { ...meta("apt-6"), clientId: "cl-2", serviceId: "svc-mes", providerStaffId: "staff-9", locationId: "loc-cowan", recurringAppointmentId: "rec-6", date: "2026-08-28", startTime: "09:00", endTime: "10:00", durationMinutes: 60, status: "completed", attendanceStatus: "attended", completedAt: "2026-08-28T14:05:00.000Z", documentationRequired: true, documentationStatus: "complete", superbillRequestStatus: "requested", appointmentType: "in_person", syncStatus: "not_synced" },
  { ...meta("apt-7"), clientId: "cl-8", serviceId: "svc-apparatix", providerStaffId: "staff-3", locationId: "loc-cowan", recurringAppointmentId: "rec-3", date: "2026-08-24", startTime: "13:00", endTime: "13:50", durationMinutes: 50, status: "early_cancel", attendanceStatus: "excused", cancelledAt: "2026-08-22T14:10:00.000Z", cancellationNoticeHours: 47, cancellationReason: "Client travel (demo)", documentationRequired: false, documentationStatus: "not_required", superbillRequestStatus: "not_requested", appointmentType: "in_person", syncStatus: "not_synced" },
  { ...meta("apt-8"), clientId: "cl-1", serviceId: "svc-pt", providerStaffId: "staff-3", locationId: "loc-cowan", recurringAppointmentId: "rec-1", date: "2026-08-26", startTime: "07:00", endTime: "08:00", durationMinutes: 60, status: "late_cancel", attendanceStatus: "absent", cancelledAt: "2026-08-26T02:00:00.000Z", cancellationNoticeHours: 5, cancellationReason: "Illness (demo)", documentationRequired: false, documentationStatus: "not_required", superbillRequestStatus: "not_requested", appointmentType: "in_person", syncStatus: "not_synced" },
  { ...meta("apt-12"), clientId: "cl-5", serviceId: "svc-pt", providerStaffId: "staff-1", locationId: "loc-cowan", date: "2026-08-25", startTime: "12:00", endTime: "13:00", durationMinutes: 60, status: "no_show", attendanceStatus: "absent", cancellationReason: "No contact from client (demo)", documentationRequired: false, documentationStatus: "not_required", superbillRequestStatus: "not_requested", appointmentType: "in_person", syncStatus: "not_synced" },
  { ...meta("apt-13"), clientId: "cl-9", serviceId: "svc-pilates", providerStaffId: "staff-3", locationId: "loc-william", date: "2026-08-20", startTime: "10:00", endTime: "10:55", durationMinutes: 55, status: "no_show", attendanceStatus: "absent", documentationRequired: false, documentationStatus: "not_required", superbillRequestStatus: "not_requested", appointmentType: "in_person", syncStatus: "not_synced" },
  { ...meta("apt-14"), clientId: "cl-7", serviceId: "svc-massage", providerStaffId: "staff-10", locationId: "loc-cowan", date: "2026-08-19", startTime: "14:00", endTime: "15:00", durationMinutes: 60, status: "rescheduled", attendanceStatus: "excused", rescheduledToAppointmentId: "apt-15", cancelledAt: "2026-08-17T18:00:00.000Z", cancellationNoticeHours: 44, cancellationReason: "Provider schedule change (demo)", documentationRequired: false, documentationStatus: "not_required", superbillRequestStatus: "not_requested", appointmentType: "in_person", syncStatus: "not_synced" },
  { ...meta("apt-15"), clientId: "cl-7", serviceId: "svc-massage", providerStaffId: "staff-10", locationId: "loc-cowan", date: "2026-08-27", startTime: "14:00", endTime: "15:00", durationMinutes: 60, status: "completed", attendanceStatus: "attended", rescheduledFromAppointmentId: "apt-14", completedAt: "2026-08-27T19:05:00.000Z", documentationRequired: true, documentationStatus: "complete", superbillRequestStatus: "not_requested", appointmentType: "in_person", syncStatus: "not_synced" },
  { ...meta("apt-9"), clientId: "cl-6", serviceId: "svc-nutrition", providerStaffId: "staff-8", locationId: "loc-virtual", recurringAppointmentId: "rec-4", date: "2026-07-28", startTime: "11:00", endTime: "11:45", durationMinutes: 45, status: "completed", attendanceStatus: "attended", completedAt: "2026-07-28T15:50:00.000Z", documentationRequired: true, documentationStatus: "complete", superbillRequestStatus: "finalized", appointmentType: "virtual", externalCalendarProvider: "google", externalCalendarEventId: "demo-gcal-evt-77102", virtualMeetingProvider: "google_meet", virtualMeetingUrl: "https://meet.google.com/demo-hij-klmn", syncStatus: "synced", lastSyncedAt: "2026-07-28T10:00:00.000Z" },
  { ...meta("apt-16"), clientId: "cl-3", serviceId: "svc-pilates", providerStaffId: "staff-3", locationId: "loc-william", recurringAppointmentId: "rec-2", date: "2026-08-17", startTime: "16:00", endTime: "16:55", durationMinutes: 55, status: "completed", attendanceStatus: "attended", completedAt: "2026-08-17T21:00:00.000Z", documentationRequired: true, documentationStatus: "pending", superbillRequestStatus: "not_requested", appointmentType: "in_person", syncStatus: "not_synced" },

  /* Upcoming */
  { ...meta("apt-10"), clientId: "cl-5", serviceId: "svc-onboarding", providerStaffId: "staff-7", locationId: "loc-cowan", date: "2026-09-02", startTime: "10:00", endTime: "11:15", durationMinutes: 75, status: "scheduled", attendanceStatus: "pending", documentationRequired: true, documentationStatus: "pending", superbillRequestStatus: "not_requested", appointmentType: "in_person", syncStatus: "not_synced" },
  { ...meta("apt-17"), clientId: "cl-1", serviceId: "svc-pt", providerStaffId: "staff-3", locationId: "loc-cowan", recurringAppointmentId: "rec-1", serviceAgreementId: "sa-1", date: "2026-09-07", startTime: "07:00", endTime: "08:00", durationMinutes: 60, status: "scheduled", attendanceStatus: "pending", documentationRequired: true, documentationStatus: "pending", superbillRequestStatus: "not_requested", appointmentType: "in_person", syncStatus: "not_synced" },
  { ...meta("apt-18"), clientId: "cl-8", serviceId: "svc-apparatix", providerStaffId: "staff-3", locationId: "loc-cowan", recurringAppointmentId: "rec-3", serviceAgreementId: "sa-2", date: "2026-09-07", startTime: "13:00", endTime: "13:50", durationMinutes: 50, status: "scheduled", attendanceStatus: "pending", documentationRequired: true, documentationStatus: "pending", superbillRequestStatus: "not_requested", appointmentType: "in_person", syncStatus: "not_synced" },
  { ...meta("apt-19"), clientId: "cl-6", serviceId: "svc-nutrition", providerStaffId: "staff-8", locationId: "loc-virtual", recurringAppointmentId: "rec-4", date: "2026-09-28", startTime: "11:00", endTime: "11:45", durationMinutes: 45, status: "scheduled", attendanceStatus: "pending", documentationRequired: true, documentationStatus: "pending", superbillRequestStatus: "not_requested", appointmentType: "virtual", externalCalendarProvider: "google", virtualMeetingProvider: "google_meet", syncStatus: "pending" },
  { ...meta("apt-20"), clientId: "cl-4", serviceId: "svc-mes", providerStaffId: "staff-9", locationId: "loc-cowan", recurringAppointmentId: "rec-5", date: "2026-09-28", startTime: "08:30", endTime: "09:30", durationMinutes: 60, status: "scheduled", attendanceStatus: "pending", documentationRequired: true, documentationStatus: "pending", superbillRequestStatus: "not_requested", appointmentType: "in_person", syncStatus: "not_synced" },
  { ...meta("apt-21"), clientId: "cl-2", serviceId: "svc-mes", providerStaffId: "staff-9", locationId: "loc-cowan", recurringAppointmentId: "rec-6", date: "2026-09-09", startTime: "09:00", endTime: "10:00", durationMinutes: 60, status: "scheduled", attendanceStatus: "pending", documentationRequired: true, documentationStatus: "pending", superbillRequestStatus: "not_requested", appointmentType: "in_person", syncStatus: "not_synced" },
];

/** Every status change is recorded; nothing is silently overwritten. */
export const APPOINTMENT_STATUS_HISTORY: AppointmentStatusHistory[] = [
  { ...meta("ash-1"), appointmentId: "apt-7", fromStatus: "confirmed", toStatus: "early_cancel", changedByStaffId: "staff-7", reason: "Client travel (demo)", occurredAt: "2026-08-22T14:10:00.000Z" },
  { ...meta("ash-2"), appointmentId: "apt-8", fromStatus: "confirmed", toStatus: "late_cancel", changedByStaffId: "staff-7", reason: "Illness, 5 hours notice (demo)", occurredAt: "2026-08-26T02:00:00.000Z" },
  { ...meta("ash-3"), appointmentId: "apt-12", fromStatus: "confirmed", toStatus: "no_show", changedByStaffId: "staff-1", reason: "No contact from client (demo)", occurredAt: "2026-08-25T17:10:00.000Z" },
  { ...meta("ash-4"), appointmentId: "apt-13", fromStatus: "scheduled", toStatus: "no_show", changedByStaffId: "staff-3", occurredAt: "2026-08-20T15:05:00.000Z" },
  { ...meta("ash-5"), appointmentId: "apt-14", fromStatus: "confirmed", toStatus: "rescheduled", changedByStaffId: "staff-10", reason: "Provider schedule change — moved to Aug 27 (demo)", occurredAt: "2026-08-17T18:00:00.000Z" },
  { ...meta("ash-6"), appointmentId: "apt-15", fromStatus: "scheduled", toStatus: "completed", changedByStaffId: "staff-10", occurredAt: "2026-08-27T19:05:00.000Z" },
  { ...meta("ash-7"), appointmentId: "apt-6", fromStatus: "confirmed", toStatus: "completed", changedByStaffId: "staff-9", occurredAt: "2026-08-28T14:05:00.000Z" },
];

/* --------------------------- entitlements --------------------------- */

export const MEMBERSHIPS: Membership[] = [
  { ...meta("mem-apparatix-4"), name: "Apparatix — 4 / month", serviceCategory: "apparatix", sessionsPerPeriod: 4, period: "month", isActive: true },
  { ...meta("mem-pt-12"), name: "Personal Training — 12 / month", serviceCategory: "personal_training", sessionsPerPeriod: 12, period: "month", isActive: true },
];

export const CLIENT_MEMBERSHIPS: ClientMembership[] = [
  { ...meta("cm-1"), clientId: "cl-8", membershipId: "mem-apparatix-4", status: "active", startDate: "2021-02-01", frequency: "4 credits / month" },
  { ...meta("cm-2"), clientId: "cl-1", membershipId: "mem-pt-12", status: "active", startDate: "2023-02-06", frequency: "3x / week" },
];

/**
 * Reference values are configurable business data, not hard-coded policy, and
 * they do not make credits interchangeable across service lines.
 */
export const CREDIT_TYPES: CreditType[] = [
  { ...meta("ct-pt"), key: "pt_makeup", name: "Personal Training Makeup", eligibleServiceCategories: ["personal_training"], referenceValueUsd: 95, transferable: false, defaultExpirationDays: 90, maxBalance: 6, isActive: true },
  { ...meta("ct-pilates"), key: "pilates_makeup", name: "Pilates Makeup", eligibleServiceCategories: ["pilates"], referenceValueUsd: 95, transferable: false, defaultExpirationDays: 90, maxBalance: 4, isActive: true },
  { ...meta("ct-mes"), key: "medical_exercise_makeup", name: "Medical Exercise Makeup", eligibleServiceCategories: ["medical_exercise"], referenceValueUsd: 125, transferable: false, defaultExpirationDays: 60, maxBalance: 4, isActive: true },
  { ...meta("ct-recovery"), key: "recovery_makeup", name: "Recovery Makeup", eligibleServiceCategories: ["recovery"], referenceValueUsd: 110, transferable: false, defaultExpirationDays: 60, maxBalance: 4, isActive: true },
  { ...meta("ct-apparatix"), key: "apparatix_credit", name: "Apparatix Credit", eligibleServiceCategories: ["apparatix"], referenceValueUsd: 45, transferable: false, defaultExpirationDays: 60, maxBalance: 8, isActive: true },
  { ...meta("ct-general"), key: "general_account_credit", name: "General Account Credit", eligibleServiceCategories: [], referenceValueUsd: 1, transferable: true, defaultExpirationDays: null, maxBalance: null, isActive: true },
];

/**
 * No FFS cancellation policy is approved yet, so every rule below is inactive
 * demo configuration. Nothing issues credit automatically in this build.
 */
export const CREDIT_RULES: CreditRule[] = [
  { ...meta("cr-1"), name: "Demo / Inactive — Apparatix early cancel", serviceCategory: "apparatix", triggerStatus: "early_cancel", requiredNoticeHours: 24, grantsCreditTypeId: "ct-apparatix", creditAmount: 1, expirationDays: 60, transferable: false, maxBalance: 8, isActive: false, policyState: "demo_inactive" },
  { ...meta("cr-2"), name: "Demo / Inactive — Personal Training early cancel", serviceCategory: "personal_training", triggerStatus: "early_cancel", requiredNoticeHours: 24, grantsCreditTypeId: "ct-pt", creditAmount: 1, expirationDays: 90, transferable: false, maxBalance: 6, isActive: false, policyState: "demo_inactive" },
  { ...meta("cr-3"), name: "Demo / Inactive — Late cancel (no credit)", serviceCategory: "all", triggerStatus: "late_cancel", requiredNoticeHours: 24, grantsCreditTypeId: null, creditAmount: 0, expirationDays: null, transferable: false, maxBalance: null, isActive: false, policyState: "demo_inactive" },
  { ...meta("cr-4"), name: "Demo / Inactive — No show (no credit)", serviceCategory: "all", triggerStatus: "no_show", requiredNoticeHours: 0, grantsCreditTypeId: null, creditAmount: 0, expirationDays: null, transferable: false, maxBalance: null, isActive: false, policyState: "demo_inactive" },
];

/**
 * Every row is a manual, staff-recorded demo transaction. Corrections appear
 * as new adjustment rows so history is never rewritten.
 */
export const CREDIT_TRANSACTIONS: CreditTransaction[] = [
  { ...meta("cx-1"), clientId: "cl-8", creditTypeId: "ct-apparatix", amount: 1, direction: "earned", referenceValueUsd: 45, transactionDate: "2026-08-22", reason: "Early cancel with 47 hours notice (demo)", originatingAppointmentId: "apt-7", originatingCancellationStatus: "early_cancel", serviceRestriction: "apparatix", expiresOn: "2026-10-23", status: "available", createdByStaffId: "staff-7" },
  { ...meta("cx-2"), clientId: "cl-8", creditTypeId: "ct-apparatix", amount: 1, direction: "earned", referenceValueUsd: 45, transactionDate: "2026-08-01", reason: "Studio closure makeup (demo)", serviceRestriction: "apparatix", expiresOn: "2026-09-30", status: "available", createdByStaffId: "staff-7" },
  { ...meta("cx-3"), clientId: "cl-8", creditTypeId: "ct-apparatix", amount: -1, direction: "redeemed", referenceValueUsd: 45, transactionDate: TODAY, reason: "Redeemed for Apparatix session (demo)", redeemedAppointmentId: "apt-4", serviceRestriction: "apparatix", status: "redeemed", createdByStaffId: "staff-7" },
  { ...meta("cx-4"), clientId: "cl-1", creditTypeId: "ct-pt", amount: 1, direction: "earned", referenceValueUsd: 95, transactionDate: "2026-08-15", reason: "Trainer schedule change (demo)", serviceRestriction: "personal_training", expiresOn: "2026-11-15", status: "available", createdByStaffId: "staff-7" },
  { ...meta("cx-5"), clientId: "cl-1", creditTypeId: "ct-pt", amount: 1, direction: "earned", referenceValueUsd: 95, transactionDate: "2026-07-03", reason: "Weather closure (demo)", serviceRestriction: "personal_training", expiresOn: "2026-10-01", status: "available", createdByStaffId: "staff-7" },
  { ...meta("cx-6"), clientId: "cl-3", creditTypeId: "ct-pilates", amount: 1, direction: "earned", referenceValueUsd: 95, transactionDate: "2026-07-22", reason: "Instructor unavailable (demo)", serviceRestriction: "pilates", expiresOn: "2026-10-20", status: "available", createdByStaffId: "staff-7" },
  { ...meta("cx-7"), clientId: "cl-2", creditTypeId: "ct-general", amount: 45, direction: "earned", referenceValueUsd: 1, transactionDate: "2026-06-30", reason: "Account credit from package adjustment (demo)", status: "available", createdByStaffId: "staff-1" },
  { ...meta("cx-8"), clientId: "cl-1", creditTypeId: "ct-pt", amount: 1, direction: "adjustment", referenceValueUsd: 95, transactionDate: "2026-08-27", reason: "Leadership override — makeup granted after late cancel for illness (demo)", originatingAppointmentId: "apt-8", originatingCancellationStatus: "late_cancel", serviceRestriction: "personal_training", expiresOn: "2026-11-27", status: "available", createdByStaffId: "staff-7", authorizedByStaffId: "staff-1", isLeadershipOverride: true, notes: "Recorded as an override, not an automatic policy outcome." },
  { ...meta("cx-9"), clientId: "cl-9", creditTypeId: "ct-pilates", amount: 1, direction: "adjustment", referenceValueUsd: 95, transactionDate: "2026-08-21", reason: "Leadership override — goodwill credit after no show (demo)", originatingAppointmentId: "apt-13", originatingCancellationStatus: "no_show", serviceRestriction: "pilates", expiresOn: "2026-11-21", status: "available", createdByStaffId: "staff-2", authorizedByStaffId: "staff-1", isLeadershipOverride: true },
  { ...meta("cx-10"), clientId: "cl-3", creditTypeId: "ct-pilates", amount: -1, direction: "adjustment", referenceValueUsd: 95, transactionDate: "2026-08-18", reason: "Correction — earlier credit recorded in error (demo)", overrideOfTransactionId: "cx-6", serviceRestriction: "pilates", status: "adjusted", createdByStaffId: "staff-1", authorizedByStaffId: "staff-1", isLeadershipOverride: true, notes: "Original row cx-6 is retained unchanged." },
  { ...meta("cx-11"), clientId: "cl-7", creditTypeId: "ct-recovery", amount: 1, direction: "earned", referenceValueUsd: 110, transactionDate: "2026-08-17", reason: "Provider-initiated reschedule (demo)", originatingAppointmentId: "apt-14", serviceRestriction: "recovery", expiresOn: "2026-10-16", status: "available", createdByStaffId: "staff-7" },
  { ...meta("cx-12"), clientId: "cl-7", creditTypeId: "ct-recovery", amount: -1, direction: "redeemed", referenceValueUsd: 110, transactionDate: "2026-08-27", reason: "Redeemed for rescheduled massage (demo)", redeemedAppointmentId: "apt-15", serviceRestriction: "recovery", status: "redeemed", createdByStaffId: "staff-10" },
  { ...meta("cx-13"), clientId: "cl-4", creditTypeId: "ct-mes", amount: 1, direction: "earned", referenceValueUsd: 125, transactionDate: "2026-05-12", reason: "Clinician unavailable (demo)", serviceRestriction: "medical_exercise", expiresOn: "2026-07-11", status: "expired", createdByStaffId: "staff-7" },
  { ...meta("cx-14"), clientId: "cl-4", creditTypeId: "ct-mes", amount: -1, direction: "expired", referenceValueUsd: 125, transactionDate: "2026-07-11", reason: "Credit expired unused (demo)", serviceRestriction: "medical_exercise", status: "expired", createdByStaffId: "staff-7" },
];



/* ---------------------------- assessments --------------------------- */

export const ASSESSMENT_TYPES: AssessmentType[] = [
  { ...meta("at-inbody"), key: "inbody", name: "InBody Composition", category: "general", description: "Body composition measurements captured over time.", supportsOverallScore: false, supportsMedia: true, isActive: true },
  { ...meta("at-fms"), key: "fms", name: "Functional Movement Screen (FMS)", category: "general", description: "Seven-movement screen with per-movement scores and video.", supportsOverallScore: true, supportsMedia: true, isActive: true },
  { ...meta("at-initial"), key: "initial_physical", name: "Initial Physical Assessment", category: "onboarding", description: "Baseline strength, mobility and balance measures.", supportsOverallScore: false, supportsMedia: true, isActive: true },
  { ...meta("at-gait"), key: "gait", name: "Gait Analysis", category: "medical_exercise", description: "Observational and video gait assessment.", supportsOverallScore: false, supportsMedia: true, isActive: true },
  { ...meta("at-postural"), key: "postural", name: "Postural Assessment", category: "general", description: "Static postural observations.", supportsOverallScore: false, supportsMedia: true, isActive: true },
  { ...meta("at-pilates"), key: "pilates", name: "Pilates Assessment", category: "pilates", description: "Pilates level and control assessment.", supportsOverallScore: true, supportsMedia: true, isActive: true },
  { ...meta("at-mes"), key: "medical_exercise", name: "Medical Exercise Assessment", category: "medical_exercise", description: "Referral-informed functional assessment.", supportsOverallScore: false, supportsMedia: true, isActive: true },
  { ...meta("at-apparatix"), key: "apparatix", name: "Apparatix Assessment", category: "apparatix", description: "Apparatix level progression assessment.", supportsOverallScore: true, supportsMedia: true, isActive: true },
];

const FMS_MOVEMENTS = [
  "Deep Squat",
  "Hurdle Step",
  "Inline Lunge",
  "Shoulder Mobility",
  "Active Straight-Leg Raise",
  "Trunk Stability Push-Up",
  "Rotary Stability",
];

const INBODY_METRICS: Array<[string, string, string]> = [
  ["weight", "Weight", "lb"],
  ["skeletal_muscle_mass", "Skeletal Muscle Mass", "lb"],
  ["body_fat_mass", "Body Fat Mass", "lb"],
  ["percent_body_fat", "Percent Body Fat", "%"],
  ["visceral_fat", "Visceral Fat Level", "level"],
  ["phase_angle", "Phase Angle", "°"],
  ["ecw_tbw", "ECW/TBW", "ratio"],
];

export const ASSESSMENT_METRICS: AssessmentMetric[] = [
  ...INBODY_METRICS.map(([key, name, unit], i) => ({
    ...meta(`am-inbody-${key}`),
    assessmentTypeId: "at-inbody",
    key,
    name,
    valueType: "numeric" as const,
    unit,
    sided: false,
    graphable: true,
    displayOrder: i + 1,
  })),
  ...FMS_MOVEMENTS.map((name, i) => ({
    ...meta(`am-fms-${i + 1}`),
    assessmentTypeId: "at-fms",
    key: name.toLowerCase().replace(/[^a-z]+/g, "_"),
    name,
    valueType: "score" as const,
    unit: "0–3",
    sided: ["Hurdle Step", "Inline Lunge", "Shoulder Mobility", "Active Straight-Leg Raise", "Rotary Stability"].includes(name),
    graphable: true,
    displayOrder: i + 1,
  })),
];

export const ASSESSMENT_INSTANCES: AssessmentInstance[] = [
  { ...meta("ai-1"), clientId: "cl-1", assessmentTypeId: "at-inbody", assessmentDate: "2023-02-08", assessorStaffId: "staff-3", status: "final", notes: "Demo baseline.", sequenceLabel: "Initial Assessment" },
  { ...meta("ai-2"), clientId: "cl-1", assessmentTypeId: "at-inbody", assessmentDate: "2024-02-20", assessorStaffId: "staff-3", status: "final", previousInstanceId: "ai-1", sequenceLabel: "Reassessment 1" },
  { ...meta("ai-3"), clientId: "cl-1", assessmentTypeId: "at-inbody", assessmentDate: "2026-02-17", assessorStaffId: "staff-3", status: "final", previousInstanceId: "ai-2", sequenceLabel: "Reassessment 2" },
  { ...meta("ai-4"), clientId: "cl-1", assessmentTypeId: "at-fms", assessmentDate: "2023-02-08", assessorStaffId: "staff-3", status: "final", overallScore: 13, sequenceLabel: "Initial Assessment" },
  { ...meta("ai-5"), clientId: "cl-1", assessmentTypeId: "at-fms", assessmentDate: "2026-02-17", assessorStaffId: "staff-3", status: "final", overallScore: 16, previousInstanceId: "ai-4", sequenceLabel: "Reassessment 1" },
  { ...meta("ai-6"), clientId: "cl-4", assessmentTypeId: "at-initial", assessmentDate: "2022-03-20", assessorStaffId: "staff-9", status: "final", sequenceLabel: "Initial Assessment" },
];

const inbodyValues: Record<string, number[]> = {
  weight: [186, 181, 178],
  skeletal_muscle_mass: [66, 69, 71],
  body_fat_mass: [58, 50, 45],
  percent_body_fat: [31.2, 27.6, 25.3],
  visceral_fat: [11, 9, 8],
  phase_angle: [4.8, 5.1, 5.3],
  ecw_tbw: [0.394, 0.388, 0.385],
};

export const ASSESSMENT_RESULTS: AssessmentResult[] = [
  ...["ai-1", "ai-2", "ai-3"].flatMap((instanceId, idx) =>
    INBODY_METRICS.map(([key], i) => ({
      ...meta(`ar-${instanceId}-${key}`),
      assessmentInstanceId: instanceId,
      assessmentMetricId: `am-inbody-${key}`,
      numericValue: inbodyValues[key]?.[idx] ?? null,
      displayOrder: i + 1,
    })),
  ),
  ...FMS_MOVEMENTS.map((name, i) => ({
    ...meta(`ar-ai4-${i + 1}`),
    assessmentInstanceId: "ai-4",
    assessmentMetricId: `am-fms-${i + 1}`,
    score: [2, 2, 1, 2, 2, 2, 2][i] ?? 0,
    leftValue: [null, 2, 1, 2, 2, null, 2][i] ?? null,
    rightValue: [null, 2, 2, 3, 2, null, 2][i] ?? null,
    painIndicator: false,
    observations: "Demo observation.",
    correctivePriority: (i === 2 ? "high" : "low") as "high" | "low",
    displayOrder: i + 1,
  })),
  ...FMS_MOVEMENTS.map((name, i) => ({
    ...meta(`ar-ai5-${i + 1}`),
    assessmentInstanceId: "ai-5",
    assessmentMetricId: `am-fms-${i + 1}`,
    score: [3, 2, 2, 3, 2, 2, 2][i] ?? 0,
    leftValue: [null, 2, 2, 3, 2, null, 2][i] ?? null,
    rightValue: [null, 3, 2, 3, 2, null, 2][i] ?? null,
    painIndicator: false,
    observations: "Demo observation.",
    correctivePriority: "low" as const,
    displayOrder: i + 1,
  })),
];

export const MEDIA_ATTACHMENTS: MediaAttachment[] = [
  { ...meta("md-1"), clientId: "cl-1", relatedEntityType: "assessment_result", relatedEntityId: "ar-ai5-1", storageProvider: "demo-local", objectKey: "demo/fms/deep-squat-2026-02-17.mp4", fileName: "deep-squat-2026-02-17.mp4", fileType: "video/mp4", fileSizeBytes: 18_442_000, visibility: "client_visible", uploadedAt: "2026-02-17T15:12:00.000Z", isArchived: false },
  { ...meta("md-2"), clientId: "cl-1", relatedEntityType: "assessment_result", relatedEntityId: "ar-ai4-1", storageProvider: "demo-local", objectKey: "demo/fms/deep-squat-2023-02-08.mp4", fileName: "deep-squat-2023-02-08.mp4", fileType: "video/mp4", fileSizeBytes: 16_120_000, visibility: "client_visible", uploadedAt: "2023-02-08T15:02:00.000Z", isArchived: false },
];

/* ------------------------ tasks, comms, audit ----------------------- */

export const TASKS: Task[] = [
  { ...meta("task-1"), title: "Session note due — Marisol Vega", assignedStaffId: "staff-3", clientId: "cl-1", relatedAppointmentId: "apt-1", category: "documentation", dueDate: TODAY, priority: "high", status: "open" },
  { ...meta("task-2"), title: "Structured note due — Desmond Pryor", assignedStaffId: "staff-9", clientId: "cl-4", relatedAppointmentId: "apt-2", category: "documentation", dueDate: TODAY, priority: "high", status: "open" },
  { ...meta("task-3"), title: "Reassessment due — Grant Ashby (12 months)", assignedStaffId: "staff-9", clientId: "cl-2", category: "reassessment", dueDate: "2026-09-05", priority: "normal", status: "open" },
  { ...meta("task-4"), title: "Follow up — Rowan Casteel membership pause ends", assignedStaffId: "staff-7", clientId: "cl-7", category: "follow_up", dueDate: "2026-09-08", priority: "normal", status: "open" },
  { ...meta("task-5"), title: "Collect referral paperwork — Hollis Meier", assignedStaffId: "staff-7", clientId: "cl-9", category: "onboarding", dueDate: "2026-09-01", priority: "high", status: "in_progress" },
  { ...meta("task-6"), title: "Nutrition summary — publish to client record", assignedStaffId: "staff-8", clientId: "cl-6", relatedAppointmentId: "apt-9", category: "documentation", dueDate: "2026-08-29", priority: "normal", status: "complete" },
];

export const CONVERSATIONS: Conversation[] = [
  { ...meta("conv-1"), clientId: "cl-1", subject: "Morning session swap", status: "open", lastMessageAt: "2026-08-29T13:40:00.000Z" },
  { ...meta("conv-2"), clientId: "cl-6", subject: "Nutrition check-in", status: "open", lastMessageAt: "2026-08-28T18:05:00.000Z" },
  { ...meta("conv-3"), clientId: "cl-8", subject: "Apparatix credits question", status: "open", lastMessageAt: "2026-08-26T09:15:00.000Z" },
];

export const MESSAGES: Message[] = [
  { ...meta("msg-1"), conversationId: "conv-1", senderType: "client", senderId: "cl-1", body: "Can we move Thursday to 7:30? (demo message)", sentAt: "2026-08-29T13:32:00.000Z" },
  { ...meta("msg-2"), conversationId: "conv-1", senderType: "staff", senderId: "staff-3", body: "Absolutely — I'll update the schedule. (demo message)", sentAt: "2026-08-29T13:40:00.000Z" },
  { ...meta("msg-3"), conversationId: "conv-2", senderType: "staff", senderId: "staff-8", body: "Your summary from last visit is in your documents. (demo message)", sentAt: "2026-08-28T18:05:00.000Z" },
  { ...meta("msg-4"), conversationId: "conv-3", senderType: "client", senderId: "cl-8", body: "How many Apparatix credits do I have left? (demo message)", sentAt: "2026-08-26T09:15:00.000Z" },
];

export const AUDIT_LOG: AuditLogEntry[] = [
  { ...meta("al-1"), userId: "user-3", action: "appointment.completed", entityType: "appointment", entityId: "apt-6", summary: "Marked Medical Exercise session complete", previousValue: "scheduled", newValue: "completed", occurredAt: "2026-08-28T15:05:00.000Z" },
  { ...meta("al-2"), userId: "user-7", action: "credit.granted", entityType: "credit_transaction", entityId: "cx-1", summary: "Apparatix credit granted for cancellation with 47h notice", newValue: "+1", occurredAt: "2026-08-22T14:12:00.000Z" },
  { ...meta("al-3"), userId: "user-3", action: "assessment.finalized", entityType: "assessment_instance", entityId: "ai-5", summary: "FMS reassessment finalized (composite 16)", occurredAt: "2026-02-17T16:20:00.000Z" },
  { ...meta("al-4"), userId: "user-1", action: "client.updated", entityType: "client", entityId: "cl-7", summary: "Client status changed to paused", previousValue: "active", newValue: "paused", occurredAt: "2026-08-01T11:00:00.000Z" },
];

export const PROVIDER_BILLING_PROFILES: ProviderBillingProfile[] = [
  { ...meta("pbp-1"), staffId: "staff-8", providerCredentials: "RDN (demo)", npi: "DEMO-NPI-0000001", practiceName: "Fredericksburg Fitness Studio (demo)", practiceAddress: "100 Demo Commerce Way, Fredericksburg, VA", taxIdOnFile: true, isActive: true },
  { ...meta("pbp-2"), staffId: "staff-9", providerCredentials: "MES (demo)", practiceName: "Fredericksburg Fitness Studio (demo)", practiceAddress: "100 Demo Commerce Way, Fredericksburg, VA", taxIdOnFile: true, isActive: true },
];

export const SUPERBILLS: Superbill[] = [
  { ...meta("sb-1"), clientId: "cl-6", providerStaffId: "staff-8", superbillNumber: "DEMO-SB-000112", issueDate: "2026-08-01", periodStart: "2026-07-01", periodEnd: "2026-07-31", status: "finalized", totalCharged: 0, totalPaid: 0, attestedByStaffId: "staff-8" },
  { ...meta("sb-2"), clientId: "cl-2", providerStaffId: "staff-9", superbillNumber: "DEMO-SB-000113", issueDate: "2026-08-29", periodStart: "2026-08-01", periodEnd: "2026-08-31", status: "draft", totalCharged: 0 },
];

/* ------------------------------------------------------------------ */
/* Build #2.3 — form templates, public booking, group classes          */
/* ------------------------------------------------------------------ */

/**
 * FFS already owns the wording for these forms. Nothing legal, medical or
 * clinical is invented here — each template stays `awaiting_ffs_content`
 * with clearly labelled placeholder sections until leadership supplies the
 * approved content, at which point a new version is published.
 */
export const FORM_TEMPLATES: FormTemplate[] = [
  {
    ...meta("tpl-apparatix-health-history"),
    key: "apparatix_health_history",
    name: "Apparatix Health History Form",
    version: "v1",
    kind: "form",
    contentStatus: "approved",
    description:
      "Secure health history collected before the Initial Apparatix Assessment. Rendered from the shared form architecture (src/lib/domain/form-schema.ts) and never shown on a public page.",
    placeholderSections: [],
  },
  {
    ...meta("tpl-viewpoint-liability"),
    key: "viewpoint_liability",
    name: "Viewpoint Form / Liability",
    version: "v0-placeholder",
    kind: "form",
    contentStatus: "awaiting_ffs_content",
    description:
      "Placeholder for the existing FFS Viewpoint / Liability form. No waiver language is written by FredFit Portal.",
    placeholderSections: [
      "Viewpoint questions — awaiting FFS content",
      "Liability / waiver language — awaiting FFS approved legal text",
      "Acknowledgment & signature — capability reserved for a later build",
    ],
  },
  {
    ...meta("tpl-medical-release"),
    key: "medical_release",
    name: "Medical Release Form",
    version: "v0-placeholder",
    kind: "form",
    contentStatus: "awaiting_ffs_content",
    description:
      "Placeholder for the existing FFS Medical Release Form. Authorization language is supplied by FFS.",
    placeholderSections: [
      "Release scope — awaiting FFS approved authorization language",
      "Provider / practice details — awaiting FFS content",
      "Acknowledgment & signature — capability reserved for a later build",
    ],
  },
  {
    ...meta("tpl-bloodwork-upload"),
    key: "bloodwork_upload",
    name: "Bloodwork Upload",
    version: "v1",
    kind: "document_upload",
    contentStatus: "approved",
    description:
      "Secure client upload of the original bloodwork report. The source document is preserved, never replaced by extracted values.",
    placeholderSections: [],
  },
  {
    ...meta("tpl-food-log"),
    key: "food_log_3_day",
    name: "3-Day Food Log",
    version: "v1",
    kind: "food_log",
    contentStatus: "approved",
    description:
      "Simple client-friendly 3-day food log for RDN review. No calorie or macro tracking.",
    placeholderSections: [],
  },
  {
    ...meta("tpl-discovery-call"),
    key: "discovery_call",
    name: "Discovery Call Form",
    version: "v1",
    kind: "form",
    contentStatus: "approved",
    description: "Lead/discovery form collected during public Discovery Call booking. Not a medical intake.",
    placeholderSections: [],
  },
];

/** Demo public availability until FFS leadership enters real hours. */
const DEMO_AVAILABILITY = {
  weekdays: [1, 2, 3, 4, 5],
  startTime: "09:00",
  endTime: "16:00",
  slotIntervalMinutes: 30,
  minimumNoticeHours: 24,
  maximumHorizonDays: 45,
  bufferMinutes: 0,
  isDemoConfiguration: true,
};

export const PUBLIC_BOOKING_CONFIGS: PublicBookingConfig[] = [
  {
    ...meta("pbc-apparatix-assessment"),
    bookingType: "apparatix_assessment",
    slug: "apparatix-assessment",
    publicTitle: "Initial Apparatix Assessment",
    description:
      "A private 60-minute assessment with Jennifer Scherer before beginning Apparatix. This is an individual assessment, not a group class.",
    durationMinutes: 60,
    providerStaffIds: ["staff-8"],
    locationId: "loc-william",
    resourceId: "res-william-pilates",
    serviceId: "svc-apparatix-assessment",
    availability: { ...DEMO_AVAILABILITY },
    postBookingFormKeys: ["apparatix_health_history"],
    publicFormKey: null,
    paymentRequired: true,
    paymentProvider: "quickbooks",
    priceUsd: null,
    externalPaymentUrl: "https://connect.intuit.com/pay/DEMO-PLACEHOLDER-LINK",
    paymentDescription: "Initial Apparatix Assessment — Fredericksburg Fitness Studio",
    bookingSource: "public_booking_link",
    confirmationMessage:
      "Your Initial Apparatix Assessment is reserved. Please complete your Apparatix Health History Form before your appointment.",
    isActive: true,
  },
  {
    ...meta("pbc-discovery-call"),
    bookingType: "discovery_call",
    slug: "discovery-call",
    publicTitle: "Free 30-Minute Discovery Call",
    description:
      "A free, no-pressure 30-minute phone call about your goals and how Fredericksburg Fitness Studio can help. We call you — there is nothing to drive to.",
    durationMinutes: 30,
    providerStaffIds: ["staff-8", "staff-1"],
    locationId: "loc-phone",
    resourceId: null,
    serviceId: "svc-discovery",
    availability: { ...DEMO_AVAILABILITY, minimumNoticeHours: 4 },
    postBookingFormKeys: [],
    publicFormKey: "discovery_call",
    paymentRequired: false,
    paymentProvider: "none",
    priceUsd: 0,
    externalPaymentUrl: null,
    bookingSource: "discovery_call",
    confirmationMessage:
      "Your free Discovery Call is scheduled. We will call you at the number you provided — there is no need to come to the studio.",
    isActive: true,
  },
];

/* Apparatix group classes — one session per class block, six-client capacity. */
export const CLASS_SESSIONS: ClassSession[] = [
  { ...meta("cls-1"), serviceId: "svc-apparatix", instructorStaffIds: ["staff-8"], locationId: "loc-cowan", resourceId: "res-cowan-demo-floor", date: TODAY, startTime: "10:00", endTime: "10:50", durationMinutes: 50, capacity: 6, status: "scheduled" },
  { ...meta("cls-2"), serviceId: "svc-apparatix-plus", instructorStaffIds: ["staff-3"], locationId: "loc-cowan", resourceId: "res-cowan-demo-floor", date: TODAY, startTime: "11:00", endTime: "11:50", durationMinutes: 50, capacity: 6, status: "scheduled" },
  { ...meta("cls-3"), serviceId: "svc-apparatix", instructorStaffIds: ["staff-8"], locationId: "loc-cowan", resourceId: "res-cowan-demo-floor", date: "2026-09-02", startTime: "10:00", endTime: "10:50", durationMinutes: 50, capacity: 6, status: "scheduled" },
];

export const CLASS_PARTICIPANTS: ClassParticipant[] = [
  { ...meta("cp-1"), classSessionId: "cls-1", clientId: "cl-1", status: "booked", bookedAt: NOW, bookingSource: "staff_scheduled" },
  { ...meta("cp-2"), classSessionId: "cls-1", clientId: "cl-2", status: "booked", bookedAt: NOW, bookingSource: "staff_scheduled" },
  { ...meta("cp-3"), classSessionId: "cls-1", clientId: "cl-3", status: "booked", bookedAt: NOW, bookingSource: "staff_scheduled" },
  { ...meta("cp-4"), classSessionId: "cls-1", clientId: "cl-8", status: "booked", bookedAt: NOW, bookingSource: "staff_scheduled" },
  { ...meta("cp-5"), classSessionId: "cls-1", clientId: "cl-5", status: "booked", bookedAt: NOW, bookingSource: "staff_scheduled" },
  { ...meta("cp-6"), classSessionId: "cls-2", clientId: "cl-4", status: "booked", bookedAt: NOW, bookingSource: "staff_scheduled" },
  { ...meta("cp-7"), classSessionId: "cls-2", clientId: "cl-6", status: "booked", bookedAt: NOW, bookingSource: "staff_scheduled" },
  { ...meta("cp-8"), classSessionId: "cls-2", clientId: "cl-7", status: "booked", bookedAt: NOW, bookingSource: "staff_scheduled" },
  { ...meta("cp-9"), classSessionId: "cls-2", clientId: "cl-9", status: "booked", bookedAt: NOW, bookingSource: "staff_scheduled" },
  { ...meta("cp-10"), classSessionId: "cls-2", clientId: "cl-10", status: "booked", bookedAt: NOW, bookingSource: "staff_scheduled" },
  { ...meta("cp-11"), classSessionId: "cls-2", clientId: "cl-2", status: "booked", bookedAt: NOW, bookingSource: "staff_scheduled" },
];

/* ------------------------------------------------------------------ */
/* Availability, blocked time, service resource rules (demo config)    */
/* ------------------------------------------------------------------ */

/**
 * DEMO working windows. FFS has not supplied real provider schedules, so these
 * are synthetic configuration that leadership can replace. Sellable capacity is
 * calculated only inside these windows — never from blank calendar space.
 */
const availability = (
  idx: number,
  staffId: string,
  locationId: string,
  weekdays: number[],
  startTime: string,
  endTime: string,
): StaffAvailability[] =>
  weekdays.map((weekday, i) => ({
    ...meta(`avail-${idx}-${i}`),
    staffId,
    locationId,
    weekday,
    startTime,
    endTime,
    effectiveFrom: null,
    effectiveTo: null,
    isActive: true,
    notes: "Demo availability — pending FFS configuration.",
  }));

export const STAFF_AVAILABILITY: StaffAvailability[] = [
  ...availability(1, "staff-9", "loc-cowan", [1, 2, 3, 4, 5], "08:00", "17:00"),
  ...availability(2, "staff-10", "loc-cowan", [1, 3, 5], "09:00", "16:00"),
  ...availability(3, "staff-11", "loc-william", [2, 4], "08:00", "16:00"),
  ...availability(4, "staff-11", "loc-cowan", [1, 3], "12:00", "18:00"),
  ...availability(5, "staff-3", "loc-cowan", [1, 2, 4], "07:00", "15:00"),
  ...availability(6, "staff-3", "loc-william", [3, 5], "08:00", "14:00"),
  ...availability(7, "staff-9", "loc-cowan", [1, 2, 3, 4], "09:00", "15:00"),
  ...availability(8, "staff-8", "loc-virtual", [2, 3, 4], "10:00", "18:00"),
  ...availability(9, "staff-10", "loc-william", [1, 2, 4, 5], "10:00", "18:00"),
  ...availability(10, "staff-8", "loc-cowan", [1, 3, 5], "08:00", "14:00"),
  ...availability(11, "staff-8", "loc-william", [2, 4], "08:00", "13:00"),
  ...availability(12, "staff-4", "loc-cowan", [2], "17:00", "20:00"),
  ...availability(13, "staff-5", "loc-cowan", [1, 4], "09:00", "16:00"),
  ...availability(14, "staff-7", "loc-cowan", [1, 2, 3, 4, 5], "08:00", "15:00"),
  ...availability(15, "staff-2", "loc-cowan", [2, 3, 4], "09:00", "15:00"),
  ...availability(16, "staff-1", "loc-cowan", [1, 2, 3, 4, 5], "08:00", "18:00"),
  ...availability(17, "staff-12", "loc-cowan", [1, 3, 5], "09:00", "15:00"),
  ...availability(18, "staff-13", "loc-cowan", [2, 4], "10:00", "18:00"),
];

/** Demo blocked time: administrative blocks and a recurring room hold. */
export const BLOCKED_TIMES: BlockedTime[] = [
  { ...meta("blk-1"), staffId: "staff-9", resourceId: null, locationId: "loc-cowan", date: null, weekday: 1, startTime: "12:00", endTime: "13:00", reason: "Team meeting (demo)", isActive: true },
  { ...meta("blk-2"), staffId: "staff-10", resourceId: null, locationId: "loc-cowan", date: null, weekday: 3, startTime: "13:00", endTime: "16:00", reason: "Unavailable Wednesday afternoons (demo)", isActive: true },
  { ...meta("blk-3"), staffId: null, resourceId: "res-cowan-studio-1", locationId: "loc-cowan", date: null, weekday: 3, startTime: "14:00", endTime: "15:00", reason: "Studio 1 recurring maintenance hold (demo)", isActive: true },
];

/**
 * Which rooms a service may use at each location. Nothing is assumed: services
 * without a rule here can be delivered without a room record.
 */
export const SERVICE_RESOURCE_REQUIREMENTS: ServiceResourceRequirement[] = [
  { ...meta("srr-1"), serviceId: "svc-pt", locationId: "loc-cowan", eligibleResourceIds: ["res-cowan-studio-1", "res-cowan-studio-2"], resourceRequired: true },
  { ...meta("srr-2"), serviceId: "svc-pt", locationId: "loc-william", eligibleResourceIds: [], resourceRequired: false },
  { ...meta("srr-3"), serviceId: "svc-pilates", locationId: "loc-william", eligibleResourceIds: ["res-william-pilates"], resourceRequired: true },
  { ...meta("srr-4"), serviceId: "svc-pilates", locationId: "loc-cowan", eligibleResourceIds: ["res-cowan-studio-1", "res-cowan-studio-2"], resourceRequired: true },
  { ...meta("srr-5"), serviceId: "svc-mes", locationId: "loc-cowan", eligibleResourceIds: ["res-cowan-studio-2"], resourceRequired: true },
  { ...meta("srr-6"), serviceId: "svc-massage", locationId: "loc-william", eligibleResourceIds: ["res-william-treatment"], resourceRequired: true },
  { ...meta("srr-7"), serviceId: "svc-stretch", locationId: "loc-william", eligibleResourceIds: ["res-william-treatment"], resourceRequired: true },
  { ...meta("srr-9"), serviceId: "svc-pt-partner", locationId: "loc-cowan", eligibleResourceIds: ["res-cowan-studio-1", "res-cowan-studio-2"], resourceRequired: true },
  { ...meta("srr-10"), serviceId: "svc-pt-trio", locationId: "loc-cowan", eligibleResourceIds: ["res-cowan-studio-1", "res-cowan-studio-2"], resourceRequired: true },
  { ...meta("srr-11"), serviceId: "svc-pilates-partner", locationId: "loc-william", eligibleResourceIds: ["res-william-pilates"], resourceRequired: true },
  { ...meta("srr-12"), serviceId: "svc-pilates-trio", locationId: "loc-william", eligibleResourceIds: ["res-william-pilates"], resourceRequired: true },
  { ...meta("srr-8"), serviceId: "svc-nutrition", locationId: "loc-virtual", eligibleResourceIds: [], resourceRequired: false },
];

/* ------------------------------------------------------------------ */
/* Makeup ledger (demo history)                                        */
/* ------------------------------------------------------------------ */

export const MAKEUP_CREDITS: MakeupCredit[] = [
  {
    ...meta("mk-1"),
    clientId: "cl-8",
    sourceAppointmentId: "apt-7",
    sourceServiceId: "svc-apparatix",
    sourceProviderStaffId: "staff-3",
    originalAbsenceDate: "2026-08-24",
    originalAbsenceStartTime: "13:00",
    issuedDate: "2026-08-22",
    issuedByStaffId: "staff-1",
    expirationDate: "2026-11-22",
    status: "available",
    usedDate: null,
    redeemedAppointmentId: null,
    notes: "Early Cancel with 47 hours notice (demo).",
  },
  {
    ...meta("mk-2"),
    clientId: "cl-3",
    sourceAppointmentId: "apt-hist-301",
    sourceServiceId: "svc-pilates",
    sourceProviderStaffId: "staff-3",
    originalAbsenceDate: "2026-04-10",
    originalAbsenceStartTime: "16:00",
    issuedDate: "2026-04-08",
    issuedByStaffId: "staff-1",
    expirationDate: "2026-07-09",
    status: "expired",
    usedDate: null,
    redeemedAppointmentId: null,
    notes: "Demo history — lapsed unused after 90 days. Retained for reporting.",
  },
  {
    ...meta("mk-3"),
    clientId: "cl-1",
    sourceAppointmentId: "apt-hist-302",
    sourceServiceId: "svc-pt",
    sourceProviderStaffId: "staff-3",
    originalAbsenceDate: "2026-06-02",
    originalAbsenceStartTime: "07:00",
    issuedDate: "2026-05-30",
    issuedByStaffId: "staff-1",
    expirationDate: "2026-08-31",
    status: "used",
    usedDate: "2026-06-16",
    redeemedAppointmentId: "apt-hist-303",
    redeemedByStaffId: "staff-3",
    notes: "Demo history — redeemed against a make-up session.",
  },
];

/** One-off schedule changes: PTO, holidays, temporary hours. */
export const SCHEDULE_EXCEPTIONS: ScheduleException[] = [
  { ...meta("sx-1"), staffId: "staff-3", date: "2026-09-07", kind: "holiday", reason: "Labor Day (studio closed) \u2014 demo", isActive: true },
  { ...meta("sx-2"), staffId: "staff-9", date: "2026-09-11", kind: "pto", reason: "Approved PTO (demo)", isActive: true },
];
