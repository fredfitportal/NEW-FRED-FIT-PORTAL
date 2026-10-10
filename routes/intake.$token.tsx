import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Circle, FileText, Lock, Upload, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

import { DynamicForm, FormAnswerList } from "@/components/app/DynamicForm";
import { Field, fieldClass } from "@/components/app/form-primitives";
import { schemaForTemplate } from "@/lib/domain/form-schema";
import { Button } from "@/components/ui/button";
import { useDemoData } from "@/hooks/useDemoData";
import {
  REQUIREMENT_STATUS_LABELS,
  clientByToken,
  ensureFoodLog,
  getFoodLog,
  getSubmission,
  isRequirementComplete,
  listClientDocuments,
  listRequirements,
  removeFoodLogEntry,
  saveFoodLogDay,
  saveFoodLogEntry,
  setRequirementStatus,
  submitForm,
  submitFoodLog,
  templateByKey,
  uploadClientDocument,
} from "@/lib/domain/operations";
import { formatDate } from "@/lib/domain/repository";
import type { Client, FormRequirement } from "@/lib/domain/types";

export const Route = createFileRoute("/intake/$token")({
  head: () => ({
    meta: [
      { title: "Your Secure Intake — Fredericksburg Fitness Studio" },
      {
        name: "description",
        content:
          "Complete your Fredericksburg Fitness Studio intake forms, uploads and food log through your private secure link.",
      },
      { property: "og:title", content: "Your Secure Intake — Fredericksburg Fitness Studio" },
      {
        property: "og:description",
        content: "Private client intake workspace for Fredericksburg Fitness Studio.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IntakePage,
});

function IntakePage() {
  useDemoData();
  const { token } = Route.useParams();
  const client = clientByToken(token);

  if (!client) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <Lock className="mx-auto size-8 text-muted-foreground" />
        <h1 className="page-heading mt-4 text-2xl">This link isn't valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Intake links are private to a single client. Please contact the studio for a new link.
        </p>
      </div>
    );
  }

  const requirements = listRequirements(client.id);
  const done = requirements.filter(isRequirementComplete).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-5 py-4">
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Fredericksburg Fitness Studio
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" /> Private link for {client.firstName} {client.lastName}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-5 pb-24 pt-8">
        <section>
          <h1 className="page-heading text-3xl">Your intake checklist</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {done} of {requirements.length} complete. You can finish these in any order, and
            return to this link any time.
          </p>
        </section>

        {requirements.length === 0 ? (
          <p className="surface-card p-6 text-sm text-muted-foreground">
            Nothing is outstanding right now.
          </p>
        ) : null}

        {requirements.map((req) => (
          <RequirementCard key={req.id} client={client} requirement={req} />
        ))}

        <p className="text-xs text-muted-foreground">
          This is a development environment using synthetic demo data. Documents are recorded as
          metadata only, and no email or text notifications are actually delivered.
        </p>
      </main>
    </div>
  );
}

function RequirementCard({ client, requirement }: { client: Client; requirement: FormRequirement }) {
  const template = templateByKey(requirement.templateKey);
  const [open, setOpen] = useState(false);
  const complete = isRequirementComplete(requirement);

  return (
    <section className="surface-card overflow-hidden">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (requirement.status === "sent") setRequirementStatus(requirement.id, "viewed");
        }}
        className="flex w-full items-start gap-3 p-5 text-left"
      >
        {complete ? (
          <CheckCircle2 className="mt-0.5 size-5 text-primary" />
        ) : (
          <Circle className="mt-0.5 size-5 text-muted-foreground" />
        )}
        <span className="flex-1">
          <span className="block font-medium text-foreground">
            {template?.name ?? requirement.templateKey}
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground">
            {REQUIREMENT_STATUS_LABELS[requirement.status]}
            {requirement.dueBefore ? ` · due before ${formatDate(requirement.dueBefore)}` : ""}
          </span>
        </span>
        <span className="text-sm text-primary">{open ? "Hide" : complete ? "View" : "Open"}</span>
      </button>

      {open ? (
        <div className="border-t border-border p-5">
          {template?.kind === "document_upload" ? (
            <UploadPanel client={client} requirement={requirement} />
          ) : template?.kind === "food_log" ? (
            <FoodLogPanel client={client} requirement={requirement} />
          ) : schemaForTemplate(requirement.templateKey) ? (
            <SchemaFormPanel requirement={requirement} />
          ) : (
            <PlaceholderFormPanel requirement={requirement} />
          )}
        </div>
      ) : null}
    </section>
  );
}

/** Structured forms (Apparatix Health History) render from the shared schema. */
function SchemaFormPanel({ requirement }: { requirement: FormRequirement }) {
  const schema = schemaForTemplate(requirement.templateKey);
  const submission = getSubmission(requirement.submissionId);
  if (!schema) return null;

  if (isRequirementComplete(requirement) && submission) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-primary">
          Submitted {formatDate(requirement.submittedAt?.slice(0, 10))} — locked to version{" "}
          {submission.templateVersion}.
        </p>
        <FormAnswerList
          schema={schema}
          payload={submission.payload as Record<string, string | string[] | boolean>}
        />
      </div>
    );
  }

  return (
    <DynamicForm
      schema={schema}
      submitLabel="Submit my health history"
      onSubmit={(payload) => {
        submitForm(requirement.id, payload);
        toast.success("Health history submitted securely");
      }}
    />
  );
}

function PlaceholderFormPanel({ requirement }: { requirement: FormRequirement }) {
  const template = templateByKey(requirement.templateKey);
  const [acknowledged, setAcknowledged] = useState(false);
  const complete = isRequirementComplete(requirement);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
        <FileText className="mt-0.5 size-4 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            Awaiting the approved Fredericksburg Fitness Studio content
          </p>
          <p className="mt-1">{template?.description}</p>
        </div>
      </div>

      <ul className="space-y-2">
        {(template?.placeholderSections ?? []).map((section) => (
          <li
            key={section}
            className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
          >
            {section}
          </li>
        ))}
      </ul>

      {complete ? (
        <p className="text-sm text-primary">
          Submitted {formatDate(requirement.submittedAt?.slice(0, 10))} — locked to version{" "}
          {requirement.templateVersion}.
        </p>
      ) : (
        <>
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="mt-1"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            I understand this is a placeholder structure and that the real form content will be
            supplied by Fredericksburg Fitness Studio.
          </label>
          <Button
            disabled={!acknowledged}
            onClick={() => {
              submitForm(requirement.id, {
                acknowledgedPlaceholder: true,
                templateVersion: requirement.templateVersion,
              });
              toast.success("Marked as complete");
            }}
          >
            Mark as complete
          </Button>
        </>
      )}
    </div>
  );
}


function UploadPanel({ client, requirement }: { client: Client; requirement: FormRequirement }) {
  const documents = listClientDocuments(client.id).filter((d) => d.requirementId === requirement.id);
  const [fileName, setFileName] = useState("");
  const [documentDate, setDocumentDate] = useState("");

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload your original bloodwork report. We keep the original document — values are never
        typed over the source file.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Choose a file">
          <input
            type="file"
            className={fieldClass}
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
        </Field>
        <Field label="Date on the report (optional)">
          <input
            type="date"
            className={fieldClass}
            value={documentDate}
            onChange={(e) => setDocumentDate(e.target.value)}
          />
        </Field>
      </div>

      <Button
        disabled={!fileName}
        onClick={() => {
          uploadClientDocument({
            clientId: client.id,
            requirementId: requirement.id,
            documentType: "bloodwork",
            fileName,
            fileType: fileName.split(".").pop() ?? "file",
            fileSizeBytes: 0,
            documentDate: documentDate || null,
            uploadedByType: "client",
          });
          setFileName("");
          toast.success("Document recorded");
        }}
      >
        <Upload className="mr-2 size-4" /> Submit document
      </Button>

      {documents.length ? (
        <ul className="space-y-2 text-sm">
          {documents.map((d) => (
            <li key={d.id} className="rounded-lg border border-border px-4 py-2">
              <span className="font-medium text-foreground">{d.fileName}</span>
              <span className="ml-2 text-muted-foreground">
                Received {formatDate(d.uploadedAt.slice(0, 10))} · {d.reviewStatus.replace("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function FoodLogPanel({ client, requirement }: { client: Client; requirement: FormRequirement }) {
  const log = getFoodLog(client.id) ?? ensureFoodLog(client.id, requirement.id, requirement.onboardingCaseId);
  const [draft, setDraft] = useState({ dayIndex: 0, time: "", mealLabel: "", foods: "", beverages: "", portions: "" });
  if (!log) return null;
  const locked = log.status !== "in_progress";

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Record three typical days of eating. Add as many entries per day as you like — there's no
        fixed number of meals.
      </p>

      {log.days.map((day) => {
        const entries = log.entries.filter((e) => e.dayIndex === day.dayIndex);
        return (
          <div key={day.dayIndex} className="rounded-lg border border-border p-4">
            <p className="font-medium text-foreground">
              Day {day.dayIndex + 1} · {formatDate(day.date)}
            </p>
            <ul className="mt-2 space-y-2">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="flex items-start justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium text-foreground">
                      {e.mealLabel}
                      {e.time ? ` · ${e.time}` : ""}
                    </span>
                    <span className="block text-muted-foreground">{e.foods}</span>
                    {e.beverages ? (
                      <span className="block text-muted-foreground">Drinks: {e.beverages}</span>
                    ) : null}
                    {e.portions ? (
                      <span className="block text-muted-foreground">Portions: {e.portions}</span>
                    ) : null}
                  </span>
                  {locked ? null : (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => removeFoodLogEntry(log.id, e.id)}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
              {entries.length === 0 ? (
                <li className="text-sm text-muted-foreground">No entries yet.</li>
              ) : null}
            </ul>
            {locked ? null : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Field label="Water / fluids">
                  <input
                    className={fieldClass}
                    defaultValue={day.water ?? ""}
                    onBlur={(e) => saveFoodLogDay(log.id, day.dayIndex, { water: e.target.value })}
                  />
                </Field>
                <Field label="Notes for the day">
                  <input
                    className={fieldClass}
                    defaultValue={day.comments ?? ""}
                    onBlur={(e) => saveFoodLogDay(log.id, day.dayIndex, { comments: e.target.value })}
                  />
                </Field>
              </div>
            )}
          </div>
        );
      })}

      {locked ? (
        <p className="text-sm text-primary">Submitted — thank you.</p>
      ) : (
        <>
          <div className="rounded-lg border border-dashed border-border p-4">
            <p className="text-sm font-medium text-foreground">Add an entry</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Day">
                <select
                  className={fieldClass}
                  value={draft.dayIndex}
                  onChange={(e) => setDraft({ ...draft, dayIndex: Number(e.target.value) })}
                >
                  {log.days.map((d) => (
                    <option key={d.dayIndex} value={d.dayIndex}>
                      Day {d.dayIndex + 1}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Time">
                <input
                  type="time"
                  className={fieldClass}
                  value={draft.time}
                  onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                />
              </Field>
              <Field label="Meal / snack label">
                <input
                  className={fieldClass}
                  placeholder="Breakfast, snack, late night…"
                  value={draft.mealLabel}
                  onChange={(e) => setDraft({ ...draft, mealLabel: e.target.value })}
                />
              </Field>
              <Field label="Portions (optional)">
                <input
                  className={fieldClass}
                  value={draft.portions}
                  onChange={(e) => setDraft({ ...draft, portions: e.target.value })}
                />
              </Field>
              <Field label="Foods" className="sm:col-span-2">
                <textarea
                  rows={2}
                  className={fieldClass}
                  value={draft.foods}
                  onChange={(e) => setDraft({ ...draft, foods: e.target.value })}
                />
              </Field>
              <Field label="Beverages" className="sm:col-span-2">
                <input
                  className={fieldClass}
                  value={draft.beverages}
                  onChange={(e) => setDraft({ ...draft, beverages: e.target.value })}
                />
              </Field>
            </div>
            <Button
              className="mt-3"
              disabled={!draft.mealLabel || !draft.foods}
              onClick={() => {
                saveFoodLogEntry(log.id, {
                  dayIndex: draft.dayIndex,
                  time: draft.time,
                  mealLabel: draft.mealLabel,
                  foods: draft.foods,
                  beverages: draft.beverages,
                  portions: draft.portions,
                });
                setDraft({ ...draft, time: "", mealLabel: "", foods: "", beverages: "", portions: "" });
              }}
            >
              <UtensilsCrossed className="mr-2 size-4" /> Add entry
            </Button>
          </div>
          <Button
            variant="secondary"
            disabled={log.entries.length === 0}
            onClick={() => {
              submitFoodLog(log.id);
              toast.success("Food log submitted");
            }}
          >
            Submit my 3-day food log
          </Button>
        </>
      )}
    </div>
  );
}
