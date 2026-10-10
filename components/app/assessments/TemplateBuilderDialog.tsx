import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Field, DialogFooterBar, fieldClass } from "@/components/app/form-primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { METRIC_DOMAIN_LABELS, type MetricDomain } from "@/lib/domain/assessment-types";
import {
  BETTER_WHEN_LABELS,
  BILATERAL_FINAL_LABELS,
  CADENCE_LABELS,
  CHOICE_ITEM_TYPES,
  CLOSING_FIELD_LABELS,
  DEFAULT_OUTCOME_OPTIONS,
  FIXED_CHOICES,
  ITEM_PHASE_LABELS,
  ITEM_TYPE_LABELS,
  NUMERIC_ITEM_TYPES,
  SCORE_RULE_LABELS,
  SUGGESTED_SECTIONS,
  blueprintMetrics,
  blueprintToSchema,
  type AssessmentBlueprint,
  type AssessmentItemDef,
  type AssessmentItemType,
  type AssessmentSectionBlueprint,
  type BetterWhen,
  type BilateralFinalScore,
  type ClosingFieldsConfig,
  type ItemPhase,
  type ReassessmentCadence,
  type ScoreRule,
} from "@/lib/domain/assessment-blueprint";
import {
  createTemplate,
  getTemplate,
  saveTemplateBlueprintVersion,
  templateVersion,
} from "@/lib/domain/assessments";
import { repository } from "@/lib/domain/repository";
import type { ID } from "@/lib/domain/types";

/**
 * UNIVERSAL ASSESSMENT TEMPLATE BUILDER.
 *
 * One builder for every FFS assessment. Advanced capability (scoring,
 * reference ranges, conditional logic, media, phase) sits behind per-question
 * progressive disclosure so simple assessments stay simple to build.
 *
 * Editing an existing template always publishes a NEW version — completed
 * assessments keep the version they were recorded against.
 */

interface DraftItem extends AssessmentItemDef {
  uid: number;
  optionsText: string;
  advanced: boolean;
}

interface DraftSection {
  uid: number;
  key: string;
  title: string;
  description: string;
  scoringRule: ScoreRule;
  allowNote: boolean;
  items: DraftItem[];
}

let seq = 1;
const uid = () => seq++;

function slug(label: string, fallback: string) {
  const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return key || fallback;
}

function newItem(): DraftItem {
  return {
    uid: uid(),
    key: "",
    label: "",
    type: "number",
    optionsText: "",
    advanced: false,
    required: false,
    track: true,
    unit: "",
    domain: "clinical",
    betterWhen: "none",
    phase: "both",
    bilateral: { finalScore: "lower", asymmetry: false },
    scoring: { rule: "none" },
    reference: {},
    showIf: [],
    allowNote: false,
    allowImage: false,
    allowVideo: false,
  };
}

function newSection(title = "Findings"): DraftSection {
  return {
    uid: uid(),
    key: slug(title, `section_${uid()}`),
    title,
    description: "",
    scoringRule: "none",
    allowNote: false,
    items: [newItem()],
  };
}

function fromBlueprint(blueprint: AssessmentBlueprint): DraftSection[] {
  return blueprint.sections.map((s) => ({
    uid: uid(),
    key: s.key,
    title: s.title,
    description: s.description ?? "",
    scoringRule: s.scoring?.rule ?? "none",
    allowNote: Boolean(s.allowNote),
    items: s.items.map((i) => ({
      ...i,
      uid: uid(),
      optionsText: (i.options ?? []).join("\n"),
      advanced: false,
      unit: i.unit ?? "",
      domain: i.domain ?? "clinical",
      betterWhen: i.betterWhen ?? "none",
      phase: i.phase ?? "both",
      bilateral: i.bilateral ?? { finalScore: "lower", asymmetry: false },
      scoring: i.scoring ?? { rule: "none" },
      reference: i.reference ?? {},
      showIf: i.showIf ?? [],
    })),
  }));
}

function move<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  if (item) next.splice(to, 0, item);
  return next;
}

export function TemplateBuilderDialog({
  open,
  onOpenChange,
  templateId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the builder edits that template and saves a new version. */
  templateId?: ID | null;
}) {
  const roles = repository.listRoles();
  const editing = getTemplate(templateId);
  const editingBlueprint = editing ? templateVersion(editing.id, editing.currentVersion)?.blueprint : undefined;

  const initial = useMemo(
    () => ({
      name: editing?.name ?? "",
      category: editing?.category ?? "",
      description: editing?.description ?? "",
      performRoleIds: editing?.performRoleIds ?? [],
      viewRoleIds: editing?.viewRoleIds ?? [],
      reassessmentDefault: editing?.reassessmentDefault ?? false,
      cadence: (editing?.reassessmentCadence ?? "quarterly") as ReassessmentCadence,
      intervalDays: String(editing?.reassessmentIntervalDays ?? 90),
      lifecycle: editing?.lifecycle ?? "active",
      sections: editingBlueprint ? fromBlueprint(editingBlueprint) : [newSection()],
      closingFields: (editingBlueprint?.closingFields ?? {}) as ClosingFieldsConfig,
      overallRule: (editingBlueprint?.overallScoring?.rule ?? "none") as ScoreRule,
      outcomeEnabled: Boolean(editingBlueprint?.outcomeOptions?.length),
      outcomeText: (editingBlueprint?.outcomeOptions ?? DEFAULT_OUTCOME_OPTIONS).join("\n"),
      allowAssessmentNote: editingBlueprint?.allowAssessmentNote ?? true,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [templateId, open],
  );

  const [name, setName] = useState(initial.name);
  const [category, setCategory] = useState(initial.category);
  const [description, setDescription] = useState(initial.description);
  const [reassessmentDefault, setReassessmentDefault] = useState(initial.reassessmentDefault);
  const [cadence, setCadence] = useState<ReassessmentCadence>(initial.cadence);
  const [intervalDays, setIntervalDays] = useState(initial.intervalDays);
  const [lifecycle, setLifecycle] = useState(initial.lifecycle);
  const [performRoleIds, setPerformRoleIds] = useState<string[]>(initial.performRoleIds);
  const [viewRoleIds, setViewRoleIds] = useState<string[]>(initial.viewRoleIds);
  const [sections, setSections] = useState<DraftSection[]>(initial.sections);
  const [closingFields, setClosingFields] = useState<ClosingFieldsConfig>(initial.closingFields);
  const [overallRule, setOverallRule] = useState<ScoreRule>(initial.overallRule);
  const [outcomeEnabled, setOutcomeEnabled] = useState(initial.outcomeEnabled);
  const [outcomeText, setOutcomeText] = useState(initial.outcomeText);
  const [allowAssessmentNote, setAllowAssessmentNote] = useState(initial.allowAssessmentNote);
  const [changeNote, setChangeNote] = useState("");
  const [signature, setSignature] = useState(`${templateId ?? "new"}-${open}`);

  // Re-seed the form when the dialog is reopened for a different template.
  const nextSignature = `${templateId ?? "new"}-${open}`;
  if (nextSignature !== signature) {
    setSignature(nextSignature);
    setName(initial.name);
    setCategory(initial.category);
    setDescription(initial.description);
    setReassessmentDefault(initial.reassessmentDefault);
    setCadence(initial.cadence);
    setIntervalDays(initial.intervalDays);
    setLifecycle(initial.lifecycle);
    setPerformRoleIds(initial.performRoleIds);
    setViewRoleIds(initial.viewRoleIds);
    setSections(initial.sections);
    setClosingFields(initial.closingFields);
    setOverallRule(initial.overallRule);
    setOutcomeEnabled(initial.outcomeEnabled);
    setOutcomeText(initial.outcomeText);
    setAllowAssessmentNote(initial.allowAssessmentNote);
    setChangeNote("");
  }

  function patchSection(sUid: number, next: Partial<DraftSection>) {
    setSections((prev) => prev.map((s) => (s.uid === sUid ? { ...s, ...next } : s)));
  }

  function patchItem(sUid: number, iUid: number, next: Partial<DraftItem>) {
    setSections((prev) =>
      prev.map((s) =>
        s.uid === sUid
          ? { ...s, items: s.items.map((i) => (i.uid === iUid ? { ...i, ...next } : i)) }
          : s,
      ),
    );
  }

  function toggle(list: string[], set: (v: string[]) => void, id: string) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  /** All previously defined questions — the choices available for conditions. */
  function earlierItems(sUid: number, iUid: number) {
    const out: DraftItem[] = [];
    for (const s of sections) {
      for (const i of s.items) {
        if (s.uid === sUid && i.uid === iUid) return out;
        if (i.label.trim()) out.push(i);
      }
    }
    return out;
  }

  function buildBlueprint(): AssessmentBlueprint | null {
    const usedItemKeys = new Set<string>();
    const usedSectionKeys = new Set<string>();
    const built: AssessmentSectionBlueprint[] = [];

    sections.forEach((s, si) => {
      const named = s.items.filter((i) => i.label.trim());
      if (!named.length && !s.title.trim()) return;
      let sKey = slug(s.title, `section_${si + 1}`);
      while (usedSectionKeys.has(sKey)) sKey = `${sKey}_${si + 1}`;
      usedSectionKeys.add(sKey);

      built.push({
        key: sKey,
        title: s.title.trim() || `Section ${si + 1}`,
        ...(s.description.trim() ? { description: s.description.trim() } : {}),
        ...(s.scoringRule !== "none" ? { scoring: { rule: s.scoringRule } } : {}),
        ...(s.allowNote ? { allowNote: true } : {}),
        items: named.map((i, ii) => {
          let key = i.key || slug(i.label, `item_${ii + 1}`);
          while (usedItemKeys.has(key)) key = `${key}_${ii + 1}`;
          usedItemKeys.add(key);
          const options = i.optionsText
            .split(/\n|,/)
            .map((o) => o.trim())
            .filter(Boolean);
          const needsOptions = CHOICE_ITEM_TYPES.includes(i.type);
          const item: AssessmentItemDef = {
            key,
            label: i.label.trim(),
            type: i.type,
            ...(needsOptions ? { options: options.length ? options : ["Option 1", "Option 2"] } : {}),
            ...(i.required ? { required: true } : {}),
            ...(i.hint?.trim() ? { hint: i.hint.trim() } : {}),
            ...(i.unit?.trim() ? { unit: i.unit.trim() } : {}),
            ...(i.type === "rating"
              ? { scaleMin: i.scaleMin ?? 0, scaleMax: i.scaleMax ?? 10 }
              : {}),
            ...(i.track ? { track: true } : {}),
            domain: i.domain ?? "clinical",
            betterWhen: i.betterWhen ?? "none",
            phase: i.phase ?? "both",
            ...(i.type === "bilateral"
              ? { bilateral: i.bilateral ?? { finalScore: "lower" } }
              : {}),
            ...(i.scoring && i.scoring.rule !== "none" ? { scoring: i.scoring } : {}),
            ...(i.reference && (i.reference.min != null || i.reference.max != null || i.reference.text || i.reference.classification)
              ? { reference: i.reference }
              : {}),
            ...(i.showIf?.length ? { showIf: i.showIf.filter((c) => c.key) } : {}),
            ...(i.allowNote ? { allowNote: true } : {}),
            ...(i.allowImage ? { allowImage: true } : {}),
            ...(i.allowVideo ? { allowVideo: true } : {}),
          };
          return item;
        }),
      });
    });

    if (!built.some((s) => s.items.length)) return null;

    return {
      sections: built,
      ...(overallRule !== "none" ? { overallScoring: { rule: overallRule } } : {}),
      closingFields,
      ...(outcomeEnabled
        ? {
            outcomeOptions: outcomeText
              .split("\n")
              .map((o) => o.trim())
              .filter(Boolean),
            outcomeLabel: "Assessment outcome / program recommendation",
          }
        : {}),
      allowAssessmentNote,
    };
  }

  function save() {
    if (!name.trim()) {
      toast.error("Give the assessment a name.");
      return;
    }
    if (performRoleIds.length === 0) {
      toast.error("Choose at least one role that can perform this assessment.");
      return;
    }
    const blueprint = buildBlueprint();
    if (!blueprint) {
      toast.error("Add at least one question.");
      return;
    }

    const shared = {
      name: name.trim(),
      category: category.trim() || "General",
      description: description.trim(),
      performRoleIds,
      viewRoleIds: viewRoleIds.length ? viewRoleIds : performRoleIds,
      reassessmentDefault,
      reassessmentCadence: cadence,
      reassessmentIntervalDays: cadence === "custom" ? Number(intervalDays) || 90 : null,
      lifecycle,
    };

    if (editing) {
      saveTemplateBlueprintVersion(editing.id, {
        ...shared,
        blueprint,
        ...(changeNote.trim() ? { changeNote: changeNote.trim() } : {}),
      });
      toast.success(`${shared.name} saved as version ${editing.currentVersion + 1}`);
    } else {
      const key = slug(shared.name, "assessment");
      createTemplate({
        ...shared,
        blueprint,
        sections: blueprintToSchema(blueprint, { templateKey: key, version: "1", title: shared.name })
          .sections,
        metrics: blueprintMetrics(blueprint),
      });
      toast.success(`${shared.name} added to the assessment library`);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.name}` : "New assessment template"}</DialogTitle>
          <DialogDescription>
            {editing
              ? `Saving publishes version ${editing.currentVersion + 1}. Completed assessments keep the version they were recorded against.`
              : "Build any FFS assessment here — measurements, movement screens, Pilates apparatus, gait, balance or clinical observations."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* -------------------------------------------------- basics */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Assessment name">
              <input
                className={fieldClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Functional Movement Screen"
              />
            </Field>
            <Field label="Category">
              <input
                className={fieldClass}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Movement"
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              className={fieldClass}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this assessment covers and when it is used."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Who can perform it
              </p>
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={performRoleIds.includes(r.id)}
                    onChange={() => toggle(performRoleIds, setPerformRoleIds, r.id)}
                  />
                  {r.name}
                </label>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Who can view results
              </p>
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={viewRoleIds.includes(r.id)}
                    onChange={() => toggle(viewRoleIds, setViewRoleIds, r.id)}
                  />
                  {r.name}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Reassessment interval">
              <select
                className={fieldClass}
                value={cadence}
                onChange={(e) => setCadence(e.target.value as ReassessmentCadence)}
              >
                {Object.entries(CADENCE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            {cadence === "custom" ? (
              <Field label="Days between reassessments">
                <input
                  className={fieldClass}
                  type="number"
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(e.target.value)}
                />
              </Field>
            ) : null}
            <Field label="Status">
              <select
                className={fieldClass}
                value={lifecycle}
                onChange={(e) => setLifecycle(e.target.value as typeof lifecycle)}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={reassessmentDefault}
              onChange={(e) => setReassessmentDefault(e.target.checked)}
            />
            Include in the default reassessment suggestion
          </label>

          {/* ------------------------------------------------ sections */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Sections & questions</h3>
              <div className="flex gap-2">
                <select
                  className={fieldClass + " w-48"}
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setSections((prev) => [...prev, newSection(e.target.value)]);
                  }}
                >
                  <option value="">Add suggested section…</option>
                  {SUGGESTED_SECTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSections((prev) => [...prev, newSection("New section")])}
                >
                  Add section
                </Button>
              </div>
            </div>

            {sections.map((section, si) => (
              <div
                key={section.uid}
                className="space-y-4 rounded-xl border border-border bg-card/50 p-4"
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", String(si))}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = Number(e.dataTransfer.getData("text/plain"));
                  if (!Number.isNaN(from)) setSections((prev) => move(prev, from, si));
                }}
              >
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Field label={`Section ${si + 1}`} hint="Drag to reorder sections.">
                    <input
                      className={fieldClass}
                      value={section.title}
                      onChange={(e) => patchSection(section.uid, { title: e.target.value })}
                    />
                  </Field>
                  <div className="flex items-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSections((prev) => move(prev, si, si - 1))}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSections((prev) => move(prev, si, si + 1))}
                    >
                      ↓
                    </Button>
                    {sections.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setSections((prev) => prev.filter((s) => s.uid !== section.uid))
                        }
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Section score">
                    <select
                      className={fieldClass}
                      value={section.scoringRule}
                      onChange={(e) =>
                        patchSection(section.uid, { scoringRule: e.target.value as ScoreRule })
                      }
                    >
                      {Object.entries(SCORE_RULE_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <label className="flex items-center gap-2 pt-7 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={section.allowNote}
                      onChange={(e) => patchSection(section.uid, { allowNote: e.target.checked })}
                    />
                    Allow section notes
                  </label>
                </div>

                {section.items.map((item, ii) => {
                  const needsOptions = CHOICE_ITEM_TYPES.includes(item.type);
                  const isNumeric =
                    NUMERIC_ITEM_TYPES.includes(item.type) || item.type === "bilateral";
                  const conditionSources = earlierItems(section.uid, item.uid);
                  const condition = item.showIf?.[0];
                  const sourceItem = conditionSources.find((c) => (c.key || slug(c.label, "")) === condition?.key);
                  const sourceChoices =
                    sourceItem
                      ? FIXED_CHOICES[sourceItem.type] ??
                        sourceItem.optionsText.split(/\n|,/).map((o) => o.trim()).filter(Boolean)
                      : [];

                  return (
                    <div key={item.uid} className="space-y-3 rounded-lg border border-border bg-background p-3">
                      <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
                        <Field label={`Question ${ii + 1}`}>
                          <input
                            className={fieldClass}
                            value={item.label}
                            onChange={(e) => patchItem(section.uid, item.uid, { label: e.target.value })}
                            placeholder="e.g. Overhead reach"
                          />
                        </Field>
                        <Field label="Answer type">
                          <select
                            className={fieldClass}
                            value={item.type}
                            onChange={(e) =>
                              patchItem(section.uid, item.uid, {
                                type: e.target.value as AssessmentItemType,
                              })
                            }
                          >
                            {Object.entries(ITEM_TYPE_LABELS).map(([v, l]) => (
                              <option key={v} value={v}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>

                      {needsOptions ? (
                        <Field label="Choices" hint="One per line, or separated by commas.">
                          <textarea
                            className={fieldClass}
                            rows={2}
                            value={item.optionsText}
                            onChange={(e) =>
                              patchItem(section.uid, item.uid, { optionsText: e.target.value })
                            }
                          />
                        </Field>
                      ) : null}

                      {item.type === "rating" ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Scale minimum">
                            <input
                              className={fieldClass}
                              type="number"
                              value={item.scaleMin ?? 0}
                              onChange={(e) =>
                                patchItem(section.uid, item.uid, { scaleMin: Number(e.target.value) })
                              }
                            />
                          </Field>
                          <Field label="Scale maximum">
                            <input
                              className={fieldClass}
                              type="number"
                              value={item.scaleMax ?? 10}
                              onChange={(e) =>
                                patchItem(section.uid, item.uid, { scaleMax: Number(e.target.value) })
                              }
                            />
                          </Field>
                        </div>
                      ) : null}

                      {item.type === "bilateral" ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Final score comes from">
                            <select
                              className={fieldClass}
                              value={item.bilateral?.finalScore ?? "lower"}
                              onChange={(e) =>
                                patchItem(section.uid, item.uid, {
                                  bilateral: {
                                    finalScore: e.target.value as BilateralFinalScore,
                                    asymmetry: item.bilateral?.asymmetry ?? false,
                                  },
                                })
                              }
                            >
                              {Object.entries(BILATERAL_FINAL_LABELS).map(([v, l]) => (
                                <option key={v} value={v}>
                                  {l}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <label className="flex items-center gap-2 pt-7 text-sm text-foreground">
                            <input
                              type="checkbox"
                              checked={item.bilateral?.asymmetry ?? false}
                              onChange={(e) =>
                                patchItem(section.uid, item.uid, {
                                  bilateral: {
                                    finalScore: item.bilateral?.finalScore ?? "lower",
                                    asymmetry: e.target.checked,
                                  },
                                })
                              }
                            />
                            Calculate asymmetry %
                          </label>
                        </div>
                      ) : null}

                      {isNumeric ? (
                        <div className="grid gap-3 sm:grid-cols-4">
                          <label className="flex items-center gap-2 pt-7 text-sm text-foreground">
                            <input
                              type="checkbox"
                              checked={Boolean(item.track)}
                              onChange={(e) =>
                                patchItem(section.uid, item.uid, { track: e.target.checked })
                              }
                            />
                            Track over time
                          </label>
                          <Field label="Unit">
                            <input
                              className={fieldClass}
                              value={item.unit ?? ""}
                              onChange={(e) =>
                                patchItem(section.uid, item.uid, { unit: e.target.value })
                              }
                              placeholder="lbs, sec, °"
                            />
                          </Field>
                          <Field label="Group">
                            <select
                              className={fieldClass}
                              value={item.domain ?? "clinical"}
                              onChange={(e) =>
                                patchItem(section.uid, item.uid, {
                                  domain: e.target.value as MetricDomain,
                                })
                              }
                            >
                              {Object.entries(METRIC_DOMAIN_LABELS).map(([v, l]) => (
                                <option key={v} value={v}>
                                  {l}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Better when">
                            <select
                              className={fieldClass}
                              value={item.betterWhen ?? "none"}
                              onChange={(e) =>
                                patchItem(section.uid, item.uid, {
                                  betterWhen: e.target.value as BetterWhen,
                                })
                              }
                            >
                              {Object.entries(BETTER_WHEN_LABELS).map(([v, l]) => (
                                <option key={v} value={v}>
                                  {l}
                                </option>
                              ))}
                            </select>
                          </Field>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-4">
                          <label className="flex items-center gap-2 text-sm text-foreground">
                            <input
                              type="checkbox"
                              checked={Boolean(item.required)}
                              onChange={(e) =>
                                patchItem(section.uid, item.uid, { required: e.target.checked })
                              }
                            />
                            Required
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              patchItem(section.uid, item.uid, { advanced: !item.advanced })
                            }
                          >
                            {item.advanced ? "Hide advanced options" : "Advanced options"}
                          </Button>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              patchSection(section.uid, { items: move(section.items, ii, ii - 1) })
                            }
                          >
                            ↑
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              patchSection(section.uid, { items: move(section.items, ii, ii + 1) })
                            }
                          >
                            ↓
                          </Button>
                          {section.items.length > 1 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                patchSection(section.uid, {
                                  items: section.items.filter((x) => x.uid !== item.uid),
                                })
                              }
                            >
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      {item.advanced ? (
                        <div className="space-y-4 rounded-lg border border-dashed border-border p-3">
                          <Field label="Helper text">
                            <input
                              className={fieldClass}
                              value={item.hint ?? ""}
                              onChange={(e) =>
                                patchItem(section.uid, item.uid, { hint: e.target.value })
                              }
                              placeholder="Instructions for the practitioner"
                            />
                          </Field>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Scoring">
                              <select
                                className={fieldClass}
                                value={item.scoring?.rule ?? "none"}
                                onChange={(e) =>
                                  patchItem(section.uid, item.uid, {
                                    scoring: { ...(item.scoring ?? {}), rule: e.target.value as ScoreRule },
                                  })
                                }
                              >
                                {Object.entries(SCORE_RULE_LABELS).map(([v, l]) => (
                                  <option key={v} value={v}>
                                    {l}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field label="Applies to">
                              <select
                                className={fieldClass}
                                value={item.phase ?? "both"}
                                onChange={(e) =>
                                  patchItem(section.uid, item.uid, {
                                    phase: e.target.value as ItemPhase,
                                  })
                                }
                              >
                                {Object.entries(ITEM_PHASE_LABELS).map(([v, l]) => (
                                  <option key={v} value={v}>
                                    {l}
                                  </option>
                                ))}
                              </select>
                            </Field>
                          </div>

                          {item.scoring?.rule === "pass_fail" ? (
                            <Field label="Value that counts as a pass">
                              <input
                                className={fieldClass}
                                value={item.scoring?.passValue ?? "Pass"}
                                onChange={(e) =>
                                  patchItem(section.uid, item.uid, {
                                    scoring: { rule: "pass_fail", passValue: e.target.value },
                                  })
                                }
                              />
                            </Field>
                          ) : null}

                          <div className="grid gap-3 sm:grid-cols-4">
                            <Field label="Reference min">
                              <input
                                className={fieldClass}
                                type="number"
                                value={item.reference?.min ?? ""}
                                onChange={(e) =>
                                  patchItem(section.uid, item.uid, {
                                    reference: {
                                      ...(item.reference ?? {}),
                                      min: e.target.value === "" ? null : Number(e.target.value),
                                    },
                                  })
                                }
                              />
                            </Field>
                            <Field label="Reference max">
                              <input
                                className={fieldClass}
                                type="number"
                                value={item.reference?.max ?? ""}
                                onChange={(e) =>
                                  patchItem(section.uid, item.uid, {
                                    reference: {
                                      ...(item.reference ?? {}),
                                      max: e.target.value === "" ? null : Number(e.target.value),
                                    },
                                  })
                                }
                              />
                            </Field>
                            <Field label="Reference text">
                              <input
                                className={fieldClass}
                                value={item.reference?.text ?? ""}
                                onChange={(e) =>
                                  patchItem(section.uid, item.uid, {
                                    reference: { ...(item.reference ?? {}), text: e.target.value },
                                  })
                                }
                              />
                            </Field>
                            <Field label="Classification">
                              <input
                                className={fieldClass}
                                value={item.reference?.classification ?? ""}
                                onChange={(e) =>
                                  patchItem(section.uid, item.uid, {
                                    reference: {
                                      ...(item.reference ?? {}),
                                      classification: e.target.value,
                                    },
                                  })
                                }
                              />
                            </Field>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Only show this question when">
                              <select
                                className={fieldClass}
                                value={condition?.key ?? ""}
                                onChange={(e) =>
                                  patchItem(section.uid, item.uid, {
                                    showIf: e.target.value
                                      ? [{ key: e.target.value, equals: condition?.equals ?? "" }]
                                      : [],
                                  })
                                }
                              >
                                <option value="">Always show</option>
                                {conditionSources.map((c) => (
                                  <option key={c.uid} value={c.key || slug(c.label, "")}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            {condition?.key ? (
                              <Field label="Answer equals">
                                {sourceChoices.length ? (
                                  <select
                                    className={fieldClass}
                                    value={condition.equals ?? ""}
                                    onChange={(e) =>
                                      patchItem(section.uid, item.uid, {
                                        showIf: [{ key: condition.key, equals: e.target.value }],
                                      })
                                    }
                                  >
                                    <option value="">Any answer</option>
                                    {sourceChoices.map((o) => (
                                      <option key={o} value={o}>
                                        {o}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    className={fieldClass}
                                    value={condition.equals ?? ""}
                                    onChange={(e) =>
                                      patchItem(section.uid, item.uid, {
                                        showIf: [{ key: condition.key, equals: e.target.value }],
                                      })
                                    }
                                  />
                                )}
                              </Field>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 text-sm text-foreground">
                              <input
                                type="checkbox"
                                checked={Boolean(item.allowNote)}
                                onChange={(e) =>
                                  patchItem(section.uid, item.uid, { allowNote: e.target.checked })
                                }
                              />
                              Allow a note
                            </label>
                            <label className="flex items-center gap-2 text-sm text-foreground">
                              <input
                                type="checkbox"
                                checked={Boolean(item.allowImage)}
                                onChange={(e) =>
                                  patchItem(section.uid, item.uid, { allowImage: e.target.checked })
                                }
                              />
                              Allow an image
                            </label>
                            <label className="flex items-center gap-2 text-sm text-foreground">
                              <input
                                type="checkbox"
                                checked={Boolean(item.allowVideo)}
                                onChange={(e) =>
                                  patchItem(section.uid, item.uid, { allowVideo: e.target.checked })
                                }
                              />
                              Allow a video
                            </label>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => patchSection(section.uid, { items: [...section.items, newItem()] })}
                >
                  Add question
                </Button>
              </div>
            ))}
          </div>

          {/* --------------------------------------- overall & closing */}
          <div className="space-y-4 rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground">Overall scoring & summary</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Overall score" hint="Leave as No score when a total is not meaningful.">
                <select
                  className={fieldClass}
                  value={overallRule}
                  onChange={(e) => setOverallRule(e.target.value as ScoreRule)}
                >
                  {Object.entries(SCORE_RULE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="flex items-center gap-2 pt-7 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={allowAssessmentNote}
                  onChange={(e) => setAllowAssessmentNote(e.target.checked)}
                />
                Allow overall assessment notes
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Closing documentation fields
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(CLOSING_FIELD_LABELS) as (keyof ClosingFieldsConfig)[]).map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={Boolean(closingFields[key])}
                      onChange={(e) =>
                        setClosingFields((prev) => ({ ...prev, [key]: e.target.checked }))
                      }
                    />
                    {CLOSING_FIELD_LABELS[key]}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={outcomeEnabled}
                onChange={(e) => setOutcomeEnabled(e.target.checked)}
              />
              Include an assessment outcome / program recommendation list
            </label>
            {outcomeEnabled ? (
              <Field
                label="Outcome options"
                hint="One per line. Documentation only — the practitioner always chooses."
              >
                <textarea
                  className={fieldClass}
                  rows={4}
                  value={outcomeText}
                  onChange={(e) => setOutcomeText(e.target.value)}
                />
              </Field>
            ) : null}
          </div>

          {editing ? (
            <Field label="What changed in this version?">
              <input
                className={fieldClass}
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                placeholder="e.g. Added single-leg balance items"
              />
            </Field>
          ) : null}

          <DialogFooterBar>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save}>
              {editing ? `Save as version ${editing.currentVersion + 1}` : "Save assessment"}
            </Button>
          </DialogFooterBar>
        </div>
      </DialogContent>
    </Dialog>
  );
}
