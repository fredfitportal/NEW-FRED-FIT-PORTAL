import { Field, fieldClass } from "@/components/app/form-primitives";
import { Button } from "@/components/ui/button";
import {
  BETTER_WHEN_LABELS,
  CHOICE_ITEM_TYPES,
  NUMERIC_ITEM_TYPES,
  REFERENCE_LABELS,
  computeBilateral,
  computeScores,
  isItemVisible,
  itemAppliesToPhase,
  itemChoices,
  itemScore,
  itemValueNumber,
  referencePosition,
  type AssessmentBlueprint,
  type AssessmentItemDef,
  type AssessmentItemResult,
  type AssessmentItemResults,
} from "@/lib/domain/assessment-blueprint";

/**
 * Renders a template blueprint for data capture. Every calculated number shown
 * here (difference, asymmetry, score, reference position) is arithmetic on the
 * practitioner's own entries — the portal never interprets a result.
 */

function inputTypeFor(item: AssessmentItemDef) {
  if (item.type === "date") return "date";
  if (NUMERIC_ITEM_TYPES.includes(item.type) && item.type !== "duration") return "number";
  return "text";
}

function placeholderFor(item: AssessmentItemDef) {
  if (item.type === "duration") return "mm:ss or seconds";
  if (item.type === "percentage") return "%";
  if (item.type === "degrees") return "degrees";
  return item.unit ?? "";
}

function Calc({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

function ItemCard({
  item,
  result,
  onChange,
}: {
  item: AssessmentItemDef;
  result: AssessmentItemResult | undefined;
  onChange: (next: AssessmentItemResult) => void;
}) {
  const value = result?.value;
  const patch = (next: Partial<AssessmentItemResult>) => onChange({ ...(result ?? {}), ...next });
  const choices = itemChoices(item);
  const numeric = itemValueNumber(item, result);
  const refPos = referencePosition(item, numeric);
  const score = itemScore(item, result);
  const bil = item.type === "bilateral" ? computeBilateral(item, result) : undefined;

  const hint = [
    item.hint,
    item.unit ? `Unit: ${item.unit}` : "",
    item.reference?.text,
    item.reference?.min != null || item.reference?.max != null
      ? `Reference ${item.reference?.min ?? "–"} to ${item.reference?.max ?? "–"}`
      : "",
    item.betterWhen && item.betterWhen !== "none"
      ? `Better when: ${BETTER_WHEN_LABELS[item.betterWhen]}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <Field label={item.label + (item.required ? " *" : "")} {...(hint ? { hint } : {})}>
        {item.type === "bilateral" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className={fieldClass}
              inputMode="decimal"
              placeholder="Left"
              value={result?.left ?? ""}
              onChange={(e) => patch({ left: e.target.value })}
            />
            <input
              className={fieldClass}
              inputMode="decimal"
              placeholder="Right"
              value={result?.right ?? ""}
              onChange={(e) => patch({ right: e.target.value })}
            />
          </div>
        ) : item.type === "notes" ? (
          <textarea
            className={fieldClass}
            rows={3}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => patch({ value: e.target.value })}
          />
        ) : item.type === "multi_select" ? (
          <div className="flex flex-wrap gap-3">
            {choices.map((o) => {
              const list = Array.isArray(value) ? value : [];
              return (
                <label key={o} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={list.includes(o)}
                    onChange={() =>
                      patch({
                        value: list.includes(o) ? list.filter((x) => x !== o) : [...list, o],
                      })
                    }
                  />
                  {o}
                </label>
              );
            })}
          </div>
        ) : CHOICE_ITEM_TYPES.includes(item.type) || choices.length ? (
          <select
            className={fieldClass}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => patch({ value: e.target.value })}
          >
            <option value="">Select…</option>
            {choices.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : item.type === "image" || item.type === "video" ? (
          <input
            type="file"
            accept={item.type === "image" ? "image/*" : "video/*"}
            className={fieldClass}
            onChange={(e) => {
              const file = e.target.files?.[0];
              patch({
                media: file
                  ? [
                      {
                        id: `${item.key}-${Date.now()}`,
                        kind: item.type === "image" ? "image" : "video",
                        name: file.name,
                        capturedAt: new Date().toISOString(),
                      },
                    ]
                  : [],
              });
            }}
          />
        ) : (
          <input
            className={fieldClass}
            type={inputTypeFor(item)}
            placeholder={placeholderFor(item)}
            {...(item.type === "rating"
              ? { min: item.scaleMin ?? 0, max: item.scaleMax ?? 10 }
              : {})}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => patch({ value: e.target.value })}
          />
        )}
      </Field>

      {bil && (bil.left !== undefined || bil.right !== undefined) ? (
        <Calc>
          {bil.difference !== undefined ? `Difference ${bil.difference} · absolute ${bil.absDifference}` : "Enter both sides for a difference"}
          {bil.asymmetryPct !== undefined ? ` · asymmetry ${bil.asymmetryPct}%` : ""}
          {bil.score !== undefined ? ` · final score ${bil.score}` : ""}
        </Calc>
      ) : null}

      {item.bilateral?.finalScore === "manual" ? (
        <Field label="Final score">
          <input
            className={fieldClass}
            inputMode="decimal"
            value={result?.manualScore ?? ""}
            onChange={(e) => patch({ manualScore: e.target.value })}
          />
        </Field>
      ) : null}

      {item.scoring?.rule === "manual" && item.type !== "bilateral" ? (
        <Field label="Score">
          <input
            className={fieldClass}
            inputMode="decimal"
            value={result?.manualScore ?? ""}
            onChange={(e) => patch({ manualScore: e.target.value })}
          />
        </Field>
      ) : null}

      {score !== undefined && item.scoring?.rule !== "manual" ? <Calc>Score: {score}</Calc> : null}
      {refPos ? <Calc>{REFERENCE_LABELS[refPos]}</Calc> : null}
      {item.reference?.classification ? <Calc>{item.reference.classification}</Calc> : null}

      {item.allowNote ? (
        <Field label="Note">
          <textarea
            className={fieldClass}
            rows={2}
            value={result?.note ?? ""}
            onChange={(e) => patch({ note: e.target.value })}
          />
        </Field>
      ) : null}

      {(item.allowImage || item.allowVideo) && item.type !== "image" && item.type !== "video" ? (
        <Field label="Attachment" hint="Synthetic development build — file names only.">
          <input
            type="file"
            accept={item.allowImage && item.allowVideo ? "image/*,video/*" : item.allowImage ? "image/*" : "video/*"}
            className={fieldClass}
            onChange={(e) => {
              const file = e.target.files?.[0];
              patch({
                media: file
                  ? [
                      {
                        id: `${item.key}-${Date.now()}`,
                        kind: file.type.startsWith("video") ? "video" : "image",
                        name: file.name,
                        capturedAt: new Date().toISOString(),
                      },
                    ]
                  : [],
              });
            }}
          />
        </Field>
      ) : null}
    </div>
  );
}

export function BlueprintRunner({
  blueprint,
  results,
  onResults,
  sectionNotes,
  onSectionNote,
  phase = "initial",
}: {
  blueprint: AssessmentBlueprint;
  results: AssessmentItemResults;
  onResults: (next: AssessmentItemResults) => void;
  sectionNotes: Record<string, string>;
  onSectionNote: (key: string, note: string) => void;
  phase?: "initial" | "reassessment";
}) {
  const scores = computeScores(blueprint, results);

  return (
    <div className="space-y-5">
      {blueprint.sections.map((section) => {
        const visible = section.items.filter(
          (i) => itemAppliesToPhase(i, phase) && isItemVisible(i, results),
        );
        const sScore = scores.sections.find((s) => s.key === section.key);
        return (
          <section key={section.key} className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                {section.description ? (
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                ) : null}
              </div>
              {sScore?.score !== undefined ? (
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                  Section score {sScore.score}
                  {sScore.label ? ` · ${sScore.label}` : ""}
                </span>
              ) : null}
            </div>

            {visible.map((item) => (
              <ItemCard
                key={item.key}
                item={item}
                result={results[item.key]}
                onChange={(next) => onResults({ ...results, [item.key]: next })}
              />
            ))}

            {section.allowNote ? (
              <Field label={`${section.title} notes`}>
                <textarea
                  className={fieldClass}
                  rows={2}
                  value={sectionNotes[section.key] ?? ""}
                  onChange={(e) => onSectionNote(section.key, e.target.value)}
                />
              </Field>
            ) : null}
          </section>
        );
      })}

      {scores.overall !== undefined ? (
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">
          Overall score: <span className="font-semibold">{scores.overall}</span>
          {scores.overallLabel ? ` · ${scores.overallLabel}` : ""}
        </div>
      ) : null}
    </div>
  );
}

export function BlueprintRunnerFooter({
  children,
  onSubmit,
  submitLabel,
}: {
  children?: React.ReactNode;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      {children}
      <Button onClick={onSubmit}>{submitLabel}</Button>
    </div>
  );
}
