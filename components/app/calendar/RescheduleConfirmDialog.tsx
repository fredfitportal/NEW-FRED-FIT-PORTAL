import { useMemo, useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";

import { DialogFooterBar, Field, fieldClass } from "@/components/app/form-primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  clientDisplayName,
  formatDate,
  formatTime,
  repository,
  serviceById,
  staffDisplayName,
} from "@/lib/domain/repository";
import { validatePlacement } from "@/lib/domain/scheduling";
import { hasBlockingIssue } from "@/lib/domain/scheduling-policy";
import type { Appointment } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export interface RescheduleTarget {
  date: string;
  startTime: string;
  providerStaffId: string;
}

export type RescheduleScope = "occurrence" | "series";

/**
 * Every drag-and-drop move passes through here: the proposed change is shown,
 * all rules are validated, recurring series are protected, and an override
 * requires an accountable reason.
 */
export function RescheduleConfirmDialog({
  appointment,
  target,
  isLeadership,
  onCancel,
  onConfirm,
}: {
  appointment: Appointment | null;
  target: RescheduleTarget | null;
  isLeadership: boolean;
  onCancel: () => void;
  onConfirm: (scope: RescheduleScope, overrideReason?: string) => void;
}) {
  const [scope, setScope] = useState<RescheduleScope>("occurrence");
  const [overrideReason, setOverrideReason] = useState("");

  const issues = useMemo(() => {
    if (!appointment || !target) return [];
    return validatePlacement({
      date: target.date,
      startTime: target.startTime,
      durationMinutes: appointment.durationMinutes,
      serviceId: appointment.serviceId,
      providerStaffId: target.providerStaffId,
      locationId: appointment.locationId ?? null,
      resourceId: appointment.resourceId ?? null,
      ignoreAppointmentId: appointment.id,
    });
  }, [appointment, target]);

  if (!appointment || !target) return null;

  const client = repository.getClient(appointment.clientId);
  const service = serviceById(appointment.serviceId);
  const fromProvider = repository.getStaff(appointment.providerStaffId);
  const toProvider = repository.getStaff(target.providerStaffId);
  const blocked = hasBlockingIssue(issues);
  const overridable = issues.filter((i) => i.overridable);
  const needsReason = overridable.length > 0;
  const canProceed = !blocked && (!needsReason || (isLeadership && overrideReason.trim().length > 2));
  const isSeries = Boolean(appointment.recurringAppointmentId);

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm reschedule</DialogTitle>
          <DialogDescription>
            {client ? clientDisplayName(client) : "—"} · {service?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <p className="text-muted-foreground">
            <span className="line-through">
              {formatDate(appointment.date)} · {formatTime(appointment.startTime)} ·{" "}
              {fromProvider ? staffDisplayName(fromProvider) : "—"}
            </span>
          </p>
          <p className="mt-1 font-semibold text-foreground">
            {formatDate(target.date)} · {formatTime(target.startTime)} ·{" "}
            {toProvider ? staffDisplayName(toProvider) : "—"}
          </p>
        </div>

        {issues.length ? (
          <ul className="space-y-2">
            {issues.map((issue) => (
              <li
                key={issue.ruleKey + issue.message}
                className={cn(
                  "flex gap-2 rounded-lg border p-3 text-sm",
                  issue.severity === "blocking"
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-cal-medex/40 bg-cal-medex-soft text-cal-medex",
                )}
              >
                {issue.severity === "blocking" ? (
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                )}
                <span>
                  {issue.message}
                  {issue.severity === "blocking" ? " This cannot be overridden." : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            No provider, schedule, eligibility or resource conflicts detected.
          </p>
        )}

        {isSeries ? (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <p className="text-sm font-medium text-foreground">
              This appointment is part of a recurring series.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={scope === "occurrence" ? "default" : "outline"}
                onClick={() => setScope("occurrence")}
              >
                This appointment only
              </Button>
              <Button
                size="sm"
                variant={scope === "series" ? "default" : "outline"}
                onClick={() => setScope("series")}
              >
                This and future occurrences
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Moving one occurrence never changes the rest of the series.
            </p>
          </div>
        ) : null}

        {needsReason ? (
          <Field
            label={
              isLeadership
                ? "Override reason (required — logged with your name and timestamp)"
                : "Only an administrator may override these warnings"
            }
          >
            <input
              className={fieldClass}
              value={overrideReason}
              disabled={!isLeadership}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. Provider agreed to cover this session"
            />
          </Field>
        ) : null}

        <DialogFooterBar>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={!canProceed}
            onClick={() => onConfirm(scope, needsReason ? overrideReason : undefined)}
          >
            {needsReason ? "Override & reschedule" : "Confirm reschedule"}
          </Button>
        </DialogFooterBar>
      </DialogContent>
    </Dialog>
  );
}
