import { useState } from "react";
import { toast } from "sonner";

import { DialogFooterBar, Field, fieldClass } from "@/components/app/form-primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ClientDraft } from "@/lib/domain/repository";
import { repository, staffDisplayName } from "@/lib/domain/repository";
import { useSession } from "@/lib/domain/session";
import type { Client, ClientStatus, ID } from "@/lib/domain/types";

const STATUSES: ClientStatus[] = ["prospect", "onboarding", "active", "paused", "inactive"];

const SUCCESS_PREFIX = "What success looks like: ";

function splitNotes(client?: Client) {
  const raw = client?.relationshipNotes ?? "";
  const [first, ...rest] = raw.split("\n\n");
  if (first?.startsWith(SUCCESS_PREFIX)) {
    return { success: first.slice(SUCCESS_PREFIX.length), notes: rest.join("\n\n") };
  }
  return { success: "", notes: raw };
}

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client;
  onSaved?: (client: Client) => void;
}) {
  const session = useSession();
  const staff = repository.listStaff();
  const services = repository.listServices();
  const locations = repository.listLocations();
  const existingTeam = client
    ? repository.listAssignments(client.id).filter((a) => a.isActive)
    : [];
  const existingServices = client
    ? repository.listEnrollments(client.id).filter((e) => e.status === "active")
    : [];
  const split = splitNotes(client);

  const [draft, setDraft] = useState<ClientDraft>({
    firstName: client?.firstName ?? "",
    lastName: client?.lastName ?? "",
    preferredName: client?.preferredName ?? "",
    status: client?.status && client.status !== "archived" ? client.status : "prospect",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    dateOfBirth: client?.dateOfBirth ?? "",
    dateJoined: client?.dateJoined ?? new Date().toISOString().slice(0, 10),
    primaryLocationId: client?.primaryLocationId ?? locations[0]!.id,
    goals: client?.goals ?? "",
    successStatement: split.success,
    relationshipNotes: split.notes,
    primaryStaffId:
      existingTeam.find((a) => a.assignmentRole === "primary_trainer")?.staffId ??
      existingTeam[0]?.staffId ??
      null,
    careTeamStaffIds: existingTeam.map((a) => a.staffId),
    serviceIds: existingServices.map((e) => e.serviceId),
  });

  const set = <K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggle = (key: "careTeamStaffIds" | "serviceIds", id: ID) =>
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(id) ? d[key].filter((x) => x !== id) : [...d[key], id],
    }));

  function save() {
    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      toast.error("First and last name are required.");
      return;
    }
    const saved = client
      ? repository.updateClient(client.id, draft, session.staffId)
      : repository.createClient(draft, session.staffId);
    if (!saved) return;
    toast.success(client ? "Client updated." : `Client created — ${saved.clientNumber}`);
    onOpenChange(false);
    onSaved?.(saved);
  }

  function archive() {
    if (!client) return;
    repository.archiveClient(client.id, session.staffId);
    toast.success("Client archived. The record is retained, never deleted.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? "Edit client" : "Add client"}</DialogTitle>
          <DialogDescription>
            One canonical client record. Demo data only — never enter real client information.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <input
              className={fieldClass}
              value={draft.firstName}
              onChange={(e) => set("firstName", e.target.value)}
            />
          </Field>
          <Field label="Last name">
            <input
              className={fieldClass}
              value={draft.lastName}
              onChange={(e) => set("lastName", e.target.value)}
            />
          </Field>
          <Field label="Preferred name">
            <input
              className={fieldClass}
              value={draft.preferredName ?? ""}
              onChange={(e) => set("preferredName", e.target.value)}
            />
          </Field>
          <Field label="Client status">
            <select
              className={fieldClass}
              value={draft.status}
              onChange={(e) => set("status", e.target.value as ClientStatus)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={fieldClass}
              value={draft.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <input
              className={fieldClass}
              value={draft.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
          <Field label="Date of birth">
            <input
              type="date"
              className={fieldClass}
              value={draft.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)}
            />
          </Field>
          <Field label="Join / start date">
            <input
              type="date"
              className={fieldClass}
              value={draft.dateJoined}
              onChange={(e) => set("dateJoined", e.target.value)}
            />
          </Field>
          <Field label="Primary location" className="sm:col-span-2">
            <select
              className={fieldClass}
              value={draft.primaryLocationId}
              onChange={(e) => set("primaryLocationId", e.target.value)}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Primary goal" className="sm:col-span-2">
            <textarea
              rows={2}
              className={fieldClass}
              value={draft.goals ?? ""}
              onChange={(e) => set("goals", e.target.value)}
            />
          </Field>
          <Field label="What success looks like" className="sm:col-span-2">
            <textarea
              rows={2}
              className={fieldClass}
              value={draft.successStatement ?? ""}
              onChange={(e) => set("successStatement", e.target.value)}
            />
          </Field>
          <Field label="Assigned primary staff member">
            <select
              className={fieldClass}
              value={draft.primaryStaffId ?? ""}
              onChange={(e) => set("primaryStaffId", e.target.value || null)}
            >
              <option value="">Not assigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {staffDisplayName(s)} — {s.jobTitle}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Additional care team members">
            <div className="max-h-36 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2">
              {staff
                .filter((s) => s.id !== draft.primaryStaffId)
                .map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.careTeamStaffIds.includes(s.id)}
                      onChange={() => toggle("careTeamStaffIds", s.id)}
                    />
                    {staffDisplayName(s)}
                  </label>
                ))}
            </div>
          </Field>
          <Field label="Service enrollments" className="sm:col-span-2">
            <div className="grid gap-1.5 rounded-lg border border-border p-2 sm:grid-cols-2">
              {services.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.serviceIds.includes(s.id)}
                    onChange={() => toggle("serviceIds", s.id)}
                  />
                  {s.subCategory ?? s.name}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Internal notes" className="sm:col-span-2">
            <textarea
              rows={3}
              className={fieldClass}
              value={draft.relationshipNotes ?? ""}
              onChange={(e) => set("relationshipNotes", e.target.value)}
            />
          </Field>
        </div>

        <DialogFooterBar>
          {client ? (
            <Button variant="outline" onClick={archive} className="mr-auto">
              Archive client
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>{client ? "Save changes" : "Create client"}</Button>
        </DialogFooterBar>
      </DialogContent>
    </Dialog>
  );
}
