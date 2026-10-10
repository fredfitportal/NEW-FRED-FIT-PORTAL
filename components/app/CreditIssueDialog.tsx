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
import {
  appointmentHistory,
  formatDate,
  formatUsd,
  repository,
  serviceById,
} from "@/lib/domain/repository";
import { useSession } from "@/lib/domain/session";
import type { ID } from "@/lib/domain/types";

/**
 * Leadership-only manual makeup / credit authorization. Nothing here is
 * automatic — no FFS cancellation policy is approved, so every credit is an
 * explicit, attributed decision recorded as a new ledger row.
 */
export function CreditIssueDialog({
  open,
  onOpenChange,
  clientId,
  defaultAppointmentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: ID;
  defaultAppointmentId?: ID | null;
}) {
  const session = useSession();
  const creditTypes = repository.listCreditTypes();
  const appointments = appointmentHistory(clientId);

  const [creditTypeId, setCreditTypeId] = useState(creditTypes[0]!.id);
  const [quantity, setQuantity] = useState(1);
  const [referenceValue, setReferenceValue] = useState(creditTypes[0]!.referenceValueUsd);
  const [appointmentId, setAppointmentId] = useState(defaultAppointmentId ?? "");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const creditType = creditTypes.find((c) => c.id === creditTypeId)!;
  const restriction = creditType.eligibleServiceCategories[0] ?? null;

  function save() {
    if (!reason.trim()) {
      toast.error("A reason is required for a manual authorization.");
      return;
    }
    repository.createCreditTransaction({
      clientId,
      creditTypeId,
      quantity,
      referenceValueUsd: referenceValue,
      originatingAppointmentId: appointmentId || null,
      serviceRestriction: restriction,
      reason,
      notes,
      authorizedByStaffId: session.staffId,
      createdByStaffId: session.staffId,
    });
    toast.success("Credit authorized. Balance recalculated from the ledger.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Authorize makeup / credit</DialogTitle>
          <DialogDescription>
            Leadership action. Credits are tied to a service line and are not interchangeable.
            Dollar figures are reference values, not cash.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Credit type" className="sm:col-span-2">
            <select
              className={fieldClass}
              value={creditTypeId}
              onChange={(e) => {
                const next = creditTypes.find((c) => c.id === e.target.value)!;
                setCreditTypeId(next.id);
                setReferenceValue(next.referenceValueUsd);
              }}
            >
              {creditTypes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {formatUsd(c.referenceValueUsd)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quantity">
            <input
              type="number"
              min={1}
              className={fieldClass}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </Field>
          <Field label="Reference value (USD per unit)">
            <input
              type="number"
              min={0}
              className={fieldClass}
              value={referenceValue}
              onChange={(e) => setReferenceValue(Number(e.target.value))}
            />
          </Field>
          <Field label="Originating appointment" className="sm:col-span-2">
            <select
              className={fieldClass}
              value={appointmentId}
              onChange={(e) => setAppointmentId(e.target.value)}
            >
              <option value="">None</option>
              {appointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {formatDate(a.date)} · {serviceById(a.serviceId)?.name} · {a.status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Service restriction" className="sm:col-span-2">
            <input
              readOnly
              className={`${fieldClass} bg-muted`}
              value={restriction ? restriction.replace(/_/g, " ") : "Unrestricted (account credit)"}
            />
          </Field>
          <Field label="Reason" className="sm:col-span-2">
            <input
              className={fieldClass}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Leadership override — makeup after early cancel"
            />
          </Field>
          <Field label="Internal note" className="sm:col-span-2">
            <textarea
              rows={2}
              className={fieldClass}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>

        <DialogFooterBar>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!session.isLeadership}>
            Authorize {quantity} × {creditType.name}
          </Button>
        </DialogFooterBar>
        {!session.isLeadership ? (
          <p className="text-xs text-destructive">
            Your demo role cannot authorize credits. Switch to a leadership user.
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
