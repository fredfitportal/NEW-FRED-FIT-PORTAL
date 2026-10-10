/**
 * FredFit Portal — Phase 1 domain model.
 *
 * These types describe the canonical FFS operating-system entities. They are
 * intentionally storage-provider neutral: nothing here references a specific
 * database, SDK or file host. A future AWS/Postgres backend implements the
 * repository interface in `src/lib/domain/repository.ts` without any frontend
 * or client-record rewrite.
 */

export type ID = string;
export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string; // full ISO 8601

/** Every persisted record carries the same audit envelope. */
export interface BaseRecord {
  id: ID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  createdBy?: ID;
  updatedBy?: ID;
  /** Records are archived, never hard-deleted, through normal UI actions. */
  archivedAt?: ISODateTime | null;
}

/* ------------------------------------------------------------------ */
/* Authentication, roles & permissions                                 */
/* ------------------------------------------------------------------ */

/**
 * Authentication identity. Deliberately separate from `StaffMember` and
 * `Client` — a login account is not synonymous with a staff or client record.
 */
export interface UserAccount extends BaseRecord {
  email: string;
  /** Which profile this credential resolves to, if any. */
  subjectType: "staff" | "client" | "system";
  subjectId?: ID;
  status: "active" | "invited" | "suspended" | "disabled";
  lastLoginAt?: ISODateTime | null;
  mfaEnabled: boolean;
  /** External auth provider id (Cognito / Supabase / etc.) — never assumed. */
  authProvider?: string;
  authProviderUserId?: string;
}

export type PermissionKey =
  | "clients.view"
  | "clients.edit"
  | "health.view"
  | "health.edit"
  | "assessments.view"
  | "assessments.create"
  | "assessments.edit"
  | "assessments.finalize"
  | "assessment_templates.manage"
  | "reassessments.manage"
  | "assessment_media.upload"
  | "assessment_media.view"
  | "programs.view"
  | "programs.edit"
  | "medical_exercise.view"
  | "medical_exercise.edit"
  | "nutrition.view"
  | "nutrition.edit"
  | "recovery.view"
  | "recovery.edit"
  | "communications.view"
  | "communications.participate"
  | "scheduling.manage"
  | "staff.manage"
  | "reports.view"
  | "settings.manage"
  | "credits.view"
  | "credits.manage"
  | "billing.view"
  | "billing.manage";

export interface Permission {
  key: PermissionKey;
  label: string;
  group: string;
  description: string;
}

/** Role families are data, not hard-coded enums — new roles can be added. */
export interface Role extends BaseRecord {
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
}

export interface RolePermission {
  roleId: ID;
  permission: PermissionKey;
}

/** Per-user grants/revocations layered on top of role permissions. */
export interface UserPermission {
  userId: ID;
  permission: PermissionKey;
  effect: "grant" | "revoke";
  reason?: string;
}

/**
 * Coarse, staff-facing permission switches. A base permission level supplies a
 * default set; these are the only overrides Jennifer/Jessie manage per person.
 * Each maps to one or more `PermissionKey`s in `accounts.ts`.
 */
export type PermissionToggle =
  | "calendar.own"
  | "calendar.all"
  | "calendar.recurring"
  | "calendar.cancellations"
  | "clients.view_assigned"
  | "clients.edit"
  | "clients.documentation"
  | "staff.directory"
  | "staff.edit"
  | "billing.view"
  | "billing.manage"
  | "reports.view"
  | "tasks.oversight";

/** A single explicit on/off override layered on the person's level defaults. */
export interface StaffPermissionOverride {
  staffId: ID;
  toggle: PermissionToggle;
  effect: "grant" | "revoke";
  setByStaffId?: ID;
  setAt?: ISODateTime;
}

/**
 * A simulated portal invitation. Shaped like the real thing so production
 * authentication can replace the delivery mechanism without touching staff
 * records or the permission architecture.
 */
export interface StaffInvitation extends BaseRecord {
  staffId: ID;
  email: string;
  token: string;
  sentByStaffId: ID;
  sentAt: ISODateTime;
  expiresAt: ISODateTime;
  acceptedAt?: ISODateTime | null;
  cancelledAt?: ISODateTime | null;
  status: "pending" | "accepted" | "cancelled" | "expired";
}

/* ------------------------------------------------------------------ */
/* Organization                                                        */
/* ------------------------------------------------------------------ */

export interface Location extends BaseRecord {
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  phone?: string;
  isActive: boolean;
}

export type ServiceCategory =
  | "personal_training"
  | "pilates"
  | "medical_exercise"
  | "nutrition"
  | "recovery"
  | "apparatix"
  | "onboarding";

export interface Service extends BaseRecord {
  name: string;
  category: ServiceCategory;
  /** Recovery supports multiple sub-services (massage, assisted stretching…). */
  subCategory?: string;
  defaultDurationMinutes: number;
  isVirtualByDefault: boolean;
  requiresDocumentation: boolean;
  documentationType?: DocumentationType;
  /**
   * Superbills are never a blanket, service-wide guarantee. This flag only
   * indicates the line CAN produce a superbill when the client, provider and
   * billing configuration qualify — and only on request.
   */
  superbillPossible: boolean;
  /**
   * Group/class services (Apparatix, Apparatix Plus) carry a configurable
   * capacity. Never hard-code the number in UI components — read it here.
   */
  isGroupClass?: boolean;
  classCapacity?: number;
  /** Individual, partner (2 clients) or trio (3 clients) delivery format. */
  sessionFormat?: "individual" | "partner" | "trio" | "group";
  /** Number of clients the session is sold to (1 for individual, 2 partner…). */
  clientCapacity?: number;
  /* --- admin-managed service catalog configuration --- */
  /** Where the service may be delivered. Empty = any location. */
  allowedLocationIds?: ID[];
  /** Rooms/resources this service may occupy. Empty = no resource required. */
  allowedResourceIds?: ID[];
  /** Physical studio, virtual, or delivered at the client's own location. */
  deliveryMode?: "in_person" | "virtual" | "in_home";
  /** Whether booked time counts toward a trainer's contracted client-facing capacity. */
  countsTowardCapacity?: boolean;
  /** Whether an Early Cancel of this service issues a makeup. */
  makeupEligible?: boolean;
  /** Calendar colour key override (see service-colors.ts). */
  colorKey?: string;
  /** Display order in pickers and the catalog. */
  displayOrder?: number;
  isActive: boolean;
}

export type DocumentationType =
  | "session_note"
  | "structured_session_note"
  | "soap_note"
  | "nutrition_summary"
  | "assessment_report";

/* ------------------------------------------------------------------ */
/* Staff                                                               */
/* ------------------------------------------------------------------ */

export interface StaffMember extends BaseRecord {
  firstName: string;
  lastName: string;
  preferredName?: string;
  email: string;
  phone?: string;
  jobTitle: string;
  /** Descriptive only — never grants access. */
  department?: string;
  /** Descriptive employment type, distinct from `employmentStatus`. */
  employmentType?: "full_time" | "part_time" | "contractor";
  roleId: ID;
  employmentStatus: "full_time" | "part_time" | "contractor" | "inactive";
  hireDate: ISODate;
  biography?: string;
  photoUrl?: string;
  /** Scheduled working hours per week — NOT the same as contracted capacity. */
  weeklyHours?: number;
  /**
   * Contracted client-facing capacity target. Deliberately distinct from
   * `weeklyHours`: a trainer may work 40 hours with a 30-hour client target.
   */
  contractedWeeklyCapacityHours?: number;
  primaryLocationId?: ID;
  additionalLocationIds?: ID[];
  /** Column order on the calendar. */
  displayOrder?: number;
  /** Inactive or non-bookable staff never appear as a bookable provider. */
  isBookable?: boolean;
  adminNotes?: string;
  isActive: boolean;
}

export interface StaffCredential extends BaseRecord {
  staffId: ID;
  name: string;
  issuingBody?: string;
  identifier?: string;
  issuedOn?: ISODate;
  expiresOn?: ISODate | null;
}

export interface StaffLocation {
  staffId: ID;
  locationId: ID;
}

export interface StaffService {
  staffId: ID;
  serviceId: ID;
}

/* ------------------------------------------------------------------ */
/* Clients                                                             */
/* ------------------------------------------------------------------ */

export type ClientStatus = "active" | "prospect" | "onboarding" | "paused" | "inactive" | "archived";

export interface Client extends BaseRecord {
  /** Human-facing unique client id, stable across every module. */
  clientNumber: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth: ISODate;
  email: string;
  phone?: string;
  status: ClientStatus;
  dateJoined: ISODate;
  primaryLocationId: ID;
  goals?: string;
  alerts: string[];
  relationshipNotes?: string;
  onboardingStatus: "not_started" | "in_progress" | "complete";
  /* Lead / marketing context — captured once, preserved through conversion. */
  preferredContactMethod?: "email" | "phone" | "text";
  bookingSource?: BookingSource;
  /** Free-form marketing/referral answer, kept separate from bookingSource. */
  referralSource?: string;
  /** Structured field — never buried inside generic notes. */
  successStatement?: string;
  biggestChallenge?: string;
  serviceInterests?: string[];
  /**
   * Unguessable token backing the demo secure client intake link. A real
   * client portal replaces this with authenticated access.
   */
  secureAccessToken?: string;
}

export type AssignmentRole =
  | "primary_trainer"
  | "pilates_instructor"
  | "medical_exercise_specialist"
  | "dietitian"
  | "recovery_professional"
  | "care_coordinator";

export interface ClientStaffAssignment extends BaseRecord {
  clientId: ID;
  staffId: ID;
  assignmentRole: AssignmentRole;
  startDate: ISODate;
  endDate?: ISODate | null;
  isActive: boolean;
}

export type EnrollmentStatus = "active" | "pending" | "referral_pending" | "completed" | "inactive";

export interface ClientServiceEnrollment extends BaseRecord {
  clientId: ID;
  serviceId: ID;
  status: EnrollmentStatus;
  startDate: ISODate;
  endDate?: ISODate | null;
  providerStaffIds: ID[];
  frequency?: string;
  notes?: string;
}

/* ------------------------------------------------------------------ */
/* Scheduling (core entity, not a placeholder)                         */
/* ------------------------------------------------------------------ */

/**
 * Early Cancel and Late Cancel are structurally distinct because they may
 * produce different makeup/credit outcomes. `cancelled` remains separate for
 * administrative / studio-driven cancellations that are not client
 * early/late-cancel events.
 */
export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "early_cancel"
  | "late_cancel"
  | "no_show"
  | "rescheduled"
  | "cancelled";

export type AttendanceStatus = "pending" | "attended" | "absent" | "excused";

/**
 * Standard FFS recurrence options. `every_4_weeks` and `monthly` are
 * deliberately distinct — they are not mathematically equivalent.
 */
export type RecurrenceFrequency =
  | "weekly"
  | "every_other_week"
  | "every_4_weeks"
  | "monthly"
  | "custom";

export interface RecurringAppointment extends BaseRecord {
  clientId: ID;
  serviceId: ID;
  providerStaffId: ID;
  locationId?: ID;
  frequency: RecurrenceFrequency;
  /** Free-form pattern description used when frequency is "custom". */
  customPattern?: string;
  /** Optional iCalendar RRULE for a future scheduling engine. */
  rrule?: string;
  weekday?: number; // 0 = Sunday
  startTime: string; // HH:mm
  durationMinutes: number;
  startDate: ISODate;
  endDate?: ISODate | null;
  status: "active" | "paused" | "ended";
  /** Optional link to the agreement that keeps this series running. */
  serviceAgreementId?: ID | null;
  isActive: boolean;
  notes?: string;
  /**
   * Every client attached to the recurring session (shared/partner formats).
   * Unset for ordinary one-client series.
   */
  participantClientIds?: ID[];
  /** Room / resource normally used for the series. */
  resourceId?: ID | null;
  appointmentType?: "in_person" | "virtual";
  /**
   * Date the CURRENT pattern is anchored to. Future occurrences are generated
   * from this date, so a permanent day/time change from a future date keeps
   * generating at the new day/time once existing occurrences run out.
   * `startDate` stays as the historical beginning of the series.
   */
  anchorDate?: ISODate;
  /** Date the current pattern took effect (informational / audit). */
  patternEffectiveDate?: ISODate;
  /**
   * Series created or edited through the recurring-series workflow keep
   * generating future occurrences automatically. Legacy demo series are left
   * untouched unless leadership opts them in.
   */
  autoGenerate?: boolean;
  /** Last date occurrences were generated through. */
  generatedThroughDate?: ISODate | null;
  /**
   * Temporary administrative interruption. No occurrence is generated on or
   * after `pauseStartDate` and before `resumeDate`; generation picks the
   * CURRENT pattern back up on `resumeDate`.
   */
  pauseStartDate?: ISODate | null;
  resumeDate?: ISODate | null;
  pauseReason?: string | null;
  /**
   * Participant-level temporary holds on a shared (Partner/Trio) schedule.
   * Only the named client is detached from occurrences inside the window; the
   * schedule itself, and every other participant, keeps running untouched.
   * No cancellation status and no make-up credit is ever involved.
   */
  participantPauses?: RecurringParticipantPause[];
}

/** One client's temporary hold on a shared recurring schedule. */
export interface RecurringParticipantPause {
  clientId: ID;
  pauseStartDate: ISODate;
  resumeDate: ISODate;
  reason?: string | null;
  createdBy: ID;
  createdAt: string;
}

/**
 * Append-only audit of recurring-PATTERN changes. Individual appointment
 * changes stay in `AppointmentStatusHistory`; this records what the recurring
 * definition itself used to be, what it became, from when, and who did it.
 */
export interface RecurringSeriesChange extends BaseRecord {
  seriesId: ID;
  /** Occurrence the change was initiated from, when applicable. */
  appointmentId?: ID | null;
  changedByStaffId: ID;
  changedAt: string;
  effectiveDate: ISODate;
  scope:
    | "occurrence"
    | "this_and_future"
    | "series_end"
    | "series_pause"
    | "series_resume"
    | "participant_pause"
    | "participant_resume";
  field: string;
  previousValue: string;
  newValue: string;
  reason?: string;
  /** Number of already-generated occurrences updated by the change. */
  occurrencesAffected?: number;
}

/**
 * Membership / service agreement. Separate from the recurring series so a
 * 12-month commitment can auto-renew without limiting or rewriting the
 * schedule or its history.
 */
export interface ServiceAgreement extends BaseRecord {
  clientId: ID;
  serviceId: ID;
  name: string;
  startDate: ISODate;
  initialCommitmentMonths: number;
  autoRenew: boolean;
  renewalStatus: "in_initial_term" | "renewed" | "pending_renewal" | "not_renewing";
  currentTermStart: ISODate;
  currentTermEnd: ISODate;
  status: "active" | "paused" | "ended";
  notes?: string;
}

export type SuperbillRequestStatus =
  | "not_requested"
  | "requested"
  | "draft"
  | "finalized"
  | "corrected"
  | "voided";

export interface Appointment extends BaseRecord {
  /** Primary/booking client. Always present, including on shared sessions. */
  clientId: ID;
  /**
   * Every client attached to this session, primary client included. Left unset
   * for ordinary one-client appointments; set for shared formats such as
   * Partner, Trio, APPARATIX and group sessions where several clients attend
   * one session with one provider at one time.
   */
  participantClientIds?: ID[];
  /**
   * Per-participant status rows for shared sessions. Absent on ordinary
   * one-client appointments, where the appointment-level status IS the
   * participant's status. Created lazily the first time a participant status
   * is set, and always kept in sync with `participantClientIds`.
   */
  participants?: AppointmentParticipant[];


  serviceId: ID;
  providerStaffId: ID;
  locationId?: ID;
  /** Room / equipment resource where applicable. */
  resourceName?: string | null;
  recurringAppointmentId?: ID | null;
  date: ISODate;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  status: AppointmentStatus;
  attendanceStatus: AttendanceStatus;
  cancelledAt?: ISODateTime | null;
  cancellationNoticeHours?: number | null;
  cancellationReason?: string;
  /**
   * The slot in the recurring pattern this occurrence belongs to. Set when a
   * single occurrence is moved off its pattern date so generation knows that
   * slot is already accounted for and must not be recreated.
   */
  seriesPatternDate?: ISODate | null;
  /** Where this occurrence originally sat before a single-occurrence move. */
  rescheduledFromDate?: ISODate | null;
  rescheduledFromStartTime?: string | null;
  rescheduledAt?: ISODateTime | null;
  rescheduledByStaffId?: ID | null;
  /** Reschedule chain — occurrences stay linked to their series. */
  rescheduledFromAppointmentId?: ID | null;
  rescheduledToAppointmentId?: ID | null;
  completedAt?: ISODateTime | null;
  /** Links to entitlement records. */
  clientMembershipId?: ID | null;
  serviceAgreementId?: ID | null;
  clientPackageId?: ID | null;
  redeemedCreditTransactionId?: ID | null;
  documentationRequired: boolean;
  documentationStatus: "not_required" | "pending" | "complete";
  /**
   * Superbill eligibility is never a blanket service-level claim. It is
   * evaluated per appointment/client/provider/billing configuration, and
   * superbills are only produced on request.
   */
  superbillRequestStatus: SuperbillRequestStatus;
  /* Provider-neutral virtual meeting / external calendar sync */
  appointmentType: "in_person" | "virtual";
  externalCalendarProvider?: "google" | "microsoft" | "other" | null;
  externalCalendarEventId?: string | null;
  virtualMeetingProvider?: "google_meet" | "zoom" | "other" | null;
  virtualMeetingUrl?: string | null;
  virtualMeetingId?: string | null;
  syncStatus?: "not_synced" | "pending" | "synced" | "error";
  lastSyncedAt?: ISODateTime | null;
  syncError?: string | null;
  notes?: string;
  /* Location → room/resource. Resources are canonical records, not labels. */
  resourceId?: ID | null;
  /* Provenance and payment (public booking engine). */
  bookingSource?: BookingSource;
  publicBookingConfigId?: ID | null;
  paymentStatus?: PaymentStatus;
  paymentId?: ID | null;
  /** Set when this appointment is a participant slot in a group class. */
  classSessionId?: ID | null;
  /** Makeup credit consumed by this appointment (see MakeupCredit). */
  makeupCreditId?: ID | null;
  /** Makeup credit issued *because* this appointment was early-cancelled. */
  issuedMakeupCreditId?: ID | null;
  /** In-home delivery: the client's own location, not a studio. */
  isInHome?: boolean;
  /** Who last rescheduled this appointment, and when. */
  lastRescheduledByStaffId?: ID | null;
  lastRescheduledAt?: ISODateTime | null;
  cancelledByStaffId?: ID | null;
  completedByStaffId?: ID | null;
  /** Explicit forfeiture flag — Late Cancel and No Show forfeit the session. */
  sessionForfeited?: boolean;
  makeupEligibility?: "eligible" | "issued" | "forfeited" | "not_applicable";
}

/**
 * Per-participant state inside a shared session (Partner, Trio, APPARATIX,
 * group). One client may cancel without changing anyone else's status, so
 * attendance, cancellation notice and make-up linkage are tracked here rather
 * than only on the session record.
 */
export interface AppointmentParticipant {
  clientId: ID;
  status: AppointmentStatus;
  attendanceStatus: AttendanceStatus;
  cancelledAt?: ISODateTime | null;
  cancellationNoticeHours?: number | null;
  cancellationReason?: string;
  completedAt?: ISODateTime | null;
  sessionForfeited?: boolean;
  makeupEligibility?: "eligible" | "issued" | "forfeited" | "not_applicable";
  /** Make-up credit issued because THIS participant early-cancelled. */
  issuedMakeupCreditId?: ID | null;
  /** Make-up credit this participant used to attend the session. */
  makeupCreditId?: ID | null;
  updatedAt?: ISODateTime;
  updatedByStaffId?: ID | null;
}


export interface AppointmentStatusHistory extends BaseRecord {
  appointmentId: ID;
  fromStatus?: AppointmentStatus;
  toStatus: AppointmentStatus;
  changedByStaffId?: ID;
  reason?: string;
  occurredAt: ISODateTime;
}


/* ------------------------------------------------------------------ */
/* Entitlements: memberships, packages, credit ledger                  */
/* ------------------------------------------------------------------ */

export interface Membership extends BaseRecord {
  name: string;
  serviceCategory: ServiceCategory;
  sessionsPerPeriod?: number;
  period?: "week" | "month";
  isActive: boolean;
}

export interface ClientMembership extends BaseRecord {
  clientId: ID;
  membershipId: ID;
  status: "active" | "paused" | "cancelled";
  startDate: ISODate;
  endDate?: ISODate | null;
  frequency?: string;
}

export interface Package extends BaseRecord {
  name: string;
  serviceCategory: ServiceCategory;
  sessionCount: number;
  isActive: boolean;
}

export interface ClientPackage extends BaseRecord {
  clientId: ID;
  packageId: ID;
  purchasedOn: ISODate;
  expiresOn?: ISODate | null;
  status: "active" | "expired" | "completed";
}

export type CreditTypeKey =
  | "pt_makeup"
  | "pilates_makeup"
  | "medical_exercise_makeup"
  | "recovery_makeup"
  | "apparatix_credit"
  | "general_account_credit";

/**
 * Configurable credit definitions — credits are NOT interchangeable by
 * default. The reference dollar value is accounting/reference information and
 * does not make a credit fungible across service lines.
 */
export interface CreditType extends BaseRecord {
  key: CreditTypeKey | string;
  name: string;
  /** Empty array = unrestricted (General Account Credit). */
  eligibleServiceCategories: ServiceCategory[];
  /** Configurable business value, e.g. Apparatix Credit = $45. */
  referenceValueUsd: number;
  /** Only a leadership override may move value across service lines. */
  transferable: boolean;
  defaultExpirationDays?: number | null;
  maxBalance?: number | null;
  isActive: boolean;
}

export type CreditTransactionDirection = "earned" | "redeemed" | "adjustment" | "expired";

/**
 * Ledger, not a counter. Current balance is always derived from transaction
 * history so FFS can explain exactly how a balance was calculated. Historical
 * transactions are never edited; corrections are new adjustment rows.
 */
export interface CreditTransaction extends BaseRecord {
  clientId: ID;
  creditTypeId: ID;
  /** Positive = earned/granted, negative = redeemed/expired/removed. */
  amount: number;
  direction: CreditTransactionDirection;
  /** Reference value per unit at the time of the transaction. */
  referenceValueUsd: number;
  transactionDate: ISODate;
  reason: string;
  originatingAppointmentId?: ID | null;
  originatingCancellationStatus?: AppointmentStatus | null;
  redeemedAppointmentId?: ID | null;
  /** Service category this credit may be applied to; null = unrestricted. */
  serviceRestriction?: ServiceCategory | null;
  expiresOn?: ISODate | null;
  status: "available" | "redeemed" | "expired" | "voided" | "adjusted";
  createdByStaffId?: ID | null;
  /** Required for leadership overrides. */
  authorizedByStaffId?: ID | null;
  /** Points at the transaction this override/adjustment relates to. */
  overrideOfTransactionId?: ID | null;
  isLeadershipOverride?: boolean;
  auditLogEntryId?: ID | null;
  notes?: string;
}

/**
 * Configurable, leadership-editable rule. No FFS cancellation policy has been
 * approved yet, so seeded rules stay `isActive: false` and are labelled
 * "Demo / Inactive" in the UI. Nothing issues credit automatically.
 */
export interface CreditRule extends BaseRecord {
  name: string;
  serviceCategory: ServiceCategory | "all";
  /** Which attendance outcome the rule would respond to. */
  triggerStatus: AppointmentStatus | "any";
  requiredNoticeHours: number;
  grantsCreditTypeId?: ID | null;
  creditAmount: number;
  expirationDays?: number | null;
  transferable: boolean;
  maxBalance?: number | null;
  /** Always false until FFS leadership approves real policy. */
  isActive: boolean;
  policyState: "demo_inactive" | "approved";
}


/* ------------------------------------------------------------------ */
/* Assessments (historical, never overwritten)                         */
/* ------------------------------------------------------------------ */

export interface AssessmentType extends BaseRecord {
  key: string;
  name: string;
  category: ServiceCategory | "general";
  description: string;
  supportsOverallScore: boolean;
  supportsMedia: boolean;
  isActive: boolean;
}

/** A metric definition belonging to an assessment type. */
export interface AssessmentMetric extends BaseRecord {
  assessmentTypeId: ID;
  key: string;
  name: string;
  valueType: "numeric" | "categorical" | "score";
  unit?: string;
  sided: boolean;
  graphable: boolean;
  displayOrder: number;
}

/** Each assessment event is its own dated instance — nothing is overwritten. */
export interface AssessmentInstance extends BaseRecord {
  clientId: ID;
  assessmentTypeId: ID;
  assessmentDate: ISODate;
  assessorStaffId: ID;
  status: "draft" | "final" | "amended";
  overallScore?: number | null;
  notes?: string;
  /** Prior instance used for comparison, if any. */
  previousInstanceId?: ID | null;
  sequenceLabel?: string; // "Initial", "Reassessment 1", …
}

export interface AssessmentResult extends BaseRecord {
  assessmentInstanceId: ID;
  assessmentMetricId: ID;
  numericValue?: number | null;
  categoricalValue?: string | null;
  leftValue?: number | null;
  rightValue?: number | null;
  score?: number | null;
  painIndicator?: boolean | null;
  observations?: string;
  correctivePriority?: "none" | "low" | "medium" | "high";
  displayOrder: number;
}

/* ------------------------------------------------------------------ */
/* Media (storage-provider neutral)                                    */
/* ------------------------------------------------------------------ */

export interface MediaAttachment extends BaseRecord {
  clientId?: ID | null;
  relatedEntityType:
    | "assessment_instance"
    | "assessment_result"
    | "client"
    | "staff"
    | "message"
    | "document";
  relatedEntityId: ID;
  /** Provider is data, never hard-coded: s3 | gcs | pcloud | local | … */
  storageProvider: string;
  objectKey: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  visibility: "internal" | "client_visible" | "restricted";
  uploadedByUserId?: ID;
  uploadedAt: ISODateTime;
  isArchived: boolean;
}

/* ------------------------------------------------------------------ */
/* Work management, communication, audit                               */
/* ------------------------------------------------------------------ */

/** Categories offered when creating a task, plus legacy seed categories. */
export type TaskCategory =
  | "client_follow_up"
  | "scheduling"
  | "billing"
  | "staff_hr"
  | "operations"
  | "marketing"
  | "programming"
  | "other"
  /* legacy demo categories, still displayed */
  | "documentation"
  | "follow_up"
  | "reassessment"
  | "admin"
  | "onboarding";

export interface Task extends BaseRecord {
  title: string;
  description?: string;
  assignedStaffId?: ID;
  clientId?: ID | null;
  relatedAppointmentId?: ID | null;
  category: TaskCategory;
  dueDate?: ISODate;
  priority: "low" | "normal" | "high";
  status: "open" | "in_progress" | "complete";
  /** Author of the task — always visible to them. */
  createdByStaffId?: ID;
  createdDate?: ISODate;
  /** Staff explicitly granted sight of this task beyond assignee and owners. */
  sharedWithStaffIds?: ID[];
  completedByStaffId?: ID | null;
  completedAt?: ISODateTime | null;
}

export interface Conversation extends BaseRecord {
  clientId: ID;
  subject: string;
  /** Conversations stay with the client record across staff changes. */
  status: "open" | "archived";
  lastMessageAt?: ISODateTime;
}

export interface ConversationMember {
  conversationId: ID;
  participantType: "staff" | "client";
  participantId: ID;
  role: "participant" | "observer";
}

export interface Message extends BaseRecord {
  conversationId: ID;
  senderType: "staff" | "client" | "system";
  senderId: ID;
  body: string;
  sentAt: ISODateTime;
}

export interface AuditLogEntry extends BaseRecord {
  userId?: ID;
  action: string;
  entityType: string;
  entityId: ID;
  summary: string;
  previousValue?: string | null;
  newValue?: string | null;
  occurredAt: ISODateTime;
}

export interface Notification extends BaseRecord {
  staffId: ID;
  title: string;
  body?: string;
  readAt?: ISODateTime | null;
  link?: string;
}

/* ------------------------------------------------------------------ */
/* Billing / superbill foundation (no codes or rules invented)         */
/* ------------------------------------------------------------------ */

export interface ProviderBillingProfile extends BaseRecord {
  staffId: ID;
  providerCredentials?: string;
  npi?: string;
  practiceName?: string;
  practiceAddress?: string;
  taxIdOnFile: boolean;
  isActive: boolean;
}

export interface ClientInsuranceInformation extends BaseRecord {
  clientId: ID;
  carrierName?: string;
  memberIdOnFile: boolean;
  notes?: string;
}

export interface ProcedureCode extends BaseRecord {
  code: string;
  description: string;
  isActive: boolean;
}

export interface DiagnosisCode extends BaseRecord {
  code: string;
  description: string;
  isActive: boolean;
}

export interface Superbill extends BaseRecord {
  clientId: ID;
  providerStaffId: ID;
  superbillNumber: string;
  issueDate: ISODate;
  periodStart: ISODate;
  periodEnd: ISODate;
  /** Superbills are produced only on request, never automatically. */
  status: SuperbillRequestStatus;
  requestedByType?: "client" | "staff";
  requestedAt?: ISODateTime | null;

  /** Corrections create a replacement version; originals are preserved. */
  replacesSuperbillId?: ID | null;
  totalCharged?: number;
  totalPaid?: number;
  attestedByStaffId?: ID | null;
}

export interface SuperbillItem extends BaseRecord {
  superbillId: ID;
  appointmentId?: ID | null;
  dateOfService: ISODate;
  serviceDescription: string;
  procedureCodeId?: ID | null;
  diagnosisCodeId?: ID | null;
  units: number;
  feeCharged: number;
  amountPaid?: number;
}


/* ------------------------------------------------------------------ */
/* Build #2.3 — business configuration, public booking, intake         */
/* ------------------------------------------------------------------ */

/**
 * A canonical room / equipment resource belonging to a Location.
 * Resource capacity is deliberately separate from service/class capacity:
 * a room may hold six people while the class itself allows six clients.
 */
export interface LocationResource extends BaseRecord {
  locationId: ID;
  name: string;
  kind: "exclusive" | "capacity";
  /** 1 for exclusive resources; configurable for capacity resources. */
  capacity: number;
  isActive: boolean;
  notes?: string;
  /** Services permitted to use this room. Empty = any service. */
  allowedServiceIds?: ID[];
  /** Display order within the location. */
  displayOrder?: number;
}

export type BookingSource =
  | "staff_scheduled"
  | "website"
  | "public_booking_link"
  | "discovery_call"
  | "social"
  | "google"
  | "referral"
  | "other";

export type PaymentStatus = "not_required" | "pending" | "paid" | "failed" | "refunded";

/**
 * Payment handoff record. FredFit never collects card data — payment happens
 * in the provider-hosted experience. A payment link alone does not prove
 * payment, so `paid` requires an explicit confirmation mechanism.
 */
export interface PaymentRecord extends BaseRecord {
  clientId: ID;
  appointmentId?: ID | null;
  provider: "quickbooks" | "none" | "other";
  status: PaymentStatus;
  expectedAmountUsd?: number | null;
  description?: string;
  externalPaymentUrl?: string | null;
  externalReference?: string | null;
  initiatedAt?: ISODateTime | null;
  paidAt?: ISODateTime | null;
  verifiedByStaffId?: ID | null;
  verificationMethod?: "manual_staff_confirmation" | "provider_webhook" | null;
}

/* ------------------------------ group classes ---------------------- */

export interface ClassSession extends BaseRecord {
  serviceId: ID;
  instructorStaffIds: ID[];
  locationId: ID;
  resourceId?: ID | null;
  date: ISODate;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  /** Copied from the service configuration at creation; still editable. */
  capacity: number;
  status: "scheduled" | "completed" | "cancelled";
  recurringAppointmentId?: ID | null;
  notes?: string;
}

export type ClassParticipantStatus =
  | "booked"
  | "attended"
  | "cancelled"
  | "late_cancelled"
  | "no_show"
  | "waitlisted";

export interface ClassParticipant extends BaseRecord {
  classSessionId: ID;
  clientId: ID;
  status: ClassParticipantStatus;
  bookedAt: ISODateTime;
  bookingSource: BookingSource;
  creditTransactionId?: ID | null;
  notes?: string;
}

/* --------------------------- public booking ------------------------ */

export interface PublicAvailabilityRules {
  /** 0 = Sunday. Demo configuration until FFS leadership supplies real hours. */
  weekdays: number[];
  startTime: string;
  endTime: string;
  slotIntervalMinutes: number;
  minimumNoticeHours: number;
  maximumHorizonDays: number;
  bufferMinutes: number;
  isDemoConfiguration: boolean;
}

export interface PublicBookingConfig extends BaseRecord {
  bookingType: string;
  slug: string;
  publicTitle: string;
  description: string;
  durationMinutes: number;
  providerStaffIds: ID[];
  locationId?: ID | null;
  resourceId?: ID | null;
  serviceId: ID;
  availability: PublicAvailabilityRules;
  /** Requirements created after a successful booking. */
  postBookingFormKeys: string[];
  /** Form collected during the public flow (lead forms only, never PHI). */
  publicFormKey?: string | null;
  paymentRequired: boolean;
  paymentProvider: "quickbooks" | "none";
  priceUsd?: number | null;
  externalPaymentUrl?: string | null;
  paymentDescription?: string;
  bookingSource: BookingSource;
  confirmationMessage: string;
  isActive: boolean;
}

/* ------------------------- forms & requirements -------------------- */

export type FormRequirementStatus =
  | "not_sent"
  | "sent"
  | "viewed"
  | "in_progress"
  | "submitted"
  | "reviewed"
  | "needs_update"
  | "waived";

export interface FormTemplate extends BaseRecord {
  key: string;
  name: string;
  version: string;
  kind: "form" | "document_upload" | "food_log";
  /**
   * FFS-owned wording (liability, medical release, health history) is never
   * invented here. Templates stay `awaiting_ffs_content` until leadership
   * supplies the approved language.
   */
  contentStatus: "awaiting_ffs_content" | "approved";
  description: string;
  placeholderSections: string[];
}

export interface FormRequirement extends BaseRecord {
  clientId: ID;
  templateKey: string;
  templateVersion: string;
  onboardingCaseId?: ID | null;
  appointmentId?: ID | null;
  status: FormRequirementStatus;
  sentAt?: ISODateTime | null;
  viewedAt?: ISODateTime | null;
  startedAt?: ISODateTime | null;
  submittedAt?: ISODateTime | null;
  reviewedAt?: ISODateTime | null;
  reviewedByStaffId?: ID | null;
  submissionId?: ID | null;
  dueBefore?: ISODate | null;
  notes?: string;
}

/** Immutable once submitted — a newer template version never overwrites it. */
export interface FormSubmission extends BaseRecord {
  requirementId: ID;
  clientId: ID;
  templateKey: string;
  templateVersion: string;
  payload: Record<string, string | string[] | boolean>;
  submittedAt: ISODateTime;
  lockedAt: ISODateTime;
  isSynthetic: boolean;
}

/* ---------------------------- onboarding case ---------------------- */

export interface OnboardingStepState {
  step: 1 | 2 | 3 | 4 | 5;
  label: string;
  appointmentIds: ID[];
  status: "not_scheduled" | "scheduled" | "complete";
}

export interface OnboardingCase extends BaseRecord {
  clientId: ID;
  /**
   * Which onboarding pathway the prospect entered after the Discovery Call.
   * Legacy cases without a value are Comprehensive 5-Step cases.
   */
  pathway?: "comprehensive" | "apparatix";
  status: "active" | "complete" | "cancelled";
  activatedAt: ISODateTime;
  step2Pathway: "fms" | "fall_risk" | "undecided";
  steps: OnboardingStepState[];
  notes?: string;
}

/* --------------------------- secure documents ---------------------- */

export interface ClientDocument extends BaseRecord {
  clientId: ID;
  onboardingCaseId?: ID | null;
  requirementId?: ID | null;
  documentType: "bloodwork" | "medical_release" | "other";
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  documentDate?: ISODate | null;
  /** Provider-neutral: "demo_local" today, protected AWS storage later. */
  storageProvider: string;
  objectKey: string;
  visibility: "restricted" | "internal";
  uploadedAt: ISODateTime;
  uploadedByType: "client" | "staff";
  uploadedById?: ID | null;
  reviewStatus: "pending_review" | "reviewed";
  reviewedByStaffId?: ID | null;
  /** Development environment only ever stores synthetic documents. */
  isSynthetic: boolean;
}

/* ----------------------------- 3-day food log ---------------------- */

export interface FoodLogEntry {
  id: ID;
  dayIndex: number; // 0, 1, 2
  time?: string;
  mealLabel: string;
  foods: string;
  beverages?: string;
  portions?: string;
  comments?: string;
}

export interface FoodLogDay {
  dayIndex: number;
  date: ISODate;
  water?: string;
  comments?: string;
}

export interface FoodLog extends BaseRecord {
  clientId: ID;
  onboardingCaseId?: ID | null;
  requirementId?: ID | null;
  startDate: ISODate;
  days: FoodLogDay[];
  entries: FoodLogEntry[];
  status: "in_progress" | "submitted" | "reviewed";
  submittedAt?: ISODateTime | null;
  reviewedByStaffId?: ID | null;
  isSynthetic: boolean;
}

/* ---------------------------- discovery calls ---------------------- */

export type DiscoveryOutcome =
  | "scheduled"
  | "completed"
  | "no_show"
  | "cancelled"
  | "follow_up_needed"
  | "qualified"
  | "not_a_fit"
  | "converted";

export interface DiscoveryCallSubmission extends BaseRecord {
  clientId: ID;
  appointmentId?: ID | null;
  interests: string[];
  whatPrompted: string;
  helpWith: string;
  /** Distinct structured field, never merged into notes. */
  successLooksLike: string;
  biggestChallenge: string;
  referralSource: string;
  anythingElse?: string;
  outcome: DiscoveryOutcome;
  recommendedNextStep?: string;
  /** Full structured answer set from the shared form engine. */
  payload?: Record<string, string | string[] | boolean>;
}

/**
 * No communications provider is connected in this build, so notifications are
 * queued and clearly labelled. Delivery is never reported as successful.
 */
export interface QueuedNotification extends BaseRecord {
  clientId: ID;
  channel: "email" | "sms";
  template: string;
  subject: string;
  status: "queued_demo";
  queuedAt: ISODateTime;
  note: string;
}

/* ------------------------------------------------------------------ */
/* Availability, blocked time & service resource requirements          */
/* (inputs to the sellable-capacity engine)                            */
/* ------------------------------------------------------------------ */

/**
 * A provider's recurring working window at one location. Availability is
 * configuration, not a calendar gap: a blank calendar outside these windows is
 * never sellable.
 */
export interface StaffAvailability extends BaseRecord {
  staffId: ID;
  locationId: ID;
  weekday: number; // 0 = Sunday
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  effectiveFrom?: ISODate | null;
  effectiveTo?: ISODate | null;
  isActive: boolean;
  notes?: string;
}

/**
 * Time a provider or a room/resource is unavailable. Either `staffId` or
 * `resourceId` (or both) is set. A weekly recurring block uses `weekday`;
 * a one-off block uses `date`.
 */
export interface BlockedTime extends BaseRecord {
  staffId?: ID | null;
  resourceId?: ID | null;
  locationId?: ID | null;
  date?: ISODate | null;
  weekday?: number | null;
  startTime: string;
  endTime: string;
  reason: string;
  isActive: boolean;
}

/**
 * Which rooms/resources a service may use at a location. Service delivery is
 * never assumed: if a service requires a resource at a location and no
 * qualifying resource is free, the slot is not sellable.
 */
export interface ServiceResourceRequirement extends BaseRecord {
  serviceId: ID;
  locationId: ID;
  /** Resources that can host this service at this location. */
  eligibleResourceIds: ID[];
  /** When false the service can run without a room record (e.g. virtual). */
  resourceRequired: boolean;
}

/* ------------------------------------------------------------------ */
/* Build #3 — makeup ledger, scheduling overrides, schedule exceptions */
/* ------------------------------------------------------------------ */

export type MakeupStatus = "available" | "used" | "expired" | "voided";

/**
 * A makeup is a first-class ledger record, never a note on an appointment.
 * Exactly one makeup may be issued per eligible early-cancelled appointment
 * (enforced by `sourceAppointmentId` uniqueness) and each may be redeemed once.
 *
 * Expiration is always computed from `originalAbsenceDate` — the date of the
 * session that was missed — not from the date staff entered the cancellation.
 */
export interface MakeupCredit extends BaseRecord {
  clientId: ID;
  sourceAppointmentId: ID;
  sourceServiceId: ID;
  sourceProviderStaffId?: ID | null;
  /** Date/time of the session that was cancelled. Drives expiration. */
  originalAbsenceDate: ISODate;
  originalAbsenceStartTime?: string;
  issuedDate: ISODate;
  issuedByStaffId?: ID | null;
  /** originalAbsenceDate + MAKEUP_EXPIRY_DAYS. */
  expirationDate: ISODate;
  status: MakeupStatus;
  usedDate?: ISODate | null;
  redeemedAppointmentId?: ID | null;
  redeemedByStaffId?: ID | null;
  voidedReason?: string | null;
  voidedByStaffId?: ID | null;
  notes?: string;
  /** Append-only history of everything that happened to this credit. */
  events?: MakeupEvent[];
}

export type MakeupEventKind =
  | "issued"
  | "redeemed"
  | "released"
  | "forfeited"
  | "expired"
  | "voided";

/** One accountable entry in a make-up credit's audit trail. */
export interface MakeupEvent {
  kind: MakeupEventKind;
  occurredAt: string;
  staffId?: ID | null;
  appointmentId?: ID | null;
  detail: string;
}

/** Rule an administrator knowingly bypassed, with an accountable reason. */
export interface SchedulingOverride extends BaseRecord {
  appointmentId?: ID | null;
  staffId: ID;
  ruleKey: string;
  ruleDescription: string;
  reason: string;
  occurredAt: ISODateTime;
  context?: string;
}

/** One-time schedule change: PTO, holiday, temporary hours, extra shift. */
export interface ScheduleException extends BaseRecord {
  staffId: ID;
  date: ISODate;
  kind: "unavailable" | "pto" | "holiday" | "custom_hours";
  startTime?: string;
  endTime?: string;
  locationId?: ID | null;
  reason: string;
  isActive: boolean;
}
