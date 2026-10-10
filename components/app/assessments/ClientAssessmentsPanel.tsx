import { useState } from "react";
import { toast } from "sonner";

import { CompleteAssessmentDialog } from "@/components/app/assessments/CompleteAssessmentDialog";
import { DialogFooterBar, Field, fieldClass } from "@/components/app/form-primitives";
import { StatusPill } from "@/components/app/StatusPill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ASSIGNMENT_STATUS_LABELS,
  CYCLE_STATUS_LABELS,
  METRIC_DOMAIN_LABELS,
  PLACEMENT_OUTCOME_LABELS,
  type PlacementOutcome,
} from "@/lib/domain/assessment-types";
import {
  addDays,
  assignAssessment,
  assignReviewer,
  canPerformTemplate,
  canViewTemplate,
  comparableTemplates,
  comparisonRows,
  completeReview,
  currentCycle,
  cycleAssignments,
  cycleStatus,
  effectiveStatus,
  finalizeAssessment,
  getCompleted,
  getTemplate,
  isAssignmentDone,
  lastCompletedCycle,
  listAssignments,
  listCompleted,
  listCycles,
  listPlacements,
  listTemplates,
  documentPlacement,
  removeAssignment,
  reminders,
  reviewForCycle,
  scheduleReview,
  startCycle,
  templateVersion,
  todayIso,
  updateAssignment,
} from "@/lib/domain/assessments";
import { formatDate, repository, serviceById, staffDisplayName } from "@/lib/domain/repository";
import { useSession } from "@/lib/domain/session";
import type { Client, ID } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ClientAssessmentsPanel({ client }: { client: Client }) {
  const session = useSession();
  const roleId = session.staff.roleId;
  const today = todayIso();

  const [assignOpen, setAssignOpen] = useState(false);
  const [completeId, setCompleteId] = useState<ID | null>(null);
  const [viewId, setViewId] = useState<ID | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [placementOpen, setPlacementOpen] = useState(false);
  const [cycleOpen, setCycleOpen] = useState(false);

  const assignments = listAssignments(client.id);
  const completed = listCompleted(client.id);
  const cycle = currentCycle(client.id);
  const review = cycle ? reviewForCycle(cycle.id) : undefined;
  const lastCycle = lastCompletedCycle(client.id);
  const placements = listPlacements(client.id);
  const clientReminders = reminders(client.id, today);
  const canManage = session.can("reassessments.manage") || session.isLeadership;

  const visible = assignments.filter((a) => {
    const t = getTemplate(a.templateId);
    return t ? canViewTemplate(roleId, t) : false;
  });
  const openPlan = visible.filter((a) => !isAssignmentDone(a));
  const donePlan = visible.filter(isAssignmentDone);

  return (
    <div className="space-y-6">
      {clientReminders.length ? (
        <div className="flex flex-wrap gap-2">
          {clientReminders.map((r, i) => (
            <StatusPill
              key={`${r.kind}-${i}`}
              label={`${r.label}${r.dueDate ? ` · ${formatDate(r.dueDate)}` : ""}`}
              tone={r.tone === "critical" ? "critical" : r.tone === "warning" ? "warning" : "info"}
            />
          ))}
        </div>
      ) : null}

      {/* --------------------------- quarterly cycle -------------------- */}
      <Panel
        title="Quarterly reassessment cycle"
        action={
          canManage ? (
            <Button variant="outline" size="sm" onClick={() => setCycleOpen(true)}>
              {cycle ? "Start a new cycle" : "Start reassessment cycle"}
            </Button>
          ) : null
        }
      >
        {cycle ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill
                label={CYCLE_STATUS_LABELS[cycleStatus(cycle, today)]}
                tone={
                  cycleStatus(cycle, today) === "overdue"
                    ? "critical"
                    : cycleStatus(cycle, today) === "complete"
                      ? "positive"
                      : "info"
                }
              />
              <span className="text-sm text-muted-foreground">
                Cycle {cycle.cycleNumber} · due {formatDate(cycle.dueDate)}
              </span>
              <span className="text-sm text-muted-foreground">
                {cycleAssignments(cycle.id).filter(isAssignmentDone).length}/
                {cycleAssignments(cycle.id).length} assessments complete
              </span>
            </div>

            <div className="rounded-xl border border-border p-4">
              <p className="text-sm font-medium text-foreground">Quarterly Results Review</p>
              {review ? (
                <div className="mt-2 space-y-3 text-sm text-muted-foreground">
                  <p>
                    Status:{" "}
                    <span className="capitalize text-foreground">{review.status.replace(/_/g, " ")}</span>
                    {review.reviewerStaffId ? (
                      <>
                        {" "}
                        · Reviewer{" "}
                        {staffDisplayName(repository.getStaff(review.reviewerStaffId)!)}
                      </>
                    ) : (
                      " · No reviewer assigned"
                    )}
                    {review.scheduledDate
                      ? ` · Scheduled ${formatDate(review.scheduledDate)} ${review.scheduledTime ?? ""}`
                      : ""}
                  </p>
                  {review.status === "completed" ? (
                    <div className="space-y-1 text-foreground">
                      <p>Services remain appropriate: {review.servicesRemainAppropriate}</p>
                      {review.recommendations ? <p>{review.recommendations}</p> : null}
                    </div>
                  ) : canManage ? (
                    <Button size="sm" onClick={() => setReviewOpen(true)}>
                      {review.status === "needed" ? "Assign & schedule review" : "Complete review"}
                    </Button>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  The review is created automatically once every required assessment in this cycle is
                  completed.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No open reassessment cycle.
            {lastCycle
              ? ` Last cycle completed ${formatDate(lastCycle.completedDate)} · next due ${formatDate(lastCycle.nextDueDate)}.`
              : ""}
          </p>
        )}
      </Panel>

      {/* --------------------------- assigned plan ---------------------- */}
      <Panel
        title="Assigned assessment plan"
        action={
          session.can("assessments.create") || canManage ? (
            <Button size="sm" onClick={() => setAssignOpen(true)}>
              Add assessment
            </Button>
          ) : null
        }
      >
        {openPlan.length ? (
          <ul className="space-y-2">
            {openPlan.map((a) => {
              const template = getTemplate(a.templateId)!;
              const status = effectiveStatus(a, today);
              const practitioner = a.practitionerStaffId
                ? repository.getStaff(a.practitionerStaffId)
                : undefined;
              return (
                <li key={a.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {template.name}{" "}
                        <span className="text-xs text-muted-foreground">
                          · {a.requirement === "required" ? "Required" : "Optional"} ·{" "}
                          {a.purpose.replace(/_/g, " ")}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Assigned {formatDate(a.assignedDate)}
                        {a.dueDate ? ` · due ${formatDate(a.dueDate)}` : ""}
                        {practitioner ? ` · ${staffDisplayName(practitioner)}` : " · unassigned"}
                        {a.appointmentDate ? ` · appointment ${formatDate(a.appointmentDate)}` : ""}
                      </p>
                      {a.reason ? (
                        <p className="mt-1 text-xs text-muted-foreground">Reason: {a.reason}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill
                        label={ASSIGNMENT_STATUS_LABELS[status]}
                        tone={
                          status === "overdue"
                            ? "critical"
                            : status === "scheduled" || status === "in_progress"
                              ? "info"
                              : "neutral"
                        }
                      />
                      {canPerformTemplate(roleId, template) ? (
                        <Button size="sm" onClick={() => setCompleteId(a.id)}>
                          Complete
                        </Button>
                      ) : null}
                      {canManage ? (
                        <select
                          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                          value={a.status}
                          onChange={(e) =>
                            updateAssignment(a.id, {
                              status: e.target.value as typeof a.status,
                            })
                          }
                        >
                          <option value="not_started">Not started</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="in_progress">In progress</option>
                        </select>
                      ) : null}
                      {canManage ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const result = removeAssignment(a.id);
                            if (!result.removed) toast.error(result.reason ?? "Cannot remove.");
                            else toast.success("Assessment removed from the plan.");
                          }}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No outstanding assessments assigned to this client.
          </p>
        )}
      </Panel>

      {/* --------------------------- timeline --------------------------- */}
      <Panel title="Assessment timeline">
        {donePlan.length || completed.length ? (
          <ul className="divide-y divide-border">
            {completed
              .filter((c) => {
                const t = getTemplate(c.templateId);
                return t ? canViewTemplate(roleId, t) : false;
              })
              .map((c) => {
                const template = getTemplate(c.templateId)!;
                const staff = repository.getStaff(c.practitionerStaffId);
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="w-32 shrink-0 text-sm font-medium text-foreground">
                      {formatDate(c.performedDate)}
                    </span>
                    <span className="flex-1 text-sm text-foreground">{template.name}</span>
                    <span className="text-xs text-muted-foreground">
                      v{c.templateVersion} · {staff ? staffDisplayName(staff) : "—"}
                    </span>
                    <StatusPill
                      label={c.status === "finalized" ? "Signed / finalized" : "Completed"}
                      tone={c.status === "finalized" ? "positive" : "info"}
                    />
                    <Button variant="ghost" size="sm" onClick={() => setViewId(c.id)}>
                      Open
                    </Button>
                  </li>
                );
              })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No completed assessments yet.</p>
        )}
      </Panel>

      {/* --------------------------- comparison ------------------------- */}
      <ComparisonPanel clientId={client.id} roleId={roleId} />

      {/* --------------------------- placements ------------------------- */}
      <Panel
        title="Service placement recommendations"
        action={
          session.can("assessments.create") || canManage ? (
            <Button variant="outline" size="sm" onClick={() => setPlacementOpen(true)}>
              Document recommendation
            </Button>
          ) : null
        }
      >
        {placements.length ? (
          <ul className="space-y-3">
            {placements.map((p) => (
              <li key={p.id} className="rounded-xl border border-border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {PLACEMENT_OUTCOME_LABELS[p.outcome]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(p.recommendationDate)} ·{" "}
                    {staffDisplayName(repository.getStaff(p.practitionerStaffId)!)}
                  </span>
                </div>
                <p className="mt-2 text-muted-foreground">
                  Requested: {serviceById(p.requestedServiceId ?? "")?.name ?? "—"} · Recommended:{" "}
                  {serviceById(p.recommendedServiceId ?? "")?.name ?? "—"}
                </p>
                <p className="mt-1 text-foreground">{p.rationale}</p>
                {p.restrictions ? (
                  <p className="mt-1 text-muted-foreground">
                    Restrictions / modifications: {p.restrictions}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.additionalAssessmentRequired ? "Additional assessment required · " : ""}
                  {p.followUpRequired ? "Follow-up required" : "No follow-up flagged"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No placement recommendation documented yet. Placement is always a practitioner decision —
            the portal never places a client automatically.
          </p>
        )}
      </Panel>

      {assignOpen ? (
        <AssignDialog clientId={client.id} onOpenChange={setAssignOpen} cycleId={cycle?.id ?? null} />
      ) : null}
      {cycleOpen ? <StartCycleDialog clientId={client.id} onOpenChange={setCycleOpen} /> : null}
      {reviewOpen && review ? (
        <ReviewDialog reviewId={review.id} onOpenChange={setReviewOpen} />
      ) : null}
      {placementOpen ? (
        <PlacementDialog clientId={client.id} onOpenChange={setPlacementOpen} />
      ) : null}
      <CompleteAssessmentDialog assignmentId={completeId} onOpenChange={() => setCompleteId(null)} />
      <ViewAssessmentDialog completedId={viewId} onOpenChange={() => setViewId(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Longitudinal comparison                                             */
/* ------------------------------------------------------------------ */

function ComparisonPanel({ clientId, roleId }: { clientId: ID; roleId: ID }) {
  const templates = comparableTemplates(clientId).filter((t) => canViewTemplate(roleId, t));
  const [templateId, setTemplateId] = useState<ID | "">(templates[0]?.id ?? "");
  const active = templateId || templates[0]?.id || "";
  const rows = active ? comparisonRows(clientId, active) : [];

  return (
    <Panel title="Longitudinal comparison">
      {templates.length ? (
        <div className="space-y-4">
          <Field label="Assessment type" hint="Only metrics from the same assessment are compared.">
            <select
              className={fieldClass}
              value={active}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3">Metric</th>
                  <th className="py-2 pr-3">Baseline</th>
                  <th className="py-2 pr-3">Previous</th>
                  <th className="py-2 pr-3">Current</th>
                  <th className="py-2">Change</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-b border-border/60">
                    <td className="py-2 pr-3 text-foreground">
                      {r.label}
                      {r.unit ? <span className="text-muted-foreground"> ({r.unit})</span> : null}
                      <span className="block text-xs text-muted-foreground">
                        {METRIC_DOMAIN_LABELS[r.domain]}
                      </span>
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-muted-foreground">{r.baseline ?? "—"}</td>
                    <td className="py-2 pr-3 tabular-nums text-muted-foreground">{r.previous ?? "—"}</td>
                    <td className="py-2 pr-3 tabular-nums font-medium text-foreground">
                      {r.current ?? "—"}
                    </td>
                    <td
                      className={cn(
                        "py-2 tabular-nums",
                        r.improved === true
                          ? "text-success"
                          : r.improved === false
                            ? "text-destructive"
                            : "text-muted-foreground",
                      )}
                    >
                      {r.change == null ? "—" : r.change > 0 ? `+${r.change}` : r.change}
                      {r.percentChange != null ? (
                        <span className="block text-xs">
                          {r.percentChange > 0 ? "+" : ""}
                          {r.percentChange}%
                        </span>
                      ) : null}
                      {r.trend ? (
                        <span className="block text-xs text-muted-foreground">
                          {r.trend === "up" ? "▲ trending up" : r.trend === "down" ? "▼ trending down" : "— steady"}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          At least two dated records of the same assessment are needed before a comparison is shown.
        </p>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Dialogs                                                             */
/* ------------------------------------------------------------------ */

function Shell({
  title,
  description,
  onOpenChange,
  children,
}: {
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({
  clientId,
  cycleId,
  onOpenChange,
}: {
  clientId: ID;
  cycleId: ID | null;
  onOpenChange: (open: boolean) => void;
}) {
  const templates = listTemplates();
  const staff = repository.listStaff().filter((s) => s.isActive);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [requirement, setRequirement] = useState<"required" | "optional">("required");
  const [purpose, setPurpose] = useState<"onboarding" | "reassessment" | "ad_hoc">("ad_hoc");
  const [practitionerStaffId, setPractitioner] = useState("");
  const [dueDate, setDueDate] = useState(addDays(todayIso(), 14));
  const [reason, setReason] = useState("");

  return (
    <Shell
      title="Add assessment to plan"
      description="Each client's plan is individual — only assign what is appropriate for this person."
      onOpenChange={onOpenChange}
    >
      <div className="space-y-4">
        <Field label="Assessment template">
          <select className={fieldClass} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Requirement">
            <select
              className={fieldClass}
              value={requirement}
              onChange={(e) => setRequirement(e.target.value as "required" | "optional")}
            >
              <option value="required">Required</option>
              <option value="optional">Optional</option>
            </select>
          </Field>
          <Field label="Purpose">
            <select
              className={fieldClass}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as typeof purpose)}
            >
              <option value="ad_hoc">Ad hoc</option>
              <option value="onboarding">Onboarding</option>
              <option value="reassessment">Reassessment (current cycle)</option>
            </select>
          </Field>
          <Field label="Responsible practitioner">
            <select
              className={fieldClass}
              value={practitionerStaffId}
              onChange={(e) => setPractitioner(e.target.value)}
            >
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {staffDisplayName(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Due date">
            <input type="date" className={fieldClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Reason for assignment" hint="Optional, but useful when the choice is clinical.">
          <textarea className={fieldClass} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <DialogFooterBar>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!templateId) return;
              assignAssessment({
                clientId,
                templateId,
                requirement,
                purpose,
                cycleId: purpose === "reassessment" ? cycleId : null,
                practitionerStaffId: practitionerStaffId || null,
                dueDate,
                ...(reason.trim() ? { reason: reason.trim() } : {}),
              });
              toast.success("Assessment added to the client's plan.");
              onOpenChange(false);
            }}
          >
            Add to plan
          </Button>
        </DialogFooterBar>
      </div>
    </Shell>
  );
}

function StartCycleDialog({
  clientId,
  onOpenChange,
}: {
  clientId: ID;
  onOpenChange: (open: boolean) => void;
}) {
  const templates = listTemplates();
  const previous = listCycles(clientId)[0];
  const suggested = previous
    ? [...new Set(cycleAssignments(previous.id).map((a) => a.templateId))]
    : templates.filter((t) => t.reassessmentDefault).map((t) => t.id);
  const [selected, setSelected] = useState<ID[]>(suggested);
  const [dueDate, setDueDate] = useState(addDays(todayIso(), 90));
  const staff = repository.listStaff().filter((s) => s.isActive);
  const [practitionerStaffId, setPractitioner] = useState("");

  return (
    <Shell
      title="Start quarterly reassessment cycle"
      description="Choose the reassessment battery for this individual client. Nothing repeats automatically."
      onOpenChange={onOpenChange}
    >
      <div className="space-y-4">
        <Field label="Reassessment due date">
          <input type="date" className={fieldClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <Field label="Responsible practitioner">
          <select className={fieldClass} value={practitionerStaffId} onChange={(e) => setPractitioner(e.target.value)}>
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {staffDisplayName(s)}
              </option>
            ))}
          </select>
        </Field>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Assessments in this cycle
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {templates.map((t) => (
              <label key={t.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(t.id)}
                  onChange={(e) =>
                    setSelected((s) => (e.target.checked ? [...s, t.id] : s.filter((x) => x !== t.id)))
                  }
                />
                {t.name}
              </label>
            ))}
          </div>
        </div>
        <DialogFooterBar>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!selected.length) {
                toast.error("Select at least one assessment for this cycle.");
                return;
              }
              startCycle({
                clientId,
                dueDate,
                templateIds: selected,
                practitionerStaffId: practitionerStaffId || null,
              });
              toast.success("Reassessment cycle started.");
              onOpenChange(false);
            }}
          >
            Start cycle
          </Button>
        </DialogFooterBar>
      </div>
    </Shell>
  );
}

export function ReviewDialog({
  reviewId,
  onOpenChange,
}: {
  reviewId: ID;
  onOpenChange: (open: boolean) => void;
}) {
  const leadership = repository
    .listStaff()
    .filter((s) => s.isActive && (s.roleId === "role-owner" || s.roleId === "role-leadership"));
  const [reviewerStaffId, setReviewer] = useState(leadership[0]?.id ?? "");
  const [date, setDate] = useState(addDays(todayIso(), 7));
  const [time, setTime] = useState("10:00");
  const [appropriate, setAppropriate] = useState<"yes" | "with_changes" | "no">("yes");
  const [recommendations, setRecommendations] = useState("");
  const [changes, setChanges] = useState("");
  const [nextSteps, setNextSteps] = useState("");

  return (
    <Shell
      title="Quarterly Results Review"
      description="Virtual review with Jennifer or Jessie. The cycle only closes once this review is completed."
      onOpenChange={onOpenChange}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Reviewer">
            <select className={fieldClass} value={reviewerStaffId} onChange={(e) => setReviewer(e.target.value)}>
              {leadership.map((s) => (
                <option key={s.id} value={s.id}>
                  {staffDisplayName(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" className={fieldClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Time">
            <input type="time" className={fieldClass} value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            assignReviewer(reviewId, reviewerStaffId);
            scheduleReview(reviewId, date, time, reviewerStaffId);
            toast.success("Results review scheduled.");
            onOpenChange(false);
          }}
        >
          Assign & schedule
        </Button>

        <div className="space-y-4 border-t border-border pt-4">
          <p className="text-sm font-medium text-foreground">Complete the review</p>
          <Field label="Do current services & programming remain appropriate?">
            <select
              className={fieldClass}
              value={appropriate}
              onChange={(e) => setAppropriate(e.target.value as typeof appropriate)}
            >
              <option value="yes">Yes — continue as is</option>
              <option value="with_changes">Yes, with changes</option>
              <option value="no">No — change of service recommended</option>
            </select>
          </Field>
          <Field label="High-level recommendations">
            <textarea
              className={fieldClass}
              rows={3}
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
            />
          </Field>
          <Field label="Changes to program / services">
            <textarea className={fieldClass} rows={2} value={changes} onChange={(e) => setChanges(e.target.value)} />
          </Field>
          <Field label="Next steps">
            <textarea className={fieldClass} rows={2} value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} />
          </Field>
          <DialogFooterBar>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (!recommendations.trim()) {
                  toast.error("Recommendations are required to complete the review.");
                  return;
                }
                const nextDue = completeReview(reviewId, {
                  servicesRemainAppropriate: appropriate,
                  recommendations: recommendations.trim(),
                  ...(changes.trim() ? { changesToProgram: changes.trim() } : {}),
                  ...(nextSteps.trim() ? { nextSteps: nextSteps.trim() } : {}),
                });
                toast.success(
                  nextDue
                    ? `Cycle complete. Next reassessment due ${formatDate(nextDue)}.`
                    : "Cycle complete.",
                );
                onOpenChange(false);
              }}
            >
              Complete review & close cycle
            </Button>
          </DialogFooterBar>
        </div>
      </div>
    </Shell>
  );
}

function PlacementDialog({
  clientId,
  onOpenChange,
}: {
  clientId: ID;
  onOpenChange: (open: boolean) => void;
}) {
  const session = useSession();
  const services = repository.listServices().filter((s) => s.isActive);
  const [requested, setRequested] = useState("");
  const [recommended, setRecommended] = useState("");
  const [outcome, setOutcome] = useState<PlacementOutcome>("appropriate_as_requested");
  const [rationale, setRationale] = useState("");
  const [restrictions, setRestrictions] = useState("");
  const [additional, setAdditional] = useState(false);
  const [followUp, setFollowUp] = useState(false);

  return (
    <Shell
      title="Document service placement recommendation"
      description="This records the practitioner's decision. The portal never determines placement on its own."
      onOpenChange={onOpenChange}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Service originally requested">
            <select className={fieldClass} value={requested} onChange={(e) => setRequested(e.target.value)}>
              <option value="">—</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Recommended service">
            <select className={fieldClass} value={recommended} onChange={(e) => setRecommended(e.target.value)}>
              <option value="">—</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Outcome">
          <select
            className={fieldClass}
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as PlacementOutcome)}
          >
            {Object.entries(PLACEMENT_OUTCOME_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Rationale">
          <textarea className={fieldClass} rows={3} value={rationale} onChange={(e) => setRationale(e.target.value)} />
        </Field>
        <Field label="Restrictions / modifications">
          <textarea
            className={fieldClass}
            rows={2}
            value={restrictions}
            onChange={(e) => setRestrictions(e.target.value)}
          />
        </Field>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={additional} onChange={(e) => setAdditional(e.target.checked)} />
            Additional assessment required
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} />
            Follow-up required
          </label>
        </div>
        <DialogFooterBar>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!rationale.trim()) {
                toast.error("A rationale is required.");
                return;
              }
              documentPlacement({
                clientId,
                practitionerStaffId: session.staffId,
                outcome,
                requestedServiceId: requested || null,
                recommendedServiceId: recommended || null,
                rationale: rationale.trim(),
                ...(restrictions.trim() ? { restrictions: restrictions.trim() } : {}),
                additionalAssessmentRequired: additional,
                followUpRequired: followUp,
              });
              toast.success("Recommendation documented.");
              onOpenChange(false);
            }}
          >
            Save recommendation
          </Button>
        </DialogFooterBar>
      </div>
    </Shell>
  );
}

function ViewAssessmentDialog({
  completedId,
  onOpenChange,
}: {
  completedId: ID | null;
  onOpenChange: (open: boolean) => void;
}) {
  const session = useSession();
  const record = getCompleted(completedId);
  if (!completedId || !record) return null;
  const template = getTemplate(record.templateId)!;
  const version = templateVersion(record.templateId, record.templateVersion);

  return (
    <Shell
      title={template.name}
      description={`Performed ${formatDate(record.performedDate)} · template version ${record.templateVersion}`}
      onOpenChange={onOpenChange}
    >
      <div className="space-y-4 text-sm">
        {version?.schema.sections.map((section) => (
          <div key={section.key}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            <dl className="mt-2 space-y-1">
              {section.fields.map((f) => (
                <div key={f.key} className="flex gap-3">
                  <dt className="w-56 shrink-0 text-muted-foreground">{f.label}</dt>
                  <dd className="text-foreground">
                    {String(record.values[f.key] ?? "—") || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
        {record.recommendations ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Practitioner recommendations
            </p>
            <p className="mt-1 text-foreground">{record.recommendations}</p>
          </div>
        ) : null}
        <DialogFooterBar>
          {record.status !== "finalized" && session.can("assessments.finalize") ? (
            <Button
              onClick={() => {
                finalizeAssessment(record.id, session.staffId);
                toast.success("Assessment signed and finalized.");
                onOpenChange(false);
              }}
            >
              Sign / finalize
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooterBar>
      </div>
    </Shell>
  );
}
