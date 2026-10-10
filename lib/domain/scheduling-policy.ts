/**
 * FFS SCHEDULING BUSINESS RULES — SINGLE SOURCE OF TRUTH.
 *
 * Every cancellation-policy, makeup-eligibility and booking-validation
 * decision in FredFit Portal is made here. UI components never re-implement a
 * rule; they call these functions and render the result.
 *
 * Nothing in this module touches localStorage, React or any storage SDK. It is
 * pure business logic over plain records, so it migrates to a production
 * backend (server function / database trigger) without modification.
 */

import type {
  Appointment,
  AppointmentStatus,
  ID,
  ISODate,
  LocationResource,
  Service,
  StaffAvailability,
  StaffMember,
} from "./types";

/* ------------------------------------------------------------------ */
/* Policy constants — configuration, not magic numbers                 */
/* ------------------------------------------------------------------ */

/** 24 hours or more notice = Early Cancel. Less = Late Cancel. */
export const CANCELLATION_NOTICE_HOURS = 24;

/** Makeups expire 90 days after the ORIGINAL scheduled absence date. */
export const MAKEUP_EXPIRY_DAYS = 90;

/** Statuses that free the time slot back up on the working calendar. */
export const SLOT_RELEASING_STATUSES: AppointmentStatus[] = [
  "early_cancel",
  "cancelled",
  "rescheduled",
];

/** Statuses that stay visible but greyed out — the client is not coming. */
export const GREYED_STATUSES: AppointmentStatus[] = ["late_cancel", "no_show"];

/** Statuses where the session is forfeited and no makeup is ever issued. */
export const FORFEITING_STATUSES: AppointmentStatus[] = ["late_cancel", "no_show"];

/* ------------------------------------------------------------------ */
/* Date / time helpers                                                 */
/* ------------------------------------------------------------------ */

export function toMinutes(hhmm: string) {
  const [h = "0", m = "0"] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

export function fromMinutes(total: number) {
  const clamped = Math.max(0, total);
  const hh = String(Math.floor(clamped / 60) % 24).padStart(2, "0");
  const mm = String(clamped % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function addDaysIso(iso: ISODate, days: number): ISODate {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function appointmentStartDate(a: Pick<Appointment, "date" | "startTime">) {
  return new Date(`${a.date}T${a.startTime}:00`);
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

/* ------------------------------------------------------------------ */
/* Cancellation policy                                                 */
/* ------------------------------------------------------------------ */

export interface CancellationClassification {
  status: "early_cancel" | "late_cancel";
  noticeHours: number;
  meetsNoticeWindow: boolean;
}

/**
 * 24h+ notice = Early Cancel (makeup eligible). Under 24h = Late Cancel
 * (forfeited). Notice is measured from `now` to the ORIGINAL session start.
 */
export function classifyCancellation(
  appointment: Pick<Appointment, "date" | "startTime">,
  now: Date = new Date(),
): CancellationClassification {
  const start = appointmentStartDate(appointment);
  const noticeHours = (start.getTime() - now.getTime()) / 3_600_000;
  const meetsNoticeWindow = noticeHours >= CANCELLATION_NOTICE_HOURS;
  return {
    status: meetsNoticeWindow ? "early_cancel" : "late_cancel",
    noticeHours: Math.round(noticeHours * 10) / 10,
    meetsNoticeWindow,
  };
}

/** 90 days from the date of the session that was missed. */
export function makeupExpirationDate(originalAbsenceDate: ISODate): ISODate {
  return addDaysIso(originalAbsenceDate, MAKEUP_EXPIRY_DAYS);
}

/** A service is makeup-eligible unless the catalog explicitly says otherwise. */
export function serviceIsMakeupEligible(service?: Service | null) {
  return service ? service.makeupEligible !== false : true;
}

/** Only an Early Cancel on a makeup-eligible service can issue a makeup. */
export function shouldIssueMakeup(status: AppointmentStatus, service?: Service | null) {
  return status === "early_cancel" && serviceIsMakeupEligible(service);
}

export interface StatusConsequence {
  title: string;
  body: string;
  tone: "positive" | "warning" | "danger" | "neutral";
  /** Explicit confirmation required before applying. */
  requiresConfirmation: boolean;
}

/** Plain-language consequence shown before a status change is applied. */
export function statusConsequence(
  status: AppointmentStatus,
  appointment: Pick<Appointment, "date" | "startTime">,
  service?: Service | null,
): StatusConsequence {
  switch (status) {
    case "completed":
      return {
        title: "Mark Completed",
        body: "The session will be recorded as completed and attended. Documentation status is tracked separately and will not be changed.",
        tone: "positive",
        requiresConfirmation: true,
      };
    case "early_cancel": {
      const eligible = serviceIsMakeupEligible(service);
      const expires = makeupExpirationDate(appointment.date);
      return {
        title: "Early Cancel",
        body: eligible
          ? `A makeup will be issued and will expire on ${expires} (90 days after the originally scheduled session). The time slot will be released so it can be re-sold. The appointment stays in the client's history. Continue?`
          : `${service?.name ?? "This service"} is not makeup-eligible, so no makeup will be issued. The time slot will be released and the appointment stays in the client's history. Continue?`,
        tone: "warning",
        requiresConfirmation: true,
      };
    }
    case "late_cancel":
      return {
        title: "Late Cancel",
        body: "Less than 24 hours' notice — the session will be forfeited and NO makeup will be issued. The appointment stays on the calendar greyed out so staff can see the client is not coming. Continue?",
        tone: "danger",
        requiresConfirmation: true,
      };
    case "no_show":
      return {
        title: "No Show",
        body: "The session will be forfeited and NO makeup will be issued. The appointment stays on the calendar greyed out and labelled No Show. Continue?",
        tone: "danger",
        requiresConfirmation: true,
      };
    case "cancelled": {
      const eligible = serviceIsMakeupEligible(service);
      const expires = makeupExpirationDate(appointment.date);
      return {
        title: "Studio cancellation",
        body: eligible
          ? `Recorded as a studio/administrative cancellation. This is not a client early or late cancel and does not forfeit the session: every client still attending receives their own make-up, expiring ${expires} (90 days after the originally scheduled session). Continue?`
          : `Recorded as a studio/administrative cancellation. ${service?.name ?? "This service"} is not makeup-eligible, so no make-up will be issued. Continue?`,
        tone: "neutral",
        requiresConfirmation: true,
      };
    }
    default:
      return {
        title: "Change status",
        body: "The appointment status will be updated and recorded in the audit history.",
        tone: "neutral",
        requiresConfirmation: false,
      };
  }
}

/** Should this appointment still occupy its slot on the working calendar? */
export function occupiesSlot(a: Pick<Appointment, "status">) {
  return !SLOT_RELEASING_STATUSES.includes(a.status);
}

export function isGreyedOut(a: Pick<Appointment, "status">) {
  return GREYED_STATUSES.includes(a.status);
}

/* ------------------------------------------------------------------ */
/* Booking validation                                                  */
/* ------------------------------------------------------------------ */

export type ValidationSeverity = "warning" | "blocking";

export interface ValidationIssue {
  ruleKey: string;
  severity: ValidationSeverity;
  message: string;
  /** Whether an authorised admin may override this rule with a reason. */
  overridable: boolean;
}

export interface BookingContext {
  date: ISODate;
  startTime: string;
  endTime: string;
  service?: Service | null;
  provider?: StaffMember | null;
  locationId?: ID | null;
  resource?: LocationResource | null;
  /** Working windows configured for this provider. */
  availability: StaffAvailability[];
  /** Explicit exception dates (PTO, holiday) for this provider. */
  unavailableDates?: ISODate[];
  /** Service ids the provider is approved to deliver. */
  approvedServiceIds: ID[];
  /** Live appointments on the same date, excluding the one being moved. */
  sameDayAppointments: Appointment[];
  /** Resources belonging to the target location. */
  locationResources?: LocationResource[];
}

function isVirtualLocation(locationId?: ID | null) {
  return locationId === "loc-virtual" || locationId === "loc-phone";
}

function isInHomeLocation(locationId?: ID | null) {
  return locationId === "loc-in-home";
}

/**
 * Every scheduling rule in one place. Returns the complete list of issues so
 * the UI can show all of them at once instead of one at a time.
 */
export function validateBooking(ctx: BookingContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const weekday = new Date(`${ctx.date}T00:00:00`).getDay();

  /* 1. Provider approved for this service */
  if (ctx.service && ctx.provider) {
    if (!ctx.approvedServiceIds.includes(ctx.service.id)) {
      issues.push({
        ruleKey: "provider_service_eligibility",
        severity: "warning",
        overridable: true,
        message: `${ctx.provider.firstName} ${ctx.provider.lastName} is not approved for ${ctx.service.name}.`,
      });
    }
  }

  /* 2. Provider bookable at all */
  if (ctx.provider && (ctx.provider.isBookable === false || !ctx.provider.isActive)) {
    issues.push({
      ruleKey: "provider_not_bookable",
      severity: "warning",
      overridable: true,
      message: `${ctx.provider.firstName} ${ctx.provider.lastName} is not currently a bookable provider.`,
    });
  }

  /* 3. Provider scheduled to work at that date/time/location */
  if (ctx.provider) {
    if (ctx.unavailableDates?.includes(ctx.date)) {
      issues.push({
        ruleKey: "provider_time_off",
        severity: "warning",
        overridable: true,
        message: `${ctx.provider.firstName} ${ctx.provider.lastName} is marked unavailable (PTO / holiday) on ${ctx.date}.`,
      });
    } else {
      const windows = ctx.availability.filter(
        (w) =>
          w.isActive &&
          w.weekday === weekday &&
          (!ctx.locationId || isVirtualLocation(ctx.locationId) || w.locationId === ctx.locationId),
      );
      const covered = windows.some(
        (w) => toMinutes(ctx.startTime) >= toMinutes(w.startTime) && toMinutes(ctx.endTime) <= toMinutes(w.endTime),
      );
      if (!covered) {
        issues.push({
          ruleKey: "provider_not_scheduled",
          severity: "warning",
          overridable: true,
          message: windows.length
            ? `Provider is not scheduled to work ${ctx.startTime}–${ctx.endTime} on this date.`
            : "Provider is not scheduled to work at this location on this day.",
        });
      }
    }
  }

  /* 4. Provider double-booking — never silent */
  if (ctx.provider) {
    const clash = ctx.sameDayAppointments.filter(
      (a) =>
        a.providerStaffId === ctx.provider!.id &&
        occupiesSlot(a) &&
        overlaps(ctx.startTime, ctx.endTime, a.startTime, a.endTime),
    );
    if (clash.length) {
      issues.push({
        ruleKey: "provider_conflict",
        severity: "warning",
        overridable: true,
        message: `Provider already has ${clash.length} appointment${clash.length > 1 ? "s" : ""} overlapping ${ctx.startTime}–${ctx.endTime}.`,
      });
    }
  }

  /* 5. Service delivery mode vs location */
  if (ctx.service) {
    const mode = ctx.service.deliveryMode ?? (ctx.service.isVirtualByDefault ? "virtual" : "in_person");
    if (mode === "virtual" && !isVirtualLocation(ctx.locationId)) {
      issues.push({
        ruleKey: "service_delivery_mode",
        severity: "warning",
        overridable: true,
        message: `${ctx.service.name} is a virtual service but a physical location is selected.`,
      });
    }
    if (mode === "in_home" && !isInHomeLocation(ctx.locationId)) {
      issues.push({
        ruleKey: "service_delivery_mode",
        severity: "warning",
        overridable: true,
        message: `${ctx.service.name} is delivered at the client's location — use the In Home location, not a studio.`,
      });
    }
    if (
      mode === "in_person" &&
      ctx.locationId &&
      ctx.service.allowedLocationIds?.length &&
      !ctx.service.allowedLocationIds.includes(ctx.locationId)
    ) {
      issues.push({
        ruleKey: "service_location",
        severity: "warning",
        overridable: true,
        message: `${ctx.service.name} is not offered at this location.`,
      });
    }
  }

  /* 6. Resource belongs to the location, is active, and allows the service */
  const needsRoom =
    ctx.service &&
    (ctx.service.deliveryMode ?? "in_person") === "in_person" &&
    !isVirtualLocation(ctx.locationId) &&
    !isInHomeLocation(ctx.locationId);

  if (ctx.resource) {
    if (ctx.locationId && ctx.resource.locationId !== ctx.locationId) {
      issues.push({
        ruleKey: "resource_wrong_location",
        severity: "blocking",
        overridable: false,
        message: `${ctx.resource.name} belongs to a different location and cannot be used here.`,
      });
    }
    if (!ctx.resource.isActive) {
      issues.push({
        ruleKey: "resource_inactive",
        severity: "blocking",
        overridable: false,
        message: `${ctx.resource.name} is inactive and cannot be used for new appointments.`,
      });
    }
    if (
      ctx.service &&
      ctx.resource.allowedServiceIds?.length &&
      !ctx.resource.allowedServiceIds.includes(ctx.service.id)
    ) {
      issues.push({
        ruleKey: "resource_service_mismatch",
        severity: "warning",
        overridable: true,
        message: `${ctx.resource.name} is not configured for ${ctx.service.name}.`,
      });
    }
    /* Resource capacity — an exclusive room cannot hold two bookings. */
    const users = ctx.sameDayAppointments.filter(
      (a) =>
        a.resourceId === ctx.resource!.id &&
        occupiesSlot(a) &&
        overlaps(ctx.startTime, ctx.endTime, a.startTime, a.endTime),
    );
    if (users.length + 1 > ctx.resource.capacity) {
      issues.push({
        ruleKey: "resource_conflict",
        severity: "blocking",
        overridable: false,
        message: `${ctx.resource.name} is already at capacity (${ctx.resource.capacity}) for ${ctx.startTime}–${ctx.endTime}.`,
      });
    }
  } else if (needsRoom && ctx.locationResources?.length) {
    issues.push({
      ruleKey: "resource_missing",
      severity: "warning",
      overridable: true,
      message: "No room / resource selected for an in-person session.",
    });
  }

  return issues;
}

export function hasBlockingIssue(issues: ValidationIssue[]) {
  return issues.some((i) => i.severity === "blocking");
}

/* ------------------------------------------------------------------ */
/* Capacity rules                                                      */
/* ------------------------------------------------------------------ */

/** Client-facing time only. Admin blocks never count toward capacity. */
export function countsTowardCapacity(service?: Service | null) {
  if (!service) return false;
  if (service.countsTowardCapacity === false) return false;
  return true;
}

export const CAPACITY_COUNTING_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "completed",
  "late_cancel",
  "no_show",
];

/** Completed hours only ever count genuinely delivered sessions. */
export const CAPACITY_COMPLETED_STATUSES: AppointmentStatus[] = ["completed"];
