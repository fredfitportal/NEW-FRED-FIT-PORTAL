import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader } from "@/components/app/PageHeader";
import { StatusPill } from "@/components/app/StatusPill";
import { Button } from "@/components/ui/button";
import { useDemoData } from "@/hooks/useDemoData";
import {
  REQUIREMENT_STATUS_LABELS,
  intakeReadiness,
  isRequirementComplete,
  listOnboardingCases,
  onboardingProgress,
  secureIntakePath,
  setOnboardingStepStatus,
  setStep2Pathway,
  templateByKey,
} from "@/lib/domain/operations";
import { formatDate, repository } from "@/lib/domain/repository";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "5-Step Onboarding — FredFit Portal" },
      {
        name: "description",
        content:
          "Track every Fredericksburg Fitness Studio onboarding case: intake forms, bloodwork, food log and the five onboarding appointments.",
      },
      { property: "og:title", content: "5-Step Onboarding — FredFit Portal" },
      {
        property: "og:description",
        content: "Onboarding case management and intake readiness for FFS clients.",
      },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  useDemoData();
  const cases = listOnboardingCases();

  return (
    <div className="space-y-6">
      <PageHeader
        title="5-Step Onboarding"
        description="Onboarding is a case, not a single appointment. Each case tracks intake completion and the five onboarding steps in order."
      />

      {cases.length === 0 ? (
        <p className="surface-card p-6 text-sm text-muted-foreground">
          No active onboarding cases. Activate onboarding from a client profile or the leads page.
        </p>
      ) : null}

      {cases.map((oc) => {
        const client = repository.getClient(oc.clientId);
        if (!client) return null;
        const progress = onboardingProgress(oc);
        const readiness = intakeReadiness(client.id, oc.id);
        const intakePath = secureIntakePath(client);

        return (
          <article key={oc.id} className="surface-card space-y-5 p-5">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link
                  to="/clients/$clientId"
                  params={{ clientId: client.id }}
                  className="font-medium text-foreground hover:underline"
                >
                  {client.firstName} {client.lastName}
                </Link>
                <p className="text-sm text-muted-foreground">
                  Activated {formatDate(oc.activatedAt.slice(0, 10))} · Steps {progress.complete}/
                  {progress.total} complete · Intake {readiness.complete}/{readiness.total}
                </p>
              </div>
              <StatusPill status={oc.status} />
            </header>

            {!readiness.ready ? (
              <p className="rounded-lg border border-warning/35 bg-warning/10 p-3 text-sm text-warning-foreground">
                Intake is not complete. Step 1 should not begin until the required forms, bloodwork
                and food log are received.
              </p>
            ) : (
              <p className="rounded-lg border border-success/25 bg-success/10 p-3 text-sm text-success">
                Intake complete — this client is ready to start Step 1.
              </p>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              {readiness.requirements.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="text-foreground">
                    {templateByKey(r.templateKey)?.name ?? r.templateKey}
                  </span>
                  <StatusPill
                    label={REQUIREMENT_STATUS_LABELS[r.status]}
                    tone={isRequirementComplete(r) ? "positive" : "warning"}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {oc.steps.map((step) => (
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
                        value={oc.step2Pathway}
                        onChange={(e) =>
                          setStep2Pathway(oc.id, e.target.value as "fms" | "fall_risk" | "undecided")
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
                        oc.id,
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
            </div>

            {intakePath ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <Button variant="outline" size="sm" asChild>
                  <a href={intakePath} target="_blank" rel="noreferrer">
                    Open client's secure intake link
                  </a>
                </Button>
                <span className="text-xs text-muted-foreground">
                  Notifications are queued only — no email or text provider is connected.
                </span>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
