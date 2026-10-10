import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, CalendarClock, CalendarPlus, Pencil, Ticket, Video } from "lucide-react";
import { useEffect, useState } from "react";

import { AppointmentDetailsDialog } from "@/components/app/AppointmentDetailsDialog";
import { AppointmentFormDialog } from "@/components/app/AppointmentFormDialog";
import { ClientFormDialog } from "@/components/app/ClientFormDialog";
import { CreditIssueDialog } from "@/components/app/CreditIssueDialog";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";
import { ClientIntakePanel } from "@/components/app/ClientIntakePanel";
import { MakeupLedgerPanel } from "@/components/app/MakeupLedgerPanel";
import { ProfileTasksPanel } from "@/components/app/tasks/ProfileTasksPanel";
import { ClientAssessmentsPanel } from "@/components/app/assessments/ClientAssessmentsPanel";
import { ClientSummaryHeader } from "@/components/app/assessments/ClientSummaryHeader";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusPill } from "@/components/app/StatusPill";
import {
  ASSIGNMENT_ROLE_LABELS,
  CREDIT_DIRECTION_LABELS,
  appointmentHistory,
  attendanceSummary,
  assignedStaffFor,
  clientDisplayName,
  creditBalances,
  formatDate,
  formatTime,
  formatUsd,
  locationById,
  recurrenceLabel,
  repository,
  serviceById,
  staffDisplayName,
  upcomingAppointments,
} from "@/lib/domain/repository";
import { Button } from "@/components/ui/button";
import { useDemoData } from "@/hooks/useDemoData";
import { makeupSummary } from "@/lib/domain/makeups";

import { appointmentIncludesClient, clientStatusFor, isSharedSession } from "@/lib/domain/sessions";
import { useSession } from "@/lib/domain/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/clients/$clientId")({
  head: () => ({
    meta: [
      { title: "Client record — FredFit Portal" },
      {
        name: "description",
        content:
          "Client profile at Fredericksburg Fitness Studio: overview, services, assessments, progress, documents and notes.",
      },
      { property: "og:title", content: "Client record — FredFit Portal" },
      { property: "og:description", content: "One canonical client record for every FFS module." },
    ],
  }),
  component: ClientProfile,
  notFoundComponent: ClientMissing,
});

function ClientMissing() {
  return (
    <div className="surface-card p-10 text-center">
      <h1 className="text-xl font-semibold">Client not found</h1>
      <Link to="/clients" className="mt-4 inline-block text-sm text-primary hover:underline">
        Back to clients
      </Link>
    </div>
  );
}

const TABS = [
  "Overview",
  "Schedule & Credits",
  "Intake & Onboarding",
  "Health & Safety",
  "Assessments",
  "Exercise",
  "Services",
  "Progress",
  "Documents",
  "Notes",
] as const;
type Tab = (typeof TABS)[number];

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface-card p-6">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ClientProfile() {
  useDemoData();
  const session = useSession();
  const { clientId } = Route.useParams();
  const [tab, setTab] = useState<Tab>("Overview");
  const [editOpen, setEditOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  // Demo records live in the browser store, so the server render of a
  // client-created record legitimately has no row yet.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const client = repository.getClient(clientId);
  // The demo store lives in the browser, so the server cannot know about
  // records created in this session. Render the record only after hydration.
  if (!hydrated) {
    return (
      <div className="surface-card p-10 text-center text-sm text-muted-foreground">
        Loading client record…
      </div>
    );
  }
  if (!client) throw notFound();

  const team = assignedStaffFor(client.id);
  const enrollments = repository.listEnrollments(client.id);
  const next = upcomingAppointments(client.id)[0];
  const balances = creditBalances(client.id);
  const makeups = makeupSummary(client.id);

  const instances = repository.listAssessmentInstances(client.id);
  const membership = undefined;

  return (
    <div className="space-y-8">
      <Link
        to="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Clients
      </Link>

      <PageHeader
        eyebrow={`${client.clientNumber} · joined ${formatDate(client.dateJoined)}`}
        title={clientDisplayName(client)}
        description={client.goals}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setEditOpen(true)}
              disabled={!session.can("clients.edit")}
            >
              <Pencil className="size-4" /> Edit Client
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setTab("Schedule & Credits");
                requestAnimationFrame(() =>
                  document.getElementById("makeups")?.scrollIntoView({ behavior: "smooth" }),
                );
              }}
            >
              <Ticket className="size-4" /> View Make-Ups ({makeups.available})
            </Button>
            <Button
              onClick={() => setScheduleOpen(true)}
              disabled={!session.can("scheduling.manage")}
            >
              <CalendarPlus className="size-4" /> Schedule Appointment
            </Button>

            <StatusPill status={client.status} />
            <StatusPill
              status={client.onboardingStatus}
              label={`Onboarding: ${client.onboardingStatus.replace(/_/g, " ")}`}
            />
          </>
        }
      />

      {editOpen ? (
        <ClientFormDialog open={editOpen} onOpenChange={setEditOpen} client={client} />
      ) : null}
      {scheduleOpen ? (
        <AppointmentFormDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          clientId={client.id}
          onSaved={() => setTab("Schedule & Credits")}
        />
      ) : null}
      {creditOpen ? (
        <CreditIssueDialog open={creditOpen} onOpenChange={setCreditOpen} clientId={client.id} />
      ) : null}
      <AppointmentDetailsDialog appointmentId={detailsId} onOpenChange={() => setDetailsId(null)} />

      {client.alerts.length ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-warning/35 bg-warning/12 px-5 py-4">
          <AlertTriangle className="size-4 text-warning-foreground" />
          <div className="text-sm text-warning-foreground">
            <span className="font-semibold">Important alerts: </span>
            {client.alerts.join(" · ")}
          </div>
        </div>
      ) : null}

      <ClientSummaryHeader client={client} />

      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 rounded-t-xl px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title="Client details">
            <dl className="space-y-3 text-sm">
              {[
                ["Preferred name", client.preferredName ?? client.firstName],
                ["Date of birth", formatDate(client.dateOfBirth)],
                ["Phone", client.phone ?? "—"],
                ["Primary location", locationById(client.primaryLocationId)?.name ?? "—"],
                ["Status", client.status],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <dt className="w-36 shrink-0 text-muted-foreground">{label}</dt>
                  <dd className="capitalize text-foreground">{value}</dd>
                </div>
              ))}
              <div className="flex gap-3">
                <dt className="w-36 shrink-0 text-muted-foreground">Email</dt>
                <dd className="break-all text-foreground">{client.email}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Care team">
            <ul className="space-y-3">
              {team.length ? (
                team.map(({ assignment, staff }) => (
                  <li key={assignment.id} className="flex items-center justify-between gap-3">
                    <Link
                      to="/team/$staffId"
                      params={{ staffId: staff.id }}
                      className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {staffDisplayName(staff)}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {ASSIGNMENT_ROLE_LABELS[assignment.assignmentRole]}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">No assignments yet.</li>
              )}
            </ul>
          </Panel>

          <Panel title="Scheduling & account summary">
            <div className="space-y-4 text-sm">
              <div className="rounded-xl bg-muted/60 px-4 py-3">
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <CalendarClock className="size-4 text-primary" /> Next appointment
                </p>
                {next ? (
                  <p className="mt-1 text-muted-foreground">
                    {serviceById(next.serviceId)?.name} · {formatDate(next.date)} at{" "}
                    {formatTime(next.startTime)}
                    {next.appointmentType === "virtual" ? (
                      <span className="mt-1 flex items-center gap-1 text-info">
                        <Video className="size-3.5" /> Virtual (Google Meet)
                      </span>
                    ) : null}
                  </p>
                ) : (
                  <p className="mt-1 text-muted-foreground">Nothing scheduled.</p>
                )}
              </div>

              <div>
                <p className="font-medium text-foreground">Available credits</p>
                <ul className="mt-2 space-y-1.5">
                  {balances.length ? (
                    balances.map((b) => (
                      <li key={b.creditType.id} className="flex justify-between text-muted-foreground">
                        <span>{b.creditType.name}</span>
                        <span className="font-medium tabular-nums text-foreground">
                          {b.balance} · {formatUsd(b.valueUsd)}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">No credit activity.</li>
                  )}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  Balances are calculated from the credit ledger, never from an editable field.
                </p>
              </div>

              <div className="rounded-xl border border-border px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium text-foreground">Current Make-Ups</p>
                  <span className="text-2xl font-semibold tabular-nums text-primary">
                    {makeups.available}
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {makeups.all
                    .filter((m) => m.status === "available")
                    .slice(0, 3)
                    .map((m) => (
                      <li key={m.id}>
                        {formatDate(m.issuedDate)} — Available — Expires{" "}
                        {formatDate(m.expirationDate)}
                      </li>
                    ))}
                  {makeups.available === 0 ? <li>No current make-ups available.</li> : null}
                </ul>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 px-0"
                  onClick={() => {
                    setTab("Schedule & Credits");
                    requestAnimationFrame(() =>
                      document.getElementById("makeups")?.scrollIntoView({ behavior: "smooth" }),
                    );
                  }}
                >
                  View Make-Ups
                </Button>

              </div>

              <div>
                <p className="font-medium text-foreground">Outstanding documentation</p>
                <p className="mt-1 text-muted-foreground">
                  {repository
                    .listAppointments()
                    .filter((a) => appointmentIncludesClient(a, client.id) && a.documentationStatus === "pending")
                    .length}{" "}
                  item(s) due
                </p>
              </div>
            </div>
          </Panel>

          <div className="lg:col-span-2">
            <Panel title="Active services">
              <ul className="space-y-2">
                {enrollments
                  .filter((e) => e.status === "active")
                  .map((e) => (
                    <li
                      key={e.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/60 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {serviceById(e.serviceId)?.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{e.frequency ?? "—"}</span>
                      <StatusPill status={e.status} />
                    </li>
                  ))}
                {enrollments.filter((e) => e.status === "active").length === 0 ? (
                  <li className="text-sm text-muted-foreground">No active service enrollments.</li>
                ) : null}
              </ul>
            </Panel>
          </div>

          <ProfileTasksPanel clientId={client.id} />

          <Panel title="Recent activity">
            <ul className="space-y-3 text-sm">
              {repository
                .listAuditLog()
                .filter((a) => a.entityType === "client" && a.entityId === client.id)
                .map((a) => (
                  <li key={a.id} className="text-muted-foreground">
                    {a.summary} · {formatDate(a.occurredAt)}
                  </li>
                ))}
              <li className="text-xs text-muted-foreground">
                A richer activity feed (sessions, notes, messages, documents) arrives with the
                modules that generate those events.
              </li>
            </ul>
          </Panel>
        </div>
      ) : null}

      {tab === "Schedule & Credits" ? (
        <div className="space-y-6">
          <MakeupLedgerPanel clientId={client.id} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {(() => {
              const s = attendanceSummary(client.id);
              return [
                { label: "Past appointments", value: s.total },
                { label: "Attended", value: s.attended },
                { label: "No Shows", value: s.noShow, alert: true },
                { label: "Late Cancels", value: s.lateCancel },
                { label: "Early Cancels", value: s.earlyCancel },
              ];
            })().map((s) => (
              <div key={s.label} className="surface-card p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p
                  className={cn(
                    "mt-1 text-2xl font-semibold tabular-nums text-foreground",
                    s.alert && s.value > 0 && "text-destructive",
                  )}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          <Panel title="Recurring schedule & agreements">
            <ul className="space-y-3 text-sm">
              {repository.listRecurringAppointments(client.id).map((r) => {
                const agreement = r.serviceAgreementId
                  ? repository
                      .listServiceAgreements(client.id)
                      .find((a) => a.id === r.serviceAgreementId)
                  : undefined;
                return (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/60 px-4 py-3"
                  >
                    <span className="font-medium text-foreground">
                      {serviceById(r.serviceId)?.name}
                    </span>
                    <span className="text-muted-foreground">
                      {recurrenceLabel(r)} · {formatTime(r.startTime)} ·{" "}
                      {staffDisplayName(repository.getStaff(r.providerStaffId)!)}
                    </span>
                    {agreement ? (
                      <span className="text-xs text-muted-foreground">
                        {agreement.name} · renews {formatDate(agreement.currentTermEnd)} ·{" "}
                        {agreement.autoRenew ? "auto-renew" : "no auto-renew"}
                      </span>
                    ) : null}
                    <StatusPill status={r.status} />
                  </li>
                );
              })}
              {repository.listRecurringAppointments(client.id).length === 0 ? (
                <li className="text-muted-foreground">No recurring series.</li>
              ) : null}
            </ul>
          </Panel>

          <Panel title="Appointment & attendance history">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Service</th>
                    <th className="py-2 pr-4 font-medium">Provider</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {appointmentHistory(client.id).map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => setDetailsId(a.id)}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-muted/60",
                        clientStatusFor(a, client.id) === "no_show" && "bg-destructive/8",
                      )}
                    >
                      <td className="py-3 pr-4 text-foreground">
                        {formatDate(a.date)}
                        <span className="block text-xs tabular-nums text-muted-foreground">
                          {formatTime(a.startTime)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {serviceById(a.serviceId)?.name}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {staffDisplayName(repository.getStaff(a.providerStaffId)!)}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusPill status={clientStatusFor(a, client.id)} />
                        {isSharedSession(a) ? (
                          <span className="mt-1 block text-[11px] uppercase tracking-wide text-muted-foreground">
                            Shared session · this client&apos;s status
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {a.cancellationReason ??
                          (a.cancellationNoticeHours != null
                            ? `${a.cancellationNoticeHours}h notice`
                            : "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCreditOpen(true)}
              disabled={!session.isLeadership}
            >
              <Ticket className="size-4" /> Authorize makeup / credit
            </Button>
          </div>

          <Panel title="Credit ledger">
            <p className="text-sm text-muted-foreground">
              Balances are always derived from this ledger. Credits are tied to their service line,
              are not cash, and are not transferable between services. Dollar figures are reference
              values only. Corrections appear as new rows — history is never rewritten.
            </p>
            <div className="mt-4 space-y-6">
              {balances.length ? (
                balances.map((b) => (
                  <div key={b.creditType.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {b.creditType.name}
                      </h3>
                      <span className="text-sm tabular-nums text-foreground">
                        Balance {b.balance} · {formatUsd(b.valueUsd)} reference value
                      </span>
                    </div>
                    <ul className="mt-2 divide-y divide-border text-sm">
                      {b.transactions.map((t) => (
                        <li key={t.id} className="flex flex-wrap items-center gap-3 py-2">
                          <span className="w-28 shrink-0 text-xs text-muted-foreground">
                            {formatDate(t.transactionDate)}
                          </span>
                          <span
                            className={cn(
                              "w-10 shrink-0 font-semibold tabular-nums",
                              t.amount >= 0 ? "text-success" : "text-muted-foreground",
                            )}
                          >
                            {t.amount > 0 ? `+${t.amount}` : t.amount}
                          </span>
                          <span className="flex-1 text-muted-foreground">{t.reason}</span>
                          <StatusPill
                            tone="info"
                            label={CREDIT_DIRECTION_LABELS[t.direction] ?? t.direction}
                          />
                          {t.isLeadershipOverride ? (
                            <StatusPill tone="warning" label="Leadership override" />
                          ) : null}
                          <StatusPill status={t.status} />
                          <span className="w-full text-xs text-muted-foreground">
                            {t.authorizedByStaffId
                              ? `Authorized by ${staffDisplayName(repository.getStaff(t.authorizedByStaffId)!)} · `
                              : ""}
                            {t.createdByStaffId
                              ? `Recorded by ${staffDisplayName(repository.getStaff(t.createdByStaffId)!)}`
                              : ""}
                            {t.expiresOn ? ` · expires ${formatDate(t.expiresOn)}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No credit activity.</p>
              )}
            </div>
          </Panel>
        </div>
      ) : null}

      {tab === "Intake & Onboarding" ? <ClientIntakePanel client={client} /> : null}

      {tab === "Health & Safety" ? (
        <ModulePlaceholder
          title="Health & Safety"
          summary="Health history architecture is intentionally deferred. This phase only records important alerts on the client record so staff see safety-critical information immediately."
          planned={[
            "Health history intake",
            "Diagnoses and conditions",
            "Injuries and surgical history",
            "Medications",
            "Precautions and contraindications",
            "Physician and referral information",
          ]}
        >
          <div className="rounded-xl bg-muted/60 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">Current alerts on file</p>
            <p className="mt-1 text-muted-foreground">
              {client.alerts.length ? client.alerts.join(" · ") : "None recorded."}
            </p>
          </div>
        </ModulePlaceholder>
      ) : null}

      {tab === "Assessments" ? (
        <div className="space-y-6">
          <ClientAssessmentsPanel client={client} />

          {instances.length ? (
            <Panel title="Legacy assessment history">
              <ul className="divide-y divide-border">
                {instances.map((i) => {
                  const type = repository
                    .listAssessmentTypes()
                    .find((t) => t.id === i.assessmentTypeId);
                  const assessor = repository.getStaff(i.assessorStaffId);
                  return (
                    <li key={i.id} className="flex flex-wrap items-center gap-3 py-3">
                      <span className="w-32 shrink-0 text-sm font-medium text-foreground">
                        {formatDate(i.assessmentDate)}
                      </span>
                      <span className="flex-1 text-sm text-foreground">{type?.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {i.sequenceLabel} · {assessor ? staffDisplayName(assessor) : "—"}
                        {i.overallScore != null ? ` · composite ${i.overallScore}` : ""}
                      </span>
                      <StatusPill status={i.status} />
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                Records captured before the assessment engine. Kept read-only so history stays intact.
              </p>
            </Panel>
          ) : null}
        </div>
      ) : null}

      {tab === "Exercise" ? (
        <ModulePlaceholder
          title="Exercise"
          summary="Programming for this client will live here once the exercise engine is built. Programs will reference the shared exercise library and this same client record."
          planned={[
            "Current exercise program",
            "Previous programs",
            "Assigned homework",
            "Exercise history",
            "Corrective exercises",
            "Program templates applied to this client",
          ]}
        />
      ) : null}

      {tab === "Services" ? (
        <div className="space-y-6">
          <Panel title="Service enrollments">
            <ul className="space-y-2">
              {enrollments.map((e) => {
                const service = serviceById(e.serviceId);
                const providers = e.providerStaffIds
                  .map((id) => repository.getStaff(id))
                  .filter(Boolean);
                return (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{service?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(e.startDate)}
                        {e.endDate ? ` – ${formatDate(e.endDate)}` : ""} ·{" "}
                        {providers.map((p) => staffDisplayName(p!)).join(", ") || "No provider"}
                        {e.frequency ? ` · ${e.frequency}` : ""}
                      </p>
                    </div>
                    <StatusPill status={e.status} />
                  </li>
                );
              })}
              {enrollments.length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  This client is not enrolled in any service yet.
                </li>
              ) : null}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Only services this client is actually enrolled in appear here — Medical Exercise,
              Nutrition, Recovery and Apparatix never clutter profiles that do not use them.
            </p>
          </Panel>

          {balances.length ? (
            <Panel title="Credit ledger">
              <div className="space-y-5">
                {balances.map((b) => (
                  <div key={b.creditType.id}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{b.creditType.name}</p>
                      <p className="text-sm font-semibold tabular-nums text-primary">
                        {b.balance} available
                      </p>
                    </div>
                    <ul className="mt-2 divide-y divide-border text-xs">
                      {b.transactions.map((t) => (
                        <li key={t.id} className="flex flex-wrap items-center gap-3 py-2">
                          <span
                            className={cn(
                              "w-10 shrink-0 font-semibold tabular-nums",
                              t.amount > 0 ? "text-success" : "text-muted-foreground",
                            )}
                          >
                            {t.amount > 0 ? `+${t.amount}` : t.amount}
                          </span>
                          <span className="flex-1 text-foreground/80">{t.reason}</span>
                          <span className="text-muted-foreground">
                            {t.expiresOn ? `expires ${formatDate(t.expiresOn)}` : "no expiration"}
                          </span>
                          <StatusPill status={t.status} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}
        </div>
      ) : null}

      {tab === "Progress" ? (
        <ModulePlaceholder
          title="Progress"
          summary="Repeated measurements are already stored as dated assessment instances, so longitudinal charts can be built without any data migration. Visualization arrives in a later phase."
          planned={[
            "Body composition trends (weight, SMM, body fat, visceral fat, phase angle, ECW/TBW)",
            "FMS composite and per-movement score trends",
            "Mobility, strength and balance measures",
            "Pilates / Apparatix level progression",
            "Assessment-to-assessment comparison",
            "Milestones and goal progress",
            "Qualitative wins recorded by practitioners",
          ]}
          footnote="No qualitative progress statements are fabricated for demo clients. Practitioner-recorded wins will appear here once that capture flow exists."
        />
      ) : null}

      {tab === "Documents" ? (
        <ModulePlaceholder
          title="Documents"
          summary="Documents and media are recorded through a storage-provider-neutral attachment table. Files reference a provider plus an object key, so AWS S3 (or any other provider) can be adopted later without changing the client record."
          planned={[
            "Uploaded intake and consent forms",
            "Assessment reports",
            "Nutrition session summaries",
            "Superbills (draft, finalized, corrected versions)",
            "Assessment and movement video",
            "Signed / private media access for the client portal",
          ]}
        >
          <div className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            Superbills on file:{" "}
            {repository.listSuperbills(client.id).length
              ? repository
                  .listSuperbills(client.id)
                  .map((s) => `${s.superbillNumber} (${s.status})`)
                  .join(", ")
              : "none"}
          </div>
        </ModulePlaceholder>
      ) : null}

      {tab === "Notes" ? (
        <div className="space-y-6">
          <Panel title="Internal relationship notes">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {client.relationshipNotes ?? "No notes recorded."}
            </p>
          </Panel>
          <ModulePlaceholder
            title="Session documentation"
            summary="Completed appointments will generate the documentation requirement appropriate to the service. The appointment record already carries the documentation requirement and status."
            planned={[
              "Personal Training session notes",
              "Pilates session notes",
              "Medical Exercise structured notes",
              "Massage SOAP notes",
              "Registered Dietitian session summaries",
              "Client-facing summary publishing",
            ]}
          />
        </div>
      ) : null}

      {membership}
    </div>
  );
}
