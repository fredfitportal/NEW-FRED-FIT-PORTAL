import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader } from "@/components/app/PageHeader";
import { StaffFormDialog } from "@/components/app/StaffFormDialog";
import { StatusPill } from "@/components/app/StatusPill";
import { Button } from "@/components/ui/button";
import { useDemoData } from "@/hooks/useDemoData";
import { ACCOUNT_STATUS_LABELS, accountStatus } from "@/lib/domain/accounts";
import { useSession } from "@/lib/domain/session";
import { formatDate, initials, repository, staffDisplayName } from "@/lib/domain/repository";

export const Route = createFileRoute("/_authenticated/team/")({
  head: () => ({
    meta: [
      { title: "Team — FredFit Portal" },
      {
        name: "description",
        content:
          "Staff directory for Fredericksburg Fitness Studio with roles, credentials, locations and authorized services.",
      },
      { property: "og:title", content: "Team — FredFit Portal" },
      {
        property: "og:description",
        content: "Staff records, roles and credentials across the studio.",
      },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  useDemoData();
  const session = useSession();
  const [adding, setAdding] = useState(false);
  const staff = repository.listStaff();
  const roles = repository.listRoles();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="People"
        title="Team"
        description="Staff records are separate from login accounts. A staff profile describes the person and their authorizations; the authentication identity that signs in is a distinct record."
        actions={
          session.has("staff.edit") || session.isPortalAdmin ? (
            <Button onClick={() => setAdding(true)}>Add staff member</Button>
          ) : null
        }
      />

      {adding ? <StaffFormDialog open={adding} onOpenChange={setAdding} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {staff.map((s) => {
          const role = roles.find((r) => r.id === s.roleId);
          const creds = repository.listStaffCredentials(s.id);
          return (
            <Link
              key={s.id}
              to="/team/$staffId"
              params={{ staffId: s.id }}
              className="surface-card group p-5 transition-shadow hover:shadow-[var(--shadow-lift)]"
            >
              <div className="flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-sm font-semibold text-primary">
                  {initials(staffDisplayName(s))}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-foreground group-hover:text-primary">
                    {staffDisplayName(s)}
                  </h2>
                  <p className="text-sm text-muted-foreground">{s.jobTitle}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <StatusPill status={s.isActive ? "active" : "inactive"} />
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                      {role?.name} · {ACCOUNT_STATUS_LABELS[accountStatus(s.id)]}
                    </span>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Hired {formatDate(s.hireDate)} · {creds.length} credential
                {creds.length === 1 ? "" : "s"} on file
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
