import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/app/PageHeader";
import { TaskList } from "@/components/app/tasks/TaskList";
import { TaskFormDialog } from "@/components/app/tasks/TaskFormDialog";
import { fieldClass } from "@/components/app/form-primitives";
import { Button } from "@/components/ui/button";
import { useDemoData } from "@/hooks/useDemoData";
import {
  DEMO_TODAY,
  clientDisplayName,
  repository,
  staffDisplayName,
} from "@/lib/domain/repository";
import { useSession } from "@/lib/domain/session";
import {
  TASK_CATEGORY_LABELS,
  TASK_CATEGORY_OPTIONS,
  groupTasks,
  isTaskAdmin,
  listVisibleTasks,
} from "@/lib/domain/tasks";
import type { Task, TaskCategory } from "@/lib/domain/types";

interface TaskSearch {
  scope?: "mine" | "all" | undefined;
  view?: "outstanding" | "completed" | undefined;
  bucket?: "overdue" | "today" | "upcoming" | undefined;
  staff?: string | undefined;
  priority?: string | undefined;
  category?: string | undefined;
  client?: string | undefined;
}

const asString = (v: unknown) => (typeof v === "string" && v ? v : undefined);

export const Route = createFileRoute("/_authenticated/tasks")({
  validateSearch: (search: Record<string, unknown>): TaskSearch => {
    const bucket = asString(search["bucket"]);
    return {
      scope: search["scope"] === "all" ? "all" : "mine",
      view: search["view"] === "completed" ? "completed" : "outstanding",
      bucket:
        bucket && ["overdue", "today", "upcoming"].includes(bucket)
          ? (bucket as TaskSearch["bucket"])
          : undefined,
      staff: asString(search["staff"]),
      priority: asString(search["priority"]),
      category: asString(search["category"]),
      client: asString(search["client"]),
    };
  },
  head: () => ({
    meta: [
      { title: "Tasks & Action Items — FredFit Portal" },
      {
        name: "description",
        content:
          "Outstanding action items across Fredericksburg Fitness Studio, visible only to the staff authorized to see them.",
      },
      { property: "og:title", content: "Tasks & Action Items — FredFit Portal" },
      {
        property: "og:description",
        content: "Permission-controlled action items for FFS staff and leadership.",
      },
    ],
  }),
  component: TasksPage,
});

function Section({
  title,
  tasks,
  emphasise,
}: {
  title: string;
  tasks: Task[];
  emphasise?: boolean;
}) {
  return (
    <section className="surface-card p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <TaskList tasks={tasks} {...(emphasise ? { emphasise: true } : {})} />
    </section>
  );
}

function TasksPage() {
  useDemoData();
  const session = useSession();
  const navigate = useNavigate({ from: "/tasks" });
  const search = Route.useSearch();
  const [adding, setAdding] = useState(false);

  const admin = isTaskAdmin(session.staffId);
  const scope = admin ? (search.scope ?? "mine") : "mine";
  const view = search.view ?? "outstanding";
  const staffFilter = admin ? (search.staff ?? "") : "";

  const tasks = listVisibleTasks(session.staffId, {
    status: view === "completed" ? "complete" : "outstanding",
    // Non-admins already only ever receive their own + shared tasks, so no
    // assignee filter is applied for them — otherwise shared tasks vanish.
    ...(admin && scope === "mine" ? { assignedStaffId: session.staffId } : {}),
    ...(staffFilter ? { assignedStaffId: staffFilter } : {}),
    ...(search.priority ? { priority: search.priority as Task["priority"] } : {}),
    ...(search.category ? { category: search.category as TaskCategory } : {}),
    ...(search.client ? { clientId: search.client } : {}),
  });

  const groups = groupTasks(tasks, DEMO_TODAY);
  const bucket = search.bucket;

  function update(patch: Partial<TaskSearch>) {
    void navigate({ to: ".", search: (prev) => ({ ...prev, ...patch }) });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Work management"
        title="Tasks & Action Items"
        description={
          admin
            ? "Every outstanding action item at FFS. Staff only ever see their own tasks and anything shared with them."
            : "Your action items, plus anything shared with you. Other staff members' tasks stay private."
        }
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Add Task
          </Button>
        }
      />

      <div className="surface-card flex flex-wrap items-end gap-3 p-4">
        <div className="flex gap-2">
          <Button
            variant={scope === "mine" ? "default" : "outline"}
            size="sm"
            onClick={() => update({ scope: "mine", staff: undefined })}
          >
            My Tasks
          </Button>
          {admin ? (
            <Button
              variant={scope === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => update({ scope: "all" })}
            >
              All Tasks
            </Button>
          ) : null}
          <Button
            variant={view === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() =>
              update({ view: view === "completed" ? "outstanding" : "completed", bucket: undefined })
            }
          >
            Completed
          </Button>
        </div>

        {admin && scope === "all" ? (
          <label className="text-xs text-muted-foreground">
            <span className="mb-1 block uppercase tracking-wider">Staff member</span>
            <select
              className={fieldClass}
              value={staffFilter}
              onChange={(e) => update({ staff: e.target.value || undefined })}
            >
              <option value="">Everyone</option>
              {repository.listStaff().map((s) => (
                <option key={s.id} value={s.id}>
                  {staffDisplayName(s)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="text-xs text-muted-foreground">
          <span className="mb-1 block uppercase tracking-wider">Priority</span>
          <select
            className={fieldClass}
            value={search.priority ?? ""}
            onChange={(e) => update({ priority: e.target.value || undefined })}
          >
            <option value="">Any</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </label>

        <label className="text-xs text-muted-foreground">
          <span className="mb-1 block uppercase tracking-wider">Category</span>
          <select
            className={fieldClass}
            value={search.category ?? ""}
            onChange={(e) => update({ category: e.target.value || undefined })}
          >
            <option value="">Any</option>
            {TASK_CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {TASK_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-muted-foreground">
          <span className="mb-1 block uppercase tracking-wider">Client</span>
          <select
            className={fieldClass}
            value={search.client ?? ""}
            onChange={(e) => update({ client: e.target.value || undefined })}
          >
            <option value="">Any</option>
            {repository.listClients().map((c) => (
              <option key={c.id} value={c.id}>
                {clientDisplayName(c)}
              </option>
            ))}
          </select>
        </label>

        {bucket ? (
          <Button variant="ghost" size="sm" onClick={() => update({ bucket: undefined })}>
            Clear “{bucket}” filter
          </Button>
        ) : null}
      </div>

      {view === "completed" ? (
        <Section title="Completed" tasks={tasks} />
      ) : (
        <div className="space-y-4">
          {(!bucket || bucket === "overdue") && (
            <Section title="Overdue" tasks={groups.overdue} emphasise />
          )}
          {(!bucket || bucket === "today") && (
            <Section title="Due Today" tasks={groups.dueToday} />
          )}
          {(!bucket || bucket === "upcoming") && (
            <Section title="Upcoming" tasks={groups.upcoming} />
          )}
          {!bucket && <Section title="No Due Date" tasks={groups.noDueDate} />}
        </div>
      )}

      {adding ? <TaskFormDialog open={adding} onOpenChange={setAdding} /> : null}
    </div>
  );
}
