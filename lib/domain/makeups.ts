/**
 * MAKEUP LEDGER.
 *
 * Makeups are independently trackable records — never text on an appointment.
 * All policy decisions come from `scheduling-policy.ts`; this module only
 * persists and queries the ledger.
 *
 * Guarantees enforced here:
 *  - Idempotent issuance: one eligible cancelled appointment issues at most
 *    one makeup, no matter how many times its status is toggled.
 *  - Single redemption: a makeup may be used exactly once.
 *  - Expiration is derived from the ORIGINAL absence date and expired makeups
 *    can never be redeemed. Expired records are retained for reporting.
 */

import { getDataset, mutate, nextId, nowIso } from "./store";
import { appointmentIncludesClient } from "./sessions";
import {
  MAKEUP_EXPIRY_DAYS,
  makeupExpirationDate,
  serviceIsMakeupEligible,
} from "./scheduling-policy";
import type {
  Appointment,
  ID,
  ISODate,
  MakeupCredit,
  MakeupEventKind,
  Service,
} from "./types";

export { MAKEUP_EXPIRY_DAYS };

function audit(id: ID) {
  return { id, createdAt: nowIso(), updatedAt: nowIso(), archivedAt: null };
}

/**
 * Append-only audit trail. Recording an event never changes policy — it only
 * documents what already happened to the credit.
 */
export function logMakeupEvent(
  makeup: MakeupCredit,
  kind: MakeupEventKind,
  detail: string,
  staffId?: ID | null,
  appointmentId?: ID | null,
) {
  makeup.events = [
    ...(makeup.events ?? []),
    { kind, occurredAt: nowIso(), staffId: staffId ?? null, appointmentId: appointmentId ?? null, detail },
  ];
}

function today(): ISODate {
  return new Date().toISOString().slice(0, 10);
}

/** Lazily marks lapsed makeups expired. Records are kept, never deleted. */
export function sweepExpiredMakeups(reference: ISODate = today()) {
  const data = getDataset();
  let changed = 0;
  data.makeupCredits.forEach((m) => {
    if (m.status === "available" && m.expirationDate < reference) {
      m.status = "expired";
      m.updatedAt = nowIso();
      logMakeupEvent(m, "expired", `Expired on ${m.expirationDate} (90 days from the original absence).`);
      changed += 1;
    }
  });
  return changed;
}

export function listMakeups(clientId?: ID): MakeupCredit[] {
  sweepExpiredMakeups();
  return getDataset()
    .makeupCredits.filter((m) => !clientId || m.clientId === clientId)
    .sort((a, b) => b.originalAbsenceDate.localeCompare(a.originalAbsenceDate));
}

export function getMakeup(id?: ID | null) {
  return id ? getDataset().makeupCredits.find((m) => m.id === id) : undefined;
}

/** Available, unexpired makeups — oldest expiration first (use these first). */
export function availableMakeups(clientId: ID, serviceId?: ID | null): MakeupCredit[] {
  return listMakeups(clientId)
    .filter((m) => m.status === "available" && m.expirationDate >= today())
    .filter((m) => !serviceId || true) // makeups are not service-locked; source service is informational
    .sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));
}

export function makeupSummary(clientId: ID) {
  const all = listMakeups(clientId);
  return {
    available: all.filter((m) => m.status === "available").length,
    used: all.filter((m) => m.status === "used").length,
    expired: all.filter((m) => m.status === "expired").length,
    voided: all.filter((m) => m.status === "voided").length,
    all,
  };
}

/**
 * The makeup already issued for this appointment, if any. On a shared session
 * each participant earns their own credit, so pass `clientId` to scope the
 * lookup to one participant.
 */
export function makeupForSourceAppointment(appointmentId: ID, clientId?: ID) {
  return getDataset().makeupCredits.find(
    (m) =>
      m.sourceAppointmentId === appointmentId &&
      m.status !== "voided" &&
      (!clientId || m.clientId === clientId),
  );
}

export interface IssueMakeupResult {
  makeup?: MakeupCredit;
  created: boolean;
  reason?: string;
}

/**
 * Idempotently issue the single makeup an early-cancelled appointment earns.
 * Re-running for the same appointment/client returns the existing record.
 * On shared sessions only the cancelling participant is credited.
 */
export function issueMakeupForAppointment(
  appointment: Appointment,
  service: Service | undefined,
  actorStaffId: ID,
  clientId: ID = appointment.clientId,
): IssueMakeupResult {
  if (!serviceIsMakeupEligible(service)) {
    return { created: false, reason: "Service is not makeup-eligible." };
  }
  const existing = makeupForSourceAppointment(appointment.id, clientId);
  if (existing) return { makeup: existing, created: false, reason: "Makeup already issued." };

  return mutate((data) => {
    const makeup: MakeupCredit = {
      ...audit(nextId("mk")),
      createdBy: actorStaffId,
      clientId,
      sourceAppointmentId: appointment.id,
      sourceServiceId: appointment.serviceId,
      sourceProviderStaffId: appointment.providerStaffId,
      originalAbsenceDate: appointment.date,
      originalAbsenceStartTime: appointment.startTime,
      issuedDate: today(),
      issuedByStaffId: actorStaffId,
      expirationDate: makeupExpirationDate(appointment.date),
      status: "available",
      usedDate: null,
      redeemedAppointmentId: null,
      notes: `Issued automatically on ${appointment.status === "cancelled" ? "a studio/provider cancellation" : "Early Cancel"} (${MAKEUP_EXPIRY_DAYS}-day expiry from the original session date).`,
    };
    logMakeupEvent(
      makeup,
      "issued",
      `Issued for ${appointment.status === "cancelled" ? "a studio/provider cancellation" : "an Early Cancel"} of the ${appointment.date} session — valid ${MAKEUP_EXPIRY_DAYS} days, expiring ${makeup.expirationDate}.`,
      actorStaffId,
      appointment.id,
    );
    data.makeupCredits.push(makeup);
    const source = data.appointments.find((a) => a.id === appointment.id);
    if (source) {
      const participant = source.participants?.find((p) => p.clientId === clientId);
      if (participant) {
        participant.issuedMakeupCreditId = makeup.id;
        participant.makeupEligibility = "issued";
        participant.updatedAt = nowIso();
      }
      if (clientId === source.clientId) {
        source.issuedMakeupCreditId = makeup.id;
        source.makeupEligibility = "issued";
      }
      source.updatedAt = nowIso();
    }
    return { makeup, created: true };
  });
}


export type RedeemResult =
  | { ok: true; makeup: MakeupCredit }
  | { ok: false; reason: string };

/** Redeem exactly one available, unexpired makeup against an appointment. */
export function redeemMakeup(makeupId: ID, appointmentId: ID, actorStaffId: ID): RedeemResult {
  return mutate((data) => {
    const makeup = data.makeupCredits.find((m) => m.id === makeupId);
    if (!makeup) return { ok: false as const, reason: "Makeup not found." };
    if (makeup.status === "used") return { ok: false as const, reason: "This makeup has already been used." };
    if (makeup.status === "voided") return { ok: false as const, reason: "This makeup was voided." };
    if (makeup.status === "expired" || makeup.expirationDate < today()) {
      makeup.status = "expired";
      return { ok: false as const, reason: `This makeup expired on ${makeup.expirationDate} and cannot be redeemed.` };
    }
    const appointment = data.appointments.find((a) => a.id === appointmentId);
    if (!appointment) return { ok: false as const, reason: "Appointment not found." };
    if (!appointmentIncludesClient(appointment, makeup.clientId)) {
      return { ok: false as const, reason: "Makeup belongs to a different client." };
    }
    if (appointment.makeupCreditId) {
      return { ok: false as const, reason: "A makeup is already applied to this appointment." };
    }

    makeup.status = "used";
    makeup.usedDate = today();
    makeup.redeemedAppointmentId = appointmentId;
    makeup.redeemedByStaffId = actorStaffId;
    makeup.updatedAt = nowIso();

    appointment.makeupCreditId = makeup.id;
    appointment.updatedAt = nowIso();
    appointment.updatedBy = actorStaffId;
    logMakeupEvent(
      makeup,
      "redeemed",
      `Redeemed against the ${appointment.date} ${appointment.startTime} appointment.`,
      actorStaffId,
      appointmentId,
    );

    return { ok: true as const, makeup };
  });
}

/**
 * Undo a redemption. Used when a make-up appointment is cancelled, deleted, or
 * was marked as a make-up by mistake. The credit returns to the ledger as
 * `available` — or `expired` if its 90-day window has since lapsed — so no
 * credit is silently destroyed or resurrected past its expiry.
 */
export function releaseMakeupForAppointment(appointmentId: ID, actorStaffId: ID): RedeemResult {
  return mutate((data) => {
    const appointment = data.appointments.find((a) => a.id === appointmentId);
    const makeupId = appointment?.makeupCreditId;
    const makeup =
      data.makeupCredits.find((m) => m.id === makeupId) ??
      data.makeupCredits.find((m) => m.redeemedAppointmentId === appointmentId);
    if (!makeup) return { ok: false as const, reason: "No makeup is applied to this appointment." };
    if (makeup.status === "voided") {
      return { ok: false as const, reason: "This makeup was voided and cannot be returned." };
    }

    makeup.status = makeup.expirationDate < today() ? "expired" : "available";
    logMakeupEvent(
      makeup,
      "released",
      makeup.status === "expired"
        ? `Released from appointment ${appointmentId}, but the credit had already expired on ${makeup.expirationDate}.`
        : `Released from appointment ${appointmentId} and returned to the client's available balance.`,
      actorStaffId,
      appointmentId,
    );
    makeup.usedDate = null;
    makeup.redeemedAppointmentId = null;
    makeup.redeemedByStaffId = null;
    makeup.updatedAt = nowIso();

    if (appointment) {
      appointment.makeupCreditId = null;
      appointment.updatedAt = nowIso();
      appointment.updatedBy = actorStaffId;
    }
    return { ok: true as const, makeup };
  });
}

/**
 * Release a make-up that ONE participant of a shared session had applied.
 * Only that participant's credit is returned; nobody else is affected.
 */
export function releaseMakeupForParticipant(
  appointmentId: ID,
  participant: { clientId: ID; makeupCreditId?: ID | null },
  actorStaffId: ID,
): RedeemResult {
  return mutate((data) => {
    const makeup =
      data.makeupCredits.find((m) => m.id === participant.makeupCreditId) ??
      data.makeupCredits.find(
        (m) => m.redeemedAppointmentId === appointmentId && m.clientId === participant.clientId,
      );
    if (!makeup) return { ok: false as const, reason: "No makeup is applied for this participant." };
    if (makeup.status === "voided") {
      return { ok: false as const, reason: "This makeup was voided and cannot be returned." };
    }
    makeup.status = makeup.expirationDate < today() ? "expired" : "available";
    logMakeupEvent(
      makeup,
      "released",
      makeup.status === "expired"
        ? `Released from session ${appointmentId}, but the credit had already expired on ${makeup.expirationDate}.`
        : `Released from session ${appointmentId} and returned to the client's available balance.`,
      actorStaffId,
      appointmentId,
    );
    makeup.usedDate = null;
    makeup.redeemedAppointmentId = null;
    makeup.redeemedByStaffId = null;
    makeup.updatedAt = nowIso();
    participant.makeupCreditId = null;
    return { ok: true as const, makeup };
  });
}

/** Authorised correction. The record is retained with an accountable reason. */
export function voidMakeup(makeupId: ID, reason: string, actorStaffId: ID): RedeemResult {
  return mutate((data) => {
    const makeup = data.makeupCredits.find((m) => m.id === makeupId);
    if (!makeup) return { ok: false as const, reason: "Makeup not found." };
    if (makeup.status === "used") {
      return { ok: false as const, reason: "A redeemed makeup cannot be voided — reverse the redemption first." };
    }
    makeup.status = "voided";
    logMakeupEvent(makeup, "voided", `Voided by leadership — ${reason}`, actorStaffId);
    makeup.voidedReason = reason;
    makeup.voidedByStaffId = actorStaffId;
    makeup.updatedAt = nowIso();
    return { ok: true as const, makeup };
  });
}

/**
 * Late Cancel / No Show forfeits a redeemed make-up. The credit stays `used`
 * (release logic is unchanged); this only records why it never came back.
 */
export function recordMakeupForfeited(appointmentId: ID, statusLabel: string, actorStaffId: ID) {
  return mutate((data) => {
    const makeup = data.makeupCredits.find((m) => m.redeemedAppointmentId === appointmentId);
    if (!makeup) return undefined;
    logMakeupEvent(
      makeup,
      "forfeited",
      `Forfeited — the make-up appointment was marked ${statusLabel}. The credit does not return to the client's balance.`,
      actorStaffId,
      appointmentId,
    );
    makeup.updatedAt = nowIso();
    return makeup;
  });
}

export const MAKEUP_EVENT_LABELS: Record<MakeupEventKind, string> = {
  issued: "Issued",
  redeemed: "Redeemed",
  released: "Released",
  forfeited: "Forfeited",
  expired: "Expired",
  voided: "Voided",
};

export const MAKEUP_STATUS_LABELS: Record<string, string> = {
  available: "Available",
  used: "Used",
  expired: "Expired",
  voided: "Voided",
};
