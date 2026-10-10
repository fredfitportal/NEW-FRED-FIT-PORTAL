/**
 * TASKS / ACTION ITEMS — one shared collection, permission-filtered.
 *
 * Privacy is decided here and nowhere else. Every surface in the portal (the
 * Tasks page, client profiles, staff profiles, the dashboard, a direct task
 * link) reads tasks through `listVisibleTasks` / `getVisibleTask`, so a task a
 * viewer may not see is never handed to the UI in the first place — no screen
 * filters a fuller list down in the browser.
 *
 * Rules:
 *  - Owner level (Jennifer Scherer, Jessie Domi — the Owner role) sees every
 *    task and may edit, reassign and complete any of them.
 *  - Everyone else sees only tasks assigned to them, created by them, or
 *    explicitly shared with them. Visibility is one-directional: owners seeing
 *    a leader's tasks never grants that leader sight of an owner's tasks.
 *
 * NOTE: this build has no real authentication — staff choose which demo user
 * they act as. These rules are enforced at the data layer exactly as written,
 * but they are honest role simulation, not server-side security.
 */

import { hasToggle } from "./accounts";
import { DEMO_TODAY } from "./repository";
import { getDataset, mutate, nextId, nowIso } from "./store";
import type { ID, ISODate, Task, TaskCategory } from "./types";

export const OWNER_ROLE_ID = "role-owner";

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  client_follow_up: "Client Follow-Up",
  scheduling: "Scheduling",
  billing: "Billing",
  staff_hr: "Staff/HR",
  operations: "Operations",
  marketing: "Marketing",
  programming: "Programming",
  other: "Other",
  documentation: "Documentation",
  follow_up: "Client Follow-Up",
  reassessment: "Reassessment",
  admin: "Operations",
  onboarding: "Onboarding",
};

/** Categories offered when creating or editing a task. */
export const TASK_CATEGORY_OPTIONS: TaskCategory[] = [
  "client_follow_up",
  "scheduling",
  "billing",
  "staff_hr",
  "operations",
  "marketing",
  "programming",
  "other",
];

export const TASK_STATUS_LABELS: Record<Task["status"], string> = {
  open: "Open",
  in_progress: "In Progress",
  complete: "Completed",
};

export const TASK_PRIORITY_LABELS: Record<Task["priority"], string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
};

/* ------------------------------ permissions ----------------------------- */

/** Executive / owner level: sees every task at FFS. */
export function isTaskAdmin(staffId: ID): boolean {
  const staff = getDataset().staff.find((s) => s.id === staffId);
  return staff?.roleId === OWNER_ROLE_ID;
}

/**
 * Organization-wide task oversight, granted deliberately by Jennifer or Jessie.
 * It NEVER exposes a task belonging to an executive — that stays executive-only,
 * so visibility remains strictly one-directional.
 */
function hasTaskOversight(staffId: ID): boolean {
  return hasToggle(staffId, "tasks.oversight");
}

function touchesExecutive(task: Task): boolean {
  return (
    (!!task.assignedStaffId && isTaskAdmin(task.assignedStaffId)) ||
    (!!task.createdByStaffId && isTaskAdmin(task.createdByStaffId))
  );
}

export function canViewTask(task: Task, viewerStaffId: ID): boolean {
  if (isTaskAdmin(viewerStaffId)) return true;
  if (task.assignedStaffId === viewerStaffId) return true;
  if (task.createdByStaffId === viewerStaffId) return true;
  if ((task.sharedWithStaffIds ?? []).includes(viewerStaffId)) return true;
  // Oversight is the only other path, and it stops at executive tasks.
  return hasTaskOversight(viewerStaffId) && !touchesExecutive(task);
}

/** Edit / reassign: owners, oversight holders, the task's author, or its assignee. */
export function canEditTask(task: Task, viewerStaffId: ID): boolean {
  if (!canViewTask(task, viewerStaffId)) return false;
  return (
    isTaskAdmin(viewerStaffId) ||
    task.createdByStaffId === viewerStaffId ||
    task.assignedStaffId === viewerStaffId ||
    (hasTaskOversight(viewerStaffId) && !touchesExecutive(task))
  );
}

export const canCompleteTask = canEditTask;

/* -------------------------------- reads --------------------------------- */

export interface TaskFilters {
  assignedStaffId?: string;
  status?: Task["status"] | "outstanding";
  priority?: Task["priority"];
  category?: TaskCategory;
  clientId?: string;
  dueFrom?: ISODate;
  dueTo?: ISODate;
  search?: string;
}

const OUTSTANDING: Task["status"][] = ["open", "in_progress"];

function sortTasks(tasks: Task[]): Task[] {
  const rank: Record<Task["priority"], number> = { high: 0, normal: 1, low: 2 };
  return [...tasks].sort((a, b) => {
    const ad = a.dueDate ?? "9999-12-31";
    const bd = b.dueDate ?? "9999-12-31";
    if (ad !== bd) return ad.localeCompare(bd);
    return rank[a.priority] - rank[b.priority];
  });
}

/** THE read path. Everything visible anywhere in the portal comes from here. */
export function listVisibleTasks(viewerStaffId: ID, filters: TaskFilters = {}): Task[] {
  const status = filters.status ?? "outstanding";
  const search = filters.search?.trim().toLowerCase();
  const visible = getDataset().tasks.filter((task) => {
    if (!canViewTask(task, viewerStaffId)) return false;
    if (status === "outstanding") {
      if (!OUTSTANDING.includes(task.status)) return false;
    } else if (task.status !== status) return false;
    if (filters.assignedStaffId && task.assignedStaffId !== filters.assignedStaffId) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.category && task.category !== filters.category) return false;
    if (filters.clientId && task.clientId !== filters.clientId) return false;
    if (filters.dueFrom && (!task.dueDate || task.dueDate < filters.dueFrom)) return false;
    if (filters.dueTo && (!task.dueDate || task.dueDate > filters.dueTo)) return false;
    if (search) {
      const haystack = `${task.title} ${task.description ?? ""}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
  return sortTasks(visible);
}

/** Direct lookup — returns undefined when the viewer may not see the task. */
export function getVisibleTask(taskId: ID, viewerStaffId: ID): Task | undefined {
  const task = getDataset().tasks.find((t) => t.id === taskId);
  if (!task || !canViewTask(task, viewerStaffId)) return undefined;
  return task;
}

export interface TaskGroups {
  overdue: Task[];
  dueToday: Task[];
  upcoming: Task[];
  noDueDate: Task[];
}

export function groupTasks(tasks: Task[], today: ISODate = DEMO_TODAY): TaskGroups {
  const groups: TaskGroups = { overdue: [], dueToday: [], upcoming: [], noDueDate: [] };
  for (const task of tasks) {
    if (!task.dueDate) groups.noDueDate.push(task);
    else if (task.dueDate < today) groups.overdue.push(task);
    else if (task.dueDate === today) groups.dueToday.push(task);
    else groups.upcoming.push(task);
  }
  return groups;
}

/** Counts for the dashboard. `scope` "mine" = assigned to the viewer. */
export function taskCounts(
  viewerStaffId: ID,
  scope: "mine" | "all" = "mine",
  today: ISODate = DEMO_TODAY,
) {
  const tasks = listVisibleTasks(
    viewerStaffId,
    scope === "mine" ? { assignedStaffId: viewerStaffId } : {},
  );
  const groups = groupTasks(tasks, today);
  return {
    overdue: groups.overdue.length,
    dueToday: groups.dueToday.length,
    upcoming: groups.upcoming.length,
    noDueDate: groups.noDueDate.length,
    total: tasks.length,
  };
}

/* ------------------------------- mutations ------------------------------ */

export interface TaskDraft {
  title: string;
  description?: string;
  assignedStaffId: ID;
  dueDate?: ISODate | undefined;
  priority: Task["priority"];
  status: Task["status"];
  category: TaskCategory;
  clientId?: ID | null;
  sharedWithStaffIds?: ID[];
}

export function createTask(draft: TaskDraft, actorStaffId: ID): Task {
  const now = nowIso();
  const task: Task = {
    id: nextId("task"),
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    title: draft.title.trim(),
    ...(draft.description?.trim() ? { description: draft.description.trim() } : {}),
    assignedStaffId: draft.assignedStaffId,
    clientId: draft.clientId ?? null,
    category: draft.category,
    ...(draft.dueDate ? { dueDate: draft.dueDate } : {}),
    priority: draft.priority,
    status: draft.status,
    createdByStaffId: actorStaffId,
    createdDate: now.slice(0, 10),
    sharedWithStaffIds: draft.sharedWithStaffIds ?? [],
    completedByStaffId: null,
    completedAt: null,
  };
  mutate((data) => {
    data.tasks = [task, ...data.tasks];
  });
  return task;
}

export function updateTask(
  taskId: ID,
  patch: Partial<TaskDraft>,
  actorStaffId: ID,
): { ok: boolean; reason?: string } {
  const existing = getDataset().tasks.find((t) => t.id === taskId);
  if (!existing || !canViewTask(existing, actorStaffId)) {
    return { ok: false, reason: "Task not found." };
  }
  if (!canEditTask(existing, actorStaffId)) {
    return { ok: false, reason: "You do not have permission to edit this task." };
  }
  const { dueDate, ...rest } = patch;
  mutate((data) => {
    data.tasks = data.tasks.map((t) => {
      if (t.id !== taskId) return t;
      const next: Task = { ...t, ...rest, updatedAt: nowIso() };
      if (patch.title) next.title = patch.title.trim();
      // An explicit empty due date clears it rather than keeping the old value.
      if (dueDate) next.dueDate = dueDate;
      else delete next.dueDate;
      return next;
    });
  });
  return { ok: true };
}

export function completeTask(taskId: ID, actorStaffId: ID): { ok: boolean; reason?: string } {
  const existing = getDataset().tasks.find((t) => t.id === taskId);
  if (!existing || !canViewTask(existing, actorStaffId)) {
    return { ok: false, reason: "Task not found." };
  }
  if (!canCompleteTask(existing, actorStaffId)) {
    return { ok: false, reason: "You do not have permission to complete this task." };
  }
  mutate((data) => {
    data.tasks = data.tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            status: "complete" as const,
            completedByStaffId: actorStaffId,
            completedAt: nowIso(),
            updatedAt: nowIso(),
          }
        : t,
    );
  });
  return { ok: true };
}

export function reopenTask(taskId: ID, actorStaffId: ID): { ok: boolean; reason?: string } {
  const existing = getDataset().tasks.find((t) => t.id === taskId);
  if (!existing || !canEditTask(existing, actorStaffId)) {
    return { ok: false, reason: "Task not found." };
  }
  mutate((data) => {
    data.tasks = data.tasks.map((t) =>
      t.id === taskId
        ? { ...t, status: "open" as const, completedByStaffId: null, completedAt: null, updatedAt: nowIso() }
        : t,
    );
  });
  return { ok: true };
}
