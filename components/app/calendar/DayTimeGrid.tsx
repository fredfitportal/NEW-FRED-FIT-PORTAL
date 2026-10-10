import { useEffect, useRef, useState } from "react";
import { Repeat, Video } from "lucide-react";

import { StaffAvatar } from "./StaffAvatar";
import {
  clientDisplayName,
  formatTime,
  locationById,
  repository,
  serviceById,
  staffDisplayName,
} from "@/lib/domain/repository";
import { appointmentClientIds, sessionParticipants, NON_ATTENDING_STATUSES } from "@/lib/domain/sessions";
import { serviceColor } from "@/lib/domain/service-colors";
import { fromMinutes, isGreyedOut, occupiesSlot, toMinutes } from "@/lib/domain/scheduling-policy";
import { resourceById } from "@/lib/domain/operations";
import type { Appointment, StaffMember } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export const GRID_START_MIN = 6 * 60; // 6:00 AM
export const GRID_END_MIN = 21 * 60; // 9:00 PM
export const PX_PER_MIN = 1.1;
const SNAP_MINUTES = 15;

export interface DropPayload {
  appointmentId: string;
  providerStaffId: string;
  startTime: string;
}

function hourRows() {
  const rows: number[] = [];
  for (let m = GRID_START_MIN; m <= GRID_END_MIN; m += 60) rows.push(m);
  return rows;
}

function useCurrentMinutes(active: boolean) {
  const [minutes, setMinutes] = useState<number | null>(null);
  useEffect(() => {
    if (!active) {
      setMinutes(null);
      return;
    }
    const tick = () => {
      const now = new Date();
      setMinutes(now.getHours() * 60 + now.getMinutes());
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [active]);
  return minutes;
}

/**
 * True time-grid day calendar: one column per provider, appointments
 * positioned and sized by their real start time and duration.
 */
export function DayTimeGrid({
  date,
  providers,
  appointments,
  isToday,
  onSelectAppointment,
  onCreateAt,
  onDropAppointment,
  canEdit,
}: {
  date: string;
  providers: StaffMember[];
  appointments: Appointment[];
  isToday: boolean;
  onSelectAppointment: (id: string) => void;
  onCreateAt: (providerStaffId: string, startTime: string) => void;
  onDropAppointment: (payload: DropPayload) => void;
  canEdit: boolean;
}) {
  const nowMinutes = useCurrentMinutes(isToday);
  const grabOffset = useRef(0);
  const [dragId, setDragId] = useState<string | null>(null);
  const [hint, setHint] = useState<{ providerId: string; startTime: string } | null>(null);

  const totalHeight = (GRID_END_MIN - GRID_START_MIN) * PX_PER_MIN;

  function minutesFromEvent(e: React.MouseEvent | React.DragEvent, el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const raw = GRID_START_MIN + y / PX_PER_MIN;
    return Math.min(
      GRID_END_MIN - SNAP_MINUTES,
      Math.max(GRID_START_MIN, Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES),
    );
  }

  if (providers.length === 0) {
    return (
      <div className="surface-card p-10 text-center text-sm text-muted-foreground">
        No team members selected. Use the Team Members menu to choose who appears on the calendar.
      </div>
    );
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <div className="flex min-w-max">
          {/* Sticky time scale */}
          <div className="sticky left-0 z-20 w-20 shrink-0 border-r border-border bg-card">
            <div className="h-16 border-b border-border" />
            <div className="relative" style={{ height: totalHeight }}>
              {hourRows().map((m) => (
                <div
                  key={m}
                  className="absolute right-2 -translate-y-1/2 text-[11px] font-medium tabular-nums text-muted-foreground"
                  style={{ top: (m - GRID_START_MIN) * PX_PER_MIN }}
                >
                  {formatTime(fromMinutes(m))}
                </div>
              ))}
            </div>
          </div>

          {/* Provider columns */}
          {providers.map((provider) => {
            const rows = appointments
              .filter((a) => a.providerStaffId === provider.id)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            return (
              <div key={provider.id} className="w-56 shrink-0 border-r border-border last:border-r-0">
                <div className="sticky top-0 z-10 flex h-16 items-center gap-2 border-b border-border bg-card px-3">
                  <StaffAvatar staff={provider} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {staffDisplayName(provider)}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {rows.filter(occupiesSlot).length} booked
                    </p>
                  </div>
                </div>

                <div
                  className="relative bg-background/40"
                  style={{ height: totalHeight }}
                  onClick={(e) => {
                    if (!canEdit) return;
                    if ((e.target as HTMLElement).closest("[data-appointment]")) return;
                    onCreateAt(provider.id, fromMinutes(minutesFromEvent(e, e.currentTarget)));
                  }}
                  onDragOver={(e) => {
                    if (!dragId) return;
                    e.preventDefault();
                    const start = minutesFromEvent(e, e.currentTarget) - grabOffset.current;
                    setHint({
                      providerId: provider.id,
                      startTime: fromMinutes(Math.round(Math.max(GRID_START_MIN, start) / SNAP_MINUTES) * SNAP_MINUTES),
                    });
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!dragId) return;
                    const start = minutesFromEvent(e, e.currentTarget) - grabOffset.current;
                    onDropAppointment({
                      appointmentId: dragId,
                      providerStaffId: provider.id,
                      startTime: fromMinutes(
                        Math.round(Math.max(GRID_START_MIN, start) / SNAP_MINUTES) * SNAP_MINUTES,
                      ),
                    });
                    setDragId(null);
                    setHint(null);
                  }}
                >
                  {/* hour lines */}
                  {hourRows().map((m) => (
                    <div
                      key={m}
                      className="pointer-events-none absolute inset-x-0 border-t border-border/60"
                      style={{ top: (m - GRID_START_MIN) * PX_PER_MIN }}
                    />
                  ))}
                  {hourRows().map((m) => (
                    <div
                      key={`half-${m}`}
                      className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/30"
                      style={{ top: (m + 30 - GRID_START_MIN) * PX_PER_MIN }}
                    />
                  ))}

                  {/* current time indicator — only on today */}
                  {nowMinutes !== null && nowMinutes >= GRID_START_MIN && nowMinutes <= GRID_END_MIN ? (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-destructive/70"
                      style={{ top: (nowMinutes - GRID_START_MIN) * PX_PER_MIN }}
                    >
                      <span className="absolute -top-1 left-0 size-2 rounded-full bg-destructive" />
                    </div>
                  ) : null}

                  {/* drop hint */}
                  {hint && hint.providerId === provider.id ? (
                    <div
                      className="pointer-events-none absolute inset-x-1 z-20 rounded-md border-2 border-dashed border-primary bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
                      style={{ top: (toMinutes(hint.startTime) - GRID_START_MIN) * PX_PER_MIN }}
                    >
                      {formatTime(hint.startTime)} · {staffDisplayName(provider)}
                    </div>
                  ) : null}

                  {rows.map((a) => (
                    <AppointmentBlock
                      key={a.id}
                      appointment={a}
                      canEdit={canEdit}
                      onSelect={() => onSelectAppointment(a.id)}
                      onDragStart={(offsetMinutes) => {
                        grabOffset.current = offsetMinutes;
                        setDragId(a.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setHint(null);
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
        Click an empty slot to book. Drag an appointment up/down to change its time, or across to
        another provider. {isToday ? "The red line marks the current time." : null}
      </p>
    </div>
  );
}

function AppointmentBlock({
  appointment,
  canEdit,
  onSelect,
  onDragStart,
  onDragEnd,
}: {
  appointment: Appointment;
  canEdit: boolean;
  onSelect: () => void;
  onDragStart: (offsetMinutes: number) => void;
  onDragEnd: () => void;
}) {
  const service = serviceById(appointment.serviceId);
  const participants = appointmentClientIds(appointment)
    .map((id) => repository.getClient(id))
    .filter(Boolean);
  const client = participants[0];
  const rows = sessionParticipants(appointment);
  const statusOf = (id: string) => rows.find((r) => r.clientId === id)?.status ?? appointment.status;
  const attendingIds = rows
    .filter((r) => !NON_ATTENDING_STATUSES.includes(r.status))
    .map((r) => r.clientId);
  const names = participants
    .map((c) =>
      NON_ATTENDING_STATUSES.includes(statusOf(c!.id))
        ? `${clientDisplayName(c!)} (cancelled)`
        : clientDisplayName(c!),
    )
    .join(", ");
  const color = serviceColor(appointment.serviceId);
  const start = toMinutes(appointment.startTime);
  const height = Math.max(22, appointment.durationMinutes * PX_PER_MIN - 2);
  const greyed = isGreyedOut(appointment);
  const released = !occupiesSlot(appointment);
  const resource = resourceById(appointment.resourceId);
  const location = locationById(appointment.locationId);

  /* Early cancels release the slot — they are not drawn on the working grid. */
  if (released) return null;

  return (
    <button
      type="button"
      data-appointment={appointment.id}
      draggable={canEdit && !greyed}
      onDragStart={(e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        onDragStart((e.clientY - rect.top) / PX_PER_MIN);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", appointment.id);
      }}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      style={{ top: (start - GRID_START_MIN) * PX_PER_MIN, height }}
      className={cn(
        "absolute inset-x-1 z-[5] overflow-hidden rounded-md border px-2 py-1 text-left text-[11px] leading-tight shadow-sm transition",
        greyed
          ? "border-dashed border-muted-foreground/50 bg-muted/60 text-muted-foreground opacity-70 saturate-0"
          : color.chipClass,
        canEdit && !greyed && "cursor-grab active:cursor-grabbing hover:brightness-95",
      )}
      title={`${appointment.startTime}–${appointment.endTime} · ${service?.name ?? "Session"} · ${names || "—"}`}
    >
      <span className="flex items-center gap-1 font-semibold tabular-nums">
        {formatTime(appointment.startTime)}
        {appointment.recurringAppointmentId ? <Repeat className="size-3 shrink-0" /> : null}
        {appointment.appointmentType === "virtual" ? <Video className="size-3 shrink-0" /> : null}
        {appointment.rescheduledFromDate ? (
          <span className="rounded bg-background/70 px-1 text-[9px] font-semibold uppercase tracking-wide">
            Moved
          </span>
        ) : null}
      </span>
      <span className="block truncate font-medium">{names || "—"}</span>
      {participants.length > 1 ? (
        <span className="block truncate opacity-90">
          {attendingIds.length} of {participants.length} attending
        </span>
      ) : null}
      {height > 40 ? (
        <span className="block truncate opacity-90">{service?.name ?? "Session"}</span>
      ) : null}
      {height > 64 ? (
        <span className="block truncate opacity-75">
          {appointment.appointmentType === "virtual"
            ? `Virtual${appointment.virtualMeetingUrl ? " • Google Meet" : ""}`
            : appointment.isInHome
              ? "In Home"
              : (resource?.name ?? location?.name ?? "")}
        </span>
      ) : null}
      {greyed ? (
        <span className="mt-0.5 block truncate text-[10px] font-bold uppercase tracking-wide">
          {appointment.status === "no_show" ? "No Show — forfeited" : "Late Cancel — forfeited"}
        </span>
      ) : null}
    </button>
  );
}
