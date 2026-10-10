import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/PageHeader";
import { StatusPill } from "@/components/app/StatusPill";
import { Field, fieldClass } from "@/components/app/form-primitives";
import { Button } from "@/components/ui/button";
import { useDemoData } from "@/hooks/useDemoData";
import {
  bookClassParticipant,
  classCapacityState,
  createClassSession,
  listClassSessions,
  listResources,
  resourceById,
  setParticipantStatus,
} from "@/lib/domain/operations";
import {
  DEMO_TODAY,
  clientDisplayName,
  formatDate,
  formatTime,
  locationById,
  repository,
  serviceById,
  staffDisplayName,
} from "@/lib/domain/repository";
import { useSession } from "@/lib/domain/session";
import type { ClassParticipantStatus } from "@/lib/domain/types";

const PARTICIPANT_STATUSES: ClassParticipantStatus[] = [
  "booked",
  "attended",
  "cancelled",
  "late_cancelled",
  "no_show",
];

export const Route = createFileRoute("/_authenticated/classes")({
  head: () => ({
    meta: [
      { title: "Group Classes & Rosters — FredFit Portal" },
      {
        name: "description",
        content:
          "Schedule Apparatix and Apparatix Plus group classes, manage the roster up to the configured capacity, and record attendance.",
      },
      { property: "og:title", content: "Group Classes & Rosters — FredFit Portal" },
      {
        property: "og:description",
        content: "Capacity-based Apparatix class scheduling and attendance for FFS.",
      },
    ],
  }),
  component: ClassesPage,
});

function ClassesPage() {
  useDemoData();
  const session = useSession();
  const sessions = listClassSessions();
  const groupServices = repository.listServices().filter((s) => s.isGroupClass && s.isActive);
  const locations = repository.listLocations();
  const staff = repository.listStaff();

  const [draft, setDraft] = useState({
    serviceId: groupServices[0]?.id ?? "",
    instructorStaffId: staff[0]?.id ?? "",
    locationId: locations[0]?.id ?? "",
    resourceId: "",
    date: DEMO_TODAY,
    startTime: "09:00",
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Group classes"
        description="An Apparatix class is ONE schedule block with a roster — not one appointment per client. Class size comes from service configuration, never a hard-coded number."
      />

      <section className="surface-card space-y-4 p-5">
        <h2 className="text-base font-semibold text-foreground">Schedule a class</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Class">
            <select
              className={fieldClass}
              value={draft.serviceId}
              onChange={(e) => setDraft({ ...draft, serviceId: e.target.value })}
            >
              {groupServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (capacity {s.classCapacity ?? 6})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Instructor">
            <select
              className={fieldClass}
              value={draft.instructorStaffId}
              onChange={(e) => setDraft({ ...draft, instructorStaffId: e.target.value })}
            >
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {staffDisplayName(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Location">
            <select
              className={fieldClass}
              value={draft.locationId}
              onChange={(e) => setDraft({ ...draft, locationId: e.target.value, resourceId: "" })}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Room / equipment">
            <select
              className={fieldClass}
              value={draft.resourceId}
              onChange={(e) => setDraft({ ...draft, resourceId: e.target.value })}
            >
              <option value="">Not specified</option>
              {listResources(draft.locationId).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input
              type="date"
              className={fieldClass}
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </Field>
          <Field label="Start time">
            <input
              type="time"
              className={fieldClass}
              value={draft.startTime}
              onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
            />
          </Field>
        </div>
        <Button
          disabled={!session.can("scheduling.manage") || !draft.serviceId}
          onClick={() => {
            createClassSession({
              serviceId: draft.serviceId,
              instructorStaffIds: [draft.instructorStaffId],
              locationId: draft.locationId,
              resourceId: draft.resourceId || null,
              date: draft.date,
              startTime: draft.startTime,
            });
            toast.success("Class scheduled");
          }}
        >
          Add class to the schedule
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="page-heading text-xl">Scheduled classes</h2>
        {sessions.length === 0 ? (
          <p className="surface-card p-6 text-sm text-muted-foreground">
            No classes scheduled yet.
          </p>
        ) : null}
        {sessions.map((cs) => {
          const state = classCapacityState(cs);
          const service = serviceById(cs.serviceId);
          const resource = resourceById(cs.resourceId);
          return (
            <article key={cs.id} className="surface-card space-y-4 p-5">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{service?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(cs.date)} · {formatTime(cs.startTime)}–{formatTime(cs.endTime)} ·{" "}
                    {locationById(cs.locationId)?.name}
                    {resource ? ` · ${resource.name}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {cs.instructorStaffIds
                      .map((id) => {
                        const s = repository.getStaff(id);
                        return s ? staffDisplayName(s) : null;
                      })
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
                <StatusPill
                  label={`${state.label} booked`}
                  tone={state.isFull ? "critical" : "positive"}
                />
              </header>

              <div className="space-y-2">
                {state.participants.map((p) => {
                  const client = repository.getClient(p.clientId);
                  return (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      {client ? (
                        <Link
                          to="/clients/$clientId"
                          params={{ clientId: client.id }}
                          className="text-foreground hover:underline"
                        >
                          {clientDisplayName(client)}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Unknown client</span>
                      )}
                      <select
                        className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                        value={p.status}
                        onChange={(e) =>
                          setParticipantStatus(p.id, e.target.value as ClassParticipantStatus)
                        }
                      >
                        {PARTICIPANT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
                {state.participants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No one booked yet.</p>
                ) : null}
              </div>

              <AddParticipant sessionId={cs.id} full={state.isFull} />
            </article>
          );
        })}
      </section>
    </div>
  );
}

function AddParticipant({ sessionId, full }: { sessionId: string; full: boolean }) {
  const clients = repository.listClients();
  const [clientId, setClientId] = useState("");

  if (full) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        This class is at capacity. Waitlisting exists in the data model but is not enabled in this
        build, so no further bookings are accepted.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
      <Field label="Add a client" className="min-w-56">
        <select
          className={fieldClass}
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">Select a client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {clientDisplayName(c)}
            </option>
          ))}
        </select>
      </Field>
      <Button
        size="sm"
        disabled={!clientId}
        onClick={() => {
          const result = bookClassParticipant(sessionId, clientId);
          if (result.ok) {
            toast.success("Client booked into the class");
            setClientId("");
          } else if (result.reason === "full") {
            toast.error("Class is at capacity");
          } else if (result.reason === "duplicate") {
            toast.error("That client is already booked");
          }
        }}
      >
        Book
      </Button>
    </div>
  );
}
