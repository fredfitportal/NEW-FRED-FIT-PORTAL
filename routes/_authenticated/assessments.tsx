import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/PageHeader";
import { StatusPill } from "@/components/app/StatusPill";
import { TemplateBuilderDialog } from "@/components/app/assessments/TemplateBuilderDialog";
import { fieldClass } from "@/components/app/form-primitives";
import { Button } from "@/components/ui/button";
import { useDemoData } from "@/hooks/useDemoData";
import {
  CYCLE_STATUS_LABELS,
  TEMPLATE_LIFECYCLE_LABELS,
  type QuarterlyCycleStatus,
} from "@/lib/domain/assessment-types";
import {
  duplicateTemplate,
  listTemplates,
  setTemplateLifecycle,
  reassessmentQueue,
  reminders,
  todayIso,
} from "@/lib/domain/assessments";
import { clientDisplayName, formatDate, repository, serviceById, staffDisplayName } from "@/lib/domain/repository";
import { useSession } from "@/lib/domain/session";

export const Route = createFileRoute("/_authenticated/assessments")({
  head: () => ({
    meta: [
      { title: "Reassessment & Results Review Queue — FredFit Portal" },
      {
        name: "description",
        content:
          "Leadership work queue for Fredericksburg Fitness Studio quarterly reassessments, outstanding assessments and virtual Quarterly Results Reviews.",
      },
      { property: "og:title", content: "Reassessment & Results Review Queue — FredFit Portal" },
      {
        property: "og:description",
        content: "Track every FFS client's quarterly reassessment cycle and results review in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssessmentsQueuePage,
});

const STATUS_ORDER: QuarterlyCycleStatus[] = [
  "overdue",
  "due",
  "due_soon",
  "scheduled",
  "partially_completed",
  "assessments_completed",
  "results_review_needed",
  "results_review_scheduled",
  "upcoming",
  "complete",
];

function AssessmentsQueuePage() {
  useDemoData();
  const session = useSession();
  const today = todayIso();
  const canManageTemplates = session.can("assessment_templates.manage");

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("all");
  const [practitioner, setPractitioner] = useState("all");
  const [locationId, setLocationId] = useState("all");
  const [serviceId, setServiceId] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const queue = reassessmentQueue(today);
  const allReminders = reminders(undefined, today);

  const rows = useMemo(
    () =>
      queue.filter((row) => {
        const client = repository.getClient(row.clientId);
        if (!client) return false;
        if (status !== "all" && row.status !== status) return false;
        if (practitioner !== "all" && !row.practitionerIds.includes(practitioner)) return false;
        if (locationId !== "all" && client.primaryLocationId !== locationId) return false;
        if (serviceId !== "all") {
          const enrolled = repository.listEnrollments(client.id).some((e) => e.serviceId === serviceId);
          if (!enrolled) return false;
        }
        if (from && (row.dueDate ?? "") < from) return false;
        if (to && (row.dueDate ?? "") > to) return false;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          if (!clientDisplayName(client).toLowerCase().includes(q)) return false;
        }
        return true;
      }),
    [queue, status, practitioner, locationId, serviceId, from, to, search],
  );

  const counts = STATUS_ORDER.map((s) => ({
    status: s,
    count: queue.filter((r) => r.status === s).length,
  })).filter((c) => c.count > 0);

  if (!session.can("assessments.view")) {
    return (
      <p className="surface-card p-6 text-sm text-muted-foreground">
        Your role does not have access to assessment information.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Leadership"
        title="Reassessment & Results Review Queue"
        description="Every client's quarterly cycle in one place, so nobody quietly drifts past their reassessment window."
        actions={
          <span className="text-xs text-muted-foreground">
            {listTemplates().length} assessment templates in the library
          </span>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {counts.map((c) => (
          <button
            key={c.status}
            onClick={() => setStatus(c.status === status ? "all" : c.status)}
            className={`surface-card p-4 text-left transition hover:border-primary/40 ${
              status === c.status ? "border-primary/60" : ""
            }`}
          >
            <p className="text-2xl font-semibold text-foreground">{c.count}</p>
            <p className="text-xs text-muted-foreground">{CYCLE_STATUS_LABELS[c.status]}</p>
          </button>
        ))}
      </div>

      <section className="surface-card space-y-3 p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <input
            className={fieldClass}
            placeholder="Search client"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className={fieldClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {CYCLE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select className={fieldClass} value={practitioner} onChange={(e) => setPractitioner(e.target.value)}>
            <option value="all">All practitioners</option>
            {repository.listStaff().map((s) => (
              <option key={s.id} value={s.id}>
                {staffDisplayName(s)}
              </option>
            ))}
          </select>
          <select className={fieldClass} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="all">All locations</option>
            {repository.listLocations().map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select className={fieldClass} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="all">All services</option>
            {repository.listServices().map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className={fieldClass} value={from} onChange={(e) => setFrom(e.target.value)} />
            <input type="date" className={fieldClass} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="surface-card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Cycle status</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Assessments</th>
              <th className="px-4 py-3">Practitioners</th>
              <th className="px-4 py-3">Results review</th>
              <th className="px-4 py-3">Next due</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const client = repository.getClient(row.clientId)!;
              const review = row.review;
              return (
                <tr key={row.cycle?.id ?? row.clientId} className="border-b border-border/60">
                  <td className="px-4 py-3">
                    <Link
                      to="/clients/$clientId"
                      params={{ clientId: client.id }}
                      className="font-medium text-foreground hover:underline"
                    >
                      {clientDisplayName(client)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill
                      label={CYCLE_STATUS_LABELS[row.status]}
                      tone={
                        row.status === "overdue"
                          ? "critical"
                          : row.status === "due"
                            ? "warning"
                            : row.status === "complete"
                              ? "positive"
                              : "info"
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.dueDate ? formatDate(row.dueDate) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.requiredDone}/{row.requiredTotal} required complete
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.practitionerIds.length
                      ? row.practitionerIds
                          .map((id) => {
                            const s = repository.getStaff(id);
                            return s ? staffDisplayName(s) : null;
                          })
                          .filter(Boolean)
                          .join(", ")
                      : "Unassigned"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {review
                      ? review.status === "scheduled" && review.scheduledDate
                        ? `${formatDate(review.scheduledDate)}${review.scheduledTime ? ` ${review.scheduledTime}` : ""}`
                        : review.status.replace(/_/g, " ")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.nextDueDate ? formatDate(row.nextDueDate) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/clients/$clientId" params={{ clientId: client.id }}>
                        Open
                      </Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No reassessment cycles match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="surface-card p-6">
        <h2 className="text-base font-semibold text-foreground">Attention & reminders</h2>
        <ul className="mt-3 space-y-2">
          {allReminders.length ? (
            allReminders.map((r, i) => {
              const client = repository.getClient(r.clientId);
              if (!client) return null;
              return (
                <li key={`${r.kind}-${r.clientId}-${i}`} className="flex flex-wrap items-center gap-3 text-sm">
                  <StatusPill
                    label={r.label}
                    tone={r.tone === "critical" ? "critical" : r.tone === "warning" ? "warning" : "info"}
                  />
                  <Link
                    to="/clients/$clientId"
                    params={{ clientId: client.id }}
                    className="text-foreground hover:underline"
                  >
                    {clientDisplayName(client)}
                  </Link>
                  {r.dueDate ? (
                    <span className="text-muted-foreground">{formatDate(r.dueDate)}</span>
                  ) : null}
                </li>
              );
            })
          ) : (
            <li className="text-sm text-muted-foreground">Nothing needs attention right now.</li>
          )}
        </ul>
      </section>

      <section className="surface-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Assessment template library</h2>
          {canManageTemplates ? (
            <Button
              size="sm"
              onClick={() => {
                setEditingTemplateId(null);
                setBuilderOpen(true);
              }}
            >
              New assessment template
            </Button>
          ) : null}
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {listTemplates({ includeInactive: canManageTemplates }).map((t) => {
            const lifecycle = t.lifecycle ?? (t.isActive ? "active" : "archived");
            return (
              <li key={t.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-foreground">{t.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      v{t.currentVersion} · {TEMPLATE_LIFECYCLE_LABELS[lifecycle]}
                      {t.reassessmentDefault ? " · reassessment default" : ""}
                    </span>
                  </div>
                  {canManageTemplates ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingTemplateId(t.id);
                          setBuilderOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          duplicateTemplate(t.id);
                          toast.success(`${t.name} duplicated as a draft`);
                        }}
                      >
                        Duplicate
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const next = lifecycle === "archived" ? "active" : "archived";
                          setTemplateLifecycle(t.id, next);
                          toast.success(`${t.name} ${next === "archived" ? "archived" : "reactivated"}`);
                        }}
                      >
                        {lifecycle === "archived" ? "Reactivate" : "Archive"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {canManageTemplates ? (
        <TemplateBuilderDialog
          open={builderOpen}
          onOpenChange={(open) => {
            setBuilderOpen(open);
            if (!open) setEditingTemplateId(null);
          }}
          templateId={editingTemplateId}
        />
      ) : null}
    </div>
  );
}
