import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  ClipboardList,
  HeartPulse,
  PhoneCall,
  Plus,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/app/PageHeader";
import { StatusPill } from "@/components/app/StatusPill";
import {
  clientDisplayName,
  formatDate,
  formatTime,
  locationById,
  repository,
  serviceById,
  staffDisplayName,
  todaysAppointments,
} from "@/lib/domain/repository";
import { TaskSummaryCard } from "@/components/app/tasks/TaskSummaryCard";
import { useSession } from "@/lib/domain/session";
import { isTaskAdmin, listVisibleTasks } from "@/lib/domain/tasks";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Home Dashboard — FredFit Portal" },
      {
        name: "description",
        content:
          "Daily operating view for Fredericksburg Fitness Studio: today's schedule, follow-ups, reassessments due and team activity.",
      },
      { property: "og:title", content: "Home Dashboard — FredFit Portal" },
      {
        property: "og:description",
        content: "Today's schedule, follow-ups and studio activity at a glance.",
      },
    ],
  }),
  component: HomeDashboard,
});

function Card({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: typeof Users;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card flex flex-col p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-base font-semibold text-foreground">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
          {title}
        </h2>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}

function HomeDashboard() {
  const session = useSession();
  const appointments = todaysAppointments();
  // Permission-filtered: staff never see other people's action items here.
  const tasks = listVisibleTasks(session.staffId, { status: "outstanding" });
  const clients = repository.listClients();
  const staff = repository.listStaff();
  const audit = repository.listAuditLog().slice(0, 5);

  const stats = [
    { label: "Active clients", value: clients.filter((c) => c.status === "active").length },
    { label: "Sessions today", value: appointments.length },
    { label: "Open tasks", value: tasks.length },
    { label: "Team members", value: staff.length },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Wednesday view"
        title="Good morning, Dana"
        description="Here's how the studio looks today. This dashboard is built to adapt by role — leadership sees organization-wide activity, practitioners see their own clients, sessions and documentation."
        actions={
          <Link
            to="/clients"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" /> Open client roster
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="surface-card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold text-foreground">
              {s.value}
            </p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <TaskSummaryCard scope="mine" />
        {isTaskAdmin(session.staffId) ? <TaskSummaryCard scope="all" /> : null}
      </div>


      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card
            title="Today's Schedule"
            icon={CalendarClock}
            action={
              <Link
                to="/schedule"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Full schedule <ArrowUpRight className="size-3.5" />
              </Link>
            }
          >
            <ul className="divide-y divide-border">
              {appointments.map((a) => {
                const client = repository.getClient(a.clientId);
                const provider = repository.getStaff(a.providerStaffId);
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="w-24 shrink-0 text-sm font-medium tabular-nums text-foreground">
                      {formatTime(a.startTime)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/clients/$clientId"
                        params={{ clientId: a.clientId }}
                        className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {client ? clientDisplayName(client) : "Unknown client"}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {serviceById(a.serviceId)?.name} ·{" "}
                        {provider ? staffDisplayName(provider) : "Unassigned"} ·{" "}
                        {locationById(a.locationId)?.name ?? "—"}
                      </p>
                    </div>
                    <StatusPill status={a.status} />
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        <Card title="Needs Attention" icon={AlertTriangle}>
          <ul className="space-y-3">
            {tasks
              .filter((t) => t.priority === "high")
              .map((t) => (
                <li key={t.id} className="rounded-xl bg-muted/70 px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Due {formatDate(t.dueDate)} · {t.category.replace(/_/g, " ")}
                  </p>
                </li>
              ))}
          </ul>
        </Card>

        <Card title="Client Follow-Up" icon={PhoneCall}>
          <ul className="space-y-3">
            {clients
              .filter((c) => c.status === "prospect" || c.status === "paused" || c.status === "onboarding")
              .map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3">
                  <Link
                    to="/clients/$clientId"
                    params={{ clientId: c.id }}
                    className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {clientDisplayName(c)}
                  </Link>
                  <StatusPill status={c.status} />
                </li>
              ))}
          </ul>
        </Card>

        <Card title="Reassessments Due" icon={ClipboardList}>
          <ul className="space-y-3">
            {tasks
              .filter((t) => t.category === "reassessment")
              .map((t) => (
                <li key={t.id} className="rounded-xl bg-muted/70 px-4 py-3 text-sm">
                  <p className="font-medium text-foreground">{t.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Due {formatDate(t.dueDate)}</p>
                </li>
              ))}
            <li className="text-xs text-muted-foreground">
              Reassessment cadence rules are configurable in Admin in a later phase.
            </li>
          </ul>
        </Card>

        <Card title="Medical Exercise" icon={HeartPulse}>
          <ul className="space-y-3">
            {repository
              .listEnrollments()
              .filter((e) => serviceById(e.serviceId)?.category === "medical_exercise")
              .map((e) => {
                const c = repository.getClient(e.clientId);
                return (
                  <li key={e.id} className="flex items-center justify-between gap-3">
                    <Link
                      to="/clients/$clientId"
                      params={{ clientId: e.clientId }}
                      className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {c ? clientDisplayName(c) : "—"}
                    </Link>
                    <StatusPill status={e.status} />
                  </li>
                );
              })}
          </ul>
        </Card>

        <Card title="Staff" icon={Users}>
          <ul className="space-y-3">
            {staff.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3">
                <Link
                  to="/team/$staffId"
                  params={{ staffId: s.id }}
                  className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                >
                  {staffDisplayName(s)}
                </Link>
                <span className="text-xs text-muted-foreground">{s.jobTitle}</span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="xl:col-span-2">
          <Card title="Recent Activity" icon={ClipboardList}>
            <ul className="divide-y divide-border">
              {audit.map((entry) => (
                <li key={entry.id} className="py-3">
                  <p className="text-sm text-foreground">{entry.summary}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {entry.action} · {formatDate(entry.occurredAt)}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card title="Quick Actions" icon={Plus}>
          <div className="grid gap-2">
            {[
              { label: "View schedule", to: "/schedule" },
              { label: "Client roster", to: "/clients" },
              { label: "Onboarding pipeline", to: "/onboarding" },
              { label: "Assessments", to: "/assessments" },
              { label: "Tasks", to: "/tasks" },
            ].map((q) => (
              <Link
                key={q.to}
                to={q.to}
                className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                {q.label}
                <ArrowUpRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
