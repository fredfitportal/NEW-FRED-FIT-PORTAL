import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/PageHeader";
import { StaffAccountPanel } from "@/components/app/StaffAccountPanel";
import { StaffAvailabilityEditor } from "@/components/app/StaffAvailabilityEditor";
import { StaffPermissionsPanel } from "@/components/app/StaffPermissionsPanel";
import { ProfileTasksPanel } from "@/components/app/tasks/ProfileTasksPanel";
import { StaffFormDialog } from "@/components/app/StaffFormDialog";
import { StatusPill } from "@/components/app/StatusPill";
import { Button } from "@/components/ui/button";
import { useDemoData } from "@/hooks/useDemoData";
import {
  ASSIGNMENT_ROLE_LABELS,
  clientDisplayName,
  formatDate,
  initials,
  repository,
  serviceById,
  staffDisplayName,
} from "@/lib/domain/repository";
import { useSession } from "@/lib/domain/session";
import {
  WEEKDAY_LABELS,
  listAllStaffAvailability,
  listStaffLocations,
  setStaffActive,
} from "@/lib/domain/staff-admin";
import { levelById, levelIdForStaff, staffProfileView } from "@/lib/domain/accounts";

export const Route = createFileRoute("/_authenticated/team/$staffId")({
  head: () => ({
    meta: [
      { title: "Staff record — FredFit Portal" },
      { name: "description", content: "Staff profile, credentials, locations and authorized services." },
      { property: "og:title", content: "Staff record — FredFit Portal" },
      { property: "og:description", content: "Staff profile and authorizations at FFS." },
    ],
  }),
  component: StaffDetail,
  notFoundComponent: StaffMissing,
});

function StaffMissing() {
  return (
    <div className="surface-card p-10 text-center">
      <h1 className="text-xl font-semibold">Staff member not found</h1>
      <Link to="/team" className="mt-4 inline-block text-sm text-primary hover:underline">
        Back to team
      </Link>
    </div>
  );
}

function StaffDetail() {
  const { staffId } = Route.useParams();
  useDemoData();
  const session = useSession();
  const [editing, setEditing] = useState(false);
  const staff = repository.getStaff(staffId);
  if (!staff) throw notFound();

  // Access decided in the permission layer, not by hiding UI. A viewer with no
  // directory access gets "not found" — including through a typed URL.
  const view = staffProfileView(session.staffId, staff.id);
  if (view === "none") throw notFound();
  const full = view === "full";
  const mayEdit = session.has("staff.edit") || session.isPortalAdmin;

  const level = levelById(levelIdForStaff(staff.id));
  const credentials = repository.listStaffCredentials(staff.id);
  const locations = listStaffLocations(staff.id);
  const services = repository.listStaffServices().filter((s) => s.staffId === staff.id);
  const assignments = repository.listAssignments().filter((a) => a.staffId === staff.id);

  return (
    <div className="space-y-8">
      <Link
        to="/team"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Team
      </Link>

      <PageHeader
        eyebrow={staff.jobTitle}
        title={staffDisplayName(staff)}
        description={staff.biography}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={staff.isActive ? "active" : "inactive"} />
            {mayEdit ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  Edit staff
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStaffActive(staff.id, !staff.isActive);
                    toast.success(staff.isActive ? "Staff member deactivated" : "Staff member reactivated");
                  }}
                >
                  {staff.isActive ? "Deactivate" : "Reactivate"}
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      {editing ? (
        <StaffFormDialog open={editing} onOpenChange={setEditing} staff={staff} />
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <section className="surface-card p-6">
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-lg font-semibold text-primary">
              {initials(staffDisplayName(staff))}
            </span>
            <div>
              <p className="font-medium text-foreground">{staff.jobTitle}</p>
              <p className="text-sm text-muted-foreground">{staff.email}</p>
            </div>
          </div>
          <dl className="mt-6 space-y-3 text-sm">
            {[
              ["Department", staff.department ?? "—"],
              ...(full
                ? ([
                    ["Employment status", staff.employmentStatus.replace(/_/g, " ")],
                    [
                      "Employment type",
                      (staff.employmentType ?? staff.employmentStatus).replace(/_/g, " "),
                    ],
                    ["Start date", formatDate(staff.hireDate)],
                    ["Phone", staff.phone ?? "—"],
                  ] as [string, string][])
                : []),
              [
                "Locations",
                locations
                  .map((l) => repository.listLocations().find((x) => x.id === l.locationId)?.name)
                  .join(", ") || "—",
              ],
              [
                "Approved services",
                services.map((s) => serviceById(s.serviceId)?.name).join(", ") || "—",
              ],
              ["Permission level", level?.name ?? "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-3">
                <dt className="w-36 shrink-0 text-muted-foreground">{label}</dt>
                <dd className="capitalize text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          {!full ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Directory view. Employment details, portal account and tasks are not shown.
            </p>
          ) : null}
        </section>

        <section className="surface-card p-6">
          <h2 className="text-base font-semibold text-foreground">Credentials</h2>
          <ul className="mt-4 space-y-3">
            {credentials.length ? (
              credentials.map((c) => (
                <li key={c.id} className="rounded-xl bg-muted/60 px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.issuingBody} · {c.identifier ?? "no id"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Expires {c.expiresOn ? formatDate(c.expiresOn) : "does not expire"}
                  </p>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">No credentials on file.</li>
            )}
          </ul>
        </section>

        {full ? <StaffAccountPanel staff={staff} /> : null}
      </div>

      {full ? <StaffPermissionsPanel staff={staff} /> : null}

      {full ? <ProfileTasksPanel staffId={staff.id} /> : null}

      <section className="surface-card p-6">
        <h2 className="text-base font-semibold text-foreground">
          Working hours &amp; availability
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          When this person is normally available to be booked. Multiple windows a day are
          supported, each at its own location. Actual availability is still decided by existing
          appointments, blocked time, recurring schedules and pauses.
        </p>
        <div className="mt-4">
          {mayEdit ? (
            <StaffAvailabilityEditor staffId={staff.id} />
          ) : (
            <ul className="space-y-2 text-sm">
              {listAllStaffAvailability(staff.id).map((row) => (
                <li key={row.id} className="rounded-lg border border-border px-3 py-2">
                  {WEEKDAY_LABELS[row.weekday]} · {row.startTime}–{row.endTime} ·{" "}
                  {repository.listLocations().find((l) => l.id === row.locationId)?.name}
                </li>
              ))}
              {listAllStaffAvailability(staff.id).length === 0 ? (
                <li className="text-muted-foreground">No working hours configured.</li>
              ) : null}
            </ul>
          )}
        </div>
      </section>

      <section className="surface-card p-6">
        <h2 className="text-base font-semibold text-foreground">Assigned clients</h2>
        <ul className="mt-4 divide-y divide-border">
          {assignments.map((a) => {
            const client = repository.getClient(a.clientId);
            if (!client) return null;
            return (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <Link
                  to="/clients/$clientId"
                  params={{ clientId: client.id }}
                  className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                >
                  {clientDisplayName(client)}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {ASSIGNMENT_ROLE_LABELS[a.assignmentRole]} · since {formatDate(a.startDate)}
                </span>
                <StatusPill status={a.isActive ? "active" : "inactive"} />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
