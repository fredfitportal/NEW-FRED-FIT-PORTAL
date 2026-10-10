/**
 * DEVELOPMENT-ONLY PERSISTENCE LAYER.
 *
 * The repository (`src/lib/domain/repository.ts`) is the only module that may
 * touch this store. The UI never reads or writes storage directly.
 *
 * Mutable demo records live in memory and are mirrored into `localStorage`
 * under a clearly marked demo key so Preview survives a page refresh. When the
 * production backend arrives, this file is replaced by real persistence and
 * the repository interface stays identical.
 *
 * No real PHI is ever stored here — every record is synthetic demo data.
 */

import * as seed from "./seed";
import * as assessmentSeed from "./assessment-seed";
import * as testImport from "./test-schedule-import";
import * as taskSeed from "./task-seed";
import type {
  AssessmentAssignment,
  AssessmentTemplate,
  AssessmentTemplateVersion,
  CompletedAssessment,
  PlacementRecommendation,
  QuarterlyCycle,
  ResultsReview,
} from "./assessment-types";
import type {
  Appointment,
  AppointmentStatusHistory,
  BlockedTime,
  Client,
  ClientServiceEnrollment,
  ClientStaffAssignment,
  ClassParticipant,
  ClassSession,
  ClientDocument,
  CreditTransaction,
  DiscoveryCallSubmission,
  FoodLog,
  FormRequirement,
  FormSubmission,
  LocationResource,
  MakeupCredit,
  OnboardingCase,
  PaymentRecord,
  PublicBookingConfig,
  QueuedNotification,
  RecurringAppointment,
  RecurringSeriesChange,
  ScheduleException,
  SchedulingOverride,
  Service,
  ServiceResourceRequirement,
  StaffAvailability,
  StaffInvitation,
  StaffMember,
  StaffPermissionOverride,
  Task,
  UserAccount,
} from "./types";

export const DEMO_STORAGE_KEY = "fredfit-portal.demo-data.v10";

/** Only these collections are writable in this build. */
export interface MutableDataset {
  /* Team management — leadership-editable staff configuration */
  staff: StaffMember[];
  staffLocations: { staffId: string; locationId: string }[];
  staffServices: { staffId: string; serviceId: string }[];
  clients: Client[];
  assignments: ClientStaffAssignment[];
  enrollments: ClientServiceEnrollment[];
  appointments: Appointment[];
  appointmentStatusHistory: AppointmentStatusHistory[];
  recurringAppointments: RecurringAppointment[];
  /** Append-only audit of recurring-pattern changes. */
  recurringSeriesChanges: RecurringSeriesChange[];
  creditTransactions: CreditTransaction[];
  /* Build #2.3 — configuration + public booking + intake */
  services: Service[];
  locationResources: LocationResource[];
  publicBookingConfigs: PublicBookingConfig[];
  classSessions: ClassSession[];
  classParticipants: ClassParticipant[];
  formRequirements: FormRequirement[];
  formSubmissions: FormSubmission[];
  onboardingCases: OnboardingCase[];
  clientDocuments: ClientDocument[];
  foodLogs: FoodLog[];
  discoverySubmissions: DiscoveryCallSubmission[];
  payments: PaymentRecord[];
  notifications: QueuedNotification[];
  /* Amendment — sellable capacity inputs */
  staffAvailability: StaffAvailability[];
  blockedTimes: BlockedTime[];
  serviceResourceRequirements: ServiceResourceRequirement[];
  /* Build #3 — makeup ledger, override audit, one-off schedule exceptions */
  makeupCredits: MakeupCredit[];
  schedulingOverrides: SchedulingOverride[];
  scheduleExceptions: ScheduleException[];
  /* Tasks / action items — one shared, permission-filtered collection */
  tasks: Task[];
  /* Build #5 — staff portal accounts, invitations & permission overrides */
  userAccounts: UserAccount[];
  staffInvitations: StaffInvitation[];
  staffPermissionOverrides: StaffPermissionOverride[];
  /* Build #4 — assessment, reassessment & quarterly results review engine */
  assessmentTemplates: AssessmentTemplate[];
  assessmentTemplateVersions: AssessmentTemplateVersion[];
  assessmentAssignments: AssessmentAssignment[];
  completedAssessments: CompletedAssessment[];
  quarterlyCycles: QuarterlyCycle[];
  resultsReviews: ResultsReview[];
  placementRecommendations: PlacementRecommendation[];
  /** Ids of one-off demo-data corrections already applied to this browser. */
  appliedCorrections?: string[];
}

/**
 * One-off, idempotent demo-data corrections requested by leadership. Each runs
 * once per browser and is then remembered, so a later manual change in Preview
 * is never undone on the next load.
 */
const DATA_CORRECTIONS: { id: string; apply: (data: MutableDataset) => void }[] = [
  {
    // Requested 2026-09-15: Olivia Lowery is no longer an active staff member.
    id: "deactivate-staff-12",
    apply: (data) => {
      const staff = data.staff.find((s) => s.id === "staff-12");
      if (!staff) return;
      staff.isActive = false;
      staff.isBookable = false;
      staff.employmentStatus = "inactive";
      staff.updatedAt = nowIso();
    },
  },
];

function applyCorrections(data: MutableDataset) {
  const applied = new Set(data.appliedCorrections ?? []);
  DATA_CORRECTIONS.forEach((c) => {
    if (applied.has(c.id)) return;
    c.apply(data);
    applied.add(c.id);
  });
  data.appliedCorrections = [...applied];
  return data;
}

/**
 * Leadership (Jen Sawyer, Meagan Freiwald) keep the operational capabilities
 * they had before permission levels existed. Defined here rather than in
 * `accounts.ts` to avoid a module cycle.
 */
const SEEDED_PERMISSION_OVERRIDES: StaffPermissionOverride[] = ["staff-2", "staff-7"].flatMap(
  (staffId) =>
    (
      [
        "calendar.all",
        "calendar.recurring",
        "calendar.cancellations",
        "clients.edit",
        "staff.edit",
        "reports.view",
      ] as StaffPermissionOverride["toggle"][]
    ).map((toggle) => ({ staffId, toggle, effect: "grant" as const })),
);

function freshDataset(): MutableDataset {
  return {
    staff: [...seed.STAFF, ...testImport.TEST_STAFF].map((r) => ({ ...r })),
    staffLocations: [...seed.STAFF_LOCATIONS, ...testImport.TEST_STAFF_LOCATIONS].map((r) => ({ ...r })),
    staffServices: [...seed.STAFF_SERVICES, ...testImport.TEST_STAFF_SERVICES].map((r) => ({ ...r })),
    clients: [...seed.CLIENTS, ...testImport.TEST_CLIENTS, ...assessmentSeed.ASSESSMENT_DEMO_CLIENTS].map((r) => ({ ...r })),
    assignments: seed.CLIENT_STAFF_ASSIGNMENTS.map((r) => ({ ...r })),
    enrollments: seed.CLIENT_SERVICE_ENROLLMENTS.map((r) => ({ ...r })),
    appointments: [...seed.APPOINTMENTS, ...testImport.TEST_APPOINTMENTS].map((r) => ({ ...r })),
    appointmentStatusHistory: seed.APPOINTMENT_STATUS_HISTORY.map((r) => ({ ...r })),
    recurringAppointments: seed.RECURRING_APPOINTMENTS.map((r) => ({ ...r })),
    recurringSeriesChanges: [],
    creditTransactions: seed.CREDIT_TRANSACTIONS.map((r) => ({ ...r })),
    services: [...seed.SERVICES, ...testImport.TEST_SERVICES].map((r) => ({ ...r })),
    locationResources: seed.LOCATION_RESOURCES.map((r) => ({ ...r })),
    publicBookingConfigs: seed.PUBLIC_BOOKING_CONFIGS.map((r) => ({ ...r })),
    classSessions: seed.CLASS_SESSIONS.map((r) => ({ ...r })),
    classParticipants: seed.CLASS_PARTICIPANTS.map((r) => ({ ...r })),
    formRequirements: [],
    formSubmissions: [],
    onboardingCases: [],
    clientDocuments: [],
    foodLogs: [],
    discoverySubmissions: [],
    payments: [],
    notifications: [],
    staffAvailability: seed.STAFF_AVAILABILITY.map((r) => ({ ...r })),
    blockedTimes: [...seed.BLOCKED_TIMES, ...testImport.TEST_BLOCKED_TIMES].map((r) => ({ ...r })),
    serviceResourceRequirements: seed.SERVICE_RESOURCE_REQUIREMENTS.map((r) => ({ ...r })),
    makeupCredits: seed.MAKEUP_CREDITS.map((r) => ({ ...r })),
    schedulingOverrides: [],
    scheduleExceptions: seed.SCHEDULE_EXCEPTIONS.map((r) => ({ ...r })),
    tasks: [...seed.TASKS, ...taskSeed.DEMO_TASKS].map((r) => ({ ...r })),
    // Owners start with an active portal account; everyone else is Not Invited
    // until Jennifer or Jessie sends them an invitation.
    userAccounts: seed.USER_ACCOUNTS.filter((a) =>
      ["staff-8", "staff-1"].includes(a.subjectId ?? ""),
    ).map((r) => ({ ...r })),
    staffInvitations: [],
    staffPermissionOverrides: SEEDED_PERMISSION_OVERRIDES.map((o) => ({ ...o })),
    assessmentTemplates: assessmentSeed.ASSESSMENT_TEMPLATES.map((r) => ({ ...r })),
    assessmentTemplateVersions: assessmentSeed.ASSESSMENT_TEMPLATE_VERSIONS.map((r) => ({ ...r })),
    assessmentAssignments: assessmentSeed.ASSESSMENT_ASSIGNMENTS.map((r) => ({ ...r })),
    completedAssessments: assessmentSeed.COMPLETED_ASSESSMENTS.map((r) => ({ ...r })),
    quarterlyCycles: assessmentSeed.QUARTERLY_CYCLES.map((r) => ({ ...r })),
    resultsReviews: assessmentSeed.RESULTS_REVIEWS.map((r) => ({ ...r })),
    placementRecommendations: assessmentSeed.PLACEMENT_RECOMMENDATIONS.map((r) => ({ ...r })),
  };
}

let dataset: MutableDataset = applyCorrections(freshDataset());
let version = 0;
let hydrated = false;
const listeners = new Set<() => void>();

export function getDataset(): MutableDataset {
  return dataset;
}

export function getVersion() {
  return version;
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  version += 1;
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(dataset));
  } catch {
    /* storage unavailable — demo continues in memory only */
  }
}

/** Applies a mutation, persists it, and notifies subscribers. */
export function mutate<T>(fn: (data: MutableDataset) => T): T {
  const result = fn(dataset);
  persist();
  notify();
  return result;
}

/** Called once on the client after hydration so SSR output stays stable. */
export function hydrateFromStorage() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<MutableDataset>;
    dataset = applyCorrections({ ...freshDataset(), ...parsed });
    persist();
    notify();
  } catch {
    /* corrupt payload — fall back to seed data */
  }
}

/** Restores the pristine demo dataset. */
export function resetDemoData() {
  dataset = applyCorrections(freshDataset());
  persist();
  notify();
}

/**
 * Removes the sanitized test-schedule import cleanly. Every imported record id
 * starts with one of these prefixes, so nothing from the original demo data set
 * (or anything created by hand in Preview) is touched.
 */
export function removeTestScheduleImport() {
  const isTest = (id: string) =>
    id.startsWith("TEST-") || id.startsWith("tc-") || id.startsWith("tstaff-") ||
    id.startsWith("tsvc-") || id.startsWith("tblk-");
  mutate((data) => {
    data.appointments = data.appointments.filter((a) => !isTest(a.id));
    data.clients = data.clients.filter((c) => !isTest(c.id));
    data.staff = data.staff.filter((s) => !isTest(s.id));
    data.services = data.services.filter((s) => !isTest(s.id));
    data.blockedTimes = data.blockedTimes.filter((b) => !isTest(b.id));
    data.staffLocations = data.staffLocations.filter((l) => !isTest(l.staffId));
    data.staffServices = data.staffServices.filter(
      (s) => !isTest(s.staffId) && !isTest(s.serviceId),
    );
  });
}

export function nextId(prefix: string) {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}`;
}

export function nowIso() {
  return new Date().toISOString();
}
