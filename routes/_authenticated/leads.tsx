import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader } from "@/components/app/PageHeader";
import { StatusPill } from "@/components/app/StatusPill";
import { Button } from "@/components/ui/button";
import { useDemoData } from "@/hooks/useDemoData";
import {
  activateOnboardingCase,
  convertProspectToClient,
  listDiscoverySubmissions,
  setDiscoveryOutcome,
} from "@/lib/domain/operations";
import { formatDate, repository } from "@/lib/domain/repository";
import type { DiscoveryOutcome } from "@/lib/domain/types";

const OUTCOMES: DiscoveryOutcome[] = [
  "scheduled",
  "completed",
  "no_show",
  "cancelled",
  "follow_up_needed",
  "qualified",
  "not_a_fit",
  "converted",
];

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({
    meta: [
      { title: "Leads & Discovery Calls — FredFit Portal" },
      {
        name: "description",
        content:
          "Track discovery call submissions, prospect answers and conversion outcomes for Fredericksburg Fitness Studio.",
      },
      { property: "og:title", content: "Leads & Discovery Calls — FredFit Portal" },
      {
        property: "og:description",
        content: "Discovery call pipeline and prospect conversion tracking.",
      },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  useDemoData();
  const submissions = [...listDiscoverySubmissions()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads & discovery calls"
        description="Everything a prospect told us before their free 30-minute call, kept with their record from day one."
        actions={
          <a
            href="/book/discovery-call"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-md border border-input px-4 py-2 text-sm font-medium"
          >
            View public booking page
          </a>
        }
      />

      {submissions.length === 0 ? (
        <p className="surface-card p-6 text-sm text-muted-foreground">
          No discovery call submissions yet. Book one from the public page to see it appear here.
        </p>
      ) : null}

      <div className="space-y-4">
        {submissions.map((s) => {
          const client = repository.getClient(s.clientId);
          const appointment = s.appointmentId ? repository.getAppointment(s.appointmentId) : undefined;
          if (!client) return null;
          return (
            <article key={s.id} className="surface-card space-y-4 p-5">
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
                    {client.email}
                    {client.phone ? ` · ${client.phone}` : ""} · Source: {s.referralSource}
                  </p>
                  {appointment ? (
                    <p className="text-sm text-muted-foreground">
                      Call on {formatDate(appointment.date)} at {appointment.startTime}
                    </p>
                  ) : null}
                </div>
                <StatusPill status={s.outcome} />
              </header>

              <dl className="grid gap-3 sm:grid-cols-2">
                <Answer label="Interested in">{s.interests.join(", ") || "—"}</Answer>
                <Answer label="What prompted the call">{s.whatPrompted || "—"}</Answer>
                <Answer label="Wants help with">{s.helpWith || "—"}</Answer>
                <Answer label="What success looks like">{s.successLooksLike || "—"}</Answer>
                <Answer label="Biggest challenge">{s.biggestChallenge || "—"}</Answer>
                <Answer label="Anything else">{s.anythingElse || "—"}</Answer>
              </dl>

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Outcome
                </label>
                <select
                  className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                  value={s.outcome}
                  onChange={(e) => setDiscoveryOutcome(s.id, e.target.value as DiscoveryOutcome)}
                >
                  {OUTCOMES.map((o) => (
                    <option key={o} value={o}>
                      {o.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    convertProspectToClient(client.id);
                    setDiscoveryOutcome(s.id, "converted");
                  }}
                >
                  Convert to client
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    activateOnboardingCase(client.id);
                    setDiscoveryOutcome(s.id, "converted");
                  }}
                >
                  Activate 5-Step Onboarding
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Answer({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}
