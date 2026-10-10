/**
 * Build #2.3 operations layer.
 *
 * Everything here follows the same provider-neutral philosophy as
 * `repository.ts`: the UI calls these functions, never the store. Swapping the
 * demo store for a real backend means re-implementing this module only.
 *
 * DEVELOPMENT ENVIRONMENT: every record produced here is synthetic. No real
 * PHI is ever entered or uploaded in this environment.
 */

import * as seed from "./seed";
import { DEMO_TODAY, clientDisplayName, serviceById } from "./repository";
import { getDataset, mutate, nextId, nowIso } from "./store";
import type {
  Appointment,
  BookingSource,
  ClassParticipant,
  ClassParticipantStatus,
  ClassSession,
  Client,
  ClientDocument,
  DiscoveryCallSubmission,
  DiscoveryOutcome,
  FoodLog,
  FoodLogEntry,
  FormRequirement,
  FormRequirementStatus,
  FormSubmission,
  ID,
  LocationResource,
  OnboardingCase,
  PaymentRecord,
  PublicBookingConfig,
  Service,
} from "./types";

function audit(id: string) {
  const now = nowIso();
  return { id, createdAt: now, updatedAt: now, archivedAt: null } as const;
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function toMinutes(hhmm: string) {
  const [h = "0", m = "0"] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

function fromMinutes(total: number) {
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

/* ------------------------------------------------------------------ */
/* Locations & resources                                               */
/* ------------------------------------------------------------------ */

export function listResources(locationId?: ID | null): LocationResource[] {
  return getDataset()
    .locationResources.filter((r) => r.isActive)
    .filter((r) => !locationId || r.locationId === locationId);
}

export function resourceById(id?: ID | null) {
  return id ? getDataset().locationResources.find((r) => r.id === id) : undefined;
}

export function saveResource(input: {
  id?: ID;
  locationId: ID;
  name: string;
  kind: "exclusive" | "capacity";
  capacity: number;
}) {
  return mutate((data) => {
    const existing = input.id ? data.locationResources.find((r) => r.id === input.id) : undefined;
    if (existing) {
      Object.assign(existing, {
        name: input.name,
        kind: input.kind,
        capacity: input.capacity,
        updatedAt: nowIso(),
      });
      return existing;
    }
    const created: LocationResource = {
      ...audit(nextId("res")),
      locationId: input.locationId,
      name: input.name,
      kind: input.kind,
      capacity: input.capacity,
      isActive: true,
    };
    data.locationResources.push(created);
    return created;
  });
}

export function updateServiceConfig(
  id: ID,
  patch: { defaultDurationMinutes?: number; classCapacity?: number; isGroupClass?: boolean },
) {
  return mutate((data) => {
    const service = data.services.find((s) => s.id === id);
    if (!service) return undefined;
    Object.assign(service, patch, { updatedAt: nowIso() });
    return service;
  });
}

export interface ConflictReport {
  providerConflicts: Appointment[];
  resourceConflicts: Array<{ kind: "appointment" | "class"; label: string }>;
}

/**
 * Provider conflicts are always exclusive. Resource conflicts respect the
 * resource's own capacity — a capacity resource can hold several bookings,
 * an exclusive resource cannot. Resource capacity and class capacity are
 * separate concepts and are never conflated.
 */
export function detectConflicts(input: {
  date: string;
  startTime: string;
  endTime: string;
  providerStaffId?: ID | null;
  resourceId?: ID | null;
  ignoreAppointmentId?: ID | null;
  ignoreClassSessionId?: ID | null;
}): ConflictReport {
  const data = getDataset();
  const live = (a: Appointment) =>
    !["early_cancel", "late_cancel", "cancelled", "rescheduled"].includes(a.status);

  const sameDay = data.appointments.filter(
    (a) => a.date === input.date && a.id !== input.ignoreAppointmentId && live(a),
  );

  const providerConflicts = input.providerStaffId
    ? sameDay.filter(
        (a) =>
          a.providerStaffId === input.providerStaffId &&
          overlaps(input.startTime, input.endTime, a.startTime, a.endTime),
      )
    : [];

  const resourceConflicts: ConflictReport["resourceConflicts"] = [];
  const resource = resourceById(input.resourceId);
  if (resource) {
    const apptUsers = sameDay.filter(
      (a) =>
        a.resourceId === resource.id &&
        overlaps(input.startTime, input.endTime, a.startTime, a.endTime),
    );
    const classUsers = data.classSessions.filter(
      (c) =>
        c.resourceId === resource.id &&
        c.date === input.date &&
        c.status !== "cancelled" &&
        c.id !== input.ignoreClassSessionId &&
        overlaps(input.startTime, input.endTime, c.startTime, c.endTime),
    );
    const used = apptUsers.length + classUsers.length;
    if (used + 1 > resource.capacity) {
      apptUsers.forEach((a) =>
        resourceConflicts.push({
          kind: "appointment",
          label: `${a.startTime}–${a.endTime} · ${serviceById(a.serviceId)?.name ?? "Appointment"}`,
        }),
      );
      classUsers.forEach((c) =>
        resourceConflicts.push({
          kind: "class",
          label: `${c.startTime}–${c.endTime} · ${serviceById(c.serviceId)?.name ?? "Class"}`,
        }),
      );
    }
  }

  return { providerConflicts, resourceConflicts };
}

/* ------------------------------------------------------------------ */
/* Group classes (Apparatix / Apparatix Plus)                          */
/* ------------------------------------------------------------------ */

export function listClassSessions(filter?: { date?: string; locationId?: ID }) {
  return getDataset()
    .classSessions.filter((c) => (filter?.date ? c.date === filter.date : true))
    .filter((c) => (filter?.locationId ? c.locationId === filter.locationId : true))
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

export function getClassSession(id: ID) {
  return getDataset().classSessions.find((c) => c.id === id);
}

export function listParticipants(classSessionId: ID) {
  return getDataset().classParticipants.filter((p) => p.classSessionId === classSessionId);
}

/** Participant reservations across every class, for a client's own history. */
export function listClientClassReservations(clientId: ID) {
  return getDataset()
    .classParticipants.filter((p) => p.clientId === clientId)
    .map((p) => ({ participant: p, session: getClassSession(p.classSessionId) }))
    .filter((r): r is { participant: ClassParticipant; session: ClassSession } => Boolean(r.session))
    .sort((a, b) =>
      (b.session.date + b.session.startTime).localeCompare(a.session.date + a.session.startTime),
    );
}

const COUNTS_TOWARD_CAPACITY: ClassParticipantStatus[] = ["booked", "attended", "no_show"];

export function classCapacityState(session: ClassSession) {
  const participants = listParticipants(session.id);
  const booked = participants.filter((p) => COUNTS_TOWARD_CAPACITY.includes(p.status)).length;
  return {
    booked,
    capacity: session.capacity,
    open: Math.max(session.capacity - booked, 0),
    isFull: booked >= session.capacity,
    label: `${booked} / ${session.capacity}`,
    participants,
  };
}

export function createClassSession(input: {
  serviceId: ID;
  instructorStaffIds: ID[];
  locationId: ID;
  resourceId?: ID | null;
  date: string;
  startTime: string;
  durationMinutes?: number;
  capacity?: number;
}) {
  const service = serviceById(input.serviceId);
  const duration = input.durationMinutes ?? service?.defaultDurationMinutes ?? 50;
  return mutate((data) => {
    const session: ClassSession = {
      ...audit(nextId("cls")),
      serviceId: input.serviceId,
      instructorStaffIds: input.instructorStaffIds,
      locationId: input.locationId,
      resourceId: input.resourceId ?? null,
      date: input.date,
      startTime: input.startTime,
      endTime: fromMinutes(toMinutes(input.startTime) + duration),
      durationMinutes: duration,
      capacity: input.capacity ?? service?.classCapacity ?? 6,
      status: "scheduled",
    };
    data.classSessions.push(session);
    return session;
  });
}

export type BookParticipantResult =
  | { ok: true; participant: ClassParticipant }
  | { ok: false; reason: "full" | "duplicate" | "missing" };

/** Ordinary booking stops at capacity. Waitlisting is architecture-only. */
export function bookClassParticipant(
  classSessionId: ID,
  clientId: ID,
  bookingSource: BookingSource = "staff_scheduled",
): BookParticipantResult {
  return mutate((data) => {
    const session = data.classSessions.find((c) => c.id === classSessionId);
    if (!session) return { ok: false, reason: "missing" } as const;
    const existing = data.classParticipants.find(
      (p) =>
        p.classSessionId === classSessionId &&
        p.clientId === clientId &&
        COUNTS_TOWARD_CAPACITY.includes(p.status),
    );
    if (existing) return { ok: false, reason: "duplicate" } as const;
    const state = classCapacityState(session);
    if (state.isFull) return { ok: false, reason: "full" } as const;
    const participant: ClassParticipant = {
      ...audit(nextId("cp")),
      classSessionId,
      clientId,
      status: "booked",
      bookedAt: nowIso(),
      bookingSource,
    };
    data.classParticipants.push(participant);
    return { ok: true, participant } as const;
  });
}

export function setParticipantStatus(
  participantId: ID,
  status: ClassParticipantStatus,
  creditTransactionId?: ID | null,
) {
  return mutate((data) => {
    const p = data.classParticipants.find((x) => x.id === participantId);
    if (!p) return undefined;
    p.status = status;
    p.updatedAt = nowIso();
    if (creditTransactionId !== undefined) p.creditTransactionId = creditTransactionId;
    return p;
  });
}

/* ------------------------------------------------------------------ */
/* Public booking engine                                               */
/* ------------------------------------------------------------------ */

export function listPublicBookingConfigs() {
  return getDataset().publicBookingConfigs;
}

export function getPublicBookingConfig(slug: string) {
  return getDataset().publicBookingConfigs.find((c) => c.slug === slug && c.isActive);
}

export function updatePublicBookingConfig(id: ID, patch: Partial<PublicBookingConfig>) {
  return mutate((data) => {
    const config = data.publicBookingConfigs.find((c) => c.id === id);
    if (!config) return undefined;
    Object.assign(config, patch, { updatedAt: nowIso() });
    return config;
  });
}

export interface PublicSlot {
  date: string;
  startTime: string;
  endTime: string;
  providerStaffId: ID;
}

/**
 * Availability is DERIVED from real FredFit data. The public visitor only ever
 * receives a list of open start times — never the provider's calendar, client
 * names or any internal record.
 */
export function publicAvailability(config: PublicBookingConfig, days = 14): PublicSlot[] {
  const rules = config.availability;
  const slots: PublicSlot[] = [];
  const horizon = Math.min(days, rules.maximumHorizonDays);
  const earliest = new Date(`${DEMO_TODAY}T00:00:00`);
  earliest.setHours(earliest.getHours() + rules.minimumNoticeHours);
  const earliestDate = earliest.toISOString().slice(0, 10);

  for (let i = 0; i < horizon; i += 1) {
    const date = addDays(DEMO_TODAY, i);
    if (date < earliestDate) continue;
    const weekday = new Date(`${date}T00:00:00`).getDay();
    if (!rules.weekdays.includes(weekday)) continue;

    for (
      let start = toMinutes(rules.startTime);
      start + config.durationMinutes <= toMinutes(rules.endTime);
      start += rules.slotIntervalMinutes
    ) {
      const startTime = fromMinutes(start);
      const endTime = fromMinutes(start + config.durationMinutes + rules.bufferMinutes);
      const provider = config.providerStaffIds.find((staffId) => {
        const conflicts = detectConflicts({
          date,
          startTime,
          endTime,
          providerStaffId: staffId,
          resourceId: config.resourceId ?? null,
        });
        return (
          conflicts.providerConflicts.length === 0 && conflicts.resourceConflicts.length === 0
        );
      });
      if (provider) slots.push({ date, startTime, endTime, providerStaffId: provider });
    }
  }
  return slots;
}

export interface PublicContactInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  preferredContactMethod?: "email" | "phone" | "text";
}

function makeToken() {
  const raw =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  return raw.slice(0, 24);
}

/** Never creates a second people database — canonical match on email/phone. */
export function findOrCreatePerson(
  contact: PublicContactInput,
  bookingSource: BookingSource,
  extra?: Partial<Client>,
): { client: Client; created: boolean } {
  return mutate((data) => {
    const email = contact.email.trim().toLowerCase();
    const phone = (contact.phone ?? "").replace(/\D/g, "");
    const match = data.clients.find(
      (c) =>
        (email && c.email.trim().toLowerCase() === email) ||
        (phone.length >= 10 && (c.phone ?? "").replace(/\D/g, "") === phone),
    );
    if (match) {
      Object.assign(match, extra ?? {}, { updatedAt: nowIso() });
      if (!match.secureAccessToken) match.secureAccessToken = makeToken();
      return { client: match, created: false };
    }
    const numbers = data.clients
      .map((c) => Number(c.clientNumber.replace(/\D/g, "")))
      .filter((n) => !Number.isNaN(n));
    const next = (numbers.length ? Math.max(...numbers) : 1000) + 1;
    const client: Client = {
      ...audit(nextId("cl")),
      clientNumber: `FFS-${next}`,
      firstName: contact.firstName,
      lastName: contact.lastName,
      dateOfBirth: "",
      email: contact.email,
      ...(contact.phone ? { phone: contact.phone } : {}),
      status: "prospect",
      dateJoined: DEMO_TODAY,
      primaryLocationId: "loc-cowan",
      alerts: [],
      onboardingStatus: "not_started",
      bookingSource,
      ...(contact.preferredContactMethod
        ? { preferredContactMethod: contact.preferredContactMethod }
        : {}),
      secureAccessToken: makeToken(),
      ...(extra ?? {}),
    };
    data.clients.push(client);
    return { client, created: true };
  });
}

export interface PublicBookingResult {
  client: Client;
  appointment: Appointment;
  payment?: PaymentRecord;
  requirements: FormRequirement[];
}

export function createPublicBooking(input: {
  config: PublicBookingConfig;
  slot: PublicSlot;
  contact: PublicContactInput;
  clientExtra?: Partial<Client>;
}): PublicBookingResult {
  const { config, slot, contact } = input;
  const { client } = findOrCreatePerson(contact, config.bookingSource, input.clientExtra);
  const service = serviceById(config.serviceId);

  const appointment = mutate((data) => {
    const appt: Appointment = {
      ...audit(nextId("apt")),
      clientId: client.id,
      serviceId: config.serviceId,
      providerStaffId: slot.providerStaffId,
      ...(config.locationId ? { locationId: config.locationId } : {}),
      resourceId: config.resourceId ?? null,
      date: slot.date,
      startTime: slot.startTime,
      endTime: fromMinutes(toMinutes(slot.startTime) + config.durationMinutes),
      durationMinutes: config.durationMinutes,
      status: "scheduled",
      attendanceStatus: "pending",
      documentationRequired: service?.requiresDocumentation ?? false,
      documentationStatus: service?.requiresDocumentation ? "pending" : "not_required",
      superbillRequestStatus: "not_requested",
      appointmentType: "in_person",
      syncStatus: "not_synced",
      bookingSource: config.bookingSource,
      publicBookingConfigId: config.id,
      paymentStatus: config.paymentRequired ? "pending" : "not_required",
      notes: "Created through the public booking link (synthetic demo data).",
    };
    data.appointments.push(appt);
    data.appointmentStatusHistory.push({
      ...audit(nextId("ash")),
      appointmentId: appt.id,
      toStatus: "scheduled",
      reason: `Public booking — ${config.publicTitle}`,
      occurredAt: nowIso(),
    });
    return appt;
  });

  let payment: PaymentRecord | undefined;
  if (config.paymentRequired) {
    payment = mutate((data) => {
      const record: PaymentRecord = {
        ...audit(nextId("pay")),
        clientId: client.id,
        appointmentId: appointment.id,
        provider: config.paymentProvider === "quickbooks" ? "quickbooks" : "other",
        status: "pending",
        expectedAmountUsd: config.priceUsd ?? null,
        ...(config.paymentDescription ? { description: config.paymentDescription } : {}),
        externalPaymentUrl: config.externalPaymentUrl ?? null,
        initiatedAt: null,
        paidAt: null,
      };
      data.payments.push(record);
      const appt = data.appointments.find((a) => a.id === appointment.id);
      if (appt) appt.paymentId = record.id;
      return record;
    });
  }

  const requirements = config.postBookingFormKeys.map((key) =>
    ensureRequirement({
      clientId: client.id,
      templateKey: key,
      appointmentId: appointment.id,
      dueBefore: slot.date,
    }),
  );

  if (requirements.length) {
    queueNotification(
      client.id,
      "email",
      "apparatix_health_history_invitation",
      "Complete your Apparatix Health History Form",
    );
  }

  return { client, appointment, ...(payment ? { payment } : {}), requirements };
}

/* ------------------------------------------------------------------ */
/* Payments (QuickBooks payment-link handoff only)                     */
/* ------------------------------------------------------------------ */

export function getPayment(id?: ID | null) {
  return id ? getDataset().payments.find((p) => p.id === id) : undefined;
}

export function listPayments(clientId?: ID) {
  return getDataset().payments.filter((p) => !clientId || p.clientId === clientId);
}

export function markPaymentInitiated(paymentId: ID) {
  return mutate((data) => {
    const payment = data.payments.find((p) => p.id === paymentId);
    if (!payment) return undefined;
    payment.initiatedAt = nowIso();
    payment.status = "pending";
    payment.updatedAt = nowIso();
    return payment;
  });
}

/**
 * A payment link alone proves nothing. `paid` is only ever reached through an
 * explicit, recorded confirmation — today a staff member verifying in
 * QuickBooks, later a real webhook/API integration.
 */
export function confirmPaymentManually(
  paymentId: ID,
  staffId: ID,
  externalReference: string,
  status: "paid" | "failed" | "refunded" = "paid",
) {
  return mutate((data) => {
    const payment = data.payments.find((p) => p.id === paymentId);
    if (!payment) return undefined;
    payment.status = status;
    payment.externalReference = externalReference || null;
    payment.verifiedByStaffId = staffId;
    payment.verificationMethod = "manual_staff_confirmation";
    payment.paidAt = status === "paid" ? nowIso() : null;
    payment.updatedAt = nowIso();
    const appt = data.appointments.find((a) => a.id === payment.appointmentId);
    if (appt) appt.paymentStatus = status;
    return payment;
  });
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  not_required: "Payment not required",
  pending: "Payment pending",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

/* ------------------------------------------------------------------ */
/* Forms, requirements & submissions                                   */
/* ------------------------------------------------------------------ */

export function listFormTemplates() {
  return seed.FORM_TEMPLATES;
}

export function templateByKey(key: string) {
  return seed.FORM_TEMPLATES.find((t) => t.key === key);
}

export function listRequirements(clientId?: ID) {
  return getDataset().formRequirements.filter((r) => !clientId || r.clientId === clientId);
}

export function getRequirement(id: ID) {
  return getDataset().formRequirements.find((r) => r.id === id);
}

const OPEN_STATUSES: FormRequirementStatus[] = [
  "not_sent",
  "sent",
  "viewed",
  "in_progress",
  "needs_update",
];

/** Idempotent: a repeated trigger never produces a duplicate requirement. */
export function ensureRequirement(input: {
  clientId: ID;
  templateKey: string;
  onboardingCaseId?: ID | null;
  appointmentId?: ID | null;
  dueBefore?: string | null;
}): FormRequirement {
  return mutate((data) => {
    const existing = data.formRequirements.find(
      (r) =>
        r.clientId === input.clientId &&
        r.templateKey === input.templateKey &&
        (OPEN_STATUSES.includes(r.status) ||
          r.status === "submitted" ||
          r.status === "reviewed" ||
          r.status === "waived"),
    );
    if (existing) return existing;
    const template = templateByKey(input.templateKey);
    const requirement: FormRequirement = {
      ...audit(nextId("req")),
      clientId: input.clientId,
      templateKey: input.templateKey,
      templateVersion: template?.version ?? "v0-placeholder",
      onboardingCaseId: input.onboardingCaseId ?? null,
      appointmentId: input.appointmentId ?? null,
      status: "sent",
      sentAt: nowIso(),
      dueBefore: input.dueBefore ?? null,
    };
    data.formRequirements.push(requirement);
    return requirement;
  });
}

export function setRequirementStatus(
  id: ID,
  status: FormRequirementStatus,
  staffId?: ID,
): FormRequirement | undefined {
  return mutate((data) => {
    const req = data.formRequirements.find((r) => r.id === id);
    if (!req) return undefined;
    req.status = status;
    req.updatedAt = nowIso();
    if (status === "viewed" && !req.viewedAt) req.viewedAt = nowIso();
    if (status === "in_progress" && !req.startedAt) req.startedAt = nowIso();
    if (status === "reviewed") {
      req.reviewedAt = nowIso();
      req.reviewedByStaffId = staffId ?? null;
    }
    return req;
  });
}

/**
 * Submissions are locked. A newer template version is never written over an
 * already-submitted form — the historical version is preserved verbatim.
 */
export function submitForm(
  requirementId: ID,
  payload: Record<string, string | string[] | boolean>,
): FormSubmission | undefined {
  return mutate((data) => {
    const req = data.formRequirements.find((r) => r.id === requirementId);
    if (!req) return undefined;
    const submission: FormSubmission = {
      ...audit(nextId("sub")),
      requirementId,
      clientId: req.clientId,
      templateKey: req.templateKey,
      templateVersion: req.templateVersion,
      payload,
      submittedAt: nowIso(),
      lockedAt: nowIso(),
      isSynthetic: true,
    };
    data.formSubmissions.push(submission);
    req.status = "submitted";
    req.submittedAt = submission.submittedAt;
    req.submissionId = submission.id;
    req.updatedAt = nowIso();
    return submission;
  });
}

export function listSubmissions(clientId?: ID) {
  return getDataset().formSubmissions.filter((s) => !clientId || s.clientId === clientId);
}

export function getSubmission(id?: ID | null) {
  return id ? getDataset().formSubmissions.find((s) => s.id === id) : undefined;
}

export const REQUIREMENT_STATUS_LABELS: Record<FormRequirementStatus, string> = {
  not_sent: "Not sent",
  sent: "Sent",
  viewed: "Viewed",
  in_progress: "In progress",
  submitted: "Submitted",
  reviewed: "Reviewed",
  needs_update: "Needs update",
  waived: "Waived",
};

export function isRequirementComplete(r: FormRequirement) {
  return r.status === "submitted" || r.status === "reviewed" || r.status === "waived";
}

/* ------------------------------------------------------------------ */
/* 5-Step Onboarding case                                              */
/* ------------------------------------------------------------------ */

export const ONBOARDING_INTAKE_KEYS = [
  "viewpoint_liability",
  "medical_release",
  "bloodwork_upload",
  "food_log_3_day",
];

function apparatixSteps(): OnboardingCase["steps"] {
  return [
    { step: 1, label: "Apparatix Assessment", appointmentIds: [], status: "not_scheduled" },
    { step: 2, label: "InBody", appointmentIds: [], status: "not_scheduled" },
    {
      step: 3,
      label: "30-Minute Program Recommendations Appointment",
      appointmentIds: [],
      status: "not_scheduled",
    },
  ];
}

function freshSteps(): OnboardingCase["steps"] {
  return [
    { step: 1, label: "InBody Analysis + Gait Analysis", appointmentIds: [], status: "not_scheduled" },
    {
      step: 2,
      label: "FMS or Fall Risk Screening + Initial Physical Assessment",
      appointmentIds: [],
      status: "not_scheduled",
    },
    { step: 3, label: "Corrective Exercise", appointmentIds: [], status: "not_scheduled" },
    { step: 4, label: "Pilates Assessment", appointmentIds: [], status: "not_scheduled" },
    {
      step: 5,
      label: "Final RDN Consultation + Individualized Program Recommendations",
      appointmentIds: [],
      status: "not_scheduled",
    },
  ];
}

export function getOnboardingCase(clientId: ID) {
  return getDataset().onboardingCases.find((c) => c.clientId === clientId && c.status === "active");
}

export function listOnboardingCases() {
  return getDataset().onboardingCases;
}

export function listQueuedNotifications(clientId?: ID) {
  return getDataset().notifications.filter((n) => !clientId || n.clientId === clientId);
}

/**
 * Event-driven trigger: "5-Step Onboarding purchased / activated".
 * Idempotent — one canonical case, one set of intake requirements.
 */
export function activateOnboardingCase(
  clientId: ID,
  pathway: "comprehensive" | "apparatix" = "comprehensive",
): {
  onboardingCase: OnboardingCase;
  requirements: FormRequirement[];
  created: boolean;
} {
  const existing = getOnboardingCase(clientId);
  const onboardingCase =
    existing ??
    mutate((data) => {
      const created: OnboardingCase = {
        ...audit(nextId("onb")),
        clientId,
        pathway,
        status: "active",
        activatedAt: nowIso(),
        step2Pathway: "undecided",
        steps: pathway === "apparatix" ? apparatixSteps() : freshSteps(),
      };
      data.onboardingCases.push(created);
      const client = data.clients.find((c) => c.id === clientId);
      if (client) {
        client.onboardingStatus = "in_progress";
        if (client.status === "prospect") client.status = "onboarding";
        if (!client.secureAccessToken) client.secureAccessToken = makeToken();
        client.updatedAt = nowIso();
      }
      return created;
    });

  const intakeKeys =
    pathway === "apparatix"
      ? ["viewpoint_liability", "medical_release"]
      : ONBOARDING_INTAKE_KEYS;
  const requirements = intakeKeys.map((key) =>
    ensureRequirement({ clientId, templateKey: key, onboardingCaseId: onboardingCase.id }),
  );

  if (!existing) {
    queueNotification(
      clientId,
      "email",
      "onboarding_welcome_checklist",
      "Welcome to your 5-Step Onboarding — your intake checklist",
    );
  }

  return { onboardingCase, requirements, created: !existing };
}

export function setStep2Pathway(caseId: ID, pathway: "fms" | "fall_risk" | "undecided") {
  return mutate((data) => {
    const c = data.onboardingCases.find((x) => x.id === caseId);
    if (!c) return undefined;
    c.step2Pathway = pathway;
    c.updatedAt = nowIso();
    return c;
  });
}

export function setOnboardingStepStatus(
  caseId: ID,
  step: number,
  status: "not_scheduled" | "scheduled" | "complete",
) {
  return mutate((data) => {
    const c = data.onboardingCases.find((x) => x.id === caseId);
    const s = c?.steps.find((x) => x.step === step);
    if (!c || !s) return undefined;
    s.status = status;
    c.updatedAt = nowIso();
    if (c.steps.every((x) => x.status === "complete")) c.status = "complete";
    return c;
  });
}

export function onboardingProgress(onboardingCase: OnboardingCase) {
  const complete = onboardingCase.steps.filter((s) => s.status === "complete").length;
  return { complete, total: onboardingCase.steps.length };
}

export function intakeReadiness(clientId: ID, onboardingCaseId?: ID) {
  const reqs = listRequirements(clientId).filter(
    (r) => !onboardingCaseId || r.onboardingCaseId === onboardingCaseId,
  );
  const complete = reqs.filter(isRequirementComplete).length;
  return { requirements: reqs, complete, total: reqs.length, ready: reqs.length > 0 && complete === reqs.length };
}

/* ------------------------------------------------------------------ */
/* Secure documents (provider-neutral)                                 */
/* ------------------------------------------------------------------ */

export function listClientDocuments(clientId?: ID) {
  return getDataset().clientDocuments.filter((d) => !clientId || d.clientId === clientId);
}

/**
 * Only metadata is retained in this development environment; the original
 * source document reference is preserved and never replaced by extracted
 * values. `storageProvider` points at protected production storage later.
 */
export function uploadClientDocument(input: {
  clientId: ID;
  requirementId?: ID | null;
  onboardingCaseId?: ID | null;
  documentType: ClientDocument["documentType"];
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  documentDate?: string | null;
  uploadedByType: "client" | "staff";
  uploadedById?: ID | null;
}) {
  return mutate((data) => {
    const doc: ClientDocument = {
      ...audit(nextId("doc")),
      clientId: input.clientId,
      onboardingCaseId: input.onboardingCaseId ?? null,
      requirementId: input.requirementId ?? null,
      documentType: input.documentType,
      fileName: input.fileName,
      fileType: input.fileType,
      fileSizeBytes: input.fileSizeBytes,
      documentDate: input.documentDate ?? null,
      storageProvider: "demo_local_metadata_only",
      objectKey: `demo/${input.clientId}/${nextId("obj")}`,
      visibility: "restricted",
      uploadedAt: nowIso(),
      uploadedByType: input.uploadedByType,
      uploadedById: input.uploadedById ?? null,
      reviewStatus: "pending_review",
      isSynthetic: true,
    };
    data.clientDocuments.push(doc);
    if (input.requirementId) {
      const req = data.formRequirements.find((r) => r.id === input.requirementId);
      if (req) {
        req.status = "submitted";
        req.submittedAt = doc.uploadedAt;
        req.updatedAt = nowIso();
      }
    }
    return doc;
  });
}

/* ------------------------------------------------------------------ */
/* 3-Day Food Log                                                      */
/* ------------------------------------------------------------------ */

export function getFoodLog(clientId: ID) {
  return getDataset().foodLogs.find((f) => f.clientId === clientId);
}

export function ensureFoodLog(clientId: ID, requirementId?: ID | null, onboardingCaseId?: ID | null) {
  const existing = getFoodLog(clientId);
  if (existing) return existing;
  return mutate((data) => {
    const log: FoodLog = {
      ...audit(nextId("flog")),
      clientId,
      onboardingCaseId: onboardingCaseId ?? null,
      requirementId: requirementId ?? null,
      startDate: DEMO_TODAY,
      days: [0, 1, 2].map((dayIndex) => ({ dayIndex, date: addDays(DEMO_TODAY, dayIndex) })),
      entries: [],
      status: "in_progress",
      submittedAt: null,
      isSynthetic: true,
    };
    data.foodLogs.push(log);
    return log;
  });
}

export function saveFoodLogEntry(logId: ID, entry: Omit<FoodLogEntry, "id"> & { id?: ID }) {
  return mutate((data) => {
    const log = data.foodLogs.find((f) => f.id === logId);
    if (!log) return undefined;
    if (entry.id) {
      const found = log.entries.find((e) => e.id === entry.id);
      if (found) Object.assign(found, entry);
    } else {
      log.entries.push({ ...entry, id: nextId("fle") });
    }
    log.updatedAt = nowIso();
    if (log.status === "in_progress" && log.requirementId) {
      const req = data.formRequirements.find((r) => r.id === log.requirementId);
      if (req && (req.status === "sent" || req.status === "viewed")) req.status = "in_progress";
    }
    return log;
  });
}

export function removeFoodLogEntry(logId: ID, entryId: ID) {
  return mutate((data) => {
    const log = data.foodLogs.find((f) => f.id === logId);
    if (!log) return undefined;
    log.entries = log.entries.filter((e) => e.id !== entryId);
    log.updatedAt = nowIso();
    return log;
  });
}

export function saveFoodLogDay(logId: ID, dayIndex: number, patch: { water?: string; comments?: string }) {
  return mutate((data) => {
    const log = data.foodLogs.find((f) => f.id === logId);
    const day = log?.days.find((d) => d.dayIndex === dayIndex);
    if (!log || !day) return undefined;
    Object.assign(day, patch);
    log.updatedAt = nowIso();
    return log;
  });
}

export function submitFoodLog(logId: ID) {
  return mutate((data) => {
    const log = data.foodLogs.find((f) => f.id === logId);
    if (!log) return undefined;
    log.status = "submitted";
    log.submittedAt = nowIso();
    log.updatedAt = nowIso();
    const req = data.formRequirements.find((r) => r.id === log.requirementId);
    if (req) {
      req.status = "submitted";
      req.submittedAt = log.submittedAt;
      req.updatedAt = nowIso();
    }
    return log;
  });
}

/* ------------------------------------------------------------------ */
/* Discovery calls                                                     */
/* ------------------------------------------------------------------ */

export const DISCOVERY_INTERESTS = [
  "Personal Training",
  "Partner Personal Training",
  "Pilates",
  "Partner Pilates",
  "Medical Exercise",
  "Corrective Exercise",
  "Registered Dietitian / Nutrition",
  "Massage Therapy",
  "Assisted Stretching",
  "Apparatix",
  "Apparatix Plus",
  "5-Step Onboarding",
  "Not Sure / Help Me Decide",
];

export const REFERRAL_SOURCES = [
  "Google",
  "Facebook",
  "Instagram",
  "Friend / Family Referral",
  "Current Client Referral",
  "Physician / Healthcare Provider",
  "Local Event",
  "Television / Media",
  "Podcast",
  "Website",
  "Other",
];

export function createDiscoverySubmission(input: {
  clientId: ID;
  appointmentId?: ID | null;
  interests: string[];
  whatPrompted: string;
  helpWith: string;
  successLooksLike: string;
  biggestChallenge: string;
  referralSource: string;
  anythingElse?: string;
  payload?: Record<string, string | string[] | boolean>;
}) {
  return mutate((data) => {
    const submission: DiscoveryCallSubmission = {
      ...audit(nextId("dcs")),
      clientId: input.clientId,
      appointmentId: input.appointmentId ?? null,
      interests: input.interests,
      whatPrompted: input.whatPrompted,
      helpWith: input.helpWith,
      successLooksLike: input.successLooksLike,
      biggestChallenge: input.biggestChallenge,
      referralSource: input.referralSource,
      ...(input.anythingElse ? { anythingElse: input.anythingElse } : {}),
      ...(input.payload ? { payload: input.payload } : {}),
      outcome: "scheduled",
    };
    data.discoverySubmissions.push(submission);
    const client = data.clients.find((c) => c.id === input.clientId);
    if (client) {
      client.serviceInterests = input.interests;
      client.successStatement = input.successLooksLike;
      client.biggestChallenge = input.biggestChallenge;
      client.referralSource = input.referralSource;
      client.goals = client.goals || input.helpWith;
      client.updatedAt = nowIso();
    }
    return submission;
  });
}

export function listDiscoverySubmissions(clientId?: ID) {
  return getDataset()
    .discoverySubmissions.filter((s) => !clientId || s.clientId === clientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function setDiscoveryOutcome(id: ID, outcome: DiscoveryOutcome, recommendedNextStep?: string) {
  return mutate((data) => {
    const s = data.discoverySubmissions.find((x) => x.id === id);
    if (!s) return undefined;
    s.outcome = outcome;
    if (recommendedNextStep !== undefined) s.recommendedNextStep = recommendedNextStep;
    s.updatedAt = nowIso();
    return s;
  });
}

/**
 * The SAME canonical person transitions — no second record is created, and
 * all discovery-call history, goals and appointments are preserved.
 */
export function convertProspectToClient(clientId: ID, target: "onboarding" | "active" = "onboarding") {
  return mutate((data) => {
    const client = data.clients.find((c) => c.id === clientId);
    if (!client) return undefined;
    client.status = target;
    client.updatedAt = nowIso();
    const submissions = data.discoverySubmissions.filter((s) => s.clientId === clientId);
    submissions.forEach((s) => {
      if (s.outcome !== "converted") s.outcome = "converted";
    });
    return client;
  });
}

export const DISCOVERY_OUTCOME_LABELS: Record<DiscoveryOutcome, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  no_show: "No Show",
  cancelled: "Cancelled",
  follow_up_needed: "Follow-up needed",
  qualified: "Qualified",
  not_a_fit: "Not a fit",
  converted: "Converted to client",
};

/* ------------------------------------------------------------------ */
/* Notifications — queued only, never reported as delivered            */
/* ------------------------------------------------------------------ */

export function queueNotification(clientId: ID, channel: "email" | "sms", template: string, subject: string) {
  return mutate((data) => {
    const item = {
      ...audit(nextId("ntf")),
      clientId,
      channel,
      template,
      subject,
      status: "queued_demo" as const,
      queuedAt: nowIso(),
      note: "No communications provider is connected. Nothing has been delivered.",
    };
    data.notifications.push(item);
    return item;
  });
}

export function listNotifications(clientId?: ID) {
  return getDataset()
    .notifications.filter((n) => !clientId || n.clientId === clientId)
    .sort((a, b) => b.queuedAt.localeCompare(a.queuedAt));
}

/* ------------------------------------------------------------------ */
/* Misc helpers                                                        */
/* ------------------------------------------------------------------ */

export const BOOKING_SOURCE_LABELS: Record<BookingSource, string> = {
  staff_scheduled: "Staff scheduled",
  website: "Website",
  public_booking_link: "Public booking link",
  discovery_call: "Discovery call",
  social: "Facebook / Social",
  google: "Google",
  referral: "Referral",
  other: "Other",
};

export function secureIntakePath(client: Client) {
  return client.secureAccessToken ? `/intake/${client.secureAccessToken}` : null;
}

export function clientByToken(token: string) {
  return getDataset().clients.find((c) => c.secureAccessToken === token);
}

export function ensureAccessToken(clientId: ID) {
  return mutate((data) => {
    const client = data.clients.find((c) => c.id === clientId);
    if (!client) return undefined;
    if (!client.secureAccessToken) {
      client.secureAccessToken = makeToken();
      client.updatedAt = nowIso();
    }
    return client;
  });
}

export function groupClassServices(): Service[] {
  return getDataset().services.filter((s) => s.isGroupClass);
}

export function personLabel(client: Client) {
  return clientDisplayName(client);
}

export { addDays as addDaysIso, fromMinutes, toMinutes };
