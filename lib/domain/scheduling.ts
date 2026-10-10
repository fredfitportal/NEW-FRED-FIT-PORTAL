/**
 * Binds the pure rules in `scheduling-policy.ts` to the current data set.
 *
 * Components call these functions; they never re-derive a rule themselves.
 * When the production backend lands, only the data lookups below change.
 */

import { listResources, resourceById } from "./operations";
import { DEMO_TODAY, repository, serviceById } from "./repository";
import {
  CAPACITY_COMPLETED_STATUSES,
  CAPACITY_COUNTING_STATUSES,
  countsTowardCapacity,
  occupiesSlot,
  toMinutes,
  validateBooking,
  type ValidationIssue,
} from "./scheduling-policy";
import { getDataset } from "./store";
import type { Appointment, ID, ISODate, StaffMember } from "./types";

export type { ValidationIssue };

export function approvedServiceIdsFor(staffId: ID): ID[] {
  return repository
    .listStaffServices()
    .filter((r) => r.staffId === staffId)
    .map((r) => r.serviceId);
}

export function unavailableDatesFor(staffId: ID): ISODate[] {
  return repository
    .listScheduleExceptions(staffId)
    .filter((e) => e.kind === "unavailable" || e.kind === "pto" || e.kind === "holiday")
    .map((e) => e.date);
}

export interface PlacementInput {
  date: ISODate;
  startTime: string;
  durationMinutes: number;
  serviceId: ID;
  providerStaffId: ID;
  locationId?: ID | null;
  resourceId?: ID | null;
  ignoreAppointmentId?: ID | null;
}

/** Full rule check for a create, edit or drag-and-drop placement. */
export function validatePlacement(input: PlacementInput): ValidationIssue[] {
  const endTime = addMinutes(input.startTime, input.durationMinutes);
  const sameDay = repository
    .listAppointments()
    .filter((a) => a.date === input.date && a.id !== input.ignoreAppointmentId);

  return validateBooking({
    date: input.date,
    startTime: input.startTime,
    endTime,
    service: serviceById(input.serviceId) ?? null,
    provider: repository.getStaff(input.providerStaffId) ?? null,
    locationId: input.locationId ?? null,
    resource: resourceById(input.resourceId) ?? null,
    availability: getDataset().staffAvailability.filter((w) => w.staffId === input.providerStaffId),
    unavailableDates: unavailableDatesFor(input.providerStaffId),
    approvedServiceIds: approvedServiceIdsFor(input.providerStaffId),
    sameDayAppointments: sameDay,
    locationResources: input.locationId ? listResources(input.locationId) : [],
  });
}

export function addMinutes(hhmm: string, minutes: number) {
  const total = toMinutes(hhmm) + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Capacity: working hours vs contracted client-facing capacity        */
/* ------------------------------------------------------------------ */

export function startOfWeek(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  const shift = (d.getDay() + 6) % 7; // Monday-based
  d.setDate(d.getDate() - shift);
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface CapacityRow {
  staff: StaffMember;
  /** Hours the provider is rostered to work (availability windows). */
  availableWorkingHours: number;
  /** Contracted client-facing target — a separate concept from working hours. */
  contractedHours: number;
  /** Client-facing hours booked this week. */
  scheduledHours: number;
  /** Client-facing hours actually delivered (Completed). */
  completedHours: number;
  remainingToCapacity: number;
  percentScheduled: number;
  percentCompleted: number;
  /** Rostered hours still free for booking. */
  openBookableHours: number;
  overCapacity: boolean;
}

/**
 * Answers "how many more client hours does each trainer need this week?".
 * Working hours, booked client hours and the contracted target are tracked
 * separately and never conflated.
 */
export function weeklyCapacity(weekStart = startOfWeek(DEMO_TODAY)): CapacityRow[] {
  const weekEnd = addDays(weekStart, 6);
  const appointments = repository
    .listAppointments()
    .filter((a) => a.date >= weekStart && a.date <= weekEnd);
  const availability = getDataset().staffAvailability.filter((w) => w.isActive);

  return repository
    .listStaff()
    .filter((s) => s.isActive)
    .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99))
    .map((staff) => {
      const rostered =
        availability
          .filter((w) => w.staffId === staff.id)
          .reduce((sum, w) => sum + (toMinutes(w.endTime) - toMinutes(w.startTime)), 0) / 60;

      const mine = appointments.filter((a) => a.providerStaffId === staff.id);
      const clientFacing = (a: Appointment) => countsTowardCapacity(serviceById(a.serviceId));

      const scheduledHours =
        mine
          .filter((a) => clientFacing(a) && CAPACITY_COUNTING_STATUSES.includes(a.status))
          .reduce((sum, a) => sum + a.durationMinutes, 0) / 60;
      const completedHours =
        mine
          .filter((a) => clientFacing(a) && CAPACITY_COMPLETED_STATUSES.includes(a.status))
          .reduce((sum, a) => sum + a.durationMinutes, 0) / 60;
      const bookedAnyHours =
        mine.filter(occupiesSlot).reduce((sum, a) => sum + a.durationMinutes, 0) / 60;

      const contractedHours = staff.contractedWeeklyCapacityHours ?? 0;
      const remainingToCapacity = Math.max(0, contractedHours - scheduledHours);

      return {
        staff,
        availableWorkingHours: round(rostered),
        contractedHours,
        scheduledHours: round(scheduledHours),
        completedHours: round(completedHours),
        remainingToCapacity: round(remainingToCapacity),
        percentScheduled: contractedHours ? Math.round((scheduledHours / contractedHours) * 100) : 0,
        percentCompleted: contractedHours ? Math.round((completedHours / contractedHours) * 100) : 0,
        openBookableHours: round(Math.max(0, rostered - bookedAnyHours)),
        overCapacity: contractedHours > 0 && scheduledHours > contractedHours,
      };
    });
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}
