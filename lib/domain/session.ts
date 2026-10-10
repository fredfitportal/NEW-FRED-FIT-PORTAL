/**
 * Demo session. There is no authentication in this build — staff choose which
 * demo user they are acting as so permission-gated actions (leadership-only
 * credit authorization, scheduling) can be demonstrated honestly.
 *
 * What the actor may do is decided entirely by `accounts.ts`: permission level
 * defaults plus per-person toggles. Nothing is inferred from a job title.
 */

import { useSyncExternalStore } from "react";

import { effectivePermissions, hasToggle, isPortalAdmin } from "./accounts";
import { getDataset } from "./store";
import type { PermissionKey, PermissionToggle, StaffMember } from "./types";

const KEY = "fredfit-portal.demo-actor.v1";
const DEFAULT_STAFF_ID = "staff-1"; // Jessica Domi — Executive / Admin

let currentStaffId = DEFAULT_STAFF_ID;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function hydrateSession() {
  if (typeof window === "undefined") return;
  const stored = window.localStorage.getItem(KEY);
  if (stored && getDataset().staff.some((s) => s.id === stored) && stored !== currentStaffId) {
    currentStaffId = stored;
    emit();
  }
}

export function setCurrentStaffId(id: string) {
  currentStaffId = id;
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, id);
  emit();
}

export function getCurrentStaffId() {
  return currentStaffId;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function permissionsFor(staffId: string): PermissionKey[] {
  const staff = getDataset().staff.find((s) => s.id === staffId);
  if (!staff) return [];
  return effectivePermissions(staffId);
}

export interface DemoSession {
  staff: StaffMember;
  staffId: string;
  can: (permission: PermissionKey) => boolean;
  /** True when this person carries credit / make-up authority. */
  isLeadership: boolean;
  /** Coarse permission switch check. */
  has: (toggle: PermissionToggle) => boolean;
  /** Jennifer Scherer and Jessie Domi only — protected administration. */
  isPortalAdmin: boolean;
}

export function useSession(): DemoSession {
  const staffId = useSyncExternalStore(
    subscribe,
    getCurrentStaffId,
    () => DEFAULT_STAFF_ID,
  );
  const all = getDataset().staff;
  const staff = all.find((s) => s.id === staffId) ?? all[0]!;
  const perms = permissionsFor(staffId);
  return {
    staff,
    staffId,
    can: (permission) => perms.includes(permission),
    isLeadership: perms.includes("credits.manage"),
    has: (toggle) => hasToggle(staffId, toggle),
    isPortalAdmin: isPortalAdmin(staffId),
  };
}
