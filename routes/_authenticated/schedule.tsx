import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";

import { AppointmentDetailsDialog } from "@/components/app/AppointmentDetailsDialog";
import { AppointmentFormDialog } from "@/components/app/AppointmentFormDialog";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusPill } from "@/components/app/StatusPill";
import { StaffAvatar } from "@/components/app/calendar/StaffAvatar";
import {
  CalendarToolbar,
  IN_HOME_LOCATION_ID,
  VIRTUAL_LOCATION_IDS,
  type CalendarView,
  type TeamSelection,
} from "@/components/app/calendar/CalendarToolbar";
import { DayTimeGrid, type DropPayload } from "@/components/app/calendar/DayTimeGrid";
import {
  RescheduleConfirmDialog,
  type RescheduleScope,
  type RescheduleTarget,
} from "@/components/app/calendar/RescheduleConfirmDialog";
import { Button } from "@/components/ui/button";
import { useDemoData } from "@/hooks/useDemoData";
import {
  APPOINTMENT_STATUS_LABELS,
  todayIso,
  clientDisplayName,
  formatDate,
  formatTime,
  locationById,
  repository,
  serviceById,
  staffDisplayName,
} from "@/lib/domain/repository";
import { occupiesSlot } from "@/lib/domain/scheduling-policy";
import { addDays, startOfWeek, weeklyCapacity } from "@/lib/domain/scheduling";
import { CALENDAR_LEGEND, serviceColor } from "@/lib/domain/service-colors";
import { useSession } from "@/lib/domain/session";
import type { Appointment } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [
      { title: "Calendar & Scheduling — FredFit Portal" },
      {
        name: "description",
        content:
          "Professional day, week and list scheduling for Fredericksburg Fitness Studio with drag-and-drop rescheduling, cancellation policy enforcement, makeup tracking and weekly trainer capacity.",
      },
      { property: "og:title", content: "Calendar & Scheduling — FredFit Portal" },
      {
        property: "og:description",
        content:
          "Drag-and-drop scheduling, attendance outcomes, makeup credits and trainer capacity in one calendar.",
      },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  useDemoData();
  const session = useSession();

  const [view, setView] = useState<CalendarView>("day");
  const [today, setToday] = useState(() => todayIso());
  const [date, setDate] = useState(() => todayIso());
  const [dateTouched, setDateTouched] = useState(false);

  // Resolve the real local date after hydration so SSR (UTC) can't shift the day.
  useEffect(() => {
    const actual = todayIso();
    setToday(actual);
    setDate((current) => (dateTouched ? current : actual));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeDate(next: string) {
    setDateTouched(true);
    setDate(next);
  }
  const [locationFilter, setLocationFilter] = useState("all");
  const [team, setTeam] = useState<TeamSelection>({ mode: "scheduled", staffIds: [] });
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<Record<string, unknown> | undefined>(undefined);
  const [pendingMove, setPendingMove] = useState<{
    appointment: Appointment;
    target: RescheduleTarget;
  } | null>(null);

  const staff = repository.listStaff();
  const locations = repository.listLocations();
  const canEdit = session.can("scheduling.manage");

  const weekStart = startOfWeek(date);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const matchesLocation = useMemo(
    () => (a: Appointment) => {
      if (locationFilter === "all") return true;
      if (locationFilter === "virtual")
        return a.appointmentType === "virtual" || VIRTUAL_LOCATION_IDS.includes(a.locationId ?? "");
      if (locationFilter === IN_HOME_LOCATION_ID)
        return Boolean(a.isInHome) || a.locationId === IN_HOME_LOCATION_ID;
      return a.locationId === locationFilter;
    },
    [locationFilter],
  );

  const all = repository.listAppointments();
  const dayAppointments = useMemo(
    () => all.filter((a) => a.date === date && matchesLocation(a)),
    [all, date, matchesLocation],
  );
  const weekAppointments = useMemo(
    () => all.filter((a) => a.date >= weekStart && a.date <= addDays(weekStart, 6) && matchesLocation(a)),
    [all, weekStart, matchesLocation],
  );

  const scheduledStaffIds = useMemo(() => {
    const source = view === "week" ? weekAppointments : dayAppointments;
    const ids = new Set(source.filter(occupiesSlot).map((a) => a.providerStaffId));
    return staff.filter((s) => ids.has(s.id)).map((s) => s.id);
  }, [view, dayAppointments, weekAppointments, staff]);

  const visibleStaff = useMemo(() => {
    const bookable = staff.filter((s) => s.isBookable !== false);
    if (team.mode === "all") return bookable;
    if (team.mode === "custom") return bookable.filter((s) => team.staffIds.includes(s.id));
    const scheduled = bookable.filter((s) => scheduledStaffIds.includes(s.id));
    return scheduled.length ? scheduled : bookable.slice(0, 6);
  }, [staff, team, scheduledStaffIds]);

  const visibleIds = visibleStaff.map((s) => s.id);
  const dayForGrid = dayAppointments.filter((a) => visibleIds.includes(a.providerStaffId));

  const capacityRows = useMemo(() => weeklyCapacity(weekStart), [weekStart, all]);

  function handleDrop(payload: DropPayload) {
    const appointment = repository.getAppointment(payload.appointmentId);
    if (!appointment) return;
    if (
      appointment.providerStaffId === payload.providerStaffId &&
      appointment.startTime === payload.startTime
    )
      return;
    setPendingMove({
      appointment,
      target: {
        date: appointment.date,
        startTime: payload.startTime,
        providerStaffId: payload.providerStaffId,
      },
    });
  }

  function confirmMove(scope: RescheduleScope, overrideReason?: string) {
    if (!pendingMove) return;
    const { appointment, target } = pendingMove;
    const patch = {
      date: target.date,
      startTime: target.startTime,
      providerStaffId: target.providerStaffId,
    };
    if (scope === "series") {
      if (overrideReason) {
        repository.recordSchedulingOverride({
          appointmentId: appointment.id,
          staffId: session.staffId,
          ruleKey: "reschedule.override",
          ruleDescription: "Rescheduled despite scheduling warnings",
          reason: overrideReason,
          context: `${target.date} ${target.startTime}`,
        });
      }
      const moved = repository.rescheduleSeriesFrom(
        appointment.id,
        patch,
        session.staffId,
        overrideReason,
      );
      toast.success(`Series updated — ${moved.length} occurrences moved.`);
    } else {
      repository.moveSingleOccurrence(appointment.id, patch, session.staffId, {
        ...(overrideReason ? { reason: overrideReason } : {}),
        ...(overrideReason
          ? {
              override: {
                ruleKey: "reschedule.override",
                ruleDescription: "Rescheduled despite scheduling warnings",
                reason: overrideReason,
                context: `${target.date} ${target.startTime}`,
              },
            }
          : {}),
      });
      toast.success("Appointment rescheduled.");
    }
    setPendingMove(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Calendar"
        description="Drag to reschedule, click an open slot to book, and track attendance, cancellations and makeups in one place."
        actions={
          canEdit ? (
            <Button
              onClick={() => {
                setFormInitial({ date });
                setFormOpen(true);
              }}
            >
              <CalendarPlus className="size-4" /> New appointment
            </Button>
          ) : null
        }
      />

      <CalendarToolbar
        date={date}
        today={today}
        view={view}
        onDateChange={changeDate}
        onViewChange={setView}
        locationFilter={locationFilter}
        onLocationChange={setLocationFilter}
        locations={locations}
        team={team}
        onTeamChange={setTeam}
        staff={staff.filter((s) => s.isBookable !== false)}
        scheduledStaffIds={scheduledStaffIds}
      />

      {view === "day" ? (
        <DayTimeGrid
          date={date}
          providers={visibleStaff}
          appointments={dayForGrid}
          isToday={date === new Date().toISOString().slice(0, 10)}
          canEdit={canEdit}
          onSelectAppointment={setDetailsId}
          onCreateAt={(providerStaffId, startTime) => {
            setFormInitial({ date, startTime, providerStaffId });
            setFormOpen(true);
          }}
          onDropAppointment={handleDrop}
        />
      ) : null}

      {view === "week" ? (
        <WeekView
          days={weekDays}
          appointments={weekAppointments.filter((a) => visibleIds.includes(a.providerStaffId))}
          onSelect={setDetailsId}
          onPickDay={(d) => {
            changeDate(d);
            setView("day");
          }}
        />
      ) : null}

      {view === "list" ? (
        <ListView
          appointments={dayAppointments
            .filter((a) => visibleIds.includes(a.providerStaffId))
            .sort((a, b) => a.startTime.localeCompare(b.startTime))}
          onSelect={setDetailsId}
        />
      ) : null}

      <section className="surface-card flex flex-wrap items-center gap-x-5 gap-y-2 p-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Service colors
        </span>
        {CALENDAR_LEGEND.map((c) => (
          <span key={c.key} className="inline-flex items-center gap-2 text-sm text-foreground">
            <span className={cn("size-3 rounded-sm", c.dotClass)} />
            {c.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-3 rounded-sm border border-dashed border-muted-foreground/60 bg-muted" />
          Late Cancel / No Show (greyed, session forfeited)
        </span>
      </section>

      <CapacityPanel weekStart={weekStart} rows={capacityRows} />

      <AppointmentDetailsDialog
        appointmentId={detailsId}
        onOpenChange={(open) => !open && setDetailsId(null)}
      />
      {formOpen ? (
        <AppointmentFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          initial={formInitial as never}
          onSaved={() => setFormOpen(false)}
        />
      ) : null}
      <RescheduleConfirmDialog
        appointment={pendingMove?.appointment ?? null}
        target={pendingMove?.target ?? null}
        isLeadership={session.isLeadership}
        onCancel={() => setPendingMove(null)}
        onConfirm={confirmMove}
      />
    </div>
  );
}

function WeekView({
  days,
  appointments,
  onSelect,
  onPickDay,
}: {
  days: string[];
  appointments: Appointment[];
  onSelect: (id: string) => void;
  onPickDay: (date: string) => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-7">
      {days.map((day) => {
        const rows = appointments
          .filter((a) => a.date === day)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        return (
          <div key={day} className="surface-card min-h-40 space-y-2 p-3">
            <button
              type="button"
              onClick={() => onPickDay(day)}
              className="w-full text-left text-sm font-semibold text-foreground hover:text-primary"
            >
              {new Date(`${day}T00:00:00`).toLocaleDateString("en-US", {
                weekday: "short",
                month: "numeric",
                day: "numeric",
              })}
            </button>
            {rows.length ? (
              rows.map((a) => {
                const color = serviceColor(a.serviceId);
                const client = repository.getClient(a.clientId);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onSelect(a.id)}
                    className={cn(
                      "block w-full truncate rounded-md border px-2 py-1 text-left text-[11px]",
                      occupiesSlot(a)
                        ? color.chipClass
                        : "border-dashed border-muted-foreground/40 bg-muted/50 text-muted-foreground line-through",
                    )}
                  >
                    {formatTime(a.startTime)} · {client ? clientDisplayName(client) : "—"}
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground">No appointments</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ListView({
  appointments,
  onSelect,
}: {
  appointments: Appointment[];
  onSelect: (id: string) => void;
}) {
  if (!appointments.length) {
    return (
      <div className="surface-card p-8 text-center text-sm text-muted-foreground">
        No appointments match the current filters.
      </div>
    );
  }
  return (
    <div className="surface-card overflow-x-auto">
      <table className="w-full min-w-[840px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-medium">Time</th>
            <th className="px-4 py-3 font-medium">Client</th>
            <th className="px-4 py-3 font-medium">Service</th>
            <th className="px-4 py-3 font-medium">Provider</th>
            <th className="px-4 py-3 font-medium">Where</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {appointments.map((a) => {
            const client = repository.getClient(a.clientId);
            const provider = repository.getStaff(a.providerStaffId);
            const color = serviceColor(a.serviceId);
            return (
              <tr
                key={a.id}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => onSelect(a.id)}
              >
                <td className="px-4 py-3 tabular-nums text-foreground">
                  {formatTime(a.startTime)} – {formatTime(a.endTime)}
                </td>
                <td className="px-4 py-3">
                  {client ? (
                    <Link
                      to="/clients/$clientId"
                      params={{ clientId: client.id }}
                      className="font-medium text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {clientDisplayName(client)}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    <span className={cn("size-2.5 rounded-sm", color.dotClass)} />
                    {serviceById(a.serviceId)?.name ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {provider ? (
                    <span className="inline-flex items-center gap-2">
                      <StaffAvatar staff={provider} size="sm" />
                      {staffDisplayName(provider)}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {a.appointmentType === "virtual"
                    ? "Virtual"
                    : a.isInHome
                      ? "In Home"
                      : (locationById(a.locationId)?.name ?? "—")}
                </td>
                <td className="px-4 py-3">
                  <StatusPill
                    status={a.status}
                    label={APPOINTMENT_STATUS_LABELS[a.status] ?? a.status}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CapacityPanel({
  weekStart,
  rows,
}: {
  weekStart: string;
  rows: ReturnType<typeof weeklyCapacity>;
}) {
  return (
    <section className="surface-card space-y-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="page-heading text-lg">Weekly trainer capacity</h2>
        <p className="text-sm text-muted-foreground">Week of {formatDate(weekStart)}</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Working hours, booked client hours and contracted capacity are tracked separately — the
        remaining column is how many more client hours each trainer needs this week.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Team member</th>
              <th className="py-2 pr-4 font-medium">Working hrs</th>
              <th className="py-2 pr-4 font-medium">Contracted</th>
              <th className="py-2 pr-4 font-medium">Scheduled</th>
              <th className="py-2 pr-4 font-medium">Completed</th>
              <th className="py-2 pr-4 font-medium">Remaining</th>
              <th className="py-2 pr-4 font-medium">Open bookable</th>
              <th className="py-2 font-medium">Utilization</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.staff.id}>
                <td className="py-3 pr-4">
                  <span className="inline-flex items-center gap-2">
                    <StaffAvatar staff={r.staff} size="sm" />
                    <span className="font-medium text-foreground">{staffDisplayName(r.staff)}</span>
                  </span>
                </td>
                <td className="py-3 pr-4 tabular-nums text-muted-foreground">
                  {r.availableWorkingHours}
                </td>
                <td className="py-3 pr-4 tabular-nums text-muted-foreground">
                  {r.contractedHours || "—"}
                </td>
                <td className="py-3 pr-4 tabular-nums text-foreground">{r.scheduledHours}</td>
                <td className="py-3 pr-4 tabular-nums text-muted-foreground">{r.completedHours}</td>
                <td
                  className={cn(
                    "py-3 pr-4 font-semibold tabular-nums",
                    r.overCapacity ? "text-destructive" : "text-primary",
                  )}
                >
                  {r.overCapacity ? `+${r.scheduledHours - r.contractedHours} over` : r.remainingToCapacity}
                </td>
                <td className="py-3 pr-4 tabular-nums text-muted-foreground">
                  {r.openBookableHours}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          r.overCapacity ? "bg-destructive" : "bg-primary",
                        )}
                        style={{ width: `${Math.min(100, r.percentScheduled)}%` }}
                      />
                    </div>
                    <span className="tabular-nums text-xs text-muted-foreground">
                      {r.percentScheduled}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
