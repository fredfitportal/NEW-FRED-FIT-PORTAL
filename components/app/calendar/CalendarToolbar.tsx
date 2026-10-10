import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, MapPin, Users } from "lucide-react";

import { MonthDatePicker } from "./MonthDatePicker";
import { StaffAvatar } from "./StaffAvatar";
import { Button } from "@/components/ui/button";
import { staffDisplayName } from "@/lib/domain/repository";
import type { Location, StaffMember } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export type CalendarView = "day" | "week" | "list";
export type TeamSelection = { mode: "scheduled" | "all" | "custom"; staffIds: string[] };

/** Virtual is a first-class location filter, never a free-text workaround. */
export const VIRTUAL_LOCATION_IDS = ["loc-virtual", "loc-phone"];
export const IN_HOME_LOCATION_ID = "loc-in-home";

function useOutsideClose(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return ref;
}

function Dropdown({
  label,
  icon,
  children,
  widthClass = "w-64",
}: {
  label: string;
  icon?: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  widthClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(() => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        {icon}
        <span className="max-w-48 truncate">{label}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
      {open ? (
        <div
          className={cn(
            "absolute left-0 z-40 mt-2 rounded-xl border border-border bg-popover p-2 shadow-lg",
            widthClass,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

export function CalendarToolbar({
  date,
  today,
  view,
  onDateChange,
  onViewChange,
  locationFilter,
  onLocationChange,
  locations,
  team,
  onTeamChange,
  staff,
  scheduledStaffIds,
}: {
  date: string;
  today: string;
  view: CalendarView;
  onDateChange: (date: string) => void;
  onViewChange: (view: CalendarView) => void;
  locationFilter: string;
  onLocationChange: (value: string) => void;
  locations: Location[];
  team: TeamSelection;
  onTeamChange: (team: TeamSelection) => void;
  staff: StaffMember[];
  scheduledStaffIds: string[];
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useOutsideClose(() => setPickerOpen(false));

  const step = view === "week" ? 7 : 1;
  function shift(days: number) {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + days);
    onDateChange(d.toISOString().slice(0, 10));
  }

  const heading = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const locationLabel =
    locationFilter === "all"
      ? "All Locations"
      : locationFilter === "virtual"
        ? "Virtual"
        : locationFilter === IN_HOME_LOCATION_ID
          ? "In Home"
          : (locations.find((l) => l.id === locationFilter)?.name ?? "All Locations");

  const teamLabel =
    team.mode === "all"
      ? "All Staff"
      : team.mode === "scheduled"
        ? "Scheduled Team"
        : team.staffIds.length === 1
          ? (staff.find((s) => s.id === team.staffIds[0]) &&
              staffDisplayName(staff.find((s) => s.id === team.staffIds[0])!)) ||
            "1 selected"
          : `${team.staffIds.length} team members`;

  function toggleStaff(id: string) {
    const base = team.mode === "custom" ? team.staffIds : scheduledStaffIds;
    const next = base.includes(id) ? base.filter((s) => s !== id) : [...base, id];
    onTeamChange({ mode: "custom", staffIds: next });
  }

  return (
    <div className="surface-card sticky top-2 z-30 flex flex-wrap items-center gap-2 p-3">
      <Button variant="outline" size="sm" onClick={() => onDateChange(today)}>
        Today
      </Button>

      <div className="flex items-center">
        <button
          type="button"
          aria-label={view === "week" ? "Previous week" : "Previous day"}
          onClick={() => shift(-step)}
          className="rounded-l-lg border border-border px-2 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="relative" ref={pickerRef}>
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            className="inline-flex items-center gap-2 border-y border-border bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            <CalendarDays className="size-4 text-muted-foreground" />
            {heading}
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
          {pickerOpen ? (
            <div className="absolute left-0 z-40 mt-2">
              <MonthDatePicker
                selected={date}
                today={today}
                onSelect={(d) => {
                  onDateChange(d);
                  setPickerOpen(false);
                }}
              />
            </div>
          ) : null}
        </div>
        <button
          type="button"
          aria-label={view === "week" ? "Next week" : "Next day"}
          onClick={() => shift(step)}
          className="rounded-r-lg border border-border px-2 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <Dropdown label={locationLabel} icon={<MapPin className="size-4 text-muted-foreground" />}>
        {(close) => (
          <ul className="space-y-0.5">
            {[
              { value: "loc-cowan", label: "2541 Cowan Blvd" },
              { value: "loc-william", label: "541 William Street" },
              { value: "virtual", label: "Virtual" },
              { value: IN_HOME_LOCATION_ID, label: "In Home" },
              { value: "all", label: "All Locations" },
            ].map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => {
                    onLocationChange(opt.value);
                    close();
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted",
                    locationFilter === opt.value && "font-semibold text-primary",
                  )}
                >
                  {opt.label}
                  {locationFilter === opt.value ? <Check className="size-4" /> : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Dropdown>

      <Dropdown
        label={teamLabel}
        icon={<Users className="size-4 text-muted-foreground" />}
        widthClass="w-72"
      >
        {() => (
          <div className="space-y-1">
            <div className="flex gap-1 px-1 pb-1">
              <Button
                size="sm"
                variant={team.mode === "scheduled" ? "default" : "outline"}
                className="flex-1"
                onClick={() => onTeamChange({ mode: "scheduled", staffIds: [] })}
              >
                Scheduled
              </Button>
              <Button
                size="sm"
                variant={team.mode === "all" ? "default" : "outline"}
                className="flex-1"
                onClick={() => onTeamChange({ mode: "all", staffIds: [] })}
              >
                All staff
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onTeamChange({ mode: "scheduled", staffIds: [] })}
              >
                Reset
              </Button>
            </div>
            <ul className="max-h-72 space-y-0.5 overflow-y-auto">
              {staff.map((s) => {
                const checked =
                  team.mode === "all" ||
                  (team.mode === "scheduled" && scheduledStaffIds.includes(s.id)) ||
                  (team.mode === "custom" && team.staffIds.includes(s.id));
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => toggleStaff(s.id)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <span
                        className={cn(
                          "flex size-4 items-center justify-center rounded border",
                          checked ? "border-primary bg-primary text-primary-foreground" : "border-border",
                        )}
                      >
                        {checked ? <Check className="size-3" /> : null}
                      </span>
                      <StaffAvatar staff={s} size="sm" />
                      <span className="min-w-0 flex-1 truncate">{staffDisplayName(s)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Dropdown>

      <div className="ml-auto inline-flex rounded-lg border border-border p-0.5">
        {(["day", "week", "list"] as CalendarView[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onViewChange(v)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
              view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
