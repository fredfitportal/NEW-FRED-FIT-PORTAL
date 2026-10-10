import { StatusPill } from "@/components/app/StatusPill";
import {
  currentCycle,
  cycleStatus,
  lastCompletedCycle,
  listAssignments,
  isAssignmentDone,
  reviewForCycle,
  todayIso,
} from "@/lib/domain/assessments";
import { CYCLE_STATUS_LABELS } from "@/lib/domain/assessment-types";
import { listOnboardingCases } from "@/lib/domain/operations";
import { assignedStaffFor, formatDate, repository, serviceById, staffDisplayName } from "@/lib/domain/repository";
import type { Client } from "@/lib/domain/types";

/**
 * Compact operational snapshot shown above every client tab. Deliberately
 * short — it answers "who is this, where are they in the cycle, is anything
 * unsafe" and nothing else.
 */
export function ClientSummaryHeader({ client }: { client: Client }) {
  const today = todayIso();
  const cycle = currentCycle(client.id);
  const review = cycle ? reviewForCycle(cycle.id) : undefined;
  const last = lastCompletedCycle(client.id);
  const assignments = listAssignments(client.id);
  const outstanding = assignments.filter((a) => !isAssignmentDone(a));
  const onboarding = listOnboardingCases().find((c) => c.clientId === client.id);
  const primaryStaff = assignedStaffFor(client.id)[0]?.staff;
  const services = repository
    .listEnrollments(client.id)
    .map((e) => serviceById(e.serviceId)?.name)
    .filter(Boolean) as string[];
  const alerts = client.alerts;

  const items: { label: string; value: string }[] = [
    { label: "Services", value: services.length ? services.join(", ") : "None enrolled" },
    { label: "Primary practitioner", value: primaryStaff ? staffDisplayName(primaryStaff) : "Unassigned" },
    {
      label: "Onboarding",
      value: onboarding
        ? `${onboarding.pathway === "apparatix" ? "Apparatix 3-step" : "Comprehensive 5-step"} · ${onboarding.status}`
        : "Not in onboarding",
    },
    {
      label: "Assessment plan",
      value: outstanding.length
        ? `${outstanding.length} outstanding of ${assignments.length}`
        : assignments.length
          ? "All assigned assessments complete"
          : "No assessments assigned",
    },
    {
      label: "Last reassessment",
      value: last ? formatDate(last.completedDate) : "—",
    },
    {
      label: "Next reassessment due",
      value: cycle ? formatDate(cycle.dueDate) : last?.nextDueDate ? formatDate(last.nextDueDate) : "—",
    },
    {
      label: "Quarterly Results Review",
      value: review
        ? review.status === "scheduled" && review.scheduledDate
          ? `Scheduled ${formatDate(review.scheduledDate)}`
          : review.status.replace(/_/g, " ")
        : "—",
    },
  ];

  return (
    <section className="surface-card space-y-3 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <StatusPill status={client.status} />
        {cycle ? (
          <StatusPill
            label={CYCLE_STATUS_LABELS[cycleStatus(cycle, today)]}
            tone={cycleStatus(cycle, today) === "overdue" ? "critical" : "info"}
          />
        ) : null}
        {alerts.map((a) => (
          <StatusPill key={a} label={a} tone="critical" />
        ))}
      </div>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.label}>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {i.label}
            </dt>
            <dd className="text-sm text-foreground">{i.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
