/**
 * Leadership-only team management (Preview / localStorage demo build).
 *
 * Staff records, their location assignments, authorized services and weekly
 * availability windows are configuration — never hard-coded. This module is the
 * only writer for those collections; the UI calls these functions.
 *
 * No authentication exists yet: permission checks use the demo session actor.
 */

import type { ID, StaffAvailability, StaffMember } from "./types";
import { getDataset, mutate, nextId, nowIso } from "./store";

export interface StaffInput {
  id?: ID | undefined;
  firstName: string;
  lastName: string;
  preferredName?: string | undefined;
  email: string;
  phone?: string | undefined;
  jobTitle: string;
  department?: string | undefined;
  employmentType?: StaffMember["employmentType"] | undefined;
  roleId: ID;
  employmentStatus: StaffMember["employmentStatus"];
  hireDate: string;
  weeklyHours?: number | undefined;
  contractedWeeklyCapacityHours?: number | undefined;
  primaryLocationId?: ID | undefined;
  biography?: string | undefined;
  isBookable?: boolean | undefined;
  isActive?: boolean | undefined;
}

/** Drops undefined keys so exact-optional record types stay satisfied. */
function clean<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

/** Creates or updates a staff member. Records are never deleted. */
export function saveStaffMember(input: StaffInput): StaffMember {
  return mutate((data) => {
    const existing = input.id ? data.staff.find((s) => s.id === input.id) : undefined;
    if (existing) {
      Object.assign(existing, clean({
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        preferredName: input.preferredName?.trim() || undefined,
        email: input.email.trim(),
        phone: input.phone?.trim() || undefined,
        jobTitle: input.jobTitle.trim(),
        department: input.department?.trim() || undefined,
        employmentType: input.employmentType,
        roleId: input.roleId,
        employmentStatus: input.employmentStatus,
        hireDate: input.hireDate,
        weeklyHours: input.weeklyHours,
        contractedWeeklyCapacityHours: input.contractedWeeklyCapacityHours,
        primaryLocationId: input.primaryLocationId,
        biography: input.biography?.trim() || undefined,
        isBookable: input.isBookable ?? existing.isBookable,
        isActive: input.isActive ?? existing.isActive,
        updatedAt: nowIso(),
      }) as Partial<StaffMember>);
      return existing;
    }

    const record: StaffMember = clean({
      id: nextId("staff"),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      preferredName: input.preferredName?.trim() || undefined,
      email: input.email.trim(),
      phone: input.phone?.trim() || undefined,
      jobTitle: input.jobTitle.trim(),
      department: input.department?.trim() || undefined,
      employmentType: input.employmentType,
      roleId: input.roleId,
      employmentStatus: input.employmentStatus,
      hireDate: input.hireDate,
      weeklyHours: input.weeklyHours,
      contractedWeeklyCapacityHours: input.contractedWeeklyCapacityHours,
      primaryLocationId: input.primaryLocationId,
      biography: input.biography?.trim() || undefined,
      displayOrder: data.staff.length + 1,
      isBookable: input.isBookable ?? true,
      isActive: input.isActive ?? true,
    }) as StaffMember;
    data.staff.push(record);
    if (input.primaryLocationId) {
      data.staffLocations.push({ staffId: record.id, locationId: input.primaryLocationId });
    }
    return record;
  });
}

/** Activates or deactivates a staff member. History is always preserved. */
export function setStaffActive(staffId: ID, isActive: boolean) {
  mutate((data) => {
    const staff = data.staff.find((s) => s.id === staffId);
    if (!staff) return;
    staff.isActive = isActive;
    if (!isActive) staff.isBookable = false;
    staff.updatedAt = nowIso();
  });
}

export function listStaffLocations(staffId?: ID) {
  return getDataset().staffLocations.filter((l) => !staffId || l.staffId === staffId);
}

/** Replaces the full set of locations a staff member works at. */
export function setStaffLocations(staffId: ID, locationIds: ID[]) {
  mutate((data) => {
    data.staffLocations = data.staffLocations.filter((l) => l.staffId !== staffId);
    locationIds.forEach((locationId) => data.staffLocations.push({ staffId, locationId }));
  });
}

/** Replaces the full set of services a staff member is authorized to deliver. */
export function setStaffServices(staffId: ID, serviceIds: ID[]) {
  mutate((data) => {
    data.staffServices = data.staffServices.filter((s) => s.staffId !== staffId);
    serviceIds.forEach((serviceId) => data.staffServices.push({ staffId, serviceId }));
  });
}

export function listAllStaffAvailability(staffId: ID) {
  return getDataset()
    .staffAvailability.filter((a) => a.staffId === staffId)
    .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
}

export function saveAvailabilityWindow(input: {
  id?: ID | undefined;
  staffId: ID;
  locationId: ID;
  weekday: number;
  startTime: string;
  endTime: string;
  isActive?: boolean | undefined;
}): StaffAvailability {
  return mutate((data) => {
    const existing = input.id ? data.staffAvailability.find((a) => a.id === input.id) : undefined;
    if (existing) {
      Object.assign(existing, clean({
        locationId: input.locationId,
        weekday: input.weekday,
        startTime: input.startTime,
        endTime: input.endTime,
        isActive: input.isActive ?? existing.isActive,
        updatedAt: nowIso(),
      }));
      return existing;
    }
    const record: StaffAvailability = clean({
      id: nextId("avail"),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      staffId: input.staffId,
      locationId: input.locationId,
      weekday: input.weekday,
      startTime: input.startTime,
      endTime: input.endTime,
      effectiveFrom: null,
      effectiveTo: null,
      isActive: input.isActive ?? true,
    }) as StaffAvailability;
    data.staffAvailability.push(record);
    return record;
  });
}

export function removeAvailabilityWindow(id: ID) {
  mutate((data) => {
    data.staffAvailability = data.staffAvailability.filter((a) => a.id !== id);
  });
}

export const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
