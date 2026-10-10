import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { ClientFormDialog } from "@/components/app/ClientFormDialog";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusPill } from "@/components/app/StatusPill";
import { Button } from "@/components/ui/button";
import { useDemoData } from "@/hooks/useDemoData";
import { useSession } from "@/lib/domain/session";
import {
  ASSIGNMENT_ROLE_LABELS,
  assignedStaffFor,
  clientDisplayName,
  formatDate,
  locationById,
  repository,
  serviceById,
  staffDisplayName,
} from "@/lib/domain/repository";

export const Route = createFileRoute("/_authenticated/clients/")({
  head: () => ({
    meta: [
      { title: "Clients — FredFit Portal" },
      {
        name: "description",
        content:
          "Client roster for Fredericksburg Fitness Studio with status, location, assigned team and active service enrollments.",
      },
      { property: "og:title", content: "Clients — FredFit Portal" },
      {
        property: "og:description",
        content: "Every FFS client record, assignment and service enrollment in one roster.",
      },
    ],
  }),
  component: ClientsPage,
});

const STATUS_FILTERS = ["all", "active", "onboarding", "prospect", "paused", "inactive"] as const;

function ClientsPage() {
  useDemoData();
  const navigate = Route.useNavigate();
  const session = useSession();
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const clients = repository.listClients();

  const filtered = useMemo(
    () =>
      clients.filter((c) => {
        const matchesStatus = status === "all" || c.status === status;
        const haystack = `${c.firstName} ${c.lastName} ${c.preferredName ?? ""} ${c.clientNumber}`.toLowerCase();
        return matchesStatus && haystack.includes(query.toLowerCase().trim());
      }),
    [clients, query, status],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Client records"
        title="Clients"
        description="One canonical client record per person. Every future module — assessments, programs, nutrition, recovery, messaging and billing — attaches to this same record."
        actions={
          <Button onClick={() => setAddOpen(true)} disabled={!session.can("clients.edit")}>
            <Plus className="size-4" /> Add Client
          </Button>
        }
      />

      {addOpen ? (
        <ClientFormDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          onSaved={(client) =>
            navigate({ to: "/clients/$clientId", params: { clientId: client.id } })
          }
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or client number"
            aria-label="Search clients"
            className="w-full rounded-xl border border-input bg-card py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring/25"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={
                s === status
                  ? "rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium capitalize text-primary-foreground"
                  : "rounded-full border border-border px-3.5 py-1.5 text-xs font-medium capitalize text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((client) => {
          const enrollments = repository
            .listEnrollments(client.id)
            .filter((e) => e.status === "active");
          const team = assignedStaffFor(client.id);
          return (
            <Link
              key={client.id}
              to="/clients/$clientId"
              params={{ clientId: client.id }}
              className="surface-card group flex flex-col p-5 transition-shadow hover:shadow-[var(--shadow-lift)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground group-hover:text-primary">
                    {clientDisplayName(client)}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {client.clientNumber} · joined {formatDate(client.dateJoined)}
                  </p>
                </div>
                <StatusPill status={client.status} />
              </div>

              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{client.goals}</p>

              <dl className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 font-medium text-foreground/70">Location</dt>
                  <dd>{locationById(client.primaryLocationId)?.name}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 font-medium text-foreground/70">Team</dt>
                  <dd>
                    {team.length
                      ? team
                          .map(
                            (t) =>
                              `${staffDisplayName(t.staff)} (${ASSIGNMENT_ROLE_LABELS[t.assignment.assignmentRole]})`,
                          )
                          .join(", ")
                      : "Not yet assigned"}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {enrollments.length ? (
                  enrollments.map((e) => (
                    <span
                      key={e.id}
                      className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                    >
                      {serviceById(e.serviceId)?.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No active services</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No clients match this filter.
        </p>
      ) : null}
    </div>
  );
}
