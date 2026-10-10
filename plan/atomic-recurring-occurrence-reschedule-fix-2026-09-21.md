# Atomic recurring-occurrence reschedule fix

## Scope
Fix single-occurrence moves so Appointment Details, drag-and-drop time/date/provider moves, override-confirmed moves, and plain reschedules all use one operation. Preserve series-level edits, attendance, cancellations, make-up credits, participants, and existing synthetic data.

## Implementation
- Make the occurrence move operation the sole write path for single recurring occurrences.
- In one store transaction, capture the original pattern slot, persist it on the moved record, update that same record’s date/time/provider/location/resource, append recurrence and appointment history, and record any approved override.
- Keep the recurring-series provider unchanged for “This appointment only”; retain the current series update behavior for “This and future occurrences.”
- Route drag-and-drop override confirmation and Appointment Details through this operation; remove duplicate recurrence-exception logic from the older repository move path.
- Ensure recurrence generation keys suppression by series ID plus the persisted original pattern date, independent of provider.

## Verification
- Add a fictional weekly Jennifer series and move one occurrence to Jeffrey on another date/time through the override-equivalent operation.
- Assert one appointment ID/record remains, its provider/date/time changed, its original pattern date persisted, and the original date has no matching occurrence under either provider.
- Reload stored data and run recurrence generation; assert the original slot is not recreated and later occurrences remain with Jennifer.
- Assert no cancellation status, make-up credit, or participant changes occur.
- Check existing recurring, participant, capacity, and scheduling behavior; verify the calendar interaction in the preview.
