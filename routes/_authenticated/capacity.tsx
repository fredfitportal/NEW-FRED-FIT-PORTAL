import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppointmentFormDialog } from "@/components/app/AppointmentFormDialog";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusPill } from "@/components/app/StatusPill";
import { Field, fieldClass } from "@/components/app/form-primitives";
import { Button } from "@/components/ui/button";
import { useDemoData } from "@/hooks/useDemoData";
import {
  CAPACITY_STATUS_LABELS,
  DAYPART_LABELS,
  WEEKDAY_LABELS,
  classCapacity,
  eligibleProviders,
  findSellableCapacity,
  staffCapacity,
  weeklyCapacitySummary,
} from "@/lib/domain/capacity";
import type { CapacityStatus, Daypart, SellableSlot } from "@/lib/domain/capacity";
import {
  DEMO_TODAY,
  RECURRENCE_LABELS,
  formatDate,
  formatTime,
  repository,
} from "@/lib/domain/repository";
import { useSession } from "@/lib/domain/session";
import type { RecurrenceFrequency } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const RECURRENCES: RecurrenceFrequency[] = [
  "weekly",
  "every_other_week",
  "every_4_weeks",
  "monthly",
  "custom",
];
const DAYPARTS: Daypart[] = ["any", "morning", "midday", "afternoon", "evening"];
const TABS = ["Find availability", "Provider capacity", "Apparatix seats"] as const;
type Tab = (typeof TABS)[number];

function statusTone(status: CapacityStatus) {
  if (status === "available") return "positive" as const;
  if (status === "limited") return "warning" as const;
  if (status === "full") return "critical" as const;
  return "neutral" as const;
}

export const Route = createFileRoute("/_authenticated/capacity")({
  head: () => ({
    meta: [
      { title: "Sellable Capacity — FredFit Portal" },
      {
        name: "description",
        content:
          "Search real recurring appointment opportunities across providers, locations and rooms before offering times to a client.",
      },
      { property: "og:title", content: "Sellable Capacity — FredFit Portal" },
      {
        property: "og:description",
        content:
          "Provider, room, conflict and recurrence-aware capacity search for Fredericksburg Fitness Studio.",
      },
    ],
  }),
  component: CapacityPage,
});

function CapacityPage() {
  useDemoData();
  const session = useSession();
  const services = repository.listServices().filter((s) => s.isActive);
  const individualServices = services.filter((s) => !s.isGroupClass);
  const locations = repository.listLocations();
  const [tab, setTab] = useState<Tab>("Find availability");

  const [query, setQuery] = useState({
    serviceId: individualServices[0]?.id ?? "",
    locationId: "",
    weekdays: [] as number[],
    daypart: "any" as Daypart,
    providerStaffId: "",
    recurrence: "weekly" as RecurrenceFrequency,
    durationMinutes: individualServices[0]?.defaultDurationMinutes ?? 60,
    startDate: DEMO_TODAY,
    occurrencesToCheck: 4,
  });
  const [booking, setBooking] = useState<SellableSlot | null>(null);

  const providers = eligibleProviders(query.serviceId);

  const results = useMemo(
    () =>
      findSellableCapacity({
        serviceId: query.serviceId,
        locationId: query.locationId || null,
        weekdays: query.weekdays,
        daypart: query.daypart,
        providerStaffId: query.providerStaffId || null,
        recurrence: query.recurrence,
        durationMinutes: query.durationMinutes,
        startDate: query.startDate,
        occurrencesToCheck: query.occurrencesToCheck,
        limit: 25,
      }),
    [query],
  );

  const providerGrid = useMemo(
    () =>
      staffCapacity({
        serviceId: query.serviceId,
        locationId: query.locationId || null,
        recurrence: query.recurrence,
        durationMinutes: query.durationMinutes,
        startDate: query.startDate,
        occurrencesToCheck: query.occurrencesToCheck,
      }),
    [query],
  );

  const summary = useMemo(() => weeklyCapacitySummary(query.startDate), [query.startDate]);
  const classes = classCapacity({ fromDate: query.startDate });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sellable capacity"
        description="A calendar opening is an apparently empty time. Sellable capacity is a real opportunity that has passed provider eligibility, availability, blocked time, location, room, duration, conflict and recurrence checks."
        actions={<StatusPill status="active" label="Calculated from the live demo schedule" />}
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summary.map((row) => (
          <article key={row.serviceId + row.kind} className="surface-card p-5">
            <p className="text-sm text-muted-foreground">{row.serviceName}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{row.count}</p>
            <p className="text-xs text-muted-foreground">{row.unitLabel}</p>
          </article>
        ))}
      </section>

      <section className="surface-card space-y-4 p-5">
        <h2 className="text-base font-semibold text-foreground">Find availability</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Service">
            <select
              className={fieldClass}
              value={query.serviceId}
              onChange={(e) => {
                const service = services.find((s) => s.id === e.target.value);
                setQuery((q) => ({
                  ...q,
                  serviceId: e.target.value,
                  providerStaffId: "",
                  durationMinutes: service?.defaultDurationMinutes ?? q.durationMinutes,
                }));
              }}
            >
              {individualServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subCategory ?? s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Preferred location">
            <select
              className={fieldClass}
              value={query.locationId}
              onChange={(e) => setQuery((q) => ({ ...q, locationId: e.target.value }))}
            >
              <option value="">Any location</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Provider (optional)">
            <select
              className={fieldClass}
              value={query.providerStaffId}
              onChange={(e) => setQuery((q) => ({ ...q, providerStaffId: e.target.value }))}
            >
              <option value="">Any eligible provider</option>
              {providers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Daypart">
            <select
              className={fieldClass}
              value={query.daypart}
              onChange={(e) => setQuery((q) => ({ ...q, daypart: e.target.value as Daypart }))}
            >
              {DAYPARTS.map((d) => (
                <option key={d} value={d}>
                  {DAYPART_LABELS[d]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Recurrence">
            <select
              className={fieldClass}
              value={query.recurrence}
              onChange={(e) =>
                setQuery((q) => ({ ...q, recurrence: e.target.value as RecurrenceFrequency }))
              }
            >
              {RECURRENCES.map((r) => (
                <option key={r} value={r}>
                  {RECURRENCE_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Duration (minutes)">
            <input
              type="number"
              min={15}
              step={5}
              className={fieldClass}
              value={query.durationMinutes}
              onChange={(e) =>
                setQuery((q) => ({ ...q, durationMinutes: Number(e.target.value) || 60 }))
              }
            />
          </Field>
          <Field label="Start date">
            <input
              type="date"
              className={fieldClass}
              value={query.startDate}
              onChange={(e) => setQuery((q) => ({ ...q, startDate: e.target.value }))}
            />
          </Field>
          <Field label="Occurrences checked" hint="A single empty week never proves a pattern.">
            <input
              type="number"
              min={1}
              max={12}
              className={fieldClass}
              value={query.occurrencesToCheck}
              onChange={(e) =>
                setQuery((q) => ({ ...q, occurrencesToCheck: Number(e.target.value) || 4 }))
              }
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((label, weekday) => {
            const on = query.weekdays.includes(weekday);
            return (
              <button
                key={label}
                type="button"
                onClick={() =>
                  setQuery((q) => ({
                    ...q,
                    weekdays: on
                      ? q.weekdays.filter((d) => d !== weekday)
                      : [...q.weekdays, weekday],
                  }))
                }
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  on
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {label.slice(0, 3)}
              </button>
            );
          })}
          <span className="self-center text-xs text-muted-foreground">
            {query.weekdays.length ? "Preferred days" : "Any day the provider works"}
          </span>
        </div>
      </section>

      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 rounded-t-xl px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Find availability" ? (
        <section className="space-y-3">
          {results.length === 0 ? (
            <p className="surface-card p-6 text-sm text-muted-foreground">
              No sellable capacity matches this search. Provider eligibility, configured
              availability, blocked time or room availability is preventing every candidate slot.
            </p>
          ) : null}
          {results.map((slot, index) => (
            <article key={slot.key} className="surface-card flex flex-wrap gap-4 p-5">
              <span className="text-lg font-semibold tabular-nums text-muted-foreground">
                {index + 1}.
              </span>
              <div className="min-w-56 flex-1">
                <p className="font-medium text-foreground">{slot.providerName}</p>
                <p className="text-sm text-foreground">
                  {WEEKDAY_LABELS[slot.weekday]} • {formatTime(slot.startTime)}–
                  {formatTime(slot.endTime)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {slot.locationName}
                  {slot.resourceName ? ` • ${slot.resourceName}` : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  {RECURRENCE_LABELS[slot.recurrence]} · first date {formatDate(slot.firstDate)} ·{" "}
                  {slot.clearOccurrences} of {slot.checkedOccurrences} future occurrences clear
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill
                  label={CAPACITY_STATUS_LABELS[slot.status]}
                  tone={statusTone(slot.status)}
                />
                <Button
                  size="sm"
                  disabled={!session.can("scheduling.manage")}
                  onClick={() => setBooking(slot)}
                >
                  Schedule this
                </Button>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {tab === "Provider capacity" ? (
        <section className="space-y-4">
          {providerGrid.map((row) => (
            <article key={row.staffId} className="surface-card p-5">
              <header className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-foreground">{row.staffName}</p>
                <StatusPill
                  label={
                    row.totalOpportunities
                      ? `${row.totalOpportunities} recurring opportunities`
                      : "No recurring capacity"
                  }
                  tone={row.totalOpportunities ? "positive" : "neutral"}
                />
              </header>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {row.days.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No sellable recurring capacity for this service and search.
                  </p>
                ) : null}
                {row.days.map((day) => (
                  <div key={day.weekday} className="rounded-lg border border-border p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {WEEKDAY_LABELS[day.weekday]}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-foreground">
                      {day.slots.map((s) => (
                        <li key={s.key}>
                          {formatTime(s.startTime)}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {s.locationName}
                            {s.resourceName ? ` · ${s.resourceName}` : ""} ·{" "}
                            {CAPACITY_STATUS_LABELS[s.status]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {tab === "Apparatix seats" ? (
        <section className="space-y-3">
          <p className="surface-card p-4 text-sm text-muted-foreground">
            Class capacity is seats inside a scheduled class block. The engine never searches for a
            one-on-one provider opening for Apparatix.
          </p>
          {classes.map((c) => (
            <article key={c.classSessionId} className="surface-card flex flex-wrap gap-4 p-5">
              <div className="min-w-56 flex-1">
                <p className="font-medium text-foreground">{c.serviceName}</p>
                <p className="text-sm text-foreground">
                  {formatDate(c.date)} • {formatTime(c.startTime)}–{formatTime(c.endTime)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {c.locationName}
                  {c.resourceName ? ` • ${c.resourceName}` : ""} ·{" "}
                  {c.instructorNames.join(", ") || "Instructor TBD"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {c.enrolled} / {c.capacity} enrolled
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-foreground">
                  {c.sellableSeats === 0
                    ? "0 sellable spots"
                    : `${c.sellableSeats} sellable ${c.sellableSeats === 1 ? "spot" : "spots"}`}
                </span>
                <StatusPill label={CAPACITY_STATUS_LABELS[c.status]} tone={statusTone(c.status)} />
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {booking ? (
        <AppointmentFormDialog
          open={Boolean(booking)}
          onOpenChange={(open) => !open && setBooking(null)}
          initial={{
            serviceId: booking.serviceId,
            providerStaffId: booking.providerStaffId,
            locationId: booking.locationId,
            resourceId: booking.resourceId,
            date: booking.firstDate,
            startTime: booking.startTime,
            durationMinutes: booking.durationMinutes,
            recurring: true,
            frequency: booking.recurrence,
            occurrences: 8,
          }}
          onSaved={() => setBooking(null)}
        />
      ) : null}
    </div>
  );
}
