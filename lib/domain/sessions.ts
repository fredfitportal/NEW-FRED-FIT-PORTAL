/**
 * Shared-session helpers.
 *
 * Partner, Trio, APPARATIX and group formats are ONE session record attended
 * by several clients. `participantClientIds` holds every attached client
 * (primary included); one-client appointments leave it unset.
 *
 * Each attached client also has their own status: a participant may Early
 * Cancel while everyone else stays scheduled. `appointment.participants` holds
 * those rows; when it is absent the appointment-level status is the
 * participant's status (ordinary one-client appointments).
 *
 * Presentation, attendance, reporting and client-scoped lookups must go
 * through these helpers so a participant is never lost or mis-stated just
 * because they are not the primary client.
 */

import type {
  Appointment,
  AppointmentParticipant,
  AppointmentStatus,
  AttendanceStatus,
  ID,
  Service,
} from "./types";

/** Statuses that mean the client is no longer attending the session. */
export const NON_ATTENDING_STATUSES: AppointmentStatus[] = [
  "early_cancel",
  "late_cancel",
  "cancelled",
  "no_show",
  "rescheduled",
];

export function appointmentClientIds(appointment: Appointment): ID[] {
  const ids = appointment.participantClientIds?.length
    ? appointment.participantClientIds
    : [appointment.clientId];
  return Array.from(new Set(ids));
}

export function isSharedSession(appointment: Appointment): boolean {
  return appointmentClientIds(appointment).length > 1;
}

export function appointmentIncludesClient(appointment: Appointment, clientId: ID): boolean {
  return appointmentClientIds(appointment).includes(clientId);
}

/**
 * Normalised participant rows. Any client without a stored row inherits the
 * session-level status, so legacy and imported data read correctly.
 */
export function sessionParticipants(appointment: Appointment): AppointmentParticipant[] {
  return appointmentClientIds(appointment).map((clientId) => {
    const stored = appointment.participants?.find((p) => p.clientId === clientId);
    if (stored) return stored;
    return {
      clientId,
      status: appointment.status,
      attendanceStatus: appointment.attendanceStatus,
      cancelledAt: appointment.cancelledAt ?? null,
      cancellationNoticeHours: appointment.cancellationNoticeHours ?? null,
      ...(appointment.cancellationReason ? { cancellationReason: appointment.cancellationReason } : {}),
      completedAt: appointment.completedAt ?? null,
      ...(appointment.sessionForfeited !== undefined
        ? { sessionForfeited: appointment.sessionForfeited }
        : {}),
      ...(appointment.makeupEligibility !== undefined
        ? { makeupEligibility: appointment.makeupEligibility }
        : {}),
      issuedMakeupCreditId: appointment.issuedMakeupCreditId ?? null,
      makeupCreditId: appointment.makeupCreditId ?? null,
    } satisfies AppointmentParticipant;
  });
}

export function participantFor(
  appointment: Appointment,
  clientId: ID,
): AppointmentParticipant | undefined {
  return sessionParticipants(appointment).find((p) => p.clientId === clientId);
}

/** The status that applies to ONE client in this session. */
export function clientStatusFor(appointment: Appointment, clientId: ID): AppointmentStatus {
  return participantFor(appointment, clientId)?.status ?? appointment.status;
}

export function clientAttendanceFor(appointment: Appointment, clientId: ID): AttendanceStatus {
  return participantFor(appointment, clientId)?.attendanceStatus ?? appointment.attendanceStatus;
}

/** Participants still holding a seat (used for capacity after cancellations). */
export function activeParticipants(appointment: Appointment): AppointmentParticipant[] {
  return sessionParticipants(appointment).filter(
    (p) => !NON_ATTENDING_STATUSES.includes(p.status),
  );
}

export function activeParticipantCount(appointment: Appointment): number {
  return activeParticipants(appointment).length;
}

/* ------------------------------------------------------------------ */
/* Seat capacity for shared formats (Partner = 2, Trio = 3, …)         */
/* ------------------------------------------------------------------ */

/**
 * How many clients one session of this service may hold. Configuration on the
 * service record is the source of truth — never hard-code "2" in the UI.
 */
export function sessionCapacity(service?: Service | null): number {
  if (!service) return 1;
  if (service.clientCapacity) return service.clientCapacity;
  switch (service.sessionFormat) {
    case "partner":
      return 2;
    case "trio":
      return 3;
    case "group":
      return service.classCapacity ?? 1;
    default:
      return 1;
  }
}

/** True when the shared session still has a free seat for another client. */
export function hasOpenSeat(appointment: Appointment, service?: Service | null): boolean {
  return appointmentClientIds(appointment).length < sessionCapacity(service);
}
