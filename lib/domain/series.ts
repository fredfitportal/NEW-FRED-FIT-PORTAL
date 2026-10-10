/**
 * RECURRING SERIES ENGINE.
 *
 * A recurring schedule is a persistent DEFINITION (`RecurringAppointment`),
 * not just a pile of pre-generated appointments. Generated occurrences stay
 * linked to their series, but the pattern itself is the source of truth for
 * everything generated from here on.
 *
 * Non-negotiables enforced in this module:
 *  - History is never rewritten. Only occurrences on or after the effective
 *    date, and only those still awaiting an outcome (Scheduled / Confirmed),
 *    are touched by a pattern change.
 *  - Ending a series is an ADMINISTRATIVE action. Future, never-delivered
 *    occurrences are removed; no cancellation status is applied and no
 *    make-up credit is ever issued by ending a schedule.
 *  - Every pattern change writes an append-only audit row: who, when, from
 *    what date, previous value, new value and the scope chosen.
 */

import { DEMO_TODAY, repository } from "./repository";
import { validatePlacement } from "./scheduling";
import { occupiesSlot, overlaps } from "./scheduling-policy";
import { getDataset, mutate, nextId, nowIso } from "./store";
import { sessionCapacity } from "./sessions";
import type {
  Appointment,
  ID,
  ISODate,
  RecurrenceFrequency,
  RecurringAppointment,
  RecurringParticipantPause,
  RecurringSeriesChange,
} from "./types";

/* ----------------------------- date helpers ---------------------------- */

function addDays(iso: string, days: number): ISODate {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonths(iso: string, months: number): ISODate {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function dayDiff(from: string, to: string) {
  return Math.round(
    (new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86_400_000,
  );
}

function endTimeFor(startTime: string, durationMinutes: number) {
  const [h = "0", m = "0"] = startTime.split(":");
  const total = Number(h) * 60 + Number(m) + durationMinutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Statuses that mean the occurrence has not happened yet and may be moved. */
const PENDING_STATUSES = ["scheduled", "confirmed"];

function stepFor(frequency: RecurrenceFrequency) {
  switch (frequency) {
    case "every_other_week":
      return 14;
    case "every_4_weeks":
      return 28;
    default:
      return 7;
  }
}

/** Next date in the pattern after `date`. */
export function nextPatternDate(date: ISODate, frequency: RecurrenceFrequency): ISODate {
  if (frequency === "monthly") return addMonths(date, 1);
  return addDays(date, stepFor(frequency));
}

/* ------------------------------- queries -------------------------------- */

export function seriesById(id?: ID | null): RecurringAppointment | undefined {
  if (!id) return undefined;
  return getDataset().recurringAppointments.find((r) => r.id === id);
}

export function seriesForAppointment(appointment: Appointment) {
  return seriesById(appointment.recurringAppointmentId);
}

export function listSeriesChanges(seriesId?: ID): RecurringSeriesChange[] {
  return getDataset()
    .recurringSeriesChanges.filter((c) => !seriesId || c.seriesId === seriesId)
    .sort((a, b) => b.changedAt.localeCompare(a.changedAt));
}

export function seriesOccurrences(seriesId: ID): Appointment[] {
  return getDataset()
    .appointments.filter((a) => a.recurringAppointmentId === seriesId)
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
}

export function futurePendingOccurrences(seriesId: ID, fromDate: ISODate): Appointment[] {
  return seriesOccurrences(seriesId).filter(
    (a) => a.date >= fromDate && PENDING_STATUSES.includes(a.status),
  );
}

/* ------------------------------- audit ---------------------------------- */

function recordChange(input: {
  seriesId: ID;
  appointmentId?: ID | null;
  actorStaffId: ID;
  effectiveDate: ISODate;
  scope: RecurringSeriesChange["scope"];
  field: string;
  previousValue: string;
  newValue: string;
  reason?: string;
  occurrencesAffected?: number;
}) {
  const row: RecurringSeriesChange = {
    id: nextId("rsc"),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    archivedAt: null,
    seriesId: input.seriesId,
    appointmentId: input.appointmentId ?? null,
    changedByStaffId: input.actorStaffId,
    changedAt: nowIso(),
    effectiveDate: input.effectiveDate,
    scope: input.scope,
    field: input.field,
    previousValue: input.previousValue,
    newValue: input.newValue,
    ...(input.reason ? { reason: input.reason } : {}),
    ...(input.occurrencesAffected !== undefined
      ? { occurrencesAffected: input.occurrencesAffected }
      : {}),
  };
  getDataset().recurringSeriesChanges.push(row);
  return row;
}

/* --------------------------- pattern changes ---------------------------- */

export interface SeriesPatternPatch {
  /** New date of the anchor occurrence — day-of-week and shift come from it. */
  date?: ISODate;
  startTime?: string;
  durationMinutes?: number;
  providerStaffId?: ID;
  locationId?: ID | null;
  resourceId?: ID | null;
}

export interface SeriesUpdateResult {
  ok: boolean;
  reason?: string;
  series?: RecurringAppointment;
  occurrencesUpdated: number;
  changes: RecurringSeriesChange[];
}

const FIELD_LABELS: Record<string, string> = {
  date: "Day",
  startTime: "Start time",
  durationMinutes: "Duration (minutes)",
  providerStaffId: "Provider",
  locationId: "Location",
  resourceId: "Room / resource",
  participant_pause: "Participant pause",
  pause: "Schedule pause",
  occurrence_moved: "Appointment moved",
};

export { FIELD_LABELS as SERIES_FIELD_LABELS };

export interface RescheduleOccurrenceResult {
  ok: boolean;
  reason?: string;
  conflicts?: string[];
}

export interface OccurrencePatch {
  date?: ISODate;
  startTime?: string;
  durationMinutes?: number;
  providerStaffId?: ID;
  locationId?: ID | null;
}

/**
 * "This occurrence only": MOVES a single appointment in place.
 *
 * Deliberately not a cancel-and-rebook — the same appointment row keeps its
 * id, clients, participants, service, notes and history. No cancellation
 * status is written, so Early Cancel / Late Cancel / No Show and the entire
 * make-up credit system are untouched. The recurring pattern and every other
 * occurrence, past and future, are left exactly as they are; the occurrence
 * simply becomes an exception to its series and its original slot is never
 * regenerated.
 */
export function rescheduleOccurrence(
  appointmentId: ID,
  patch: OccurrencePatch,
  actorStaffId: ID,
  reason?: string,
): RescheduleOccurrenceResult {
  const current = repository.getAppointment(appointmentId);
  if (!current) return { ok: false, reason: "Appointment not found." };

  const next = {
    date: patch.date ?? current.date,
    startTime: patch.startTime ?? current.startTime,
    durationMinutes: patch.durationMinutes ?? current.durationMinutes,
    providerStaffId: patch.providerStaffId ?? current.providerStaffId,
    locationId: patch.locationId === undefined ? (current.locationId ?? null) : patch.locationId,
  };

  const hasMove =
    next.date !== current.date ||
    next.startTime !== current.startTime ||
    next.durationMinutes !== current.durationMinutes ||
    next.providerStaffId !== current.providerStaffId ||
    next.locationId !== (current.locationId ?? null);

  if (!hasMove) return { ok: true };

  /* Same rules as booking: provider, location/resource and participant clashes. */
  const issues = validatePlacement({
    date: next.date,
    startTime: next.startTime,
    durationMinutes: next.durationMinutes,
    serviceId: current.serviceId,
    providerStaffId: next.providerStaffId,
    locationId: next.locationId,
    resourceId: current.resourceId ?? null,
    ignoreAppointmentId: current.id,
  });
  /*
   * A double-booking is a hard stop for a reschedule: the provider, the room
   * and every participant must actually be free at the new time.
   */
  const HARD_CONFLICTS = ["provider_conflict", "resource_conflict"];
  const blocking = issues.filter(
    (i) => i.severity === "blocking" || HARD_CONFLICTS.includes(i.ruleKey),
  );

  const attending = current.participantClientIds?.length
    ? current.participantClientIds
    : [current.clientId];
  const newEnd = endTimeFor(next.startTime, next.durationMinutes);
  const clientClashes = repository
    .listAppointments()
    .filter(
      (a) =>
        a.id !== current.id &&
        a.date === next.date &&
        occupiesSlot(a) &&
        overlaps(next.startTime, newEnd, a.startTime, a.endTime) &&
        (a.participantClientIds?.length ? a.participantClientIds : [a.clientId]).some((c) =>
          attending.includes(c),
        ),
    );

  if (blocking.length || clientClashes.length) {
    return {
      ok: false,
      reason: "This time conflicts with something already booked.",
      conflicts: [
        ...blocking.map((i) => i.message),
        ...clientClashes.map(
          (a) =>
            `A participant already has a session at ${a.startTime}\u2013${a.endTime} on that day.`,
        ),
      ],
    };
  }

  const moved = repository.moveSingleOccurrence(appointmentId, next, actorStaffId, {
    ...(reason ? { reason } : {}),
  });
  return moved ? { ok: true } : { ok: false, reason: "Appointment not found." };
}

/**
 * "This and future occurrences": updates the recurring DEFINITION effective
 * with the anchor occurrence's date and moves every later pending occurrence
 * to match. Occurrences before that date — and any occurrence that already has
 * an outcome — are never touched.
 */
export function updateSeriesFromOccurrence(
  appointmentId: ID,
  patch: SeriesPatternPatch,
  actorStaffId: ID,
  reason?: string,
): SeriesUpdateResult {
  return mutate((data): SeriesUpdateResult => {
    const anchor = data.appointments.find((a) => a.id === appointmentId);
    if (!anchor) return { ok: false, reason: "Appointment not found", occurrencesUpdated: 0, changes: [] };
    const series = data.recurringAppointments.find((r) => r.id === anchor.recurringAppointmentId);
    if (!series)
      return {
        ok: false,
        reason: "This appointment is not part of a recurring series.",
        occurrencesUpdated: 0,
        changes: [],
      };

    const effectiveDate = patch.date ?? anchor.date;
    const shift = patch.date ? dayDiff(anchor.date, patch.date) : 0;
    const targets = futurePendingOccurrences(series.id, anchor.date);

    /* ---- record what the pattern used to be, before anything changes ---- */
    const changes: RecurringSeriesChange[] = [];
    const push = (field: string, previousValue: string, newValue: string) => {
      if (previousValue === newValue) return;
      changes.push(
        recordChange({
          seriesId: series.id,
          appointmentId: anchor.id,
          actorStaffId,
          effectiveDate,
          scope: "this_and_future",
          field,
          previousValue,
          newValue,
          ...(reason ? { reason } : {}),
          occurrencesAffected: targets.length,
        }),
      );
    };

    if (patch.date && shift !== 0) {
      const prevWeekday = series.weekday ?? new Date(`${anchor.date}T00:00:00`).getDay();
      const nextWeekday = new Date(`${patch.date}T00:00:00`).getDay();
      push("date", `${WEEKDAYS[prevWeekday] ?? prevWeekday} (from ${anchor.date})`, `${WEEKDAYS[nextWeekday] ?? nextWeekday} (from ${patch.date})`);
      series.weekday = nextWeekday;
      series.anchorDate = patch.date;
    } else if (!series.anchorDate) {
      series.anchorDate = anchor.date;
    }
    if (patch.startTime && patch.startTime !== series.startTime) {
      push("startTime", series.startTime, patch.startTime);
      series.startTime = patch.startTime;
    }
    if (patch.durationMinutes && patch.durationMinutes !== series.durationMinutes) {
      push("durationMinutes", String(series.durationMinutes), String(patch.durationMinutes));
      series.durationMinutes = patch.durationMinutes;
    }
    if (patch.providerStaffId && patch.providerStaffId !== series.providerStaffId) {
      push("providerStaffId", series.providerStaffId, patch.providerStaffId);
      series.providerStaffId = patch.providerStaffId;
    }
    if (patch.locationId !== undefined && patch.locationId !== (series.locationId ?? null)) {
      push("locationId", series.locationId ?? "—", patch.locationId ?? "—");
      if (patch.locationId) series.locationId = patch.locationId;
    }
    if (patch.resourceId !== undefined && patch.resourceId !== (series.resourceId ?? null)) {
      push("resourceId", series.resourceId ?? "—", patch.resourceId ?? "—");
      series.resourceId = patch.resourceId ?? null;
    }

    series.patternEffectiveDate = effectiveDate;
    series.autoGenerate = true;
    series.updatedAt = nowIso();
    series.updatedBy = actorStaffId;

    /* ---- move the already-generated future occurrences to match ---- */
    let updated = 0;
    targets.forEach((target) => {
      const perOccurrence = {
        ...(shift !== 0 ? { date: addDays(target.date, shift) } : {}),
        ...(patch.startTime ? { startTime: patch.startTime } : {}),
        ...(patch.durationMinutes ? { durationMinutes: patch.durationMinutes } : {}),
        ...(patch.providerStaffId ? { providerStaffId: patch.providerStaffId } : {}),
        ...(patch.locationId !== undefined ? { locationId: patch.locationId } : {}),
        ...(patch.resourceId !== undefined ? { resourceId: patch.resourceId } : {}),
      };
      repository.rescheduleAppointment(
        target.id,
        perOccurrence,
        actorStaffId,
        reason ?? "Recurring pattern changed — this and future occurrences",
      );
      updated += 1;
    });

    if (series.generatedThroughDate && shift !== 0) {
      series.generatedThroughDate = addDays(series.generatedThroughDate, shift);
    }

    return { ok: true, series, occurrencesUpdated: updated, changes };
  });
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface SeriesEndResult {
  ok: boolean;
  reason?: string;
  removedOccurrences: number;
  keptWithOutcome: number;
}

/**
 * Ends a recurring schedule effective a date. Administrative action:
 *  - the definition is marked ended and stops generating,
 *  - future occurrences that never happened are removed from the calendar,
 *  - occurrences that already have an outcome are kept exactly as they are,
 *  - NO cancellation status is applied and NO make-up credit is issued.
 */
export function endSeriesFrom(
  seriesId: ID,
  effectiveDate: ISODate,
  actorStaffId: ID,
  reason?: string,
): SeriesEndResult {
  return mutate((data): SeriesEndResult => {
    const series = data.recurringAppointments.find((r) => r.id === seriesId);
    if (!series) return { ok: false, reason: "Series not found", removedOccurrences: 0, keptWithOutcome: 0 };

    const fromDate = effectiveDate;
    const affected = data.appointments.filter(
      (a) => a.recurringAppointmentId === seriesId && a.date >= fromDate,
    );
    const removable = affected.filter((a) => PENDING_STATUSES.includes(a.status));
    const removableIds = new Set(removable.map((a) => a.id));
    data.appointments = data.appointments.filter((a) => !removableIds.has(a.id));
    data.appointmentStatusHistory = data.appointmentStatusHistory.filter(
      (h) => !removableIds.has(h.appointmentId),
    );

    const previousStatus = series.status;
    series.status = "ended";
    series.isActive = false;
    series.autoGenerate = false;
    series.endDate = addDays(fromDate, -1);
    series.updatedAt = nowIso();
    series.updatedBy = actorStaffId;

    recordChange({
      seriesId,
      actorStaffId,
      effectiveDate: fromDate,
      scope: "series_end",
      field: "status",
      previousValue: previousStatus,
      newValue: "ended",
      ...(reason ? { reason } : {}),
      occurrencesAffected: removable.length,
    });

    return {
      ok: true,
      removedOccurrences: removable.length,
      keptWithOutcome: affected.length - removable.length,
    };
  });
}

/* ------------------------------- pause ---------------------------------- */

export interface SeriesPauseResult {
  ok: boolean;
  reason?: string;
  removedOccurrences: number;
  participantsRemoved: number;
  keptWithOutcome: number;
}

/** Clients whose schedule this series represents. */
function seriesClientIds(series: RecurringAppointment): ID[] {
  return series.participantClientIds?.length
    ? Array.from(new Set(series.participantClientIds))
    : [series.clientId];
}

/**
 * Pauses a recurring schedule for a defined window.
 *
 * ADMINISTRATIVE ONLY. Not-yet-delivered occurrences inside the window are
 * removed from the calendar; nothing is marked cancelled, no attendance
 * outcome is written and NO make-up credit is issued, returned or forfeited.
 * Occurrences that already carry an outcome are left untouched, as is every
 * appointment before the pause start.
 *
 * On a shared session that also carries clients from OTHER schedules, only the
 * paused clients are detached — the remaining participants keep their session,
 * their statuses and their make-up history exactly as they were.
 */
export function pauseSeries(
  seriesId: ID,
  pauseStartDate: ISODate,
  resumeDate: ISODate,
  actorStaffId: ID,
  reason?: string,
): SeriesPauseResult {
  return mutate((data): SeriesPauseResult => {
    const series = data.recurringAppointments.find((r) => r.id === seriesId);
    if (!series)
      return { ok: false, reason: "Series not found", removedOccurrences: 0, participantsRemoved: 0, keptWithOutcome: 0 };
    if (resumeDate <= pauseStartDate)
      return {
        ok: false,
        reason: "The resume date must be after the pause start date.",
        removedOccurrences: 0,
        participantsRemoved: 0,
        keptWithOutcome: 0,
      };

    const pausedClients = new Set(seriesClientIds(series));
    const inWindow = data.appointments.filter(
      (a) =>
        a.recurringAppointmentId === seriesId &&
        a.date >= pauseStartDate &&
        a.date < resumeDate,
    );
    const pending = inWindow.filter((a) => PENDING_STATUSES.includes(a.status));

    let removed = 0;
    let detached = 0;
    const removeIds = new Set<ID>();

    pending.forEach((appointment) => {
      const attached = appointment.participantClientIds?.length
        ? appointment.participantClientIds
        : [appointment.clientId];
      const remaining = attached.filter((id) => !pausedClients.has(id));

      if (remaining.length === 0) {
        removeIds.add(appointment.id);
        removed += 1;
        return;
      }

      /* Shared session with someone else's clients: detach only ours. */
      appointment.participantClientIds = remaining;
      if (appointment.participants) {
        appointment.participants = appointment.participants.filter(
          (p) => !pausedClients.has(p.clientId),
        );
      }
      if (pausedClients.has(appointment.clientId)) appointment.clientId = remaining[0]!;
      appointment.updatedAt = nowIso();
      detached += 1;
    });

    if (removeIds.size) {
      data.appointments = data.appointments.filter((a) => !removeIds.has(a.id));
      data.appointmentStatusHistory = data.appointmentStatusHistory.filter(
        (h) => !removeIds.has(h.appointmentId),
      );
    }

    const previousStatus = series.status;
    series.status = "paused";
    series.isActive = false;
    series.autoGenerate = true;
    series.pauseStartDate = pauseStartDate;
    series.resumeDate = resumeDate;
    series.pauseReason = reason ?? null;
    series.updatedAt = nowIso();
    series.updatedBy = actorStaffId;

    recordChange({
      seriesId,
      actorStaffId,
      effectiveDate: pauseStartDate,
      scope: "series_pause",
      field: "pause",
      previousValue: previousStatus,
      newValue: `paused ${pauseStartDate} → resumes ${resumeDate}`,
      ...(reason ? { reason } : {}),
      occurrencesAffected: removed + detached,
    });

    return {
      ok: true,
      removedOccurrences: removed,
      participantsRemoved: detached,
      keptWithOutcome: inWindow.length - pending.length,
    };
  });
}

/**
 * Ends a pause. Generation restarts from the CURRENT pattern — including any
 * permanent day/time/provider/location change made before or during the pause.
 */
export function resumeSeries(
  seriesId: ID,
  actorStaffId: ID,
  reason?: string,
  fromDate?: ISODate,
): RecurringAppointment | undefined {
  const series = mutate((data) => {
    const found = data.recurringAppointments.find((r) => r.id === seriesId);
    if (!found) return undefined;
    const previous = found.pauseStartDate
      ? `paused ${found.pauseStartDate} → ${found.resumeDate ?? "—"}`
      : found.status;
    const effective = fromDate ?? found.resumeDate ?? DEMO_TODAY;
    found.status = "active";
    found.isActive = true;
    found.autoGenerate = true;
    found.pauseStartDate = null;
    found.resumeDate = null;
    found.pauseReason = null;
    found.updatedAt = nowIso();
    found.updatedBy = actorStaffId;
    recordChange({
      seriesId,
      actorStaffId,
      effectiveDate: effective,
      scope: "series_resume",
      field: "pause",
      previousValue: previous,
      newValue: `resumed ${effective}`,
      ...(reason ? { reason } : {}),
    });
    return found;
  });
  if (series) generateSeriesOccurrences(seriesId, { actorStaffId });
  return series;
}

/** Automatic resume once the resume date arrives. */
export function autoResumeDueSeries(today: ISODate = DEMO_TODAY): number {
  const due = getDataset().recurringAppointments.filter(
    (r) => r.status === "paused" && r.resumeDate && r.resumeDate <= today,
  );
  due.forEach((r) =>
    resumeSeries(r.id, r.updatedBy ?? r.createdBy ?? "system", "Pause window ended", r.resumeDate!),
  );
  return due.length;
}


/* ------------------------ participant-level pause ----------------------- */

export interface ParticipantPauseResult {
  ok: boolean;
  reason?: string;
  occurrencesUpdated: number;
}

export function participantPauses(series?: RecurringAppointment | null): RecurringParticipantPause[] {
  return series?.participantPauses ?? [];
}

export function activeParticipantPause(
  series: RecurringAppointment | null | undefined,
  clientId: ID,
): RecurringParticipantPause | undefined {
  return participantPauses(series).find((p) => p.clientId === clientId);
}

/** True when this client is on a participant-level hold covering `date`. */
export function participantPausedOn(
  series: RecurringAppointment,
  clientId: ID,
  date: ISODate,
): boolean {
  return participantPauses(series).some(
    (p) => p.clientId === clientId && date >= p.pauseStartDate && date < p.resumeDate,
  );
}

function detachClient(appointment: Appointment, clientId: ID): boolean {
  const attached = appointment.participantClientIds?.length
    ? appointment.participantClientIds
    : [appointment.clientId];
  if (!attached.includes(clientId)) return false;
  const remaining = attached.filter((id) => id !== clientId);
  if (remaining.length === 0) return false; // never empty a session here
  appointment.participantClientIds = remaining;
  if (appointment.participants) {
    appointment.participants = appointment.participants.filter((p) => p.clientId !== clientId);
  }
  if (appointment.clientId === clientId) appointment.clientId = remaining[0]!;
  appointment.updatedAt = nowIso();
  return true;
}

/**
 * Pauses ONE client on a shared recurring schedule.
 *
 * Administrative only: the client is detached from not-yet-delivered shared
 * occurrences inside the window. Every other participant keeps their seat,
 * status and history; nothing is marked cancelled and no make-up credit is
 * created, returned, consumed or forfeited. The pattern (day, time, trainer,
 * location, service, Ends: Never) is untouched.
 */
export function pauseSeriesParticipant(
  seriesId: ID,
  clientId: ID,
  pauseStartDate: ISODate,
  resumeDate: ISODate,
  actorStaffId: ID,
  reason?: string,
): ParticipantPauseResult {
  return mutate((data): ParticipantPauseResult => {
    const series = data.recurringAppointments.find((r) => r.id === seriesId);
    if (!series) return { ok: false, reason: "Series not found", occurrencesUpdated: 0 };
    if (resumeDate <= pauseStartDate)
      return {
        ok: false,
        reason: "The resume date must be after the pause start date.",
        occurrencesUpdated: 0,
      };
    const clients = seriesClientIds(series);
    if (!clients.includes(clientId))
      return { ok: false, reason: "That client is not on this schedule.", occurrencesUpdated: 0 };
    if (clients.length < 2)
      return {
        ok: false,
        reason:
          "This schedule has one client, so pausing them is the same as pausing the schedule. Use Pause schedule instead.",
        occurrencesUpdated: 0,
      };
    if (activeParticipantPause(series, clientId))
      return {
        ok: false,
        reason: "This client is already paused on this schedule.",
        occurrencesUpdated: 0,
      };

    let updated = 0;
    data.appointments.forEach((a) => {
      if (
        a.recurringAppointmentId !== seriesId ||
        a.date < pauseStartDate ||
        a.date >= resumeDate ||
        !PENDING_STATUSES.includes(a.status)
      )
        return;
      if (detachClient(a, clientId)) updated += 1;
    });

    series.participantPauses = [
      ...participantPauses(series),
      {
        clientId,
        pauseStartDate,
        resumeDate,
        reason: reason ?? null,
        createdBy: actorStaffId,
        createdAt: nowIso(),
      },
    ];
    series.updatedAt = nowIso();
    series.updatedBy = actorStaffId;

    recordChange({
      seriesId,
      actorStaffId,
      effectiveDate: pauseStartDate,
      scope: "participant_pause",
      field: "participant_pause",
      previousValue: `${clientId} attending`,
      newValue: `${clientId} paused ${pauseStartDate} → rejoins ${resumeDate}`,
      ...(reason ? { reason } : {}),
      occurrencesAffected: updated,
    });

    return { ok: true, occurrencesUpdated: updated };
  });
}

/** Attach a client back onto pending occurrences of the series from a date. */
function reattachClient(seriesId: ID, clientId: ID, fromDate: ISODate): number {
  return mutate((data) => {
    const series = data.recurringAppointments.find((r) => r.id === seriesId);
    if (!series) return 0;
    const service = data.services.find((s) => s.id === series.serviceId) ?? null;
    const capacity = sessionCapacity(service);
    let updated = 0;
    data.appointments.forEach((a) => {
      if (
        a.recurringAppointmentId !== seriesId ||
        a.date < fromDate ||
        !PENDING_STATUSES.includes(a.status)
      )
        return;
      const attached = a.participantClientIds?.length
        ? a.participantClientIds
        : [a.clientId];
      if (attached.includes(clientId)) return;
      if (attached.length >= capacity) return; // never displace an existing participant
      a.participantClientIds = [...attached, clientId];
      a.updatedAt = nowIso();
      updated += 1;
    });
    return updated;
  });
}

/**
 * Ends a participant-level pause (automatically on the resume date, or early
 * via "Resume now"). The client rejoins upcoming occurrences from the
 * effective date forward; nobody else is affected.
 */
export function resumeSeriesParticipant(
  seriesId: ID,
  clientId: ID,
  actorStaffId: ID,
  reason?: string,
  fromDate?: ISODate,
): ParticipantPauseResult {
  const effective = mutate((data) => {
    const series = data.recurringAppointments.find((r) => r.id === seriesId);
    if (!series) return null;
    const pause = participantPauses(series).find((p) => p.clientId === clientId);
    if (!pause) return null;
    const when = fromDate ?? DEMO_TODAY;
    series.participantPauses = participantPauses(series).filter((p) => p !== pause);
    series.updatedAt = nowIso();
    series.updatedBy = actorStaffId;
    recordChange({
      seriesId,
      actorStaffId,
      effectiveDate: when,
      scope: "participant_resume",
      field: "participant_pause",
      previousValue: `${clientId} paused ${pause.pauseStartDate} → ${pause.resumeDate}`,
      newValue: `${clientId} rejoined ${when}`,
      ...(reason ? { reason } : {}),
    });
    return when;
  });
  if (!effective) return { ok: false, reason: "No active pause for that client.", occurrencesUpdated: 0 };
  generateSeriesOccurrences(seriesId, { actorStaffId });
  const updated = reattachClient(seriesId, clientId, effective);
  return { ok: true, occurrencesUpdated: updated };
}

/** Automatic rejoin once a participant's resume date arrives. */
export function autoResumeDueParticipants(today: ISODate = DEMO_TODAY): number {
  let count = 0;
  getDataset().recurringAppointments.forEach((series) => {
    participantPauses(series)
      .filter((p) => p.resumeDate <= today)
      .forEach((p) => {
        resumeSeriesParticipant(
          series.id,
          p.clientId,
          series.updatedBy ?? series.createdBy ?? "system",
          "Participant pause window ended",
          p.resumeDate,
        );
        count += 1;
      });
  });
  return count;
}

/* -------------------------- occurrence generation ----------------------- */

/** Rolling window kept ahead of today for every persistent schedule (~26 weeks). */
export const GENERATION_HORIZON_DAYS = 182;

function buildOccurrence(series: RecurringAppointment, date: ISODate, actorStaffId: ID): Appointment {
  const service = getDataset().services.find((s) => s.id === series.serviceId);
  const documentationRequired = service?.requiresDocumentation ?? true;
  /* A participant on a personal hold is simply not attached to that date. */
  const attending = seriesClientIds(series).filter(
    (id) => !participantPausedOn(series, id, date),
  );
  const primary = attending.includes(series.clientId) ? series.clientId : (attending[0] ?? series.clientId);
  return {
    id: nextId("apt"),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    archivedAt: null,
    createdBy: actorStaffId,
    clientId: primary,
    ...(series.participantClientIds?.length ? { participantClientIds: attending } : {}),
    serviceId: series.serviceId,
    providerStaffId: series.providerStaffId,
    ...(series.locationId ? { locationId: series.locationId } : {}),
    ...(series.resourceId ? { resourceId: series.resourceId } : {}),
    recurringAppointmentId: series.id,
    date,
    startTime: series.startTime,
    endTime: endTimeFor(series.startTime, series.durationMinutes),
    durationMinutes: series.durationMinutes,
    status: "scheduled",
    attendanceStatus: "pending",
    documentationRequired,
    documentationStatus: documentationRequired ? "pending" : "not_required",
    superbillRequestStatus: "not_requested",
    appointmentType: series.appointmentType ?? "in_person",
    syncStatus: "not_synced",
  } as Appointment;
}

/**
 * Generates missing occurrences for one series, following the CURRENT pattern.
 * Idempotent: a date already carrying an occurrence of this series is skipped,
 * so nothing is duplicated and nothing historical is recreated.
 */
export function generateSeriesOccurrences(
  seriesId: ID,
  options: { throughDate?: ISODate; fromDate?: ISODate; actorStaffId?: ID } = {},
): Appointment[] {
  return mutate((data) => {
    const series = data.recurringAppointments.find((r) => r.id === seriesId);
    if (!series || series.frequency === "custom") return [];
    if (series.status !== "active" && series.status !== "paused") return [];

    const actorStaffId = options.actorStaffId ?? series.updatedBy ?? series.createdBy ?? "system";
    const today = options.fromDate ?? DEMO_TODAY;
    const through = options.throughDate ?? addDays(today, GENERATION_HORIZON_DAYS);
    const base = series.anchorDate ?? series.startDate;

    /*
     * A slot counts as taken by its PATTERN date, not the date the appointment
     * currently sits on. An occurrence moved by a single-occurrence reschedule
     * keeps its pattern date, so its original slot is never regenerated.
     */
    const existing = new Set(
      data.appointments
        .filter((a) => a.recurringAppointmentId === series.id)
        .map((a) => a.seriesPatternDate ?? a.date),
    );

    const created: Appointment[] = [];
    let date = base;
    /* Walk the pattern forward from its anchor; never generate into the past. */
    let guard = 0;
    while (date <= through && guard < 400) {
      guard += 1;
      const afterStart = date >= today;
      const beforeEnd = !series.endDate || date <= series.endDate;
      /* A pause window generates nothing; the pattern picks up on resume. */
      const paused =
        !!series.pauseStartDate &&
        date >= series.pauseStartDate &&
        (!series.resumeDate || date < series.resumeDate);
      const everyoneOnHold = seriesClientIds(series).every((id) =>
        participantPausedOn(series, id, date),
      );
      if (afterStart && beforeEnd && !paused && !everyoneOnHold && !existing.has(date)) {
        const appointment = buildOccurrence(series, date, actorStaffId);
        data.appointments.push(appointment);
        existing.add(date);
        created.push(appointment);
      }
      date = nextPatternDate(date, series.frequency);
    }

    if (created.length) {
      series.generatedThroughDate = through;
      series.updatedAt = nowIso();
    }
    return created;
  });
}

/**
 * Keeps every auto-generating active series stocked with future occurrences.
 * Called after the demo data loads, which is what proves the pattern — not the
 * pre-generated rows — is the source of truth for future appointments.
 */
/**
 * A dated schedule closes itself once its final occurrence is in the past.
 * Purely a status change — no appointments and no credits are touched.
 */
export function autoEndFinishedSeries(today: ISODate = DEMO_TODAY): number {
  return mutate((data) => {
    let ended = 0;
    data.recurringAppointments.forEach((r) => {
      if (r.status !== "active" || !r.endDate || r.endDate >= today) return;
      const pending = data.appointments.some(
        (a) =>
          a.recurringAppointmentId === r.id &&
          a.date >= today &&
          PENDING_STATUSES.includes(a.status),
      );
      if (pending) return;
      r.status = "ended";
      r.isActive = false;
      r.autoGenerate = false;
      r.updatedAt = nowIso();
      ended += 1;
    });
    return ended;
  });
}

export function maintainRecurringSeries(throughDate?: ISODate): number {
  /* A pause whose resume date has arrived restarts on its own. */
  autoResumeDueSeries();
  autoResumeDueParticipants();
  autoEndFinishedSeries();
  const series = getDataset().recurringAppointments.filter(
    (r) => r.autoGenerate && (r.status === "active" || r.status === "paused"),
  );
  return series.reduce(
    (count, s) =>
      count + generateSeriesOccurrences(s.id, throughDate ? { throughDate } : {}).length,
    0,
  );
}
