/**
 * STAFF ACCOUNTS, PERMISSION LEVELS & TOGGLES.
 *
 * One place decides what a staff member may do. `session.ts` delegates here,
 * so every existing `can(...)` check in the portal resolves through this
 * module — permission changes take effect everywhere without call-site edits.
 *
 * Shape notes for the future production build:
 *  - A portal account (`UserAccount`) is a separate record from the staff
 *    profile. Accepting an invitation links the account to the EXISTING staff
 *    record; it never creates a second staff member.
 *  - Invitations here are simulated (no email, no real credential). Swapping in
 *    real authentication replaces the delivery + credential steps only.
 *
 * PROTECTED CAPABILITY: permission administration (changing a level, flipping a
 * toggle, sending/cancelling invitations, disabling access) belongs to the two
 * named executives below — NOT to the Executive/Admin level. Granting someone
 * that level gives broad visibility, never permission administration.
 */

import * as seed from "./seed";
import { getDataset, mutate, nextId, nowIso } from "./store";
import type {
  ID,
  PermissionKey,
  PermissionToggle,
  StaffInvitation,
  UserAccount,
} from "./types";

/* ------------------------- protected administrators ---------------------- */

/** Jennifer Scherer and Jessie Domi. Changing this list is a deliberate act. */
export const PORTAL_ADMIN_STAFF_IDS: ID[] = ["staff-8", "staff-1"];

export function isPortalAdmin(staffId: ID): boolean {
  return PORTAL_ADMIN_STAFF_IDS.includes(staffId);
}

/* ------------------------------- toggles --------------------------------- */

export interface ToggleDef {
  key: PermissionToggle;
  group: string;
  label: string;
  description: string;
}

export const PERMISSION_TOGGLES: ToggleDef[] = [
  { key: "calendar.own", group: "Calendar & scheduling", label: "Manage own calendar", description: "Book, move and cancel their own appointments." },
  { key: "calendar.all", group: "Calendar & scheduling", label: "Manage all calendars", description: "Do the same for any provider." },
  { key: "calendar.recurring", group: "Calendar & scheduling", label: "Manage recurring schedules", description: "Create, edit, pause, resume and end recurring series." },
  { key: "calendar.cancellations", group: "Calendar & scheduling", label: "Manage cancellations & make-up credits", description: "Cancellation scope decisions and make-up credit authority." },
  { key: "clients.view_assigned", group: "Clients", label: "View assigned clients", description: "See the records of clients they work with." },
  { key: "clients.edit", group: "Clients", label: "Create & edit clients", description: "Create client records, edit details, agreements and onboarding." },
  { key: "clients.documentation", group: "Clients", label: "Edit client documentation", description: "Session notes, assessments and clinical documentation." },
  { key: "staff.directory", group: "Staff / team", label: "View staff directory", description: "Name, title, department, work contact, locations, services, hours." },
  { key: "staff.edit", group: "Staff / team", label: "Edit staff information, hours & services", description: "Never includes accounts or permissions." },
  { key: "billing.view", group: "Billing", label: "View billing", description: "Superbills, payment status and financial figures, read only." },
  { key: "billing.manage", group: "Billing", label: "Manage billing", description: "Generate, edit and finalize billing records." },
  { key: "reports.view", group: "Reports", label: "View reports", description: "Organizational reporting, capacity and utilization analytics." },
  { key: "tasks.oversight", group: "Tasks", label: "Organization-wide task oversight", description: "See and manage tasks across staff. Never exposes an executive's tasks." },
];

export const TOGGLE_LABELS: Record<PermissionToggle, string> = Object.fromEntries(
  PERMISSION_TOGGLES.map((t) => [t.key, t.label]),
) as Record<PermissionToggle, string>;

/* ----------------------------- base levels ------------------------------- */

export type PermissionLevelId =
  | "level-executive"
  | "level-leadership"
  | "level-admin"
  | "level-practitioner"
  | "level-limited";

export interface PermissionLevel {
  id: PermissionLevelId;
  name: string;
  description: string;
  defaults: PermissionToggle[];
}

const ALL_TOGGLES = PERMISSION_TOGGLES.map((t) => t.key);

export const PERMISSION_LEVELS: PermissionLevel[] = [
  {
    id: "level-executive",
    name: "Executive / Admin",
    description: "Organization-wide access. Permission administration is separately protected.",
    defaults: ALL_TOGGLES,
  },
  {
    id: "level-leadership",
    name: "Leadership",
    description: "Own calendar, assigned clients, staff directory. Everything else granted deliberately.",
    defaults: ["calendar.own", "clients.view_assigned", "staff.directory"],
  },
  {
    id: "level-admin",
    name: "Administrative / Scheduling",
    description: "Full calendar control and client management, no executive or financial access.",
    defaults: ["calendar.own", "calendar.all", "clients.view_assigned", "clients.edit", "staff.directory"],
  },
  {
    id: "level-practitioner",
    name: "Practitioner",
    description: "Views their own calendar and documents their own sessions. Booking authority is granted explicitly.",
    defaults: ["clients.view_assigned", "clients.documentation", "staff.directory"],
  },
  {
    id: "level-limited",
    name: "Limited / Read-only",
    description: "Views their own calendar and basic client information. No editing.",
    defaults: ["clients.view_assigned", "staff.directory"],
  },
];

export function levelById(id: string): PermissionLevel | undefined {
  return PERMISSION_LEVELS.find((l) => l.id === id);
}

/** Maps the seeded role records onto a base permission level. */
const ROLE_TO_LEVEL: Record<string, PermissionLevelId> = {
  "role-owner": "level-executive",
  "role-leadership": "level-leadership",
  "role-admin-staff": "level-admin",
  "role-limited": "level-limited",
};

export function levelIdForStaff(staffId: ID): PermissionLevelId {
  const staff = getDataset().staff.find((s) => s.id === staffId);
  if (!staff) return "level-limited";
  return ROLE_TO_LEVEL[staff.roleId] ?? "level-practitioner";
}

/** The role record a level corresponds to, used when the level is changed. */
const LEVEL_TO_ROLE: Record<PermissionLevelId, string> = {
  "level-executive": "role-owner",
  "level-leadership": "role-leadership",
  "level-admin": "role-admin-staff",
  "level-practitioner": "role-trainer",
  "level-limited": "role-limited",
};

/* --------------------------- toggle resolution --------------------------- */

export function effectiveToggles(staffId: ID): PermissionToggle[] {
  const level = levelById(levelIdForStaff(staffId));
  const set = new Set<PermissionToggle>(level?.defaults ?? []);
  getDataset()
    .staffPermissionOverrides.filter((o) => o.staffId === staffId)
    .forEach((o) => (o.effect === "grant" ? set.add(o.toggle) : set.delete(o.toggle)));
  // Managing all calendars implies managing your own; managing billing implies viewing it.
  if (set.has("calendar.all")) set.add("calendar.own");
  if (set.has("billing.manage")) set.add("billing.view");
  if (set.has("clients.edit")) set.add("clients.view_assigned");
  return [...set];
}

export function hasToggle(staffId: ID, toggle: PermissionToggle): boolean {
  return effectiveToggles(staffId).includes(toggle);
}

export function toggleSource(
  staffId: ID,
  toggle: PermissionToggle,
): "level" | "added" | "removed" | "off" {
  const level = levelById(levelIdForStaff(staffId));
  const fromLevel = (level?.defaults ?? []).includes(toggle);
  const override = getDataset().staffPermissionOverrides.find(
    (o) => o.staffId === staffId && o.toggle === toggle,
  );
  if (!override) return fromLevel ? "level" : "off";
  return override.effect === "grant" ? (fromLevel ? "level" : "added") : "removed";
}

/* ---------------------- toggles → permission keys ------------------------ */

const TOGGLE_PERMISSIONS: Record<PermissionToggle, PermissionKey[]> = {
  "calendar.own": [],
  "calendar.all": ["scheduling.manage"],
  "calendar.recurring": ["scheduling.manage"],
  "calendar.cancellations": ["credits.view", "credits.manage"],
  "clients.view_assigned": [
    "clients.view",
    "health.view",
    "assessments.view",
    "assessment_media.view",
    "programs.view",
    "communications.participate",
    "credits.view",
  ],
  "clients.edit": ["clients.edit"],
  "clients.documentation": [
    "health.edit",
    "assessments.create",
    "assessments.edit",
    "assessments.finalize",
    "assessment_media.upload",
    "programs.edit",
    "medical_exercise.view",
    "medical_exercise.edit",
    "nutrition.view",
    "nutrition.edit",
    "recovery.view",
    "recovery.edit",
  ],
  "staff.directory": [],
  "staff.edit": ["staff.manage"],
  "billing.view": ["billing.view"],
  "billing.manage": ["billing.manage"],
  "reports.view": ["reports.view"],
  "tasks.oversight": [],
};

const ALL_PERMISSION_KEYS = seed.PERMISSIONS.map((p) => p.key);

/** The authoritative permission set for a staff member. */
export function effectivePermissions(staffId: ID): PermissionKey[] {
  if (levelIdForStaff(staffId) === "level-executive") return [...ALL_PERMISSION_KEYS];
  const keys = new Set<PermissionKey>();
  effectiveToggles(staffId).forEach((t) =>
    TOGGLE_PERMISSIONS[t].forEach((k) => keys.add(k)),
  );
  return [...keys];
}

/* ------------------------------- accounts -------------------------------- */

export type AccountStatus = "not_invited" | "invited" | "active" | "disabled";

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  not_invited: "Not Invited",
  invited: "Invitation Pending",
  active: "Active",
  disabled: "Disabled",
};

export function accountForStaff(staffId: ID): UserAccount | undefined {
  return getDataset().userAccounts.find(
    (a) => a.subjectType === "staff" && a.subjectId === staffId,
  );
}

export function accountStatus(staffId: ID): AccountStatus {
  const account = accountForStaff(staffId);
  if (!account) return "not_invited";
  if (account.status === "active") return "active";
  if (account.status === "invited") return "invited";
  return "disabled";
}

export function pendingInvitation(staffId: ID): StaffInvitation | undefined {
  return getDataset()
    .staffInvitations.filter((i) => i.staffId === staffId && i.status === "pending")
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0];
}

export function invitationByToken(token: string): StaffInvitation | undefined {
  return getDataset().staffInvitations.find((i) => i.token === token);
}

export function isExpired(invitation: StaffInvitation): boolean {
  return new Date(invitation.expiresAt).getTime() < Date.now();
}

const INVITE_DAYS = 7;

export interface ActionResult {
  ok: boolean;
  reason?: string;
  token?: string;
}

function guard(actorStaffId: ID): ActionResult | null {
  if (!isPortalAdmin(actorStaffId)) {
    return { ok: false, reason: "Only Jennifer Scherer and Jessie Domi may administer portal accounts and permissions." };
  }
  return null;
}

/** Sends (or resends) a simulated invitation. */
export function sendInvitation(staffId: ID, actorStaffId: ID): ActionResult {
  const blocked = guard(actorStaffId);
  if (blocked) return blocked;
  return mutate((data) => {
    const staff = data.staff.find((s) => s.id === staffId);
    if (!staff) return { ok: false, reason: "Staff member not found." };
    if (!staff.email?.trim()) return { ok: false, reason: "This staff member has no email address." };

    data.staffInvitations
      .filter((i) => i.staffId === staffId && i.status === "pending")
      .forEach((i) => {
        i.status = "cancelled";
        i.cancelledAt = nowIso();
      });

    const token = nextId("invite").replace("invite-", "");
    const now = nowIso();
    data.staffInvitations.push({
      id: nextId("inv"),
      createdAt: now,
      updatedAt: now,
      staffId,
      email: staff.email,
      token,
      sentByStaffId: actorStaffId,
      sentAt: now,
      expiresAt: new Date(Date.now() + INVITE_DAYS * 86400000).toISOString(),
      acceptedAt: null,
      cancelledAt: null,
      status: "pending",
    });

    const existing = data.userAccounts.find(
      (a) => a.subjectType === "staff" && a.subjectId === staffId,
    );
    if (existing) {
      if (existing.status !== "active") existing.status = "invited";
      existing.email = staff.email;
      existing.updatedAt = now;
    } else {
      data.userAccounts.push({
        id: nextId("user"),
        createdAt: now,
        updatedAt: now,
        email: staff.email,
        subjectType: "staff",
        subjectId: staffId,
        status: "invited",
        lastLoginAt: null,
        mfaEnabled: false,
        authProvider: "simulated",
      });
    }
    return { ok: true, token };
  });
}

export function cancelInvitation(staffId: ID, actorStaffId: ID): ActionResult {
  const blocked = guard(actorStaffId);
  if (blocked) return blocked;
  return mutate((data) => {
    const invite = data.staffInvitations.find(
      (i) => i.staffId === staffId && i.status === "pending",
    );
    if (!invite) return { ok: false, reason: "There is no pending invitation." };
    invite.status = "cancelled";
    invite.cancelledAt = nowIso();
    const account = data.userAccounts.find(
      (a) => a.subjectType === "staff" && a.subjectId === staffId,
    );
    if (account && account.status === "invited") {
      data.userAccounts = data.userAccounts.filter((a) => a.id !== account.id);
    }
    return { ok: true };
  });
}

/**
 * Accepting an invitation activates the account attached to the EXISTING staff
 * profile. No staff record is created here — ever.
 */
export function acceptInvitation(token: string, _password: string): ActionResult {
  return mutate((data) => {
    const invite = data.staffInvitations.find((i) => i.token === token);
    if (!invite) return { ok: false, reason: "This invitation link is not valid." };
    if (invite.status === "accepted") return { ok: false, reason: "This invitation has already been used." };
    if (invite.status === "cancelled") return { ok: false, reason: "This invitation was cancelled." };
    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      invite.status = "expired";
      return { ok: false, reason: "This invitation has expired. Ask for a new one." };
    }
    const now = nowIso();
    invite.status = "accepted";
    invite.acceptedAt = now;
    invite.updatedAt = now;

    const account = data.userAccounts.find(
      (a) => a.subjectType === "staff" && a.subjectId === invite.staffId,
    );
    if (account) {
      account.status = "active";
      account.lastLoginAt = now;
      account.updatedAt = now;
    } else {
      data.userAccounts.push({
        id: nextId("user"),
        createdAt: now,
        updatedAt: now,
        email: invite.email,
        subjectType: "staff",
        subjectId: invite.staffId,
        status: "active",
        lastLoginAt: now,
        mfaEnabled: false,
        authProvider: "simulated",
      });
    }
    return { ok: true };
  });
}

/** Disables or re-enables portal sign-in. Never touches the staff record. */
export function setAccountEnabled(
  staffId: ID,
  enabled: boolean,
  actorStaffId: ID,
): ActionResult {
  const blocked = guard(actorStaffId);
  if (blocked) return blocked;
  if (staffId === actorStaffId) {
    return { ok: false, reason: "You cannot change your own portal access." };
  }
  return mutate((data) => {
    const account = data.userAccounts.find(
      (a) => a.subjectType === "staff" && a.subjectId === staffId,
    );
    if (!account) return { ok: false, reason: "This staff member has no portal account yet." };
    account.status = enabled ? "active" : "disabled";
    account.updatedAt = nowIso();
    return { ok: true };
  });
}

/* ------------------------ permission administration ---------------------- */

export function setPermissionLevel(
  staffId: ID,
  levelId: PermissionLevelId,
  actorStaffId: ID,
): ActionResult {
  const blocked = guard(actorStaffId);
  if (blocked) return blocked;
  if (staffId === actorStaffId) {
    return { ok: false, reason: "You cannot change your own permission level." };
  }
  return mutate((data) => {
    const staff = data.staff.find((s) => s.id === staffId);
    if (!staff) return { ok: false, reason: "Staff member not found." };
    staff.roleId = LEVEL_TO_ROLE[levelId];
    staff.updatedAt = nowIso();
    return { ok: true };
  });
}

export function setToggle(
  staffId: ID,
  toggle: PermissionToggle,
  on: boolean,
  actorStaffId: ID,
): ActionResult {
  const blocked = guard(actorStaffId);
  if (blocked) return blocked;
  if (staffId === actorStaffId) {
    return { ok: false, reason: "You cannot change your own permissions." };
  }
  return mutate((data) => {
    const level = levelById(levelIdForStaff(staffId));
    const fromLevel = (level?.defaults ?? []).includes(toggle);
    data.staffPermissionOverrides = data.staffPermissionOverrides.filter(
      (o) => !(o.staffId === staffId && o.toggle === toggle),
    );
    if (on !== fromLevel) {
      data.staffPermissionOverrides.push({
        staffId,
        toggle,
        effect: on ? "grant" : "revoke",
        setByStaffId: actorStaffId,
        setAt: nowIso(),
      });
    }
    return { ok: true };
  });
}

/* -------------------------- staff profile access ------------------------- */

export type StaffProfileView = "full" | "directory" | "none";

/**
 * What a viewer may see on someone else's staff profile. Decided here so the
 * route, the team list and any direct link all answer the same way.
 */
export function staffProfileView(viewerStaffId: ID, staffId: ID): StaffProfileView {
  if (viewerStaffId === staffId) return "full";
  if (isPortalAdmin(viewerStaffId)) return "full";
  if (levelIdForStaff(viewerStaffId) === "level-executive") return "full";
  if (hasToggle(viewerStaffId, "staff.edit")) return "full";
  if (hasToggle(viewerStaffId, "staff.directory")) return "directory";
  return "none";
}
