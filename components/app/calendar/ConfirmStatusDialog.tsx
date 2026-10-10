import { useState } from "react";

import { DialogFooterBar, Field, fieldClass } from "@/components/app/form-primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { statusConsequence } from "@/lib/domain/scheduling-policy";
import { serviceById } from "@/lib/domain/repository";
import type { Appointment, AppointmentStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/**
 * Cancellation safety: the operational consequence is spelled out before any
 * status is applied, so a Late Cancel is never entered by accident.
 */
export function ConfirmStatusDialog({
  appointment,
  status,
  scopeNote,
  onCancel,
  onConfirm,
}: {
  appointment: Appointment | null;
  status: AppointmentStatus | null;
  /** Says exactly who this change applies to (one participant vs the session). */
  scopeNote?: string | undefined;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  if (!appointment || !status) return null;
  const service = serviceById(appointment.serviceId);
  const consequence = statusConsequence(status, appointment, service);
  const forfeitsMakeup =
    Boolean(appointment.makeupCreditId) && ["late_cancel", "no_show"].includes(status);
  const returnsMakeup =
    Boolean(appointment.makeupCreditId) && ["early_cancel", "cancelled"].includes(status);

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{consequence.title}</DialogTitle>
          <DialogDescription>
            {scopeNote ?? "Confirm before this is recorded."}
          </DialogDescription>
        </DialogHeader>
        <p
          className={cn(
            "rounded-lg border p-3 text-sm",
            consequence.tone === "danger"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : consequence.tone === "warning"
                ? "border-cal-medex/40 bg-cal-medex-soft text-cal-medex"
                : "border-border bg-muted/40 text-foreground",
          )}
        >
          {consequence.body}
        </p>
        {forfeitsMakeup ? (
          <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm font-medium text-destructive">
            This appointment was booked using a make-up credit. A Late Cancel or No Show will
            forfeit this credit and it will not return to the client&apos;s available make-up
            balance.
          </p>
        ) : null}
        {returnsMakeup ? (
          <p className="rounded-lg border border-success/50 bg-success/10 p-3 text-sm text-foreground">
            This appointment was booked using a make-up credit. The credit will be returned to the
            client&apos;s available balance.
          </p>
        ) : null}
        <Field label="Reason / note (recorded in the audit history)">
          <input className={fieldClass} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <DialogFooterBar>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={consequence.tone === "danger" ? "destructive" : "default"}
            onClick={() => {
              onConfirm(reason);
              setReason("");
            }}
          >
            Confirm {consequence.title}
          </Button>
        </DialogFooterBar>
      </DialogContent>
    </Dialog>
  );
}
