/**
 * SELLABLE CAPACITY ENGINE.
 *
 * A calendar opening is an apparently empty time. Sellable capacity is a valid
 * appointment opportunity that survives every check: eligible provider,
 * configured availability, no appointment conflict, no blocked time, the right
 * location, an available room/resource, sufficient duration, and — when a
 * recurring placement is requested — the pattern holding over several future
 * occurrences rather than a single empty week.
 *
 * Nothing here invents provider qualifications: eligibility comes only from the
 * configured staff → service assignments. Nothing here invents rooms: resource
 * requirements come from configured service resource rules.
 */

import { detectConflicts, listResources, resourceById } from "./operations";
import {
  DEMO_TODAY,
  locationById,
  occurrenceDates,
  repository,
  serviceById,
  staffDisplayName,
} from "./repository";
import { getDataset } from "./store";
import type {
  BlockedTime,
  ID,
  RecurrenceFrequency,
  Service,
  StaffAvailability,
} from "./types";

/* --------------------------- time helpers --------------------------- */

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

function weekdayOf(iso: string) {
  return new Date(`${iso}T00:00:00`).getDay();
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export type Daypart = "any" | "morning" | "midday" | "afternoon" | "evening";

const DAYPART_RANGES: Record<Exclude<Daypart, "any">, [string, string]> = {
  morning: ["05:00", "11:00"],
  midday: ["11:00", "14:00"],
  afternoon: ["14:00", "17:00"],
  evening: ["17:00", "21:00"],
};

export const DAYPART_LABELS: Record<Daypart, string> = {
  any: "Any time",
  morning: "Morning",
  midday: "Midday",
  afternoon: "Afternoon",
  evening: "Evening",
};

/* ---------------------------- status model -------------------------- */

/**
 * Capacity status is always stated in words. Colour is decoration only.
 */
export type CapacityStatus =
  | "available"
  | "limited"
  | "full"
  | "blocked"
  | "provider_unavailable"
  | "resource_unavailable"
  | "conflict"
  | "not_eligible";

export const CAPACITY_STATUS_LABELS: Record<CapacityStatus, string> = {
  available: "Available",
  limited: "Limited",
  full: "Full",
  blocked: "Blocked",
  provider_unavailable: "Provider unavailable",
  resource_unavailable: "Resource unavailable",
  conflict: "Conflict",
  not_eligible: "Not eligible for service",
};

/* ------------------------- configuration reads ---------------------- */

export function listStaffAvailability(staffId?: ID) {
  return getDataset().staffAvailability.filter(
    (a) => a.isActive && (!staffId || a.staffId === staffId),
  );
}

export function listBlockedTimes() {
  return getDataset().blockedTimes.filter((b) => b.isActive);
}

export function serviceResourceRule(serviceId: ID, locationId: ID) {
  return getDataset().serviceResourceRequirements.find(
    (r) => r.serviceId === serviceId && r.locationId === locationId,
  );
}

/** Providers configured to deliver this service — never assumed from a job title. */
export function eligibleProviders(serviceId: ID) {
  const ids = new Set(
    repository
      .listStaffServices()
      .filter((row) => row.serviceId === serviceId)
      .map((row) => row.staffId),
  );
  return repository.listStaff().filter((s) => s.isActive && ids.has(s.id));
}

export function isProviderEligible(staffId: ID, serviceId: ID) {
  return eligibleProviders(serviceId).some((s) => s.id === staffId);
}

function blockedFor(
  blocks: BlockedTime[],
  match: { staffId?: ID; resourceId?: ID },
  date: string,
  startTime: string,
  endTime: string,
) {
  return blocks.find(
    (b) =>
      ((match.staffId && b.staffId === match.staffId) ||
        (match.resourceId && b.resourceId === match.resourceId)) &&
      (b.date ? b.date === date : b.weekday === weekdayOf(date)) &&
      overlaps(startTime, endTime, b.startTime, b.endTime),
  );
}

function withinEffective(a: StaffAvailability, date: string) {
  if (a.effectiveFrom && date < a.effectiveFrom) return false;
  if (a.effectiveTo && date > a.effectiveTo) return false;
  return true;
}

/* --------------------------- query & results ------------------------ */

export interface CapacityQuery {
  serviceId: ID;
  locationId?: ID | null;
  /** Preferred weekdays, 0 = Sunday. Empty = any day the provider works. */
  weekdays?: number[];
  daypart?: Daypart;
  providerStaffId?: ID | null;
  recurrence: RecurrenceFrequency;
  durationMinutes: number;
  startDate: string;
  /** How many future occurrences to test before calling a pattern sellable. */
  occurrencesToCheck?: number;
  limit?: number;
}

export interface OccurrenceCheck {
  date: string;
  clear: boolean;
  status: CapacityStatus;
  detail?: string;
}

export interface SellableSlot {
  key: string;
  serviceId: ID;
  serviceName: string;
  providerStaffId: ID;
  providerName: string;
  locationId: ID;
  locationName: string;
  resourceId: ID | null;
  resourceName: string | null;
  weekday: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  recurrence: RecurrenceFrequency;
  firstDate: string;
  status: CapacityStatus;
  clearOccurrences: number;
  checkedOccurrences: number;
  occurrences: OccurrenceCheck[];
  score: number;
}

const SLOT_STEP_MINUTES = 30;

function firstDateOnOrAfter(startDate: string, weekday: number) {
  let date = startDate;
  for (let i = 0; i < 7; i += 1) {
    if (weekdayOf(date) === weekday) return date;
    date = addDays(date, 1);
  }
  return startDate;
}

/**
 * Evaluates one candidate provider/room/time across the requested recurrence.
 * A single clear week is never enough for a recurring pattern.
 */
function evaluateSlot(input: {
  service: Service;
  providerStaffId: ID;
  locationId: ID;
  candidateResourceIds: ID[];
  resourceRequired: boolean;
  availabilityRows: StaffAvailability[];
  weekday: number;
  startTime: string;
  durationMinutes: number;
  recurrence: RecurrenceFrequency;
  startDate: string;
  occurrencesToCheck: number;
}): SellableSlot | null {
  const {
    service,
    providerStaffId,
    locationId,
    candidateResourceIds,
    resourceRequired,
    availabilityRows,
    weekday,
    startTime,
    durationMinutes,
    recurrence,
    startDate,
    occurrencesToCheck,
  } = input;

  const endTime = fromMinutes(toMinutes(startTime) + durationMinutes);
  const blocks = listBlockedTimes();
  const firstDate = firstDateOnOrAfter(startDate, weekday);
  const dates =
    recurrence === "custom"
      ? occurrenceDates(firstDate, "weekly", occurrencesToCheck)
      : occurrenceDates(firstDate, recurrence, occurrencesToCheck);

  // A recurring series should keep the same room, so a resource is chosen once
  // and then verified on every occurrence.
  let chosenResourceId: ID | null = null;
  const occurrences: OccurrenceCheck[] = [];

  for (const date of dates) {
    const inWindow = availabilityRows.some(
      (a) =>
        a.weekday === weekdayOf(date) &&
        withinEffective(a, date) &&
        toMinutes(a.startTime) <= toMinutes(startTime) &&
        toMinutes(a.endTime) >= toMinutes(endTime),
    );
    if (!inWindow) {
      occurrences.push({
        date,
        clear: false,
        status: "provider_unavailable",
        detail: "Outside the provider's configured availability",
      });
      continue;
    }

    const staffBlock = blockedFor(blocks, { staffId: providerStaffId }, date, startTime, endTime);
    if (staffBlock) {
      occurrences.push({ date, clear: false, status: "blocked", detail: staffBlock.reason });
      continue;
    }

    const providerBusy = detectConflicts({
      date,
      startTime,
      endTime,
      providerStaffId,
    }).providerConflicts;
    if (providerBusy.length) {
      occurrences.push({
        date,
        clear: false,
        status: "conflict",
        detail: "Provider already has an appointment",
      });
      continue;
    }

    if (!resourceRequired && candidateResourceIds.length === 0) {
      occurrences.push({ date, clear: true, status: "available" });
      continue;
    }

    const pool: ID[] = chosenResourceId ? [chosenResourceId] : candidateResourceIds;
    const free: ID | undefined = pool.find((resourceId: ID) => {
      if (blockedFor(blocks, { resourceId }, date, startTime, endTime)) return false;
      const report = detectConflicts({ date, startTime, endTime, resourceId });
      return report.resourceConflicts.length === 0;
    });

    if (!free) {
      occurrences.push({
        date,
        clear: false,
        status: "resource_unavailable",
        detail: chosenResourceId
          ? `${resourceById(chosenResourceId)?.name ?? "Room"} is not available`
          : "No qualifying room is available",
      });
      continue;
    }
    chosenResourceId = free;
    occurrences.push({ date, clear: true, status: "available" });
  }

  const clear = occurrences.filter((o) => o.clear).length;
  if (clear === 0) return null;

  const ratio = clear / occurrences.length;
  const status: CapacityStatus = ratio === 1 ? "available" : ratio >= 0.5 ? "limited" : "conflict";
  if (status === "conflict") return null;

  const location = locationById(locationId);
  const staff = repository.getStaff(providerStaffId);

  return {
    key: `${providerStaffId}-${locationId}-${chosenResourceId ?? "none"}-${weekday}-${startTime}`,
    serviceId: service.id,
    serviceName: service.name,
    providerStaffId,
    providerName: staff ? staffDisplayName(staff) : "Provider",
    locationId,
    locationName: location?.name ?? "Location",
    resourceId: chosenResourceId,
    resourceName: chosenResourceId ? (resourceById(chosenResourceId)?.name ?? null) : null,
    weekday,
    startTime,
    endTime,
    durationMinutes,
    recurrence,
    firstDate: occurrences.find((o) => o.clear)?.date ?? occurrences[0]!.date,
    status,
    clearOccurrences: clear,
    checkedOccurrences: occurrences.length,
    occurrences,
    score: ratio * 100 - weekday - toMinutes(startTime) / 1000,
  };
}

/**
 * Ranked sellable recurring opportunities for an individual (non-class)
 * service. Group classes never go through this path — see `classCapacity`.
 */
export function findSellableCapacity(query: CapacityQuery): SellableSlot[] {
  const service = serviceById(query.serviceId);
  if (!service || service.isGroupClass) return [];

  const providers = eligibleProviders(service.id).filter(
    (s) => !query.providerStaffId || s.id === query.providerStaffId,
  );
  const occurrencesToCheck = query.occurrencesToCheck ?? 4;
  const duration = query.durationMinutes || service.defaultDurationMinutes;
  const daypart = query.daypart ?? "any";
  const results: SellableSlot[] = [];

  for (const provider of providers) {
    const rows = listStaffAvailability(provider.id).filter(
      (a) => !query.locationId || a.locationId === query.locationId,
    );
    const byLocationWeekday = new Map<string, StaffAvailability[]>();
    rows.forEach((row) => {
      const key = `${row.locationId}|${row.weekday}`;
      byLocationWeekday.set(key, [...(byLocationWeekday.get(key) ?? []), row]);
    });

    for (const [key, windows] of byLocationWeekday) {
      const [locationId = "", weekdayRaw = "0"] = key.split("|");
      const weekday = Number(weekdayRaw);
      if (query.weekdays?.length && !query.weekdays.includes(weekday)) continue;

      const rule = serviceResourceRule(service.id, locationId);
      const resourceRequired = rule?.resourceRequired ?? false;
      const candidateResourceIds = rule
        ? rule.eligibleResourceIds.filter((id) => resourceById(id)?.isActive)
        : [];
      if (resourceRequired && candidateResourceIds.length === 0) continue;
      // A location with no configured rule and no rooms is still valid for
      // services that do not require a room (e.g. virtual nutrition).
      if (!rule && listResources(locationId).length > 0 && service.isVirtualByDefault === false) {
        // No rule configured: treat the location as room-agnostic rather than
        // inventing a requirement.
      }

      for (const window of windows) {
        const windowStart = toMinutes(window.startTime);
        const windowEnd = toMinutes(window.endTime);
        for (let start = windowStart; start + duration <= windowEnd; start += SLOT_STEP_MINUTES) {
          const startTime = fromMinutes(start);
          if (daypart !== "any") {
            const [from, to] = DAYPART_RANGES[daypart];
            if (start < toMinutes(from) || start >= toMinutes(to)) continue;
          }
          const slot = evaluateSlot({
            service,
            providerStaffId: provider.id,
            locationId,
            candidateResourceIds,
            resourceRequired,
            availabilityRows: windows,
            weekday,
            startTime,
            durationMinutes: duration,
            recurrence: query.recurrence,
            startDate: query.startDate,
            occurrencesToCheck,
          });
          if (slot) results.push(slot);
        }
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, query.limit ?? 40);
}

/* ---------------------- group class (Apparatix) --------------------- */

export interface ClassCapacityRow {
  classSessionId: ID;
  serviceId: ID;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  locationName: string;
  resourceName: string | null;
  instructorNames: string[];
  enrolled: number;
  capacity: number;
  sellableSeats: number;
  status: CapacityStatus;
}

/**
 * Apparatix capacity is seats inside an existing class block — never a search
 * for a one-on-one provider opening.
 */
export function classCapacity(filter?: {
  serviceId?: ID | null;
  locationId?: ID | null;
  fromDate?: string;
}): ClassCapacityRow[] {
  const data = getDataset();
  const from = filter?.fromDate ?? DEMO_TODAY;
  const counted = ["booked", "attended", "no_show"];
  return data.classSessions
    .filter((c) => c.status === "scheduled" && c.date >= from)
    .filter((c) => (filter?.serviceId ? c.serviceId === filter.serviceId : true))
    .filter((c) => (filter?.locationId ? c.locationId === filter.locationId : true))
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    .map((c) => {
      const enrolled = data.classParticipants.filter(
        (p) => p.classSessionId === c.id && counted.includes(p.status),
      ).length;
      const sellableSeats = Math.max(c.capacity - enrolled, 0);
      const status: CapacityStatus =
        sellableSeats === 0 ? "full" : sellableSeats <= 2 ? "limited" : "available";
      return {
        classSessionId: c.id,
        serviceId: c.serviceId,
        serviceName: serviceById(c.serviceId)?.name ?? "Class",
        date: c.date,
        startTime: c.startTime,
        endTime: c.endTime,
        locationName: locationById(c.locationId)?.name ?? "Location",
        resourceName: resourceById(c.resourceId)?.name ?? null,
        instructorNames: c.instructorStaffIds
          .map((id) => {
            const s = repository.getStaff(id);
            return s ? staffDisplayName(s) : null;
          })
          .filter((n): n is string => Boolean(n)),
        enrolled,
        capacity: c.capacity,
        sellableSeats,
        status,
      };
    });
}

/* ------------------------- staff capacity view ---------------------- */

export interface StaffCapacityDay {
  weekday: number;
  slots: SellableSlot[];
}

export interface StaffCapacityRow {
  staffId: ID;
  staffName: string;
  days: StaffCapacityDay[];
  totalOpportunities: number;
}

/**
 * Provider view of genuinely sellable recurring opportunities — deliberately
 * not a dump of every isolated calendar gap.
 */
export function staffCapacity(query: Omit<CapacityQuery, "providerStaffId">): StaffCapacityRow[] {
  const slots = findSellableCapacity({ ...query, limit: 400 });
  const byStaff = new Map<ID, SellableSlot[]>();
  slots.forEach((slot) => {
    byStaff.set(slot.providerStaffId, [...(byStaff.get(slot.providerStaffId) ?? []), slot]);
  });

  return eligibleProviders(query.serviceId).map((staff) => {
    const own = byStaff.get(staff.id) ?? [];
    const days: StaffCapacityDay[] = [0, 1, 2, 3, 4, 5, 6]
      .map((weekday) => ({
        weekday,
        // One headline opportunity per hour keeps the view sellable rather
        // than an exhaustive list of overlapping 30-minute offsets.
        slots: dedupeByHour(own.filter((s) => s.weekday === weekday)),
      }))
      .filter((d) => d.slots.length > 0);
    return {
      staffId: staff.id,
      staffName: staffDisplayName(staff),
      days,
      totalOpportunities: days.reduce((sum, d) => sum + d.slots.length, 0),
    };
  });
}

function dedupeByHour(slots: SellableSlot[]) {
  const seen = new Set<string>();
  return slots
    .slice()
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .filter((s) => {
      const hour = s.startTime.slice(0, 2);
      if (seen.has(hour)) return false;
      seen.add(hour);
      return true;
    });
}

/* --------------------------- summary card --------------------------- */

export interface CapacitySummaryRow {
  serviceId: ID;
  serviceName: string;
  kind: "individual" | "class";
  /** Recurring opportunities for individual services; open seats for classes. */
  count: number;
  unitLabel: string;
}

/**
 * Weekly leadership snapshot. Every number is calculated from the actual
 * schedule — nothing is estimated or invented.
 */
export function weeklyCapacitySummary(startDate = DEMO_TODAY): CapacitySummaryRow[] {
  const services = repository.listServices().filter((s) => s.isActive);
  const rows: CapacitySummaryRow[] = [];

  services
    .filter((s) => !s.isGroupClass && ["personal_training", "pilates", "medical_exercise", "nutrition", "recovery"].includes(s.category))
    .forEach((service) => {
      const slots = findSellableCapacity({
        serviceId: service.id,
        recurrence: "weekly",
        durationMinutes: service.defaultDurationMinutes,
        startDate,
        occurrencesToCheck: 4,
        limit: 400,
      });
      const unique = new Set(
        slots
          .filter((s) => s.status === "available")
          .map((s) => `${s.providerStaffId}-${s.weekday}-${s.startTime.slice(0, 2)}`),
      );
      rows.push({
        serviceId: service.id,
        serviceName: service.name,
        kind: "individual",
        count: unique.size,
        unitLabel: "recurring opportunities",
      });
    });

  const weekEnd = addDays(startDate, 7);
  const seats = classCapacity({ fromDate: startDate })
    .filter((c) => c.date < weekEnd)
    .reduce((sum, c) => sum + c.sellableSeats, 0);
  rows.push({
    serviceId: "svc-apparatix",
    serviceName: "Apparatix classes",
    kind: "class",
    count: seats,
    unitLabel: "open seats this week",
  });

  return rows;
}
