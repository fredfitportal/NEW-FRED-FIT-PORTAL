import { useState } from "react";
import { toast } from "sonner";

import { DialogFooterBar, Field, fieldClass } from "@/components/app/form-primitives";
import { TimeInput } from "@/components/app/TimeInput";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AppointmentDraft } from "@/lib/domain/repository";
import {
  DEMO_TODAY,
  RECURRENCE_LABELS,
  clientDisplayName,
  formatDate,
  repository,
  staffDisplayName,
} from "@/lib/domain/repository";
import { listResources } from "@/lib/domain/operations";
import { appointmentClientIds, hasOpenSeat, sessionCapacity } from "@/lib/domain/sessions";
import { occupiesSlot } from "@/lib/domain/scheduling-policy";
import { availableMakeups, redeemMakeup } from "@/lib/domain/makeups";
import { useSession } from "@/lib/domain/session";
import type { ID, RecurrenceFrequency } from "@/lib/domain/types";

function addDaysIso(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const FREQUENCIES: RecurrenceFrequency[] = [
  "weekly",
  "every_other_week",
  "every_4_weeks",
  "monthly",
  "custom",
];

export function AppointmentFormDialog({
  open,
  onOpenChange,
  clientId,
  onSaved,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: ID;
  onSaved?: () => void;
  /** Prefill from a sellable-capacity option so staff can book it directly. */
  initial?: Partial<AppointmentDraft>;
}) {
  const session = useSession();
  const clients = repository.listClients();
  const services = repository.listServices();
  const staff = repository.listStaff();
  const locations = repository.listLocations();

  const defaultEndsOn = addDaysIso(initial?.date ?? DEMO_TODAY, 84);
  const [endsMode, setEndsMode] = useState<"never" | "on_date">("never");
  const [endsOn, setEndsOn] = useState("");

  const [draft, setDraft] = useState<AppointmentDraft>({
    clientId: clientId ?? clients[0]?.id ?? "",
    serviceId: services[0]!.id,
    providerStaffId: staff[2]?.id ?? staff[0]!.id,
    locationId: locations[0]!.id,
    date: DEMO_TODAY,
    startTime: "09:00",
    durationMinutes: services[0]!.defaultDurationMinutes,
    appointmentType: "in_person",
    notes: "",
    recurring: false,
    frequency: "weekly",
    customPattern: "",
    occurrences: 8,
    endsOn: null,
    ...initial,
  });

  const set = <K extends keyof AppointmentDraft>(key: K, value: AppointmentDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  /* Existing ledger logic — available, unexpired credits, soonest expiry first. */
  const makeupOptions = draft.clientId ? availableMakeups(draft.clientId) : [];
  const [useMakeup, setUseMakeup] = useState(false);
  const [makeupId, setMakeupId] = useState("");
  const selectedMakeupId = makeupId || makeupOptions[0]?.id || "";
  const makeupAllowed = makeupOptions.length > 0 && !draft.recurring;

  /*
   * Partner / Trio formats: a second client JOINS the session already booked
   * in this slot rather than competing with it for the trainer's time.
   */
  const selectedService = services.find((s) => s.id === draft.serviceId);
  const seatCapacity = sessionCapacity(selectedService);

  /*
   * Approved services from the staff profile decide who can be booked to
   * deliver a service. Staff with no approvals recorded stay bookable so the
   * existing schedule is never silently broken.
   */
  const approvals = repository.listStaffServices();
  const approvedProviders = staff.filter((s) => {
    const own = approvals.filter((a) => a.staffId === s.id);
    if (own.length === 0) return true;
    return own.some((a) => a.serviceId === draft.serviceId);
  });
  /*
   * Any existing session for this service in this trainer/date/time slot —
   * whether or not it still has a free seat. A FULL session must block the
   * booking outright: creating a second record here silently double-books the
   * slot and visually looks like the existing clients were replaced.
   */
  const slotSession =
    seatCapacity > 1 && draft.clientId
      ? repository
          .listAppointments()
          .find(
            (a) =>
              a.date === draft.date &&
              a.startTime === draft.startTime &&
              a.providerStaffId === draft.providerStaffId &&
              a.serviceId === draft.serviceId &&
              occupiesSlot(a) &&
              !appointmentClientIds(a).includes(draft.clientId),
          )
      : undefined;
  const joinTarget =
    slotSession && hasOpenSeat(slotSession, selectedService) ? slotSession : undefined;
  const fullSession = slotSession && !joinTarget ? slotSession : undefined;
  const sessionLabel = selectedService?.subCategory ?? selectedService?.name ?? "shared";
  const fullMessage = fullSession
    ? `This ${sessionLabel} session is full (${seatCapacity} of ${seatCapacity} clients). The existing clients were not changed.`
    : "";
  const [joinExisting, setJoinExisting] = useState(true);
  const willJoin = Boolean(joinTarget) && joinExisting;
  const selectedMakeup = makeupOptions.find((m) => m.id === selectedMakeupId);

  function save() {
    if (!draft.clientId) {
      toast.error("Select a client.");
      return;
    }
    /* Capacity is checked BEFORE any write, so a blocked attempt changes nothing. */
    if (fullSession) {
      toast.error(fullMessage);
      return;
    }
    if (joinTarget && joinExisting) {
      const result = repository.addSessionParticipant(
        joinTarget.id,
        draft.clientId,
        session.staffId,
        "future",
      );
      if (!result.ok) {
        toast.error(result.reason ?? "That client could not be added to the session.");
        return;
      }
      const added = result.occurrencesUpdated ?? 1;
      toast.success(
        `Client added to the existing ${selectedService?.subCategory ?? selectedService?.name ?? "shared"} session` +
          (added > 1 ? ` and ${added - 1} future occurrence${added - 1 === 1 ? "" : "s"}.` : "."),
      );
      onOpenChange(false);
      onSaved?.();
      return;
    }
    if (draft.recurring) {
      const { occurrences } = repository.createRecurringSeries(draft, session.staffId);
      toast.success(`Recurring series created — ${occurrences.length} occurrences scheduled.`);
    } else {
      const appointment = repository.createAppointment(draft, session.staffId);
      if (useMakeup && makeupAllowed && selectedMakeupId) {
        const res = redeemMakeup(selectedMakeupId, appointment.id, session.staffId);
        const remaining = availableMakeups(draft.clientId).length;
        toast[res.ok ? "success" : "error"](
          res.ok
            ? `Make-up booked successfully. ${remaining} make-up credit${remaining === 1 ? "" : "s"} remain${remaining === 1 ? "s" : ""}.`
            : `Appointment scheduled, but the make-up was not applied: ${res.reason}`,
        );
      } else {
        toast.success("Appointment scheduled.");
      }
    }
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule appointment</DialogTitle>
          <DialogDescription>
            Occurrences generated from a recurring series stay linked to that series and keep their
            own attendance history.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client" className="sm:col-span-2">
            <select
              className={fieldClass}
              value={draft.clientId}
              onChange={(e) => set("clientId", e.target.value)}
              disabled={Boolean(clientId)}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {clientDisplayName(c)} · {c.clientNumber}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Service">
            <select
              className={fieldClass}
              value={draft.serviceId}
              onChange={(e) => {
                const service = services.find((s) => s.id === e.target.value)!;
                setDraft((d) => ({
                  ...d,
                  serviceId: service.id,
                  durationMinutes: service.defaultDurationMinutes,
                  appointmentType: service.isVirtualByDefault ? "virtual" : d.appointmentType,
                }));
              }}
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subCategory ?? s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Provider"
            hint={
              approvedProviders.length < staff.length
                ? "Only staff approved for this service are listed."
                : ""
            }
          >
            <select
              className={fieldClass}
              value={draft.providerStaffId}
              onChange={(e) => set("providerStaffId", e.target.value)}
            >
              {approvedProviders.map((s) => (
                <option key={s.id} value={s.id}>
                  {staffDisplayName(s)} — {s.jobTitle}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Location">
            <select
              className={fieldClass}
              value={draft.locationId}
              onChange={(e) => set("locationId", e.target.value)}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Room / resource">
            <select
              className={fieldClass}
              value={draft.resourceId ?? ""}
              onChange={(e) => set("resourceId", e.target.value || null)}
            >
              <option value="">Not specified</option>
              {listResources(draft.locationId).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Virtual / in-person">
            <select
              className={fieldClass}
              value={draft.appointmentType}
              onChange={(e) => set("appointmentType", e.target.value as "in_person" | "virtual")}
            >
              <option value="in_person">In-person</option>
              <option value="virtual">Virtual</option>
            </select>
          </Field>
          <Field label="Date">
            <input
              type="date"
              className={fieldClass}
              value={draft.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </Field>
          <Field label="Start time" hint="Type a time like 10:30 AM, or pick one.">
            <TimeInput value={draft.startTime} onChange={(v) => set("startTime", v)} />
          </Field>
          <Field label="Duration (minutes)">
            <input
              type="number"
              min={15}
              step={5}
              className={fieldClass}
              value={draft.durationMinutes}
              onChange={(e) => set("durationMinutes", Number(e.target.value))}
            />
          </Field>
          <Field label="One-time / recurring">
            <select
              className={fieldClass}
              value={draft.recurring ? "recurring" : "one_time"}
              onChange={(e) => set("recurring", e.target.value === "recurring")}
            >
              <option value="one_time">One-time</option>
              <option value="recurring">Recurring</option>
            </select>
          </Field>
          {draft.recurring ? (
            <>
              <Field label="Recurrence frequency">
                <select
                  className={fieldClass}
                  value={draft.frequency}
                  onChange={(e) => set("frequency", e.target.value as RecurrenceFrequency)}
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>
                      {RECURRENCE_LABELS[f]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ends">
                <select
                  className={fieldClass}
                  value={endsMode}
                  onChange={(e) => {
                    const mode = e.target.value as "never" | "on_date";
                    setEndsMode(mode);
                    set("endsOn", mode === "on_date" ? endsOn || defaultEndsOn : null);
                  }}
                >
                  <option value="never">Never</option>
                  <option value="on_date">On date</option>
                </select>
              </Field>
              {endsMode === "on_date" ? (
                <Field label="End date">
                  <input
                    type="date"
                    className={fieldClass}
                    min={draft.date}
                    value={endsOn || defaultEndsOn}
                    onChange={(e) => {
                      setEndsOn(e.target.value);
                      set("endsOn", e.target.value);
                    }}
                  />
                </Field>
              ) : (
                <p className="self-end text-xs text-muted-foreground sm:col-span-1">
                  This schedule will continue until you pause or end it. Future appointments will
                  be added automatically.
                </p>
              )}
              {draft.frequency === "custom" ? (
                <Field label="Custom pattern" className="sm:col-span-2">
                  <input
                    className={fieldClass}
                    placeholder="e.g. first and third Tuesday"
                    value={draft.customPattern ?? ""}
                    onChange={(e) => set("customPattern", e.target.value)}
                  />
                </Field>
              ) : null}
            </>
          ) : null}
          {joinTarget ? (
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm sm:col-span-2">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={joinExisting}
                  onChange={(e) => setJoinExisting(e.target.checked)}
                />
                <span>
                  <span className="font-medium text-foreground">
                    Add this client to the existing session at this time
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {staffDisplayName(staff.find((s) => s.id === draft.providerStaffId)!)} already
                    has a {selectedService?.subCategory ?? selectedService?.name} session at{" "}
                    {draft.startTime} on {formatDate(draft.date)} with{" "}
                    {appointmentClientIds(joinTarget)
                      .map((id) => {
                        const c = repository.getClient(id);
                        return c ? clientDisplayName(c) : id;
                      })
                      .join(", ")}
                    . This joins that session ({appointmentClientIds(joinTarget).length + 1} of{" "}
                    {seatCapacity} seats) instead of booking a conflicting appointment
                    {joinTarget.recurringAppointmentId
                      ? ", and applies to future occurrences of that schedule"
                      : ""}
                    .
                  </span>
                </span>
              </label>
            </div>
          ) : null}
          {fullSession ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm sm:col-span-2">
              <p className="font-medium text-foreground">{fullMessage}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {appointmentClientIds(fullSession)
                  .map((id) => {
                    const c = repository.getClient(id);
                    return c ? clientDisplayName(c) : id;
                  })
                  .join(" and ")}{" "}
                are already attending this session at {draft.startTime} on{" "}
                {formatDate(draft.date)}. Pick another time or provider, or remove a client from
                that session first.
              </p>
            </div>
          ) : null}
          {/* Make-up redemption — reuses the existing ledger, never auto-applied */}
          <div className="rounded-xl border border-border p-3 sm:col-span-2">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={useMakeup && makeupAllowed}
                disabled={!makeupAllowed}
                onChange={(e) => setUseMakeup(e.target.checked)}
              />
              <span>
                <span className="font-medium text-foreground">This appointment is a make-up</span>
                <span className="block text-xs text-muted-foreground">
                  {draft.recurring
                    ? "Make-up credits apply to single appointments only."
                    : makeupOptions.length
                      ? `${makeupOptions.length} available make-up credit${makeupOptions.length === 1 ? "" : "s"} — the soonest-expiring one is used by default.`
                      : "No available make-up credits"}
                </span>
              </span>
            </label>
            {useMakeup && makeupAllowed ? (
              <div className="mt-3 space-y-3">
                {selectedMakeup ? (
                  <div className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-foreground">
                    <p className="font-medium">Available Make-Ups: {makeupOptions.length}</p>
                    <p>
                      Using credit earned {formatDate(selectedMakeup.issuedDate)} — expires{" "}
                      {formatDate(selectedMakeup.expirationDate)}
                    </p>
                    <p>Remaining after booking: {makeupOptions.length - 1}</p>
                  </div>
                ) : null}
                <Field label="Credit to redeem">
                  <select
                    className={fieldClass}
                    value={selectedMakeupId}
                    onChange={(e) => setMakeupId(e.target.value)}
                  >
                    {makeupOptions.map((m, i) => (
                      <option key={m.id} value={m.id}>
                        Earned {formatDate(m.issuedDate)} · expires {formatDate(m.expirationDate)}
                        {i === 0 ? " (soonest)" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            ) : null}
          </div>
          <Field label="Internal appointment notes" className="sm:col-span-2">
            <textarea
              rows={3}
              className={fieldClass}
              value={draft.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </div>

        <DialogFooterBar>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={Boolean(fullSession)}>
            {willJoin
              ? "Add to existing session"
              : draft.recurring
                ? "Create series"
                : "Create appointment"}
          </Button>
        </DialogFooterBar>
      </DialogContent>
    </Dialog>
  );
}
