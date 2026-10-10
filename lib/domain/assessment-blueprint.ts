/**
 * UNIVERSAL ASSESSMENT BLUEPRINT.
 *
 * One configurable engine that can express every FFS assessment — beginner /
 * physical, FMS, Pilates, Apparatix, gait, fall risk, medical exercise — without
 * a bespoke feature per assessment type.
 *
 * Nothing here makes a clinical decision. Scores, reference-range positions and
 * asymmetry numbers are arithmetic on practitioner-entered values; every
 * interpretation, outcome and recommendation is chosen by the professional.
 *
 * Blueprints are stored ON THE TEMPLATE VERSION. Completed assessments record
 * the version they used, so editing a template never rewrites history.
 */

import type { FormFieldDef, FormSchema, FormValue } from "./form-schema";
import type { AssessmentMetricDef, MetricDomain } from "./assessment-types";

/* ------------------------------------------------------------------ */
/* Answer types                                                        */
/* ------------------------------------------------------------------ */

export type AssessmentItemType =
  | "number"
  | "text"
  | "notes"
  | "yes_no"
  | "pass_fail"
  | "positive_negative"
  | "single_select"
  | "multi_select"
  | "rating"
  | "duration"
  | "reps"
  | "degrees"
  | "percentage"
  | "date"
  | "bilateral"
  | "image"
  | "video";

export const ITEM_TYPE_LABELS: Record<AssessmentItemType, string> = {
  number: "Number",
  text: "Short text",
  notes: "Long text / clinical notes",
  yes_no: "Yes / No",
  pass_fail: "Pass / Fail",
  positive_negative: "Positive / Negative",
  single_select: "Single select",
  multi_select: "Multi-select",
  rating: "Rating scale",
  duration: "Time / duration",
  reps: "Repetitions",
  degrees: "Degrees / angle",
  percentage: "Percentage",
  date: "Date",
  bilateral: "Left / Right bilateral measurement",
  image: "Image",
  video: "Video",
};

/** Item types whose answer is a single number we can track and score. */
export const NUMERIC_ITEM_TYPES: AssessmentItemType[] = [
  "number",
  "rating",
  "duration",
  "reps",
  "degrees",
  "percentage",
];

export const CHOICE_ITEM_TYPES: AssessmentItemType[] = ["single_select", "multi_select"];

export const FIXED_CHOICES: Partial<Record<AssessmentItemType, string[]>> = {
  yes_no: ["Yes", "No"],
  pass_fail: ["Pass", "Fail"],
  positive_negative: ["Positive", "Negative"],
};

export type BetterWhen =
  | "higher"
  | "lower"
  | "within_range"
  | "closer_to_zero"
  | "symmetrical"
  | "pass"
  | "none";

export const BETTER_WHEN_LABELS: Record<BetterWhen, string> = {
  higher: "Higher",
  lower: "Lower",
  within_range: "Within range",
  closer_to_zero: "Closer to zero",
  symmetrical: "Symmetrical",
  pass: "Pass",
  none: "No preference",
};

export type ScoreRule =
  | "none"
  | "manual"
  | "value"
  | "sum"
  | "average"
  | "lowest"
  | "highest"
  | "pass_fail"
  | "threshold";

export const SCORE_RULE_LABELS: Record<ScoreRule, string> = {
  none: "No score",
  manual: "Manual score",
  value: "Use the recorded value",
  sum: "Sum",
  average: "Average",
  lowest: "Lowest score",
  highest: "Highest score",
  pass_fail: "Pass / Fail",
  threshold: "Custom threshold / range",
};

export type BilateralFinalScore = "lower" | "higher" | "average" | "difference" | "manual";

export const BILATERAL_FINAL_LABELS: Record<BilateralFinalScore, string> = {
  lower: "Lower of left / right",
  higher: "Higher of left / right",
  average: "Average of left / right",
  difference: "Difference (right − left)",
  manual: "Manually entered",
};

export type ItemPhase = "initial" | "reassessment" | "both";

export const ITEM_PHASE_LABELS: Record<ItemPhase, string> = {
  initial: "Initial assessment only",
  reassessment: "Reassessment only",
  both: "Both",
};

export type ReassessmentCadence =
  | "quarterly"
  | "six_months"
  | "annual"
  | "custom"
  | "none";

export const CADENCE_LABELS: Record<ReassessmentCadence, string> = {
  quarterly: "Quarterly",
  six_months: "Every 6 months",
  annual: "Annual",
  custom: "Custom interval",
  none: "No routine reassessment",
};

export const CADENCE_DAYS: Record<Exclude<ReassessmentCadence, "custom" | "none">, number> = {
  quarterly: 90,
  six_months: 182,
  annual: 365,
};

export interface ScoreThreshold {
  min?: number | null;
  max?: number | null;
  score?: number | null;
  label?: string;
}

export interface AssessmentCondition {
  /** Key of the item this one depends on. */
  key: string;
  /** Show when the answer equals this value. */
  equals?: string;
  /** Show when a multi-select answer includes this option. */
  includes?: string;
  /** Show when the item has any answer at all. */
  answered?: boolean;
}

export interface AssessmentItemDef {
  key: string;
  label: string;
  type: AssessmentItemType;
  options?: string[];
  required?: boolean;
  hint?: string;
  unit?: string;
  /** Rating scale bounds. */
  scaleMin?: number;
  scaleMax?: number;
  /** Track this answer as a historical data point in the client's progress view. */
  track?: boolean;
  domain?: MetricDomain;
  betterWhen?: BetterWhen;
  phase?: ItemPhase;
  /** Bilateral configuration — only used by `bilateral` items. */
  bilateral?: {
    finalScore: BilateralFinalScore;
    asymmetry?: boolean;
  };
  /** Optional scoring for this single item. */
  scoring?: {
    rule: ScoreRule;
    thresholds?: ScoreThreshold[];
    passValue?: string;
    maxScore?: number | null;
  };
  reference?: {
    min?: number | null;
    max?: number | null;
    text?: string;
    classification?: string;
  };
  showIf?: AssessmentCondition[];
  allowNote?: boolean;
  allowImage?: boolean;
  allowVideo?: boolean;
}

export interface AssessmentSectionBlueprint {
  key: string;
  title: string;
  description?: string;
  items: AssessmentItemDef[];
  scoring?: { rule: ScoreRule; thresholds?: ScoreThreshold[] };
  allowNote?: boolean;
  allowMedia?: boolean;
}

export interface ClosingFieldsConfig {
  keyStrengths?: boolean;
  primaryFindings?: boolean;
  restrictions?: boolean;
  painPatterns?: boolean;
  recommendations?: boolean;
  recommendedProgram?: boolean;
  recommendedFrequency?: boolean;
  followUpInterval?: boolean;
}

export const CLOSING_FIELD_LABELS: Record<keyof ClosingFieldsConfig, string> = {
  keyStrengths: "Key strengths",
  primaryFindings: "Primary findings",
  restrictions: "Restrictions / imbalances",
  painPatterns: "Pain patterns / safety considerations",
  recommendations: "Recommendations",
  recommendedProgram: "Recommended program",
  recommendedFrequency: "Recommended frequency",
  followUpInterval: "Follow-up / reassessment interval",
};

export interface AssessmentBlueprint {
  sections: AssessmentSectionBlueprint[];
  overallScoring?: { rule: ScoreRule; thresholds?: ScoreThreshold[] };
  closingFields?: ClosingFieldsConfig;
  /** Practitioner-selected outcome options. Never chosen automatically. */
  outcomeOptions?: string[];
  outcomeLabel?: string;
  allowAssessmentNote?: boolean;
}

export const DEFAULT_OUTCOME_OPTIONS = [
  "Appropriate for Apparatix",
  "Appropriate for Apparatix + Strength",
  "Personal Training recommended",
  "Private Pilates recommended",
  "Medical Exercise recommended",
  "Comprehensive Onboarding recommended",
  "Additional information / medical release needed",
];

export const SUGGESTED_SECTIONS = [
  "Body Composition",
  "Vital Signs",
  "Functional Movement",
  "Strength",
  "Mobility",
  "Balance",
  "Posture",
  "Breathing & Core Control",
  "Reformer",
  "Tower",
  "Chair",
  "CoreAlign",
  "Gait",
  "Clinical / Professional Observations",
];

/* ------------------------------------------------------------------ */
/* Recorded results                                                    */
/* ------------------------------------------------------------------ */

export interface AssessmentMedia {
  id: string;
  kind: "image" | "video";
  name: string;
  /** Synthetic development build: a local object/data reference only. */
  ref?: string;
  capturedAt?: string;
}

export interface AssessmentItemResult {
  value?: FormValue;
  left?: string;
  right?: string;
  manualScore?: string;
  note?: string;
  media?: AssessmentMedia[];
}

export type AssessmentItemResults = Record<string, AssessmentItemResult>;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function num(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "boolean") return value ? 1 : 0;
  const s = String(value).trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

export function itemChoices(item: AssessmentItemDef): string[] {
  return FIXED_CHOICES[item.type] ?? item.options ?? [];
}

export function isItemVisible(item: AssessmentItemDef, results: AssessmentItemResults) {
  if (!item.showIf?.length) return true;
  return item.showIf.every((rule) => {
    const r = results[rule.key];
    const v = r?.value;
    if (rule.includes !== undefined) return Array.isArray(v) && v.includes(rule.includes);
    if (rule.equals !== undefined) return String(v ?? "") === rule.equals;
    if (rule.answered) {
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === "boolean") return v;
      return String(v ?? "").trim() !== "" || Boolean(r?.left) || Boolean(r?.right);
    }
    return true;
  });
}

export function itemAppliesToPhase(item: AssessmentItemDef, phase: "initial" | "reassessment") {
  const p = item.phase ?? "both";
  return p === "both" || p === phase;
}

/* ------------------------------------------------------------------ */
/* Bilateral maths                                                     */
/* ------------------------------------------------------------------ */

export interface BilateralComputation {
  left?: number | undefined;
  right?: number | undefined;
  difference?: number | undefined;
  absDifference?: number | undefined;
  asymmetryPct?: number | undefined;
  score?: number | undefined;
}

export function computeBilateral(
  item: AssessmentItemDef,
  result: AssessmentItemResult | undefined,
): BilateralComputation {
  const left = num(result?.left);
  const right = num(result?.right);
  if (left === undefined && right === undefined) return {};
  const out: BilateralComputation = { left, right };
  if (left !== undefined && right !== undefined) {
    out.difference = round(right - left);
    out.absDifference = round(Math.abs(right - left));
    const max = Math.max(Math.abs(left), Math.abs(right));
    if (item.bilateral?.asymmetry && max > 0) {
      out.asymmetryPct = round((Math.abs(right - left) / max) * 100);
    }
  }
  const mode = item.bilateral?.finalScore ?? "lower";
  if (mode === "manual") {
    out.score = num(result?.manualScore);
  } else if (left !== undefined && right !== undefined) {
    out.score =
      mode === "lower"
        ? Math.min(left, right)
        : mode === "higher"
          ? Math.max(left, right)
          : mode === "average"
            ? round((left + right) / 2)
            : round(right - left);
  } else {
    out.score = left ?? right;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

function thresholdScore(thresholds: ScoreThreshold[] | undefined, value: number | undefined) {
  if (value === undefined || !thresholds?.length) return undefined;
  const hit = thresholds.find(
    (t) =>
      (t.min == null || value >= t.min) && (t.max == null || value <= t.max),
  );
  return hit?.score ?? undefined;
}

export function thresholdLabel(thresholds: ScoreThreshold[] | undefined, value: number | undefined) {
  if (value === undefined || !thresholds?.length) return undefined;
  return thresholds.find(
    (t) => (t.min == null || value >= t.min) && (t.max == null || value <= t.max),
  )?.label;
}

/** The comparable number for an item (before any scoring rule is applied). */
export function itemValueNumber(
  item: AssessmentItemDef,
  result: AssessmentItemResult | undefined,
): number | undefined {
  if (item.type === "bilateral") return computeBilateral(item, result).score;
  if (NUMERIC_ITEM_TYPES.includes(item.type)) return num(result?.value);
  return undefined;
}

export function itemScore(
  item: AssessmentItemDef,
  result: AssessmentItemResult | undefined,
): number | undefined {
  const rule = item.scoring?.rule ?? "none";
  if (rule === "none") return undefined;
  if (rule === "manual") return num(result?.manualScore);
  const value = itemValueNumber(item, result);
  switch (rule) {
    case "value":
      return value;
    case "lowest":
    case "highest":
    case "average":
    case "sum": {
      if (item.type !== "bilateral") return value;
      const b = computeBilateral(item, result);
      if (b.left === undefined || b.right === undefined) return b.left ?? b.right;
      if (rule === "lowest") return Math.min(b.left, b.right);
      if (rule === "highest") return Math.max(b.left, b.right);
      if (rule === "average") return round((b.left + b.right) / 2);
      return round(b.left + b.right);
    }
    case "pass_fail": {
      const pass = item.scoring?.passValue ?? "Pass";
      return String(result?.value ?? "") === pass ? 1 : 0;
    }
    case "threshold":
      return thresholdScore(item.scoring?.thresholds, value);
    default:
      return undefined;
  }
}

export interface SectionScore {
  key: string;
  title: string;
  rule: ScoreRule;
  score?: number | undefined;
  label?: string | undefined;
}

export function sectionScore(
  section: AssessmentSectionBlueprint,
  results: AssessmentItemResults,
): SectionScore | undefined {
  const rule = section.scoring?.rule ?? "none";
  if (rule === "none") return undefined;
  const scores = section.items
    .filter((i) => isItemVisible(i, results))
    .map((i) => itemScore(i, results) ?? itemValueNumber(i, results))
    .filter((n): n is number => n !== undefined);
  let score: number | undefined;
  if (rule === "manual") score = undefined;
  else if (rule === "sum") score = scores.length ? round(scores.reduce((a, b) => a + b, 0)) : undefined;
  else if (rule === "average")
    score = scores.length ? round(scores.reduce((a, b) => a + b, 0) / scores.length) : undefined;
  else if (rule === "lowest") score = scores.length ? Math.min(...scores) : undefined;
  else if (rule === "highest") score = scores.length ? Math.max(...scores) : undefined;
  else if (rule === "pass_fail") score = scores.length ? (scores.every((s) => s > 0) ? 1 : 0) : undefined;
  else if (rule === "threshold")
    score = thresholdScore(
      section.scoring?.thresholds,
      scores.length ? round(scores.reduce((a, b) => a + b, 0)) : undefined,
    );
  else if (rule === "value") score = scores[0];
  return {
    key: section.key,
    title: section.title,
    rule,
    score,
    label: thresholdLabel(section.scoring?.thresholds, score),
  };
}

export interface BlueprintScores {
  items: Record<string, number>;
  sections: SectionScore[];
  overall?: number | undefined;
  overallLabel?: string | undefined;
}

export function computeScores(
  blueprint: AssessmentBlueprint,
  results: AssessmentItemResults,
): BlueprintScores {
  const items: Record<string, number> = {};
  blueprint.sections.forEach((s) =>
    s.items.forEach((i) => {
      const score = itemScore(i, results);
      if (score !== undefined) items[i.key] = score;
    }),
  );
  const sections = blueprint.sections
    .map((s) => sectionScore(s, results))
    .filter((s): s is SectionScore => Boolean(s));

  const rule = blueprint.overallScoring?.rule ?? "none";
  let overall: number | undefined;
  if (rule !== "none" && rule !== "manual") {
    const pool = sections.length
      ? sections.map((s) => s.score).filter((n): n is number => n !== undefined)
      : Object.values(items);
    if (pool.length) {
      if (rule === "sum") overall = round(pool.reduce((a, b) => a + b, 0));
      else if (rule === "average") overall = round(pool.reduce((a, b) => a + b, 0) / pool.length);
      else if (rule === "lowest") overall = Math.min(...pool);
      else if (rule === "highest") overall = Math.max(...pool);
      else if (rule === "pass_fail") overall = pool.every((s) => s > 0) ? 1 : 0;
      else if (rule === "value") overall = pool[0];
      else if (rule === "threshold")
        overall = thresholdScore(blueprint.overallScoring?.thresholds, round(pool.reduce((a, b) => a + b, 0)));
    }
  }
  return {
    items,
    sections,
    overall,
    overallLabel: thresholdLabel(blueprint.overallScoring?.thresholds, overall),
  };
}

/* ------------------------------------------------------------------ */
/* Reference ranges                                                    */
/* ------------------------------------------------------------------ */

export type ReferencePosition = "below" | "within" | "above";

export function referencePosition(
  item: AssessmentItemDef,
  value: number | undefined,
): ReferencePosition | undefined {
  const min = item.reference?.min;
  const max = item.reference?.max;
  if (value === undefined || (min == null && max == null)) return undefined;
  if (min != null && value < min) return "below";
  if (max != null && value > max) return "above";
  return "within";
}

export const REFERENCE_LABELS: Record<ReferencePosition, string> = {
  below: "Below reference range",
  within: "Within reference range",
  above: "Above reference range",
};

/* ------------------------------------------------------------------ */
/* Compatibility with the existing form + metric layer                 */
/* ------------------------------------------------------------------ */

const TYPE_TO_FIELD: Record<AssessmentItemType, FormFieldDef["type"]> = {
  number: "number",
  text: "text",
  notes: "textarea",
  yes_no: "radio",
  pass_fail: "radio",
  positive_negative: "radio",
  single_select: "select",
  multi_select: "multiselect",
  rating: "number",
  duration: "text",
  reps: "number",
  degrees: "number",
  percentage: "number",
  date: "date",
  bilateral: "text",
  image: "text",
  video: "text",
};

/** Keeps the legacy DynamicForm schema in sync so existing views still work. */
export function blueprintToSchema(
  blueprint: AssessmentBlueprint,
  meta: { templateKey: string; version: string; title: string },
): FormSchema {
  return {
    templateKey: meta.templateKey,
    version: meta.version,
    title: meta.title,
    surface: "secure",
    sections: blueprint.sections.map((s) => ({
      key: s.key,
      title: s.title,
      ...(s.description ? { description: s.description } : {}),
      fields: s.items.map((i) => {
        const choices = itemChoices(i);
        const field: FormFieldDef = {
          key: i.key,
          label: i.label,
          type: TYPE_TO_FIELD[i.type],
          ...(i.required ? { required: true } : {}),
          ...(choices.length ? { options: choices } : {}),
          ...(i.hint ? { hint: i.hint } : {}),
          ...(i.type === "notes" ? { full: true, rows: 4 } : {}),
        };
        return field;
      }),
    })),
  };
}

export function blueprintMetrics(blueprint: AssessmentBlueprint): AssessmentMetricDef[] {
  const metrics: AssessmentMetricDef[] = [];
  blueprint.sections.forEach((s) =>
    s.items.forEach((i) => {
      if (!i.track) return;
      if (!NUMERIC_ITEM_TYPES.includes(i.type) && i.type !== "bilateral") return;
      metrics.push({
        key: i.key,
        label: i.label,
        ...(i.unit ? { unit: i.unit } : {}),
        domain: i.domain ?? "clinical",
        direction:
          i.betterWhen === "higher"
            ? "higher_better"
            : i.betterWhen === "lower"
              ? "lower_better"
              : "neutral",
        valueType: i.scoring && i.scoring.rule !== "none" ? "score" : "numeric",
      });
    }),
  );
  return metrics;
}

/** Flattens recorded results into the legacy `values` payload for history views. */
export function resultsToValues(
  blueprint: AssessmentBlueprint,
  results: AssessmentItemResults,
): Record<string, FormValue> {
  const values: Record<string, FormValue> = {};
  blueprint.sections.forEach((s) =>
    s.items.forEach((i) => {
      if (!isItemVisible(i, results)) return;
      const r = results[i.key];
      if (!r) return;
      if (i.type === "bilateral") {
        const b = computeBilateral(i, r);
        if (b.left !== undefined) values[`${i.key}_left`] = String(b.left);
        if (b.right !== undefined) values[`${i.key}_right`] = String(b.right);
        if (b.score !== undefined) values[i.key] = String(b.score);
      } else if (r.value !== undefined && r.value !== "") {
        values[i.key] = r.value;
      }
      if (r.note?.trim()) values[`${i.key}_note`] = r.note.trim();
    }),
  );
  return values;
}
