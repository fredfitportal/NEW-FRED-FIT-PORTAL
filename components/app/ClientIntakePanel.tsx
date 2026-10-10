import { toast } from "sonner";

import { StatusPill } from "@/components/app/StatusPill";
import { Button } from "@/components/ui/button";
import {
  REQUIREMENT_STATUS_LABELS,
  activateOnboardingCase,
  getOnboardingCase,
  intakeReadiness,
  isRequirementComplete,
  listClientDocuments,
  listQueuedNotifications,
  listRequirements,
  onboardingProgress,
  secureIntakePath,
  setOnboardingStepStatus,
  setRequirementStatus,
  setStep2Pathway,
  templateByKey,
} from "@/lib/domain/operations";
import { formatDate } from "@/lib/domain/repository";
import { useSession } from "@/lib/domain/session";
import type { Client } from "@/lib/domain/types";

/**
 * Staff-side view of everything the client owes before onboarding can begin.
 * Intake is deliberately separated from the five onboarding appointments so
 * neither one silently overwrites the other.
 */
export function ClientIntakePanel({ client }: { client: Client }) {
  const session = useSession();
  const onboardingCase = getOnboardingCase(client.id);
  const readiness = intakeReadiness(client.id, onboardingCase?.id);
  const allRequirements = listRequirements(client.id);
  const documents = listClientDocuments(client.id);
  const notifications = listQueuedNotifications(client.id);
  const intakePath = secureIntakePath(client);

  return (
    <div className="space-y-6">
      <section className="surface-card space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">5-Step Onboarding</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {onboardingCase
                ? `Activated ${formatDate(onboardingCase.activatedAt.slice(0, 10))} · ${
                    onboardingProgress(onboardingCase).complete
                  } of ${onboardingProgress(onboardingCase).total} steps complete`
                : "No onboarding case is active for this client."}
            </p>
          </div>
          {onboardingCase ? (
            <StatusPill status={onboardingCase.status} />
          ) : (
            <Button
              size="sm"
              disabled={!session.can("clients.edit")}
              onClick={() => {
                activateOnboardingCase(client.id);
                toast.success("Onboarding activated and intake checklist created");
              }}
            >
              Activate onboarding
            </Button>
          )}
        </div>

        {onboardingCase ? (
          <div className="space-y-2">
            {onboardingCase.steps.map((step) => (
              <div
                key={step.step}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <span className="text-sm text-foreground">
                  <strong className="mr-2">Step {step.step}</strong>
                  {step.label}
                  {step.step === 2 ? (
                    <select
                      className="ml-2 rounded-md border border-input bg-background px-2 py-1 text-xs"
                      value={onboardingCase.step2Pathway}
                      onChange={(e) =>
                        setStep2Pathway(
                          onboardingCase.id,
                          e.target.value as "fms" | "fall_risk" | "undecided",
                        )
                      }
                    >
                      <option value="undecided">Pathway undecided</option>
                      <option value="fms">FMS</option>
                      <option value="fall_risk">Fall Risk Screening</option>
                    </select>
                  ) : null}
                </span>
                <select
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                  value={step.status}
                  onChange={(e) =>
                    setOnboardingStepStatus(
                      onboardingCase.id,
                      step.step,
                      e.target.value as "not_scheduled" | "scheduled" | "complete",
                    )
                  }
                >
                  <option value="not_scheduled">Not scheduled</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="complete">Complete</option>
                </select>
              </div>
            ))}
            <p
              className={
                readiness.ready
                  ? "rounded-lg border border-success/25 bg-success/10 p-3 text-sm text-success"
                  : "rounded-lg border border-warning/35 bg-warning/10 p-3 text-sm text-warning-foreground"
              }
            >
              {readiness.ready
                ? "Intake complete — this client is ready to begin Step 1."
                : `Intake outstanding — ${readiness.complete} of ${readiness.total} items received.`}
            </p>
          </div>
        ) : null}
      </section>

      <section className="surface-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Required forms & uploads</h2>
          {intakePath ? (
            <Button variant="outline" size="sm" asChild>
              <a href={intakePath} target="_blank" rel="noreferrer">
                Open the client's secure link
              </a>
            </Button>
          ) : null}
        </div>
        <div className="mt-4 space-y-2">
          {allRequirements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing has been requested yet.</p>
          ) : null}
          {allRequirements.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
            >
              <span className="text-sm text-foreground">
                {templateByKey(r.templateKey)?.name ?? r.templateKey}
                <span className="ml-2 text-xs text-muted-foreground">
                  {r.templateVersion}
                  {r.dueBefore ? ` · due before ${formatDate(r.dueBefore)}` : ""}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <StatusPill
                  label={REQUIREMENT_STATUS_LABELS[r.status]}
                  tone={isRequirementComplete(r) ? "positive" : "warning"}
                />
                {r.status === "submitted" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setRequirementStatus(r.id, "reviewed", session.staff?.id)}
                  >
                    Mark reviewed
                  </Button>
                ) : null}
                {!isRequirementComplete(r) ? (
                  <Button size="sm" variant="ghost" onClick={() => setRequirementStatus(r.id, "waived")}>
                    Waive
                  </Button>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card p-6">
        <h2 className="text-base font-semibold text-foreground">Secure documents</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Original documents are preserved. Extracted values never replace the source file.
        </p>
        <div className="mt-4 space-y-2">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents received.</p>
          ) : null}
          {documents.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span className="text-foreground">
                {d.fileName}
                <span className="ml-2 text-xs text-muted-foreground">
                  {d.documentType.replace(/_/g, " ")} · received {formatDate(d.uploadedAt.slice(0, 10))}
                  {d.documentDate ? ` · dated ${formatDate(d.documentDate)}` : ""}
                </span>
              </span>
              <StatusPill
                label={d.reviewStatus === "reviewed" ? "Reviewed" : "Pending review"}
                tone={d.reviewStatus === "reviewed" ? "positive" : "warning"}
              />
            </div>
          ))}
        </div>
      </section>

      {notifications.length ? (
        <section className="surface-card p-6">
          <h2 className="text-base font-semibold text-foreground">Queued notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No email or text provider is connected in this build, so nothing is actually delivered.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {notifications.map((n) => (
              <li key={n.id} className="rounded-lg border border-dashed border-border px-3 py-2">
                <span className="text-foreground">{n.subject}</span>
                <span className="ml-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {n.channel} · queued (demo)
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
