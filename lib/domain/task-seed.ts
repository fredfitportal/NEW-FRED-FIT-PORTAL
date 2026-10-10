/**
 * Fictional starter tasks spanning owners, leadership and general staff so the
 * permission model is demonstrable in Preview. No real data of any kind.
 */

import type { Task } from "./types";

const NOW = "2026-08-31T12:00:00.000Z";

function meta(id: string) {
  return { id, createdAt: NOW, updatedAt: NOW, archivedAt: null };
}

export const DEMO_TASKS: Task[] = [
  {
    ...meta("task-x1"),
    title: "Review Q4 studio revenue targets",
    description: "Executive planning item — not for general circulation.",
    assignedStaffId: "staff-8",
    createdByStaffId: "staff-8",
    createdDate: "2026-08-24",
    category: "operations",
    dueDate: "2026-08-28",
    priority: "high",
    status: "open",
  },
  {
    ...meta("task-x2"),
    title: "Finalize leadership compensation review",
    assignedStaffId: "staff-1",
    createdByStaffId: "staff-1",
    createdDate: "2026-08-26",
    category: "staff_hr",
    dueDate: "2026-08-31",
    priority: "high",
    status: "in_progress",
  },
  {
    ...meta("task-x3"),
    title: "Coaching standards refresher for new trainers",
    assignedStaffId: "staff-2",
    createdByStaffId: "staff-1",
    createdDate: "2026-08-20",
    category: "staff_hr",
    dueDate: "2026-09-04",
    priority: "normal",
    status: "open",
  },
  {
    ...meta("task-x4"),
    title: "Call Rowan Casteel about resuming sessions",
    assignedStaffId: "staff-7",
    createdByStaffId: "staff-1",
    createdDate: "2026-08-29",
    clientId: "cl-7",
    category: "client_follow_up",
    dueDate: "2026-08-31",
    priority: "high",
    status: "open",
  },
  {
    ...meta("task-x5"),
    title: "Rebuild the September class promo graphics",
    assignedStaffId: "staff-7",
    createdByStaffId: "staff-7",
    createdDate: "2026-08-25",
    category: "marketing",
    priority: "low",
    status: "open",
  },
  {
    ...meta("task-x6"),
    title: "Confirm Tuesday 6am availability change",
    assignedStaffId: "staff-3",
    createdByStaffId: "staff-2",
    createdDate: "2026-08-27",
    sharedWithStaffIds: ["staff-7"],
    category: "scheduling",
    dueDate: "2026-09-02",
    priority: "normal",
    status: "open",
  },
  {
    ...meta("task-x7"),
    title: "Update Marisol Vega's program progression",
    assignedStaffId: "staff-3",
    createdByStaffId: "staff-3",
    createdDate: "2026-08-30",
    clientId: "cl-1",
    category: "programming",
    dueDate: "2026-09-07",
    priority: "normal",
    status: "open",
  },
  {
    ...meta("task-x8"),
    title: "Reconcile August package billing",
    assignedStaffId: "staff-1",
    createdByStaffId: "staff-1",
    createdDate: "2026-08-18",
    category: "billing",
    dueDate: "2026-08-20",
    priority: "normal",
    status: "complete",
    completedByStaffId: "staff-1",
    completedAt: "2026-08-21T14:30:00.000Z",
  },
];
