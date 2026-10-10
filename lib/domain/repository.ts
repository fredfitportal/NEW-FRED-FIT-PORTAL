/**
 * Provider-neutral data access layer.
 *
 * The UI only ever talks to `repository`. Swapping the development-only demo
 * store for AWS/Postgres/Supabase later means implementing this same interface
 * — no frontend or client-record rework required.
 */

import * as seed from "./seed";
import {
  issueMakeupForAppointment,
  recordMakeupForfeited,
  releaseMakeupForAppointment,
  releaseMakeupForParticipant,
} from "./makeups";
import {
  FORFEITING_STATUSES,
  classifyCancellation,
  serviceIsMakeupEligible,
} from "./scheduling-policy";
import {
  NON_ATTENDING_STATUSES as NON_ATTENDING,
  activeParticipantCount,
  appointmentClientIds,
  sessionCapacity,
  
  appointmentIncludesClient,
  clientStatusFor,
  isSharedSession,
  sessionParticipants,
} from "./sessions";
import { getDataset, mutate, nextId, nowIso } from "./store";
import type {
  Appointment,
  AppointmentParticipant,
  AppointmentStatus,
  AppointmentStatusHistory,
  AssessmentInstance,
  AssessmentMetric,
  AssessmentResult,
  AssessmentType,
  AttendanceStatus,
  AuditLogEntry,
  Client,
  ClientServiceEnrollment,
  ClientStaffAssignment,
  ClientStatus,
  Conversation,
  CreditRule,
  CreditTransaction,
  CreditType,
  ID,
  Location,
  MediaAttachment,
  Message,
  RecurrenceFrequency,
  RecurringAppointment,
  Role,
  ScheduleException,
  SchedulingOverride,
  Service,
  ServiceAgreement,
  ServiceCategory,
  StaffCredential,
  StaffMember,
  Superbill,
  Task,
} from "./types";

/* ------------------------------ write inputs ----------------------------- */

export interface ClientDraft {
  firstName: string;
  lastName: string;
  preferredName?: string;
  status: ClientStatus;
  email: string;
  phone?: string;
  dateOfBirth: string;
  dateJoined: string;
  primaryLocationId: ID;
  goals?: string;
  successStatement?: string;
  relationshipNotes?: string;
  primaryStaffId?: ID | null;
  careTeamStaffIds: ID[];
  serviceIds: ID[];
}

export interface AppointmentDraft {
  clientId: ID;
  serviceId: ID;
  providerStaffId: ID;
  locationId?: ID;
  resourceId?: ID | null;
  date: string;
  startTime: string;
  durationMinutes: number;
  appointmentType: "in_person" | "virtual";
  notes?: string;
  recurring: boolean;
  frequency?: RecurrenceFrequency;
  customPattern?: string;
  /** Only used for custom patterns, which cannot auto-generate. */
  occurrences?: number;
  /** null / undefined = never ends; otherwise the final date of the schedule. */
  endsOn?: string | null;
}

export interface CreditIssueDraft {
  clientId: ID;
  creditTypeId: ID;
  quantity: number;
  referenceValueUsd: number;
  originatingAppointmentId?: ID | null;
  serviceRestriction?: ServiceCategory | null;
  reason: string;
  notes?: string;
  authorizedByStaffId: ID;
  createdByStaffId: ID;
}

export interface CreditRedeemDraft {
  clientId: ID;
  creditTypeId: ID;
  quantity: number;
  appointmentId: ID;
  reason?: string;
  performedByStaffId: ID;
}

export interface FredFitRepository {
  listClients(): Client[];
  getClient(id: ID): Client | undefined;
  listStaff(): StaffMember[];
  getStaff(id: ID): StaffMember | undefined;
  listRoles(): Role[];
  listLocations(): Location[];
  listServices(): Service[];
  /** Configured staff → service eligibility. Never inferred from job titles. */
  listStaffServices(): { staffId: ID; serviceId: ID }[];
  listAppointments(): Appointment[];
  getAppointment(id: ID): Appointment | undefined;
  listAppointmentStatusHistory(appointmentId?: ID): AppointmentStatusHistory[];
  listRecurringAppointments(clientId?: ID): RecurringAppointment[];
  listServiceAgreements(clientId?: ID): ServiceAgreement[];
  listCreditRules(): CreditRule[];
  listTasks(): Task[];
  listAuditLog(): AuditLogEntry[];
  listConversations(): Conversation[];
  listMessages(conversationId: ID): Message[];
  listAssessmentTypes(): AssessmentType[];
  listAssessmentInstances(clientId?: ID): AssessmentInstance[];
  listAssessmentMetrics(assessmentTypeId?: ID): AssessmentMetric[];
  listAssessmentResults(instanceId: ID): AssessmentResult[];
  listMedia(relatedEntityId?: ID): MediaAttachment[];
  listCreditTypes(): CreditType[];
  listCreditTransactions(clientId?: ID): CreditTransaction[];
  listEnrollments(clientId?: ID): ClientServiceEnrollment[];
  listAssignments(clientId?: ID): ClientStaffAssignment[];
  listStaffCredentials(staffId?: ID): StaffCredential[];
  listSuperbills(clientId?: ID): Superbill[];

  /* writes */
  createClient(draft: ClientDraft, actorStaffId: ID): Client;
  updateClient(id: ID, draft: ClientDraft, actorStaffId: ID): Client | undefined;
  archiveClient(id: ID, actorStaffId: ID): Client | undefined;
  createAppointment(draft: AppointmentDraft, actorStaffId: ID): Appointment;
  createRecurringSeries(
    draft: AppointmentDraft,
    actorStaffId: ID,
  ): { series: RecurringAppointment; occurrences: Appointment[] };
  updateAppointment(id: ID, patch: Partial<Appointment>, actorStaffId: ID): Appointment | undefined;
  updateRecurringOccurrence(
    id: ID,
    patch: Partial<Appointment>,
    actorStaffId: ID,
  ): Appointment | undefined;
  changeAppointmentStatus(
    id: ID,
    toStatus: AppointmentStatus,
    actorStaffId: ID,
    reason?: string,
  ): Appointment | undefined;
  /** Changes ONE participant's status inside a shared session. */
  changeParticipantStatus(
    id: ID,
    clientId: ID,
    toStatus: AppointmentStatus,
    actorStaffId: ID,
    reason?: string,
  ): Appointment | undefined;
  /**
   * Attaches another client to an EXISTING shared session (Partner, Trio…)
   * instead of creating a competing appointment in the same slot.
   */
  addSessionParticipant(
    appointmentId: ID,
    clientId: ID,
    actorStaffId: ID,
    scope?: "occurrence" | "future",
  ): AddParticipantResult;
  createCreditTransaction(draft: CreditIssueDraft): CreditTransaction;
  redeemCredit(draft: CreditRedeemDraft): CreditTransaction;
  getClientCreditBalance(clientId: ID): CreditBalance[];
  getClientCreditHistory(clientId: ID): CreditTransaction[];
  getClientAppointmentHistory(clientId: ID): Appointment[];
  /** Drag/drop or dialog reschedule of ONE occurrence. Never touches a series. */
  moveSingleOccurrence(
    id: ID,
    patch: ReschedulePatch,
    actorStaffId: ID,
    options?: SingleOccurrenceMoveOptions,
  ): Appointment | undefined;
  /** Legacy series-internal reschedule primitive. UI single moves use moveSingleOccurrence. */
  rescheduleAppointment(
    id: ID,
    patch: ReschedulePatch,
    actorStaffId: ID,
    reason?: string,
  ): Appointment | undefined;
  /** Moves this occurrence and every later occurrence of the same series. */
  rescheduleSeriesFrom(
    id: ID,
    patch: ReschedulePatch,
    actorStaffId: ID,
    reason?: string,
  ): Appointment[];
  listScheduleExceptions(staffId?: ID): ScheduleException[];
  recordSchedulingOverride(input: {
    appointmentId?: ID | null;
    staffId: ID;
    ruleKey: string;
    ruleDescription: string;
    reason: string;
    context?: string;
  }): SchedulingOverride;
  listSchedulingOverrides(appointmentId?: ID): SchedulingOverride[];
}

export interface AddParticipantResult {
  ok: boolean;
  reason?: string;
  appointment?: Appointment;
  /** How many occurrences (this one + future ones) gained the participant. */
  occurrencesUpdated?: number;
}

export interface ReschedulePatch {
  date?: string;
  startTime?: string;
  durationMinutes?: number;
  providerStaffId?: ID;
  locationId?: ID | null;
  resourceId?: ID | null;
}

export interface SingleOccurrenceMoveOptions {
  reason?: string;
  override?: {
    ruleKey: string;
    ruleDescription: string;
    reason: string;
    context?: string;
  };
}

const active = <T extends { archivedAt?: string | null }>(rows: T[]) =>
  rows.filter((r) => !r.archivedAt);

const auditMeta = (id: ID) => ({ id, createdAt: nowIso(), updatedAt: nowIso(), archivedAt: null });

/* ------------------------- recurrence occurrences ------------------------ */

/** Rolling window of future occurrences kept on the calendar (~26 weeks). */
export const ROLLING_WINDOW_DAYS = 182;

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonths(iso: string, months: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function occurrenceDates(
  startDate: string,
  frequency: RecurrenceFrequency,
  count: number,
): string[] {
  const dates: string[] = [];
  for (let i = 0; i < count; i += 1) {
    switch (frequency) {
      case "weekly":
        dates.push(addDays(startDate, i * 7));
        break;
      case "every_other_week":
        dates.push(addDays(startDate, i * 14));
        break;
      case "every_4_weeks":
        dates.push(addDays(startDate, i * 28));
        break;
      case "monthly":
        dates.push(addMonths(startDate, i));
        break;
      default:
        dates.push(addDays(startDate, i * 7));
    }
  }
  return dates;
}

function endTimeFor(startTime: string, durationMinutes: number) {
  const [h = "0", m = "0"] = startTime.split(":");
  const total = Number(h) * 60 + Number(m) + durationMinutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function attendanceFor(status: AppointmentStatus): AttendanceStatus {
  switch (status) {
    case "completed":
      return "attended";
    case "no_show":
      return "absent";
    case "early_cancel":
    case "cancelled":
    case "rescheduled":
      return "excused";
    case "late_cancel":
      return "absent";
    default:
      return "pending";
  }
}

function buildAppointment(draft: AppointmentDraft, date: string, seriesId: ID | null): Appointment {
  const service = seed.SERVICES.find((s) => s.id === draft.serviceId);
  const documentationRequired = service?.requiresDocumentation ?? true;
  return {
    ...auditMeta(nextId("apt")),
    clientId: draft.clientId,
    serviceId: draft.serviceId,
    providerStaffId: draft.providerStaffId,
    ...(draft.locationId ? { locationId: draft.locationId } : {}),
    ...(draft.resourceId ? { resourceId: draft.resourceId } : {}),
    recurringAppointmentId: seriesId,
    date,
    startTime: draft.startTime,
    endTime: endTimeFor(draft.startTime, draft.durationMinutes),
    durationMinutes: draft.durationMinutes,
    status: "scheduled",
    attendanceStatus: "pending",
    documentationRequired,
    documentationStatus: documentationRequired ? "pending" : "not_required",
    superbillRequestStatus: "not_requested",
    appointmentType: draft.appointmentType,
    syncStatus: "not_synced",
    ...(draft.notes ? { notes: draft.notes } : {}),
  };
}

/** Materialises participant rows so per-client status can be written. */
function ensureParticipantRows(appointment: Appointment) {
  appointment.participants = sessionParticipants(appointment).map((p) => ({ ...p }));
  return appointment.participants;
}

/** Single place a participant's outcome is written (status + policy fields). */
function applyStatusToParticipant(
  appointment: Appointment,
  participant: AppointmentParticipant,
  toStatus: AppointmentStatus,
  actorStaffId: ID,
  reason?: string,
) {
  participant.status = toStatus;
  participant.attendanceStatus = attendanceFor(toStatus);
  participant.updatedAt = nowIso();
  participant.updatedByStaffId = actorStaffId;
  if (reason) participant.cancellationReason = reason;
  if (toStatus === "completed") {
    participant.completedAt = nowIso();
    participant.cancelledAt = null;
    participant.sessionForfeited = false;
    participant.makeupEligibility = "not_applicable";
  }
  if (["early_cancel", "late_cancel", "cancelled", "no_show"].includes(toStatus)) {
    participant.cancelledAt = nowIso();
    participant.cancellationNoticeHours = classifyCancellation(appointment).noticeHours;
  }
  if (FORFEITING_STATUSES.includes(toStatus)) {
    participant.sessionForfeited = true;
    participant.makeupEligibility = "forfeited";
  }
  /* A make-up this participant used comes back on Early Cancel / Cancelled. */
  if (participant.makeupCreditId && ["early_cancel", "cancelled"].includes(toStatus)) {
    releaseMakeupForParticipant(appointment.id, participant, actorStaffId);
  } else if (participant.makeupCreditId && ["late_cancel", "no_show"].includes(toStatus)) {
    recordMakeupForfeited(
      appointment.id,
      APPOINTMENT_STATUS_LABELS[toStatus] ?? toStatus,
      actorStaffId,
    );
  }
}

function recordStatusChange(
  appointment: Appointment,
  fromStatus: AppointmentStatus,
  toStatus: AppointmentStatus,
  actorStaffId: ID,
  reason?: string,
) {
  getDataset().appointmentStatusHistory.push({
    ...auditMeta(nextId("ash")),
    appointmentId: appointment.id,
    fromStatus,
    toStatus,
    changedByStaffId: actorStaffId,
    ...(reason ? { reason } : {}),
    occurredAt: nowIso(),
  });
}

function logAudit(entityType: string, entityId: ID, summary: string, actorStaffId: ID) {
  seed.AUDIT_LOG.push({
    ...auditMeta(nextId("audit")),
    actorStaffId,
    action: "update",
    entityType: entityType as AuditLogEntry["entityType"],
    entityId,
    summary,
    occurredAt: nowIso(),
  } as AuditLogEntry);
}

/* -------------------------------- repository ----------------------------- */

export const repository: FredFitRepository = {
  listClients: () => active(getDataset().clients).filter((c) => c.status !== "archived"),
  getClient: (id) => getDataset().clients.find((c) => c.id === id),
  listStaff: () => active(getDataset().staff),
  getStaff: (id) => getDataset().staff.find((s) => s.id === id),
  listRoles: () => seed.ROLES,
  listLocations: () => seed.LOCATIONS,
  listServices: () => getDataset().services,
  listStaffServices: () => getDataset().staffServices,
  listAppointments: () => getDataset().appointments,
  getAppointment: (id) => getDataset().appointments.find((a) => a.id === id),
  listAppointmentStatusHistory: (appointmentId) =>
    getDataset()
      .appointmentStatusHistory.filter((h) => !appointmentId || h.appointmentId === appointmentId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
  listRecurringAppointments: (clientId) =>
    getDataset().recurringAppointments.filter((r) => !clientId || r.clientId === clientId),
  listServiceAgreements: (clientId) =>
    seed.SERVICE_AGREEMENTS.filter((a) => !clientId || a.clientId === clientId),
  listCreditRules: () => seed.CREDIT_RULES,
  /** Unfiltered — permission filtering lives in `tasks.ts`; UI must use that. */
  listTasks: () => getDataset().tasks,
  listAuditLog: () => [...seed.AUDIT_LOG].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
  listConversations: () => seed.CONVERSATIONS,
  listMessages: (conversationId) => seed.MESSAGES.filter((m) => m.conversationId === conversationId),
  listAssessmentTypes: () => seed.ASSESSMENT_TYPES,
  listAssessmentInstances: (clientId) =>
    seed.ASSESSMENT_INSTANCES.filter((a) => !clientId || a.clientId === clientId).sort((a, b) =>
      a.assessmentDate.localeCompare(b.assessmentDate),
    ),
  listAssessmentMetrics: (typeId) =>
    seed.ASSESSMENT_METRICS.filter((m) => !typeId || m.assessmentTypeId === typeId).sort(
      (a, b) => a.displayOrder - b.displayOrder,
    ),
  listAssessmentResults: (instanceId) =>
    seed.ASSESSMENT_RESULTS.filter((r) => r.assessmentInstanceId === instanceId).sort(
      (a, b) => a.displayOrder - b.displayOrder,
    ),
  listMedia: (relatedEntityId) =>
    seed.MEDIA_ATTACHMENTS.filter((m) => !relatedEntityId || m.relatedEntityId === relatedEntityId),
  listCreditTypes: () => seed.CREDIT_TYPES,
  listCreditTransactions: (clientId) =>
    getDataset().creditTransactions.filter((t) => !clientId || t.clientId === clientId),
  listEnrollments: (clientId) =>
    getDataset().enrollments.filter((e) => !clientId || e.clientId === clientId),
  listAssignments: (clientId) =>
    getDataset().assignments.filter((a) => !clientId || a.clientId === clientId),
  listStaffCredentials: (staffId) =>
    seed.STAFF_CREDENTIALS.filter((c) => !staffId || c.staffId === staffId),
  listSuperbills: (clientId) => seed.SUPERBILLS.filter((s) => !clientId || s.clientId === clientId),

  /* ------------------------------- clients ------------------------------ */

  createClient: (draft, actorStaffId) =>
    mutate((data) => {
      const numbers = data.clients
        .map((c) => Number(c.clientNumber.replace(/\D/g, "")))
        .filter((n) => !Number.isNaN(n));
      const next = (numbers.length ? Math.max(...numbers) : 1000) + 1;
      const client: Client = {
        ...auditMeta(nextId("cl")),
        createdBy: actorStaffId,
        updatedBy: actorStaffId,
        clientNumber: `FFS-${next}`,
        firstName: draft.firstName,
        lastName: draft.lastName,
        ...(draft.preferredName ? { preferredName: draft.preferredName } : {}),
        dateOfBirth: draft.dateOfBirth,
        email: draft.email,
        ...(draft.phone ? { phone: draft.phone } : {}),
        status: draft.status,
        dateJoined: draft.dateJoined,
        primaryLocationId: draft.primaryLocationId,
        goals: draft.goals ?? "",
        alerts: [],
        relationshipNotes: [
          draft.successStatement ? `What success looks like: ${draft.successStatement}` : null,
          draft.relationshipNotes || null,
        ]
          .filter(Boolean)
          .join("\n\n"),
        onboardingStatus: draft.status === "active" ? "complete" : "not_started",
      };
      data.clients.push(client);
      applyTeamAndServices(client.id, draft, actorStaffId);
      logAudit("client", client.id, `Client record created (${client.clientNumber})`, actorStaffId);
      return client;
    }),

  updateClient: (id, draft, actorStaffId) =>
    mutate((data) => {
      const client = data.clients.find((c) => c.id === id);
      if (!client) return undefined;
      Object.assign(client, {
        firstName: draft.firstName,
        lastName: draft.lastName,
        ...(draft.preferredName ? { preferredName: draft.preferredName } : {}),
        dateOfBirth: draft.dateOfBirth,
        email: draft.email,
        ...(draft.phone ? { phone: draft.phone } : {}),
        status: draft.status,
        dateJoined: draft.dateJoined,
        primaryLocationId: draft.primaryLocationId,
        goals: draft.goals,
        relationshipNotes: [
          draft.successStatement ? `What success looks like: ${draft.successStatement}` : null,
          draft.relationshipNotes || null,
        ]
          .filter(Boolean)
          .join("\n\n"),
        updatedAt: nowIso(),
        updatedBy: actorStaffId,
      });
      applyTeamAndServices(client.id, draft, actorStaffId);
      logAudit("client", client.id, "Client record updated", actorStaffId);
      return client;
    }),

  archiveClient: (id, actorStaffId) =>
    mutate((data) => {
      const client = data.clients.find((c) => c.id === id);
      if (!client) return undefined;
      client.status = "archived";
      client.archivedAt = nowIso();
      client.updatedAt = nowIso();
      client.updatedBy = actorStaffId;
      logAudit("client", client.id, "Client archived (never hard-deleted)", actorStaffId);
      return client;
    }),

  /* ----------------------------- appointments --------------------------- */

  createAppointment: (draft, actorStaffId) =>
    mutate((data) => {
      const appointment = buildAppointment(draft, draft.date, null);
      appointment.createdBy = actorStaffId;
      data.appointments.push(appointment);
      recordStatusChange(appointment, "scheduled", "scheduled", actorStaffId, "Appointment created");
      return appointment;
    }),

  createRecurringSeries: (draft, actorStaffId) =>
    mutate((data) => {
      const frequency = draft.frequency ?? "weekly";
      const series: RecurringAppointment = {
        ...auditMeta(nextId("rec")),
        createdBy: actorStaffId,
        clientId: draft.clientId,
        serviceId: draft.serviceId,
        providerStaffId: draft.providerStaffId,
        ...(draft.locationId ? { locationId: draft.locationId } : {}),
        frequency,
        ...(frequency === "custom" && draft.customPattern
          ? { customPattern: draft.customPattern }
          : {}),
        weekday: new Date(`${draft.date}T00:00:00`).getDay(),
        startTime: draft.startTime,
        durationMinutes: draft.durationMinutes,
        startDate: draft.date,
        endDate: draft.endsOn ?? null,
        status: "active",
        isActive: true,
        /* The pattern — not the pre-generated rows — drives future occurrences. */
        anchorDate: draft.date,
        patternEffectiveDate: draft.date,
        appointmentType: draft.appointmentType,
        ...(draft.resourceId ? { resourceId: draft.resourceId } : {}),
        autoGenerate: true,
        generatedThroughDate: null,
        ...(draft.notes ? { notes: draft.notes } : {}),
      };
      data.recurringAppointments.push(series);
      /*
       * A recurring schedule is persistent: we seed a ROLLING WINDOW of future
       * occurrences (not a finite batch). maintainRecurringSeries() keeps the
       * window topped up from the pattern as time passes. Custom patterns
       * cannot be auto-generated, so those still use a finite count.
       */
      const horizon = addDays(draft.date, ROLLING_WINDOW_DAYS);
      const limit = draft.endsOn && draft.endsOn < horizon ? draft.endsOn : horizon;
      const dates =
        frequency === "custom"
          ? occurrenceDates(draft.date, frequency, draft.occurrences ?? 8)
          : occurrenceDates(draft.date, frequency, 400).filter((d) => d <= limit);
      if (frequency !== "custom") series.generatedThroughDate = limit;
      const occurrences = dates.map(
        (date) => {
          const appointment = buildAppointment(draft, date, series.id);
          appointment.createdBy = actorStaffId;
          data.appointments.push(appointment);
          recordStatusChange(
            appointment,
            "scheduled",
            "scheduled",
            actorStaffId,
            "Occurrence created from recurring series",
          );
          return appointment;
        },
      );
      return { series, occurrences };
    }),

  updateAppointment: (id, patch, actorStaffId) =>
    mutate((data) => {
      const appointment = data.appointments.find((a) => a.id === id);
      if (!appointment) return undefined;
      const schedulingPatch: ReschedulePatch = {
        ...(patch.date !== undefined ? { date: patch.date } : {}),
        ...(patch.startTime !== undefined ? { startTime: patch.startTime } : {}),
        ...(patch.durationMinutes !== undefined ? { durationMinutes: patch.durationMinutes } : {}),
        ...(patch.providerStaffId !== undefined ? { providerStaffId: patch.providerStaffId } : {}),
        ...(patch.locationId !== undefined ? { locationId: patch.locationId } : {}),
        ...(patch.resourceId !== undefined ? { resourceId: patch.resourceId } : {}),
      };
      if (Object.keys(schedulingPatch).length) {
        applySingleOccurrenceMove(data, appointment, schedulingPatch, actorStaffId);
      }
      const nonScheduling = { ...patch };
      delete nonScheduling.date;
      delete nonScheduling.startTime;
      delete nonScheduling.durationMinutes;
      delete nonScheduling.providerStaffId;
      delete nonScheduling.locationId;
      delete nonScheduling.resourceId;
      Object.assign(appointment, nonScheduling, { updatedAt: nowIso(), updatedBy: actorStaffId });
      return appointment;
    }),


  /**
   * Editing a single occurrence never rewrites the series or any other
   * occurrence — only this one row changes.
   */
  updateRecurringOccurrence: (id, patch, actorStaffId) =>
    repository.updateAppointment(id, patch, actorStaffId),

  changeAppointmentStatus: (id, toStatus, actorStaffId, reason) =>
    mutate((data) => {
      const appointment = data.appointments.find((a) => a.id === id);
      if (!appointment) return undefined;
      const fromStatus = appointment.status;
      /*
       * Snapshot who was still attending BEFORE anything changes. Participant
       * rows are derived from the session status when absent, so this must be
       * read first or a session-level cancellation makes everyone look
       * already-cancelled.
       */
      const attendingBefore = sessionParticipants(appointment)
        .filter((p) => !NON_ATTENDING.includes(p.status))
        .map((p) => p.clientId);
      appointment.status = toStatus;

      appointment.attendanceStatus = attendanceFor(toStatus);
      appointment.updatedAt = nowIso();
      appointment.updatedBy = actorStaffId;
      if (reason) appointment.cancellationReason = reason;
      if (toStatus === "completed") {
        appointment.completedAt = nowIso();
        appointment.cancelledAt = null;
      }
      if (toStatus === "completed") {
        appointment.completedByStaffId = actorStaffId;
        appointment.sessionForfeited = false;
        appointment.makeupEligibility = "not_applicable";
      }
      if (["early_cancel", "late_cancel", "cancelled", "no_show"].includes(toStatus)) {
        appointment.cancelledAt = nowIso();
        appointment.cancelledByStaffId = actorStaffId;
        appointment.cancellationNoticeHours = classifyCancellation(appointment).noticeHours;
        appointment.documentationStatus = appointment.documentationRequired
          ? "not_required"
          : appointment.documentationStatus;
      }
      /* FFS policy: Late Cancel and No Show forfeit the session outright. */
      if (FORFEITING_STATUSES.includes(toStatus)) {
        appointment.sessionForfeited = true;
        appointment.makeupEligibility = "forfeited";
      }
      /*
       * A make-up applied to this session is returned to the client when the
       * session is cancelled with notice (or cancelled outright). Late Cancel
       * and No Show forfeit the redeemed make-up, exactly like a paid session.
       */
      if (
        appointment.makeupCreditId &&
        ["early_cancel", "cancelled"].includes(toStatus)
      ) {
        releaseMakeupForAppointment(appointment.id, actorStaffId);
      } else if (
        appointment.makeupCreditId &&
        ["late_cancel", "no_show"].includes(toStatus)
      ) {
        recordMakeupForfeited(
          appointment.id,
          APPOINTMENT_STATUS_LABELS[toStatus] ?? toStatus,
          actorStaffId,
        );
      }
      recordStatusChange(appointment, fromStatus, toStatus, actorStaffId, reason);
      /*
       * Session-level change: every attached participant follows the session.
       * Participant rows are kept in sync so per-participant reporting stays
       * accurate after a whole-session cancellation or reschedule.
       */
      ensureParticipantRows(appointment);
      appointment.participants?.forEach((p) => {

        applyStatusToParticipant(appointment, p, toStatus, actorStaffId, reason);
      });
      /*
       * FFS policy: a session the client loses through no fault of their own
       * preserves the contracted session as a make-up credit.
       *  - Early Cancel  → the cancelling client earns a make-up.
       *  - Cancelled     → studio/provider cancellation: EVERY participant who
       *                    was still attending earns their own make-up.
       *  - Late Cancel / No Show → nothing is issued (session is forfeited).
       * Issuance is idempotent per appointment+client, so a participant who
       * had already cancelled individually and been credited is never credited
       * twice, and clients already non-attending are skipped entirely.
       */
      if (toStatus === "early_cancel" || toStatus === "cancelled") {
        const service = data.services.find((s) => s.id === appointment.serviceId);
        if (serviceIsMakeupEligible(service)) {
          attendingBefore.forEach((clientId) => {
            issueMakeupForAppointment(appointment, service, actorStaffId, clientId);
          });
        }
      }

      return appointment;

    }),

  /**
   * Participant-level status change inside a shared session. Only the named
   * client changes; everyone else keeps their own status and the session
   * itself stays on the calendar.
   */
  changeParticipantStatus: (appointmentId, clientId, toStatus, actorStaffId, reason) =>
    mutate((data) => {
      const appointment = data.appointments.find((a) => a.id === appointmentId);
      if (!appointment) return undefined;
      if (!appointmentIncludesClient(appointment, clientId)) return undefined;
      if (!isSharedSession(appointment)) {
        return repository.changeAppointmentStatus(appointmentId, toStatus, actorStaffId, reason);
      }

      ensureParticipantRows(appointment);
      const participant = appointment.participants!.find((p) => p.clientId === clientId);
      if (!participant) return appointment;
      const fromStatus = participant.status;
      applyStatusToParticipant(appointment, participant, toStatus, actorStaffId, reason);

      if (toStatus === "early_cancel") {
        const service = data.services.find((s) => s.id === appointment.serviceId);
        if (serviceIsMakeupEligible(service)) {
          issueMakeupForAppointment(appointment, service, actorStaffId, clientId);
        }
      }

      const client = data.clients.find((c) => c.id === clientId);
      const who = client ? `${client.firstName} ${client.lastName}` : clientId;
      recordStatusChange(
        appointment,
        fromStatus,
        toStatus,
        actorStaffId,
        `${who}: ${reason ?? "participant status change"}`,
      );

      /*
       * The shared session survives individual cancellations. Only when every
       * participant has cancelled does the session itself become cancelled.
       */
      const stillAttending = activeParticipantCount(appointment);
      if (stillAttending === 0 && !NON_ATTENDING.includes(appointment.status)) {
        appointment.status = "cancelled";
        appointment.attendanceStatus = "excused";
        appointment.cancelledAt = nowIso();
        appointment.cancelledByStaffId = actorStaffId;
      }
      appointment.updatedAt = nowIso();
      appointment.updatedBy = actorStaffId;
      return appointment;
    }),


  /**
   * Adds a client to an existing shared session. The trainer/time is NOT
   * double-booked: the client joins the session already on the calendar.
   * Seat capacity comes from the service configuration (Partner = 2).
   * Participant statuses stay independent — the new client starts scheduled.
   */
  addSessionParticipant: (appointmentId, clientId, actorStaffId, scope = "future") =>
    mutate((data): AddParticipantResult => {
      const appointment = data.appointments.find((a) => a.id === appointmentId);
      if (!appointment) return { ok: false, reason: "Appointment not found." };
      const client = data.clients.find((c) => c.id === clientId);
      if (!client) return { ok: false, reason: "Client not found." };
      const service = data.services.find((s) => s.id === appointment.serviceId);
      const capacity = sessionCapacity(service);
      if (capacity < 2) {
        return {
          ok: false,
          reason: `${service?.name ?? "This service"} is an individual session — it cannot hold a second client.`,
        };
      }
      if (appointmentClientIds(appointment).includes(clientId)) {
        return { ok: false, reason: "That client is already on this session." };
      }
      if (appointmentClientIds(appointment).length >= capacity) {
        return {
          ok: false,
          reason: `This session is full (${capacity} of ${capacity} clients).`,
        };
      }

      const attach = (target: Appointment) => {
        if (appointmentClientIds(target).includes(clientId)) return false;
        if (appointmentClientIds(target).length >= capacity) return false;
        /* Freeze existing participants' own statuses before widening. */
        ensureParticipantRows(target);
        target.participantClientIds = [...appointmentClientIds(target), clientId];
        target.participants = [
          ...(target.participants ?? []),
          {
            clientId,
            status: "scheduled",
            attendanceStatus: "pending",
            cancelledAt: null,
            cancellationNoticeHours: null,
            completedAt: null,
            issuedMakeupCreditId: null,
            makeupCreditId: null,
            updatedAt: nowIso(),
            updatedByStaffId: actorStaffId,
          },
        ];
        target.updatedAt = nowIso();
        target.updatedBy = actorStaffId;
        return true;
      };

      let updated = attach(appointment) ? 1 : 0;

      const series = appointment.recurringAppointmentId
        ? data.recurringAppointments.find((r) => r.id === appointment.recurringAppointmentId)
        : undefined;
      if (scope === "future" && series) {
        /* Future occurrences follow the shared schedule; history is untouched. */
        data.appointments
          .filter(
            (a) =>
              a.recurringAppointmentId === series.id &&
              a.date > appointment.date &&
              ["scheduled", "confirmed"].includes(a.status),
          )
          .forEach((a) => {
            if (attach(a)) updated += 1;
          });
        series.participantClientIds = Array.from(
          new Set([
            ...(series.participantClientIds?.length
              ? series.participantClientIds
              : [series.clientId]),
            clientId,
          ]),
        );
        series.updatedAt = nowIso();
        series.updatedBy = actorStaffId;
      }

      logAudit(
        "appointment",
        appointment.id,
        `${client.firstName} ${client.lastName} added to shared session (${updated} occurrence${updated === 1 ? "" : "s"})`,
        actorStaffId,
      );
      return { ok: true, appointment, occurrencesUpdated: updated };
    }),

  /* -------------------------------- credits ----------------------------- */

  createCreditTransaction: (draft) =>
    mutate((data) => {
      const creditType = seed.CREDIT_TYPES.find((c) => c.id === draft.creditTypeId);
      const expiresOn = creditType?.defaultExpirationDays
        ? addDays(new Date().toISOString().slice(0, 10), creditType.defaultExpirationDays)
        : null;
      const tx: CreditTransaction = {
        ...auditMeta(nextId("cx")),
        clientId: draft.clientId,
        creditTypeId: draft.creditTypeId,
        amount: Math.abs(draft.quantity),
        direction: "earned",
        referenceValueUsd: draft.referenceValueUsd,
        transactionDate: new Date().toISOString().slice(0, 10),
        reason: draft.reason,
        originatingAppointmentId: draft.originatingAppointmentId ?? null,
        serviceRestriction: draft.serviceRestriction ?? null,
        expiresOn,
        status: "available",
        createdByStaffId: draft.createdByStaffId,
        authorizedByStaffId: draft.authorizedByStaffId,
        isLeadershipOverride: true,
        ...(draft.notes ? { notes: draft.notes } : {}),
      };
      data.creditTransactions.push(tx);
      return tx;
    }),

  /**
   * Redemption is a new negative row. The original earned transaction is never
   * mutated or deleted — the balance is recalculated from the full ledger.
   */
  redeemCredit: (draft) =>
    mutate((data) => {
      const creditType = seed.CREDIT_TYPES.find((c) => c.id === draft.creditTypeId);
      const appointment = data.appointments.find((a) => a.id === draft.appointmentId);
      const tx: CreditTransaction = {
        ...auditMeta(nextId("cx")),
        clientId: draft.clientId,
        creditTypeId: draft.creditTypeId,
        amount: -Math.abs(draft.quantity),
        direction: "redeemed",
        referenceValueUsd: creditType?.referenceValueUsd ?? 0,
        transactionDate: new Date().toISOString().slice(0, 10),
        reason: draft.reason || `Redeemed against appointment ${draft.appointmentId}`,
        redeemedAppointmentId: draft.appointmentId,
        serviceRestriction: creditType?.eligibleServiceCategories[0] ?? null,
        status: "redeemed",
        createdByStaffId: draft.performedByStaffId,
      };
      data.creditTransactions.push(tx);
      if (appointment) {
        appointment.redeemedCreditTransactionId = tx.id;
        appointment.updatedAt = nowIso();
      }
      return tx;
    }),

  getClientCreditBalance: (clientId) => creditBalances(clientId),
  getClientCreditHistory: (clientId) =>
    [...getDataset().creditTransactions]
      .filter((t) => t.clientId === clientId)
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate)),
  getClientAppointmentHistory: (clientId) => appointmentHistory(clientId),

  /* ---------------------------- rescheduling ---------------------------- */

  moveSingleOccurrence: (id, patch, actorStaffId, options) =>
    mutate((data) => {
      const appointment = data.appointments.find((a) => a.id === id);
      if (!appointment) return undefined;
      return applySingleOccurrenceMove(data, appointment, patch, actorStaffId, options);
    }),

  rescheduleAppointment: (id, patch, actorStaffId, reason) =>
    mutate((data) => {
      const appointment = data.appointments.find((a) => a.id === id);
      if (!appointment) return undefined;
      const before = `${appointment.date} ${appointment.startTime} · ${appointment.providerStaffId}`;
      applyReschedule(appointment, patch, actorStaffId);
      const after = `${appointment.date} ${appointment.startTime} · ${appointment.providerStaffId}`;
      recordStatusChange(
        appointment,
        appointment.status,
        appointment.status,
        actorStaffId,
        reason ?? `Rescheduled: ${before} → ${after}`,
      );
      logAudit("appointment", appointment.id, `Rescheduled ${before} → ${after}`, actorStaffId);
      return appointment;
    }),

  rescheduleSeriesFrom: (id, patch, actorStaffId, reason) =>
    mutate((data) => {
      const anchor = data.appointments.find((a) => a.id === id);
      if (!anchor) return [];
      const dayShift = patch.date ? dayDiff(anchor.date, patch.date) : 0;
      const targets = anchor.recurringAppointmentId
        ? data.appointments.filter(
            (a) =>
              a.recurringAppointmentId === anchor.recurringAppointmentId &&
              a.date >= anchor.date &&
              (a.status === "scheduled" || a.status === "confirmed"),
          )
        : [anchor];
      targets.forEach((a) => {
        const perOccurrence: ReschedulePatch = {
          ...patch,
          ...(patch.date ? { date: addDays(a.date, dayShift) } : {}),
        };
        applyReschedule(a, perOccurrence, actorStaffId);
        recordStatusChange(
          a,
          a.status,
          a.status,
          actorStaffId,
          reason ?? "Rescheduled with this and all future occurrences",
        );
      });
      logAudit(
        "appointment",
        anchor.id,
        `Rescheduled ${targets.length} occurrence(s) of the series`,
        actorStaffId,
      );
      return targets;
    }),

  /* --------------------- schedule exceptions & overrides ---------------- */

  listScheduleExceptions: (staffId) =>
    getDataset().scheduleExceptions.filter((e) => e.isActive && (!staffId || e.staffId === staffId)),

  recordSchedulingOverride: (input) =>
    mutate((data) => {
      const row: SchedulingOverride = {
        ...auditMeta(nextId("ovr")),
        appointmentId: input.appointmentId ?? null,
        staffId: input.staffId,
        ruleKey: input.ruleKey,
        ruleDescription: input.ruleDescription,
        reason: input.reason,
        occurredAt: nowIso(),
        ...(input.context ? { context: input.context } : {}),
      };
      data.schedulingOverrides.push(row);
      logAudit(
        "scheduling_override",
        row.id,
        `Override of "${input.ruleDescription}" — ${input.reason}`,
        input.staffId,
      );
      return row;
    }),

  listSchedulingOverrides: (appointmentId) =>
    getDataset().schedulingOverrides.filter(
      (o) => !appointmentId || o.appointmentId === appointmentId,
    ),
};

function dayDiff(from: string, to: string) {
  return Math.round(
    (new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86_400_000,
  );
}

/** Single place where a move is written, so every path records the same audit. */
/**
 * Marks a recurring occurrence as an exception the moment it leaves its pattern
 * slot, whichever path moved it (details dialog, drag-and-drop, plain edit).
 * Without this pin the generator sees the pattern date as free and recreates a
 * phantom occurrence from the SERIES template — including the series provider,
 * which is how a moved session reappeared under another trainer.
 */
function applyReschedule(appointment: Appointment, patch: ReschedulePatch, actorStaffId: ID) {
  if (patch.date) appointment.date = patch.date;
  if (patch.startTime) appointment.startTime = patch.startTime;

  if (patch.durationMinutes) appointment.durationMinutes = patch.durationMinutes;
  if (patch.providerStaffId) appointment.providerStaffId = patch.providerStaffId;
  if (patch.locationId) appointment.locationId = patch.locationId;
  if (patch.resourceId !== undefined) appointment.resourceId = patch.resourceId;
  appointment.endTime = endTimeFor(appointment.startTime, appointment.durationMinutes);
  appointment.lastRescheduledByStaffId = actorStaffId;
  appointment.lastRescheduledAt = nowIso();
  appointment.updatedAt = nowIso();
  appointment.updatedBy = actorStaffId;
  /* External calendar / Meet sync is re-queued, never silently assumed done. */
  if (appointment.externalCalendarEventId || appointment.virtualMeetingUrl) {
    appointment.syncStatus = "pending";
  }
}

/**
 * Atomic single-occurrence move. The original series slot is persisted before
 * the row moves, and move/series/override history is committed with that same
 * store write. Provider is deliberately absent from the suppression key.
 */
function applySingleOccurrenceMove(
  data: ReturnType<typeof getDataset>,
  appointment: Appointment,
  patch: ReschedulePatch,
  actorStaffId: ID,
  options: SingleOccurrenceMoveOptions = {},
) {
  const fromDate = appointment.date;
  const fromTime = appointment.startTime;
  const fromProvider = appointment.providerStaffId;
  const before = `${fromDate} ${fromTime} · ${fromProvider}`;
  const changed =
    (patch.date !== undefined && patch.date !== appointment.date) ||
    (patch.startTime !== undefined && patch.startTime !== appointment.startTime) ||
    (patch.durationMinutes !== undefined && patch.durationMinutes !== appointment.durationMinutes) ||
    (patch.providerStaffId !== undefined && patch.providerStaffId !== appointment.providerStaffId) ||
    (patch.locationId !== undefined && patch.locationId !== (appointment.locationId ?? null)) ||
    (patch.resourceId !== undefined && patch.resourceId !== (appointment.resourceId ?? null));
  if (!changed) return appointment;

  if (appointment.recurringAppointmentId && !appointment.seriesPatternDate) {
    appointment.seriesPatternDate = fromDate;
  }
  appointment.rescheduledFromDate = appointment.rescheduledFromDate ?? fromDate;
  appointment.rescheduledFromStartTime = appointment.rescheduledFromStartTime ?? fromTime;

  applyReschedule(appointment, patch, actorStaffId);
  appointment.rescheduledAt = appointment.lastRescheduledAt ?? nowIso();
  appointment.rescheduledByStaffId = actorStaffId;
  const after = `${appointment.date} ${appointment.startTime} · ${appointment.providerStaffId}`;

  recordStatusChange(
    appointment,
    appointment.status,
    appointment.status,
    actorStaffId,
    options.reason ?? `Rescheduled: ${before} → ${after}`,
  );
  logAudit("appointment", appointment.id, `Rescheduled ${before} → ${after}`, actorStaffId);

  if (appointment.recurringAppointmentId) {
    const changedAt = nowIso();
    data.recurringSeriesChanges.push({
      ...auditMeta(nextId("rsc")),
      seriesId: appointment.recurringAppointmentId,
      appointmentId: appointment.id,
      changedByStaffId: actorStaffId,
      changedAt,
      effectiveDate: fromDate,
      scope: "occurrence",
      field: "occurrence_moved",
      previousValue: before,
      newValue: after,
      ...(options.reason ? { reason: options.reason } : {}),
      occurrencesAffected: 1,
    });
  }

  if (options.override) {
    const row: SchedulingOverride = {
      ...auditMeta(nextId("ovr")),
      appointmentId: appointment.id,
      staffId: actorStaffId,
      ruleKey: options.override.ruleKey,
      ruleDescription: options.override.ruleDescription,
      reason: options.override.reason,
      occurredAt: nowIso(),
      ...(options.override.context ? { context: options.override.context } : {}),
    };
    data.schedulingOverrides.push(row);
    logAudit(
      "scheduling_override",
      row.id,
      `Override of "${row.ruleDescription}" — ${row.reason}`,
      actorStaffId,
    );
  }

  return appointment;
}

/**
 * FFS cancellation policy applied end to end. Early Cancel issues exactly one
 * makeup (idempotent); Late Cancel and No Show forfeit the session.
 */
export function applyAttendanceOutcome(
  appointmentId: ID,
  toStatus: AppointmentStatus,
  actorStaffId: ID,
  reason?: string,
) {
  const appointment = repository.changeAppointmentStatus(
    appointmentId,
    toStatus,
    actorStaffId,
    reason,
  );
  if (!appointment) return { appointment: undefined, makeupIssued: false as const };
  if (toStatus === "early_cancel") {
    const service = serviceById(appointment.serviceId);
    if (serviceIsMakeupEligible(service)) {
      const result = issueMakeupForAppointment(appointment, service, actorStaffId);
      return { appointment, makeupIssued: result.created, makeup: result.makeup };
    }
  }
  return { appointment, makeupIssued: false as const };
}

/** Care-team assignments and service enrollments follow the client record. */
function applyTeamAndServices(clientId: ID, draft: ClientDraft, actorStaffId: ID) {
  const data = getDataset();
  const wanted = new Set(
    [draft.primaryStaffId, ...draft.careTeamStaffIds].filter(Boolean) as ID[],
  );

  data.assignments
    .filter((a) => a.clientId === clientId)
    .forEach((a) => {
      a.isActive = wanted.has(a.staffId);
    });

  wanted.forEach((staffId) => {
    const existing = data.assignments.find((a) => a.clientId === clientId && a.staffId === staffId);
    if (existing) {
      existing.isActive = true;
      existing.assignmentRole =
        staffId === draft.primaryStaffId ? "primary_trainer" : existing.assignmentRole;
      return;
    }
    data.assignments.push({
      ...auditMeta(nextId("csa")),
      createdBy: actorStaffId,
      clientId,
      staffId,
      assignmentRole: staffId === draft.primaryStaffId ? "primary_trainer" : "care_coordinator",
      startDate: draft.dateJoined,
      isActive: true,
    });
  });

  const wantedServices = new Set(draft.serviceIds);
  data.enrollments
    .filter((e) => e.clientId === clientId)
    .forEach((e) => {
      if (!wantedServices.has(e.serviceId) && e.status === "active") e.status = "inactive";
    });
  wantedServices.forEach((serviceId) => {
    const existing = data.enrollments.find(
      (e) => e.clientId === clientId && e.serviceId === serviceId,
    );
    if (existing) {
      existing.status = "active";
      return;
    }
    data.enrollments.push({
      ...auditMeta(nextId("cse")),
      createdBy: actorStaffId,
      clientId,
      serviceId,
      status: "active",
      startDate: draft.dateJoined,
      providerStaffIds: draft.primaryStaffId ? [draft.primaryStaffId] : [],
    });
  });
}

/* --------------------------- derived views -------------------------- */

/** Current calendar date in the viewer's local timezone (never a UTC-shifted day). */
export function todayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export const DEMO_TODAY = todayIso();

export function clientDisplayName(c: Client) {
  return `${c.preferredName ?? c.firstName} ${c.lastName}`;
}

export function staffDisplayName(s: StaffMember) {
  return `${s.preferredName ?? s.firstName} ${s.lastName}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function serviceById(id: ID) {
  return repository.listServices().find((s) => s.id === id);
}

export function locationById(id?: ID | null) {
  return id ? repository.listLocations().find((l) => l.id === id) : undefined;
}

/** Balances are always derived from the ledger, never from a stored number. */
export interface CreditBalance {
  creditType: CreditType;
  balance: number;
  /** Reference value only — credits are not cash and are not transferable. */
  valueUsd: number;
  transactions: CreditTransaction[];
}

export function creditBalances(clientId: ID): CreditBalance[] {
  const txs = repository.listCreditTransactions(clientId);
  return repository
    .listCreditTypes()
    .map((creditType) => {
      const transactions = [...txs]
        .filter((t) => t.creditTypeId === creditType.id)
        .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
      const balance = transactions
        .filter((t) => t.status !== "voided" && t.status !== "expired")
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        creditType,
        balance,
        valueUsd: balance * creditType.referenceValueUsd,
        transactions,
      };
    })
    .filter((b) => b.transactions.length > 0);
}

export function upcomingAppointments(clientId?: ID) {
  return repository
    .listAppointments()
    .filter((a) => (!clientId || appointmentIncludesClient(a, clientId)) && a.date >= DEMO_TODAY)
    .filter((a) => a.status === "scheduled" || a.status === "confirmed")
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

export function todaysAppointments() {
  return repository
    .listAppointments()
    .filter((a) => a.date === DEMO_TODAY)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function assignedStaffFor(clientId: ID) {
  return repository
    .listAssignments(clientId)
    .filter((a) => a.isActive)
    .map((a) => ({ assignment: a, staff: repository.getStaff(a.staffId) }))
    .filter((x): x is { assignment: ClientStaffAssignment; staff: StaffMember } => Boolean(x.staff));
}

export const ASSIGNMENT_ROLE_LABELS: Record<string, string> = {
  primary_trainer: "Primary Trainer",
  pilates_instructor: "Pilates Instructor",
  medical_exercise_specialist: "Medical Exercise Specialist",
  dietitian: "Registered Dietitian",
  recovery_professional: "Recovery Professional",
  care_coordinator: "Care Coordinator",
};

export const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  pending: "Pending",
  referral_pending: "Referral Pending",
  completed: "Completed",
  inactive: "Inactive",
};

export const CLIENT_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  prospect: "Prospect",
  onboarding: "Onboarding",
  paused: "Paused",
  inactive: "Inactive",
  archived: "Archived",
};

export function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatTime(hhmm: string) {
  const [rawH, rawM] = hhmm.split(":");
  const h = Number(rawH ?? 0);
  const m = Number(rawM ?? 0);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

/* ---------------------- scheduling display helpers ------------------- */

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  completed: "Completed",
  early_cancel: "Early Cancel",
  late_cancel: "Late Cancel",
  no_show: "No Show",
  rescheduled: "Rescheduled",
  cancelled: "Cancelled",
};

export const RECURRENCE_LABELS: Record<string, string> = {
  weekly: "Weekly",
  every_other_week: "Every other week",
  every_4_weeks: "Every 4 weeks",
  monthly: "1x per month",
  custom: "Custom",
};

export const CREDIT_DIRECTION_LABELS: Record<string, string> = {
  earned: "Earned",
  redeemed: "Redeemed",
  adjustment: "Adjustment",
  expired: "Expired",
};

export function recurrenceLabel(r: RecurringAppointment) {
  const base = RECURRENCE_LABELS[r.frequency] ?? r.frequency;
  return r.frequency === "custom" && r.customPattern ? `${base} — ${r.customPattern}` : base;
}

export function formatUsd(amount: number) {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
}

/** Appointments needing operational attention (missed or undocumented). */
export function attentionAppointments() {
  return repository
    .listAppointments()
    .filter(
      (a) =>
        a.status === "no_show" ||
        a.status === "late_cancel" ||
        (a.status === "completed" && a.documentationStatus === "pending"),
    )
    .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
}

export function appointmentHistory(clientId: ID) {
  return repository
    .listAppointments()
    .filter((a) => appointmentIncludesClient(a, clientId))
    .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
}

export function attendanceSummary(clientId?: ID) {
  // A resolved outcome counts as soon as it is recorded, even on a future date
  // — attendance drives credits, so nothing waits for the calendar to catch up.
  /*
   * On a shared session each participant carries their own outcome, so
   * reporting reads the participant's status — never the session's.
   */
  const statusOf = (a: Appointment) => (clientId ? clientStatusFor(a, clientId) : a.status);
  const attendanceOf = (a: Appointment) =>
    clientId
      ? (sessionParticipants(a).find((p) => p.clientId === clientId)?.attendanceStatus ??
        a.attendanceStatus)
      : a.attendanceStatus;
  const rows = repository
    .listAppointments()
    .filter(
      (a) =>
        (!clientId || appointmentIncludesClient(a, clientId)) &&
        (a.date < DEMO_TODAY || (statusOf(a) !== "scheduled" && statusOf(a) !== "confirmed")),
    );
  const count = (fn: (a: Appointment) => boolean) => rows.filter(fn).length;
  return {
    total: rows.length,
    attended: count((a) => attendanceOf(a) === "attended"),
    noShow: count((a) => statusOf(a) === "no_show"),
    lateCancel: count((a) => statusOf(a) === "late_cancel"),
    earlyCancel: count((a) => statusOf(a) === "early_cancel"),
    rescheduled: count((a) => statusOf(a) === "rescheduled"),
  };
}
