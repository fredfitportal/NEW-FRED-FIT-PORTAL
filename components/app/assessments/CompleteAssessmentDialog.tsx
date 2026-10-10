import { useState } from "react";
import { toast } from "sonner";

import { DynamicForm } from "@/components/app/DynamicForm";
import { Field, fieldClass } from "@/components/app/form-primitives";
import { BlueprintRunner, BlueprintRunnerFooter } from "@/components/app/assessments/BlueprintRunner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CLOSING_FIELD_LABELS,
  type AssessmentItemResults,
  type ClosingFieldsConfig,
} from "@/lib/domain/assessment-blueprint";
import {
  completeAssessment,
  getAssignment,
  getTemplate,
  templateVersion,
  todayIso,
} from "@/lib/domain/assessments";
import { repository } from "@/lib/domain/repository";
import { useSession } from "@/lib/domain/session";
import type { ID } from "@/lib/domain/types";

/**
 * Completion workflow. Templates built in the universal builder render their
 * blueprint (expanded answer types, bilateral capture, scoring, reference
 * ranges, conditional items, notes and media); older templates keep rendering
 * through the shared DynamicForm.
 */
export function CompleteAssessmentDialog({
  assignmentId,
  onOpenChange,
}: {
  assignmentId: ID | null;
  onOpenChange: (open: boolean) => void;
}) {
  const session = useSession();
  const assignment = getAssignment(assignmentId);
  const template = getTemplate(assignment?.templateId);
  const version = assignment ? templateVersion(assignment.templateId, assignment.templateVersion) : undefined;
  const locations = repository.listLocations();

  const [performedDate, setPerformedDate] = useState(todayIso());
  const [locationId, setLocationId] = useState<string>("");
  const [recommendations, setRecommendations] = useState("");
  const [finalize, setFinalize] = useState(false);
  const [results, setResults] = useState<AssessmentItemResults>({});
  const [sectionNotes, setSectionNotes] = useState<Record<string, string>>({});
  const [assessmentNote, setAssessmentNote] = useState("");
  const [closing, setClosing] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState("");

  if (!assignmentId || !assignment || !template || !version) return null;

  const allowed = template.performRoleIds.includes(session.staff.roleId);
  const blueprint = version.blueprint;
  const closingKeys = Object.entries(blueprint?.closingFields ?? {})
    .filter(([, on]) => on)
    .map(([k]) => k as keyof ClosingFieldsConfig);

  const header = (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Date performed">
        <input
          type="date"
          className={fieldClass}
          value={performedDate}
          onChange={(e) => setPerformedDate(e.target.value)}
        />
      </Field>
      <Field label="Practitioner">
        <input className={fieldClass} value={`${session.staff.firstName} ${session.staff.lastName}`} readOnly />
      </Field>
      <Field label="Location">
        <select className={fieldClass} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          <option value="">Not recorded</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );

  function saveBlueprint() {
    completeAssessment({
      assignmentId: assignment!.id,
      clientId: assignment!.clientId,
      templateId: assignment!.templateId,
      practitionerStaffId: session.staffId,
      performedDate,
      values: {},
      itemResults: results,
      locationId: locationId || null,
      sectionNotes,
      ...(assessmentNote.trim() ? { assessmentNote: assessmentNote.trim() } : {}),
      closing,
      ...(outcome ? { outcome } : {}),
      ...(recommendations.trim() ? { recommendations: recommendations.trim() } : {}),
      finalize,
      workflowStatus: finalize ? "reviewed" : "completed",
    });
    toast.success(finalize ? `${template!.name} completed and reviewed.` : `${template!.name} saved.`);
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
          <DialogDescription>
            Version {assignment.templateVersion} · results are stored against this version, so future
            template edits never change this record.
          </DialogDescription>
        </DialogHeader>

        {!allowed ? (
          <p className="rounded-lg border border-warning/35 bg-warning/10 p-3 text-sm text-warning-foreground">
            Your role is not authorized to perform this assessment type. Ask an authorized
            practitioner to complete it.
          </p>
        ) : blueprint ? (
          <div className="space-y-5">
            {header}

            <BlueprintRunner
              blueprint={blueprint}
              results={results}
              onResults={setResults}
              sectionNotes={sectionNotes}
              onSectionNote={(key, note) => setSectionNotes((prev) => ({ ...prev, [key]: note }))}
              phase={assignment.purpose === "reassessment" ? "reassessment" : "initial"}
            />

            {closingKeys.length ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Professional summary</h3>
                {closingKeys.map((key) => (
                  <Field key={key} label={CLOSING_FIELD_LABELS[key]}>
                    <textarea
                      className={fieldClass}
                      rows={2}
                      value={closing[key] ?? ""}
                      onChange={(e) => setClosing((prev) => ({ ...prev, [key]: e.target.value }))}
                    />
                  </Field>
                ))}
              </div>
            ) : null}

            {blueprint.outcomeOptions?.length ? (
              <Field
                label={blueprint.outcomeLabel || "Assessment outcome"}
                hint="Documentation of the practitioner's decision. Nothing is determined automatically."
              >
                <select className={fieldClass} value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                  <option value="">Not documented</option>
                  {blueprint.outcomeOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            {blueprint.allowAssessmentNote ? (
              <Field label="Overall assessment notes">
                <textarea
                  className={fieldClass}
                  rows={3}
                  value={assessmentNote}
                  onChange={(e) => setAssessmentNote(e.target.value)}
                />
              </Field>
            ) : null}

            <Field
              label="Practitioner recommendations"
              hint="Interpretation and next steps are always practitioner-entered."
            >
              <textarea
                className={fieldClass}
                rows={3}
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
              />
            </Field>

            <BlueprintRunnerFooter
              onSubmit={saveBlueprint}
              submitLabel={finalize ? "Save & finalize" : "Save assessment"}
            >
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={finalize}
                  disabled={!session.can("assessments.finalize")}
                  onChange={(e) => setFinalize(e.target.checked)}
                />
                Sign / finalize on save
              </label>
            </BlueprintRunnerFooter>
          </div>
        ) : (
          <div className="space-y-5">
            {header}

            <DynamicForm
              schema={version.schema}
              submitLabel={finalize ? "Save & finalize" : "Save assessment"}
              secondaryAction={
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={finalize}
                    disabled={!session.can("assessments.finalize")}
                    onChange={(e) => setFinalize(e.target.checked)}
                  />
                  Sign / finalize on save
                </label>
              }
              onSubmit={(payload) => {
                completeAssessment({
                  assignmentId: assignment.id,
                  clientId: assignment.clientId,
                  templateId: assignment.templateId,
                  practitionerStaffId: session.staffId,
                  performedDate,
                  values: payload,
                  locationId: locationId || null,
                  ...(recommendations.trim() ? { recommendations: recommendations.trim() } : {}),
                  finalize,
                });
                toast.success(
                  finalize ? `${template.name} completed and finalized.` : `${template.name} saved.`,
                );
                onOpenChange(false);
              }}
            />

            <Field
              label="Practitioner recommendations"
              hint="Interpretation and next steps are always practitioner-entered."
            >
              <textarea
                className={fieldClass}
                rows={3}
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
              />
            </Field>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
