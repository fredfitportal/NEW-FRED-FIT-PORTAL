import { useState } from "react";
import { toast } from "sonner";

import { DialogFooterBar, Field, fieldClass } from "@/components/app/form-primitives";
import { TimeInput } from "@/components/app/TimeInput";
import { StatusPill } from "@/components/app/StatusPill";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  APPOINTMENT_STATUS_LABELS,
  DEMO_TODAY,
  clientDisplayName,
  creditBalances,
  formatDate,
  formatTime,
  recurrenceLabel,
  repository,
  serviceById,
  staffDisplayName,
} from "@/lib/domain/repository";
import { ConfirmStatusDialog } from "@/components/app/calendar/ConfirmStatusDialog";
import {
  availableMakeups,
  makeupForSourceAppointment,
  makeupSummary,
  redeemMakeup,
  releaseMakeupForAppointment,
} from "@/lib/domain/makeups";
import {
  activeParticipantCount,
  appointmentClientIds,
  hasOpenSeat,
  isSharedSession,
  sessionCapacity,
  sessionParticipants,
} from "@/lib/domain/sessions";
import {
  SERIES_FIELD_LABELS,
  endSeriesFrom,
  futurePendingOccurrences,
  activeParticipantPause,
  listSeriesChanges,
  pauseSeries,
  pauseSeriesParticipant,
  resumeSeries,
  resumeSeriesParticipant,
} from "@/lib/domain/series";
import { rescheduleOccurrence, updateSeriesFromOccurrence } from "@/lib/domain/series";
import { useSession } from "@/lib/domain/session";
import type { Appointment, AppointmentStatus, ID } from "@/lib/domain/types";

function addDaysIso(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const STATUS_ORDER: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "completed",
  "early_cancel",
  "late_cancel",
  "no_show",
  "rescheduled",
  "cancelled",
];

export function AppointmentDetailsDialog({
  appointmentId,
  onOpenChange,
}: {
  appointmentId: ID | null;
  onOpenChange: (open: boolean) => void;
}) {
  const session = useSession();
  const appointment = appointmentId ? repository.getAppointment(appointmentId) : undefined;
  const [reason, setReason] = useState("");
  const [edit, setEdit] = useState<Partial<Appointment>>({});
  const [redeemTypeId, setRedeemTypeId] = useState("");
  const [pendingStatus, setPendingStatus] = useState<AppointmentStatus | null>(null);
  const [makeupId, setMakeupId] = useState("");
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [editScope, setEditScope] = useState<"occurrence" | "future">("occurrence");
  const [changeReason, setChangeReason] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [endReason, setEndReason] = useState("");
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseStart, setPauseStart] = useState("");
  const [pauseResume, setPauseResume] = useState("");
  const [pauseNote, setPauseNote] = useState("");
  const [addClientId, setAddClientId] = useState("");
  const [participantPauseFor, setParticipantPauseFor] = useState<ID | null>(null);
  const [ppStart, setPpStart] = useState("");
  const [ppResume, setPpResume] = useState("");
  const [ppNote, setPpNote] = useState("");
  const [pendingParticipant, setPendingParticipant] = useState<{
    clientId: ID;
    status: AppointmentStatus;
  } | null>(null);

  if (!appointment) {
    return (
      <Dialog open={Boolean(appointmentId)} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment not found</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const participants = appointmentClientIds(appointment)
    .map((id) => repository.getClient(id))
    .filter(Boolean);
  const client = repository.getClient(appointment.clientId);
  const service = serviceById(appointment.serviceId);
  const provider = repository.getStaff(appointment.providerStaffId);
  const series = appointment.recurringAppointmentId
    ? repository.listRecurringAppointments().find((r) => r.id === appointment.recurringAppointmentId)
    : undefined;
  const history = repository.listAppointmentStatusHistory(appointment.id);
  const futureCount = series ? futurePendingOccurrences(series.id, appointment.date).length : 0;
  const seriesChanges = series ? listSeriesChanges(series.id) : [];
  const canSchedule = session.can("scheduling.manage");
  const redeemable = client
    ? creditBalances(client.id).filter(
        (b) =>
          b.balance > 0 &&
          (b.creditType.eligibleServiceCategories.length === 0 ||
            (service && b.creditType.eligibleServiceCategories.includes(service.category))),
      )
    : [];

  const shared = isSharedSession(appointment);
  const seatCapacity = sessionCapacity(service);
  const seatsTaken = appointmentClientIds(appointment).length;
  const openSeat = hasOpenSeat(appointment, service);
  const addableClients = repository
    .listClients()
    .filter((c) => !appointmentClientIds(appointment).includes(c.id) && c.status !== "archived");
  const participantRows = sessionParticipants(appointment);
  const activeCount = activeParticipantCount(appointment);
  const clientMakeups = client ? availableMakeups(client.id, appointment.serviceId) : [];
  const sourceMakeup = makeupForSourceAppointment(appointment.id);


  const value = <K extends keyof Appointment>(key: K): Appointment[K] =>
    (edit[key] ?? appointment[key]) as Appointment[K];

  function changeStatus(status: AppointmentStatus, confirmReason: string) {
    const hadMakeup = Boolean(appointment!.makeupCreditId);
    repository.changeAppointmentStatus(
      appointment!.id,
      status,
      session.staffId,
      confirmReason || reason || undefined,
    );
    setReason("");
    setPendingStatus(null);
    const issued = makeupForSourceAppointment(appointment!.id);
    toast.success(
      `Status changed to ${APPOINTMENT_STATUS_LABELS[status]}.` +
        (issued && issued.status === "available"
          ? ` A makeup was issued, expiring ${formatDate(issued.expirationDate)}.`
          : ""),
    );
    if (hadMakeup && client) {
      if (["early_cancel", "cancelled"].includes(status)) {
        toast.success(
          `Make-up credit returned. Client now has ${makeupSummary(client.id).available} available make-ups.`,
        );
      } else if (["late_cancel", "no_show"].includes(status)) {
        toast.error(
          `Make-up credit forfeited — ${APPOINTMENT_STATUS_LABELS[status]} does not return the credit.`,
        );
      }
    }
  }

  /** Attaches another client to this shared session instead of double-booking. */
  function addParticipant() {
    if (!addClientId) {
      toast.error("Select a client to add.");
      return;
    }
    const result = repository.addSessionParticipant(
      appointment!.id,
      addClientId,
      session.staffId,
      series ? "future" : "occurrence",
    );
    if (!result.ok) {
      toast.error(result.reason ?? "That client could not be added.");
      return;
    }
    const who = repository.getClient(addClientId);
    setAddClientId("");
    toast.success(
      `${who ? clientDisplayName(who) : "Client"} added to this session` +
        (series && (result.occurrencesUpdated ?? 1) > 1
          ? ` and ${(result.occurrencesUpdated ?? 1) - 1} future occurrence${(result.occurrencesUpdated ?? 1) - 1 === 1 ? "" : "s"}.`
          : ".") +
        " Each client keeps their own attendance and make-up history.",
    );
  }

  /** One participant only — the shared session and everyone else are untouched. */
  function changeParticipantStatus(
    clientId: ID,
    status: AppointmentStatus,
    confirmReason: string,
  ) {
    const before = makeupSummary(clientId).available;
    repository.changeParticipantStatus(
      appointment!.id,
      clientId,
      status,
      session.staffId,
      confirmReason || reason || undefined,
    );
    setPendingParticipant(null);
    setReason("");
    const who = repository.getClient(clientId);
    const name = who ? clientDisplayName(who) : "Participant";
    const after = makeupSummary(clientId).available;
    toast.success(
      `${name} marked ${APPOINTMENT_STATUS_LABELS[status]}. Other participants are unchanged.` +
        (after > before ? ` A make-up was issued — ${after} now available.` : ""),
    );
    if (after < before) {
      toast.error(`${name}'s make-up credit was forfeited by this status.`);
    }
  }

  /**
   * "This occurrence only" — moves this one appointment in place. It keeps its
   * id, clients, participants and history, stays linked to its series as an
   * exception, and never produces a cancellation or a make-up credit.
   */
  function saveOccurrence() {
    const scheduling = {
      ...(edit.date ? { date: edit.date } : {}),
      ...(edit.startTime ? { startTime: edit.startTime } : {}),
      ...(edit.durationMinutes ? { durationMinutes: edit.durationMinutes } : {}),
      ...(edit.providerStaffId ? { providerStaffId: edit.providerStaffId } : {}),
      ...(edit.locationId !== undefined ? { locationId: edit.locationId } : {}),
    };
    if (Object.keys(scheduling).length) {
      const result = rescheduleOccurrence(
        appointment!.id,
        scheduling,
        session.staffId,
        changeReason || undefined,
      );
      if (!result.ok) {
        toast.error(
          result.conflicts?.length
            ? `${result.reason} ${result.conflicts.join(" ")}`
            : (result.reason ?? "This occurrence could not be moved."),
        );
        return;
      }
    }
    /* Non-scheduling fields (notes and the like) save as a plain edit. */
    const rest = { ...edit };
    delete rest.date;
    delete rest.startTime;
    delete rest.durationMinutes;
    delete rest.providerStaffId;
    delete rest.locationId;
    if (Object.keys(rest).length) {
      repository.updateRecurringOccurrence(appointment!.id, rest, session.staffId);
    }
    setEdit({});
    setChangeReason("");
    const updated = repository.getAppointment(appointment!.id);
    toast.success(
      updated && updated.rescheduledFromDate
        ? `Moved to ${formatDate(updated.date)} at ${formatTime(updated.startTime)}. No cancellation, no make-up credit, and no other occurrence changed.`
        : "This occurrence was updated. No other occurrence changed.",
    );
  }

  /** "This and future occurrences" — changes the recurring pattern itself. */
  function saveSeriesFromHere() {
    const result = updateSeriesFromOccurrence(
      appointment!.id,
      {
        ...(edit.date ? { date: edit.date } : {}),
        ...(edit.startTime ? { startTime: edit.startTime } : {}),
        ...(edit.durationMinutes ? { durationMinutes: edit.durationMinutes } : {}),
        ...(edit.providerStaffId ? { providerStaffId: edit.providerStaffId } : {}),
        ...(edit.locationId !== undefined ? { locationId: edit.locationId } : {}),
      },
      session.staffId,
      changeReason || undefined,
    );
    if (!result.ok) {
      toast.error(result.reason ?? "Could not update the recurring schedule.");
      return;
    }
    /* Notes are per-appointment, never part of the recurring pattern. */
    if (edit.notes !== undefined) {
      repository.updateAppointment(appointment!.id, { notes: edit.notes }, session.staffId);
    }
    setEdit({});
    setChangeReason("");
    toast.success(
      `Recurring schedule updated from ${formatDate(appointment!.date)} — ${result.occurrencesUpdated} future appointment${result.occurrencesUpdated === 1 ? "" : "s"} moved. Earlier appointments are unchanged.`,
    );
  }

  function endSeries() {
    if (!series) return;
    const result = endSeriesFrom(
      series.id,
      appointment!.date,
      session.staffId,
      endReason || undefined,
    );
    setConfirmEnd(false);
    setEndReason("");
    if (!result.ok) {
      toast.error(result.reason ?? "Could not end the recurring schedule.");
      return;
    }
    onOpenChange(false);
    toast.success(
      `Recurring schedule ended from ${formatDate(appointment!.date)} — ${result.removedOccurrences} future appointment${result.removedOccurrences === 1 ? "" : "s"} removed. No make-up credits were issued.`,
    );
  }

  function applyPause() {
    if (!series) return;
    const result = pauseSeries(
      series.id,
      pauseStart,
      pauseResume,
      session.staffId,
      pauseNote || undefined,
    );
    if (!result.ok) {
      toast.error(result.reason ?? "Could not pause the recurring schedule.");
      return;
    }
    setPauseOpen(false);
    toast.success(
      `Schedule paused ${formatDate(pauseStart)} – ${formatDate(pauseResume)}. ${result.removedOccurrences} appointment${result.removedOccurrences === 1 ? "" : "s"} removed administratively${result.participantsRemoved ? `, ${result.participantsRemoved} shared session${result.participantsRemoved === 1 ? "" : "s"} kept for the other participant` : ""}. No make-up credits changed.`,
    );
  }

  function redeem() {
    if (!redeemTypeId || !client) return;
    repository.redeemCredit({
      clientId: client.id,
      creditTypeId: redeemTypeId,
      quantity: 1,
      appointmentId: appointment!.id,
      reason: `Redeemed against ${service?.name} on ${formatDate(appointment!.date)}`,
      performedByStaffId: session.staffId,
    });
    setRedeemTypeId("");
    toast.success("Credit redeemed. Balance recalculated from the ledger.");
  }

  function applyParticipantPause() {
    if (!series || !participantPauseFor) return;
    const result = pauseSeriesParticipant(
      series.id,
      participantPauseFor,
      ppStart,
      ppResume,
      session.staffId,
      ppNote || undefined,
    );
    if (!result.ok) {
      toast.error(result.reason ?? "That participant could not be paused.");
      return;
    }
    const who = repository.getClient(participantPauseFor);
    setParticipantPauseFor(null);
    toast.success(
      `${who ? clientDisplayName(who) : "Client"} paused ${formatDate(ppStart)} – ${formatDate(ppResume)} on this shared schedule. ` +
        `${result.occurrencesUpdated} upcoming session${result.occurrencesUpdated === 1 ? "" : "s"} now run without them. ` +
        "Every other participant is unchanged and no make-up credits were touched.",
    );
  }

  function resumeParticipantNow(clientId: ID) {
    if (!series) return;
    const result = resumeSeriesParticipant(
      series.id,
      clientId,
      session.staffId,
      "Resumed early",
      DEMO_TODAY,
    );
    if (!result.ok) {
      toast.error(result.reason ?? "That pause could not be ended.");
      return;
    }
    const who = repository.getClient(clientId);
    toast.success(
      `${who ? clientDisplayName(who) : "Client"} rejoined ${result.occurrencesUpdated} upcoming shared session${result.occurrencesUpdated === 1 ? "" : "s"}. Other participants are unchanged.`,
    );
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Appointment details</DialogTitle>
          <DialogDescription>
            {participants.length
              ? participants.map((c) => clientDisplayName(c!)).join(", ")
              : "—"}
            {participants.length > 1 ? ` (${participants.length} clients)` : ""} · {service?.name} ·{" "}
            {provider ? staffDisplayName(provider) : "—"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={appointment.status} />
          <span className="text-sm text-muted-foreground">
            {formatDate(appointment.date)} · {formatTime(appointment.startTime)} –{" "}
            {formatTime(appointment.endTime)}
          </span>
          {appointment.rescheduledFromDate ? (
            <span
              className="rounded-full border border-primary/50 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary"
              title={`Moved from ${formatDate(appointment.rescheduledFromDate)}${appointment.rescheduledFromStartTime ? ` at ${formatTime(appointment.rescheduledFromStartTime)}` : ""}`}
            >
              Rescheduled
            </span>
          ) : null}
          {appointment.makeupCreditId ? (
            <span className="rounded-full border border-success/50 bg-success/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-success">
              Make-up
            </span>
          ) : null}
          {series ? (
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
              Part of series {series.id} · {recurrenceLabel(series)}
            </span>
          ) : null}
          {appointment.rescheduledFromDate ? (
            <p className="w-full text-xs text-muted-foreground">
              Moved from {formatDate(appointment.rescheduledFromDate)}
              {appointment.rescheduledFromStartTime
                ? ` at ${formatTime(appointment.rescheduledFromStartTime)}`
                : ""}
              {appointment.rescheduledByStaffId
                ? ` by ${staffDisplayName(repository.getStaff(appointment.rescheduledByStaffId)!)}`
                : ""}
              . The recurring schedule is unchanged and this slot will not be rebooked automatically.
            </p>
          ) : null}
        </div>

        {/* Shared-format seats — add a second client instead of double-booking */}
        {seatCapacity > 1 ? (
          <section className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Shared session seats
              </h3>
              <span className="text-xs text-muted-foreground">
                {seatsTaken} of {seatCapacity} clients attached
              </span>
            </div>
            {openSeat ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Adding a client here joins this existing session — it does not create a second
                  appointment and does not double-book the trainer.
                  {series ? " Future occurrences of this schedule include them too." : ""}
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <Field label="Add client" className="min-w-[16rem] flex-1">
                    <select
                      className={fieldClass}
                      value={addClientId}
                      onChange={(e) => setAddClientId(e.target.value)}
                      disabled={!canSchedule}
                    >
                      <option value="">Select a client…</option>
                      {addableClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {clientDisplayName(c)} · {c.clientNumber}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Button onClick={addParticipant} disabled={!canSchedule || !addClientId}>
                    Add to this session
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                This session is full — {seatCapacity} of {seatCapacity} seats are taken. No further
                clients can be added.
              </p>
            )}
          </section>
        ) : null}

        {/* Per-participant statuses (shared sessions only) */}
        {shared ? (
          <section className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Participants</h3>
              <span className="text-xs text-muted-foreground">
                {activeCount} of {participantRows.length} still attending
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Each client is tracked separately. Changing one participant never changes the others
              and never removes the session for the rest of the group.
            </p>
            <ul className="divide-y divide-border">
              {participantRows.map((p) => {
                const pc = repository.getClient(p.clientId);
                const hold = activeParticipantPause(series, p.clientId);
                return (
                  <li key={p.clientId} className="space-y-2 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {pc ? clientDisplayName(pc) : p.clientId}
                      </span>
                      <StatusPill status={p.status} />
                      {p.makeupCreditId ? (
                        <span className="rounded-full border border-success/50 bg-success/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-success">
                          Make-up
                        </span>
                      ) : null}
                      {hold ? (
                        <span className="rounded-full border border-cal-medex/40 bg-cal-medex-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-cal-medex">
                          Paused to {formatDate(hold.resumeDate)}
                        </span>
                      ) : null}
                    </div>
                    {series && participantRows.length > 1 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {hold ? (
                          <>
                            <span className="text-xs text-muted-foreground">
                              This participant only — on hold {formatDate(hold.pauseStartDate)} –{" "}
                              {formatDate(hold.resumeDate)}
                              {hold.reason ? ` (${hold.reason})` : ""}. Everyone else keeps training.
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!canSchedule}
                              onClick={() => resumeParticipantNow(p.clientId)}
                            >
                              Resume {pc ? pc.firstName : "participant"} now
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canSchedule}
                            onClick={() => {
                              setParticipantPauseFor(p.clientId);
                              setPpStart(appointment.date);
                              setPpResume(addDaysIso(appointment.date, 28));
                              setPpNote("");
                            }}
                          >
                            Pause participant…
                          </Button>
                        )}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_ORDER.map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant={s === p.status ? "default" : "outline"}
                          disabled={!canSchedule}
                          onClick={() => setPendingParticipant({ clientId: p.clientId, status: s })}
                          className={
                            s === "no_show"
                              ? "border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              : undefined
                          }
                        >
                          {APPOINTMENT_STATUS_LABELS[s]}
                        </Button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* Status changes */}
        <section className="space-y-3 rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">
            {shared ? "Whole-session status (all participants)" : "Change status"}
          </h3>
          {shared ? (
            <p className="text-xs text-muted-foreground">
              Use this only when the entire session is cancelled or rescheduled — for example if the
              trainer is unavailable. It applies the status to every participant.
            </p>
          ) : null}
          <Field label="Reason / note (optional)">
            <input
              className={fieldClass}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            {STATUS_ORDER.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={s === appointment.status ? "default" : "outline"}
                disabled={!canSchedule}
                onClick={() => setPendingStatus(s)}
                className={
                  s === "no_show"
                    ? "border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    : undefined
                }
              >
                {APPOINTMENT_STATUS_LABELS[s]}
              </Button>
            ))}
          </div>
          {!canSchedule ? (
            <p className="text-xs text-muted-foreground">
              Your demo role cannot change scheduling status.
            </p>
          ) : null}
        </section>


        {/* Edit / reschedule — scope aware for recurring series */}
        <section className="space-y-3 rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">
            {series ? "Edit / reschedule" : "Edit / reschedule this appointment"}
          </h3>
          {series ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={editScope === "occurrence" ? "default" : "outline"}
                  onClick={() => setEditScope("occurrence")}
                >
                  This occurrence only
                </Button>
                <Button
                  size="sm"
                  variant={editScope === "future" ? "default" : "outline"}
                  onClick={() => setEditScope("future")}
                >
                  This and future occurrences
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {editScope === "occurrence"
                  ? "Changes only this appointment. The recurring schedule and every other appointment stay exactly as they are."
                  : `Changes the recurring schedule itself from ${formatDate(appointment.date)} onward — this appointment, ${futureCount} later appointment${futureCount === 1 ? "" : "s"} already on the calendar, and everything generated from now on. Earlier appointments keep the day, time and trainer they actually had.`}
              </p>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Date">
              <input
                type="date"
                className={fieldClass}
                value={value("date")}
                onChange={(e) => setEdit((d) => ({ ...d, date: e.target.value }))}
              />
            </Field>
            <Field label="Start time" hint="Type a time like 10:30 AM, or pick one.">
              <TimeInput
                value={value("startTime")}
                onChange={(v) => setEdit((d) => ({ ...d, startTime: v }))}
              />
            </Field>
            <Field label="Duration">
              <input
                type="number"
                min={15}
                step={5}
                className={fieldClass}
                value={value("durationMinutes")}
                onChange={(e) => setEdit((d) => ({ ...d, durationMinutes: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Provider" className="sm:col-span-2">
              <select
                className={fieldClass}
                value={value("providerStaffId")}
                onChange={(e) => setEdit((d) => ({ ...d, providerStaffId: e.target.value }))}
              >
                {repository.listStaff().map((s) => (
                  <option key={s.id} value={s.id}>
                    {staffDisplayName(s)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Location">
              <select
                className={fieldClass}
                value={value("locationId") ?? ""}
                onChange={(e) => setEdit((d) => ({ ...d, locationId: e.target.value }))}
              >
                {repository.listLocations().map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Internal notes" className="sm:col-span-3">
              <textarea
                rows={2}
                className={fieldClass}
                value={value("notes") ?? ""}
                onChange={(e) => setEdit((d) => ({ ...d, notes: e.target.value }))}
              />
            </Field>
          </div>
          {!series || editScope === "occurrence" ? (
            <Field label="Reason for moving this appointment (optional)">
              <input
                className={fieldClass}
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
              />
            </Field>
          ) : null}
          {series && editScope === "future" ? (
            <Field label="Reason / internal note for this schedule change (optional)">
              <input
                className={fieldClass}
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
              />
            </Field>
          ) : null}
          <Button
            size="sm"
            disabled={!canSchedule || Object.keys(edit).length === 0}
            onClick={series && editScope === "future" ? saveSeriesFromHere : saveOccurrence}
          >
            {series && editScope === "future"
              ? "Save this and future occurrences"
              : series
                ? "Save this occurrence only"
                : "Save changes"}
          </Button>
        </section>

        {/* Recurring schedule */}
        {series ? (
          <section className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Recurring schedule</h3>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {series.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {recurrenceLabel(series)} · {formatTime(series.startTime)} ·{" "}
              {series.durationMinutes} min ·{" "}
              {repository.getStaff(series.providerStaffId)
                ? staffDisplayName(repository.getStaff(series.providerStaffId)!)
                : "—"}
              {series.endDate ? ` · ends ${formatDate(series.endDate)}` : ""}
              {series.status === "paused" && series.pauseStartDate && series.resumeDate
                ? ` · paused ${formatDate(series.pauseStartDate)} – resumes ${formatDate(series.resumeDate)}${series.pauseReason ? ` (${series.pauseReason})` : ""}`
                : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {series.status === "active" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canSchedule}
                  onClick={() => {
                    setPauseStart(appointment.date);
                    setPauseResume(addDaysIso(appointment.date, 28));
                    setPauseNote("");
                    setPauseOpen(true);
                  }}
                >
                  Pause schedule…
                </Button>
              ) : series.status === "paused" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canSchedule}
                  onClick={() => {
                    resumeSeries(series.id, session.staffId, changeReason || undefined);
                    toast.success("Recurring schedule resumed from the current pattern.");
                  }}
                >
                  Resume now
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                disabled={!canSchedule || series.status === "ended"}
                onClick={() => setConfirmEnd(true)}
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                End schedule from this date
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ending a schedule is an administrative action: {futureCount} not-yet-delivered
              appointment{futureCount === 1 ? "" : "s"} from {formatDate(appointment.date)} onward
              would be removed. Nothing is marked cancelled and no make-up credits are issued. To
              cancel just this session, use the status buttons above.
            </p>
            {seriesChanges.length ? (
              <div className="space-y-1.5 border-t border-border pt-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Schedule change history
                </h4>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {seriesChanges.map((c) => {
                    const actor = repository.getStaff(c.changedByStaffId);
                    return (
                      <li key={c.id}>
                        <span className="text-foreground">
                          {SERIES_FIELD_LABELS[c.field] ?? c.field}: {c.previousValue} →{" "}
                          {c.newValue}
                        </span>{" "}
                        · effective {formatDate(c.effectiveDate)} ·{" "}
                        {c.scope === "occurrence"
                          ? "this occurrence only"
                          : c.scope === "series_end"
                          ? "schedule ended"
                          : c.scope === "series_pause"
                            ? "schedule paused"
                            : c.scope === "series_resume"
                              ? "schedule resumed"
                              : "this and future occurrences"}{" "}
                        · {actor ? staffDisplayName(actor) : c.changedByStaffId} on{" "}
                        {new Date(c.changedAt).toLocaleString()}
                        {c.reason ? ` · ${c.reason}` : ""}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Credit redemption */}
        <section className="space-y-3 rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Redeem a credit / makeup</h3>
          {appointment.redeemedCreditTransactionId ? (
            <p className="text-sm text-muted-foreground">
              A credit is already redeemed against this appointment.
            </p>
          ) : redeemable.length ? (
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Available credit" className="min-w-56">
                <select
                  className={fieldClass}
                  value={redeemTypeId}
                  onChange={(e) => setRedeemTypeId(e.target.value)}
                >
                  <option value="">Select credit</option>
                  {redeemable.map((b) => (
                    <option key={b.creditType.id} value={b.creditType.id}>
                      {b.creditType.name} — {b.balance} available
                    </option>
                  ))}
                </select>
              </Field>
              <Button size="sm" disabled={!redeemTypeId || !session.can("credits.view")} onClick={redeem}>
                Redeem 1 credit
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This client has no credit eligible for {service?.name}. Credits are not interchangeable
              across service lines.
            </p>
          )}
        </section>

        {/* Makeup ledger — 90 days from the original absence, one use only */}
        <section className="space-y-3 rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Makeups</h3>
          {sourceMakeup ? (
            <p className="text-sm text-muted-foreground">
              This absence issued a makeup on {formatDate(sourceMakeup.issuedDate)}, expiring{" "}
              {formatDate(sourceMakeup.expirationDate)} ({sourceMakeup.status}).
            </p>
          ) : null}
          {appointment.makeupCreditId ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">
                A makeup has been applied to this session — it cannot be used again.
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={!canSchedule}
                onClick={() => setConfirmRelease(true)}
              >
                Release makeup
              </Button>
            </div>
          ) : clientMakeups.length ? (
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Available makeup" className="min-w-64">
                <select
                  className={fieldClass}
                  value={makeupId}
                  onChange={(e) => setMakeupId(e.target.value)}
                >
                  <option value="">Select makeup</option>
                  {clientMakeups.map((m) => (
                    <option key={m.id} value={m.id}>
                      Missed {formatDate(m.originalAbsenceDate)} · expires{" "}
                      {formatDate(m.expirationDate)}
                    </option>
                  ))}
                </select>
              </Field>
              <Button
                size="sm"
                disabled={!makeupId || !canSchedule}
                onClick={() => {
                  const res = redeemMakeup(makeupId, appointment.id, session.staffId);
                  toast[res.ok ? "success" : "error"](
                    res.ok ? "Makeup applied to this session." : res.reason,
                  );
                  setMakeupId("");
                }}
              >
                Use makeup
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No unexpired makeups are available for this client.
            </p>
          )}
        </section>

        {/* Status history */}
        <section className="space-y-2 rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Status history</h3>
          <ul className="divide-y divide-border text-sm">
            {history.length ? (
              history.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(h.occurredAt).toLocaleString()}
                  </span>
                  {h.fromStatus ? <StatusPill status={h.fromStatus} /> : null}
                  <span className="text-muted-foreground">→</span>
                  <StatusPill status={h.toStatus} />
                  <span className="text-xs text-muted-foreground">
                    {h.changedByStaffId
                      ? staffDisplayName(repository.getStaff(h.changedByStaffId)!)
                      : ""}
                    {h.reason ? ` · ${h.reason}` : ""}
                  </span>
                </li>
              ))
            ) : (
              <li className="py-2 text-muted-foreground">No recorded status changes yet.</li>
            )}
          </ul>
        </section>

        <DialogFooterBar>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooterBar>

        <AlertDialog open={confirmRelease} onOpenChange={setConfirmRelease}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Release this make-up credit?</AlertDialogTitle>
              <AlertDialogDescription>
                Release this make-up credit and return it to the client&apos;s available balance?
                This appointment will no longer be marked as a make-up.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep applied</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const res = releaseMakeupForAppointment(appointment!.id, session.staffId);
                  toast[res.ok ? "success" : "error"](
                    res.ok && client
                      ? `Make-up credit returned. Client now has ${makeupSummary(client.id).available} available make-ups.`
                      : res.ok
                        ? "Make-up credit returned to the client's ledger."
                        : res.reason,
                  );
                  setConfirmRelease(false);
                }}
              >
                Release credit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ConfirmStatusDialog
          appointment={pendingParticipant ? appointment : null}
          status={pendingParticipant?.status ?? null}
          scopeNote={
            pendingParticipant
              ? `This applies to ${clientDisplayName(repository.getClient(pendingParticipant.clientId)!)} only. The session and the other participants stay as they are.`
              : undefined
          }
          onCancel={() => setPendingParticipant(null)}
          onConfirm={(r) =>
            changeParticipantStatus(pendingParticipant!.clientId, pendingParticipant!.status, r)
          }
        />

        <ConfirmStatusDialog
          appointment={pendingStatus ? appointment : null}
          status={pendingStatus}
          {...(shared
            ? {
                scopeNote:
                  "This applies to the WHOLE session — every participant receives this status.",
              }
            : {})}
          onCancel={() => setPendingStatus(null)}
          onConfirm={(r) => changeStatus(pendingStatus!, r)}
        />

        <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>End this recurring schedule?</AlertDialogTitle>
              <AlertDialogDescription>
                The recurring schedule stops from {formatDate(appointment.date)}. {futureCount}{" "}
                not-yet-delivered appointment{futureCount === 1 ? "" : "s"} will be removed from the
                calendar. Completed, cancelled and no-show appointments are kept exactly as they
                are, nothing is marked cancelled, and no make-up credits are issued.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Field label="Reason / internal note (optional)">
              <input
                className={fieldClass}
                value={endReason}
                onChange={(e) => setEndReason(e.target.value)}
              />
            </Field>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmEnd(false)}>Keep schedule</AlertDialogCancel>
              <AlertDialogAction onClick={endSeries}>End schedule</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Participant-level pause window */}
        <AlertDialog
          open={Boolean(participantPauseFor)}
          onOpenChange={(open) => !open && setParticipantPauseFor(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Pause this participant only —{" "}
                {participantPauseFor && repository.getClient(participantPauseFor)
                  ? clientDisplayName(repository.getClient(participantPauseFor)!)
                  : ""}
              </AlertDialogTitle>
              <AlertDialogDescription>
                THIS PARTICIPANT ONLY. The recurring schedule keeps running and every other
                participant stays booked. Inside the window this client is simply removed from
                upcoming shared sessions — nothing is marked cancelled or no-show, and no make-up
                credits are created, returned or forfeited. They rejoin automatically on the resume
                date. To stop the whole schedule for everyone, use &ldquo;Pause schedule…&rdquo; in
                the Recurring schedule section instead.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Pause start date">
                <input
                  type="date"
                  className={fieldClass}
                  value={ppStart}
                  onChange={(e) => setPpStart(e.target.value)}
                />
              </Field>
              <Field label="Resume date">
                <input
                  type="date"
                  className={fieldClass}
                  value={ppResume}
                  onChange={(e) => setPpResume(e.target.value)}
                />
              </Field>
              <Field label="Reason / internal note (optional)" className="sm:col-span-2">
                <input
                  className={fieldClass}
                  value={ppNote}
                  onChange={(e) => setPpNote(e.target.value)}
                />
              </Field>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setParticipantPauseFor(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={applyParticipantPause}>
                Pause this participant only
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Pause window */}
        <AlertDialog open={pauseOpen} onOpenChange={setPauseOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Pause the ENTIRE recurring schedule (all participants)</AlertDialogTitle>
              <AlertDialogDescription>
                A pause is a temporary administrative hold. Not-yet-delivered appointments inside
                the window are removed from the calendar — nothing is marked cancelled and no
                make-up credits are issued, returned or forfeited. The schedule restarts on the
                resume date using the current day, time, trainer and location.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Pause start date">
                <input
                  type="date"
                  className={fieldClass}
                  value={pauseStart}
                  onChange={(e) => setPauseStart(e.target.value)}
                />
              </Field>
              <Field label="Resume date">
                <input
                  type="date"
                  className={fieldClass}
                  value={pauseResume}
                  onChange={(e) => setPauseResume(e.target.value)}
                />
              </Field>
              <Field label="Reason / internal note (optional)" className="sm:col-span-2">
                <input
                  className={fieldClass}
                  value={pauseNote}
                  onChange={(e) => setPauseNote(e.target.value)}
                />
              </Field>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPauseOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={applyPause}>Pause schedule</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
