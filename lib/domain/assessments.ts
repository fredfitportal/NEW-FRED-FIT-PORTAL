/**
 * ASSESSMENT ENGINE — operations layer.
 *
 * Every write goes through `mutate()` so the demo store persists and the UI
 * re-renders. Nothing here makes a clinical decision: statuses are derived from
 * dates and completion, and all interpretation is practitioner-entered text.
 */

import {
  CADENCE_DAYS,
  blueprintMetrics,
  blueprintToSchema,
  computeScores,
  resultsToValues,
  type AssessmentBlueprint,
  type AssessmentItemResults,
  type AssessmentMedia,
  type ReassessmentCadence,
  type SectionScore,
} from "./assessment-blueprint";
import type { FormSchema, FormValue } from "./form-schema";
import { getDataset, mutate, nextId, nowIso } from "./store";
import type { ID, ISODate } from "./types";
import {
  type AssessmentAmendment,
  type AssessmentAssignment,
  type CompletionWorkflowStatus,
  type TemplateLifecycle,
  type AssessmentAssignmentStatus,
  type AssessmentMetricDef,
  type AssessmentPurpose,
  type AssessmentTemplate,
  type AssessmentTemplateVersion,
  type CompletedAssessment,
  type MetricDomain,
  type PlacementOutcome,
  type PlacementRecommendation,
  type QuarterlyCycle,
  type QuarterlyCycleStatus,
  type ResultsReview,
} from "./assessment-types";

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

export const REASSESSMENT_INTERVAL_DAYS = 90;
export const DUE_SOON_WINDOW_DAYS = 21;

export function todayIso(): ISODate {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysUntil(date?: ISODate | null, from: ISODate = todayIso()): number | null {
  if (!date) return null;
  const a = Date.parse(`${from}T00:00:00.000Z`);
  const b = Date.parse(`${date}T00:00:00.000Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

function audit(id: string) {
  return { id, createdAt: nowIso(), updatedAt: nowIso(), archivedAt: null };
}

/* ------------------------------------------------------------------ */
/* Template library                                                    */
/* ------------------------------------------------------------------ */

export function listTemplates(opts: { includeInactive?: boolean } = {}): AssessmentTemplate[] {
  return getDataset()
    .assessmentTemplates.filter((t) => opts.includeInactive || t.isActive)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getTemplate(id?: ID | null): AssessmentTemplate | undefined {
  return id ? getDataset().assessmentTemplates.find((t) => t.id === id) : undefined;
}

export function templateByKey(key: string) {
  return getDataset().assessmentTemplates.find((t) => t.key === key);
}

export function templateVersion(
  templateId: ID,
  version?: number,
): AssessmentTemplateVersion | undefined {
  const versions = getDataset().assessmentTemplateVersions.filter((v) => v.templateId === templateId);
  if (version != null) return versions.find((v) => v.version === version);
  return versions.sort((a, b) => b.version - a.version)[0];
}

export function templateName(templateId?: ID | null) {
  return getTemplate(templateId)?.name ?? "Assessment";
}

/** Leadership-only: create a template with its first version. */
export function createTemplate(input: {
  name: string;
  category: string;
  description: string;
  performRoleIds: ID[];
  viewRoleIds: ID[];
  reassessmentDefault: boolean;
  /** Optional custom form definition. Falls back to a simple default. */
  sections?: FormSchema["sections"];
  metrics?: AssessmentMetricDef[];
  /** Full universal-engine definition, when built in the template builder. */
  blueprint?: AssessmentBlueprint;
  lifecycle?: TemplateLifecycle;
  reassessmentCadence?: ReassessmentCadence;
  reassessmentIntervalDays?: number | null;
}) {
  return mutate((data) => {
    const id = nextId("atpl");
    const lifecycle = input.lifecycle ?? "active";
    const template: AssessmentTemplate = {
      ...audit(id),
      key: input.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
      name: input.name,
      category: input.category,
      description: input.description,
      isActive: lifecycle === "active",
      currentVersion: 1,
      performRoleIds: input.performRoleIds,
      viewRoleIds: input.viewRoleIds,
      reassessmentDefault: input.reassessmentDefault,
      lifecycle,
      reassessmentCadence: input.reassessmentCadence ?? "quarterly",
      reassessmentIntervalDays: input.reassessmentIntervalDays ?? null,
    };
    data.assessmentTemplates.push(template);
    data.assessmentTemplateVersions.push({
      ...audit(nextId("atplv")),
      templateId: id,
      version: 1,
      publishedAt: nowIso(),
      ...(input.blueprint ? { blueprint: input.blueprint } : {}),
      schema: {
        templateKey: template.key,
        version: "1",
        title: input.name,
        surface: "secure",
        sections: input.sections?.length
          ? input.sections
          : [
              {
                key: "findings",
                title: "Findings",
                fields: [
                  { key: "summary_value", label: "Primary measure", type: "number" },
                  { key: "observations", label: "Practitioner observations", type: "textarea", full: true, rows: 4 },
                ],
              },
            ],
      },
      metrics: input.metrics
        ? input.metrics
        : [
            {
              key: "summary_value",
              label: "Primary measure",
              domain: "clinical",
              direction: "neutral",
              valueType: "numeric",
            },
          ],
    });
    return template;
  });
}

export function updateTemplate(id: ID, patch: Partial<AssessmentTemplate>) {
  return mutate((data) => {
    const t = data.assessmentTemplates.find((x) => x.id === id);
    if (!t) return undefined;
    Object.assign(t, patch, { updatedAt: nowIso() });
    return t;
  });
}

/**
 * Publishes a new version. Completed work keeps pointing at the old version,
 * so historical results are never rewritten.
 */
export function publishTemplateVersion(
  templateId: ID,
  version: Omit<AssessmentTemplateVersion, "id" | "createdAt" | "updatedAt" | "archivedAt" | "templateId" | "version" | "publishedAt">,
  changeNote?: string,
) {
  return mutate((data) => {
    const t = data.assessmentTemplates.find((x) => x.id === templateId);
    if (!t) return undefined;
    const next = t.currentVersion + 1;
    const record: AssessmentTemplateVersion = {
      ...audit(nextId("atplv")),
      templateId,
      version: next,
      publishedAt: nowIso(),
      schema: { ...version.schema, version: String(next) },
      metrics: version.metrics,
      ...(changeNote ? { changeNote } : {}),
    };
    data.assessmentTemplateVersions.push(record);
    t.currentVersion = next;
    t.updatedAt = nowIso();
    return record;
  });
}

/**
 * Saves an edited blueprint as a NEW version and updates the template header.
 * Completed assessments keep their own version, so history never changes.
 */
export function saveTemplateBlueprintVersion(
  templateId: ID,
  input: {
    name: string;
    category: string;
    description: string;
    performRoleIds: ID[];
    viewRoleIds: ID[];
    reassessmentDefault: boolean;
    reassessmentCadence: ReassessmentCadence;
    reassessmentIntervalDays?: number | null;
    lifecycle?: TemplateLifecycle;
    blueprint: AssessmentBlueprint;
    changeNote?: string;
  },
) {
  return mutate((data) => {
    const t = data.assessmentTemplates.find((x) => x.id === templateId);
    if (!t) return undefined;
    const next = t.currentVersion + 1;
    const record: AssessmentTemplateVersion = {
      ...audit(nextId("atplv")),
      templateId,
      version: next,
      publishedAt: nowIso(),
      blueprint: input.blueprint,
      schema: blueprintToSchema(input.blueprint, {
        templateKey: t.key,
        version: String(next),
        title: input.name,
      }),
      metrics: blueprintMetrics(input.blueprint),
      ...(input.changeNote ? { changeNote: input.changeNote } : {}),
    };
    data.assessmentTemplateVersions.push(record);
    t.currentVersion = next;
    t.name = input.name;
    t.category = input.category;
    t.description = input.description;
    t.performRoleIds = input.performRoleIds;
    t.viewRoleIds = input.viewRoleIds;
    t.reassessmentDefault = input.reassessmentDefault;
    t.reassessmentCadence = input.reassessmentCadence;
    t.reassessmentIntervalDays = input.reassessmentIntervalDays ?? null;
    if (input.lifecycle) {
      t.lifecycle = input.lifecycle;
      t.isActive = input.lifecycle === "active";
    }
    t.updatedAt = nowIso();
    return record;
  });
}

export function setTemplateLifecycle(templateId: ID, lifecycle: TemplateLifecycle) {
  return updateTemplate(templateId, { lifecycle, isActive: lifecycle === "active" });
}

/** Copies a template and its current version into a new Draft template. */
export function duplicateTemplate(templateId: ID) {
  const source = getTemplate(templateId);
  const version = source ? templateVersion(templateId, source.currentVersion) : undefined;
  if (!source || !version) return undefined;
  return mutate((data) => {
    const id = nextId("atpl");
    const name = `${source.name} (copy)`;
    const copy: AssessmentTemplate = {
      ...audit(id),
      key: `${source.key}_copy_${id}`,
      name,
      category: source.category,
      description: source.description,
      isActive: false,
      currentVersion: 1,
      performRoleIds: [...source.performRoleIds],
      viewRoleIds: [...source.viewRoleIds],
      reassessmentDefault: source.reassessmentDefault,
      lifecycle: "draft",
      reassessmentCadence: source.reassessmentCadence ?? "quarterly",
      reassessmentIntervalDays: source.reassessmentIntervalDays ?? null,
    };
    data.assessmentTemplates.push(copy);
    data.assessmentTemplateVersions.push({
      ...audit(nextId("atplv")),
      templateId: id,
      version: 1,
      publishedAt: nowIso(),
      ...(version.blueprint ? { blueprint: version.blueprint } : {}),
      schema: { ...version.schema, templateKey: copy.key, version: "1", title: name },
      metrics: version.metrics.map((m) => ({ ...m })),
    });
    return copy;
  });
}

/** Days between reassessments for this template, or null when not routine. */
export function templateReassessmentDays(t: AssessmentTemplate): number | null {
  const cadence = t.reassessmentCadence ?? "quarterly";
  if (cadence === "none") return null;
  if (cadence === "custom") return t.reassessmentIntervalDays ?? REASSESSMENT_INTERVAL_DAYS;
  return CADENCE_DAYS[cadence];
}

/* ------------------------------------------------------------------ */
/* Permissions                                                         */
/* ------------------------------------------------------------------ */

export function canViewTemplate(roleId: ID, template: AssessmentTemplate) {
  return template.viewRoleIds.includes(roleId);
}

export function canPerformTemplate(roleId: ID, template: AssessmentTemplate) {
  return template.performRoleIds.includes(roleId);
}

/* ------------------------------------------------------------------ */
/* Client assessment plan                                              */
/* ------------------------------------------------------------------ */

export function listAssignments(clientId?: ID): AssessmentAssignment[] {
  return getDataset()
    .assessmentAssignments.filter((a) => !clientId || a.clientId === clientId)
    .slice()
    .sort((a, b) => (a.dueDate ?? a.assignedDate).localeCompare(b.dueDate ?? b.assignedDate));
}

export function getAssignment(id?: ID | null) {
  return id ? getDataset().assessmentAssignments.find((a) => a.id === id) : undefined;
}

export function assignAssessment(input: {
  clientId: ID;
  templateId: ID;
  purpose?: AssessmentPurpose;
  cycleId?: ID | null;
  requirement?: "required" | "optional";
  practitionerStaffId?: ID | null;
  dueDate?: ISODate | null;
  reason?: string;
}) {
  const template = getTemplate(input.templateId);
  return mutate((data) => {
    const record: AssessmentAssignment = {
      ...audit(nextId("aasg")),
      clientId: input.clientId,
      templateId: input.templateId,
      templateVersion: template?.currentVersion ?? 1,
      purpose: input.purpose ?? "ad_hoc",
      cycleId: input.cycleId ?? null,
      requirement: input.requirement ?? "required",
      practitionerStaffId: input.practitionerStaffId ?? null,
      assignedDate: todayIso(),
      dueDate: input.dueDate ?? null,
      status: "not_started",
      ...(input.reason ? { reason: input.reason } : {}),
    };
    data.assessmentAssignments.push(record);
    return record;
  });
}

/** Only removable before any work has been recorded. */
export function removeAssignment(id: ID): { removed: boolean; reason?: string } {
  const existing = getAssignment(id);
  if (!existing) return { removed: false, reason: "Assignment not found." };
  if (existing.status === "completed" || existing.status === "finalized") {
    return { removed: false, reason: "Completed assessments stay in the client's history." };
  }
  mutate((data) => {
    data.assessmentAssignments = data.assessmentAssignments.filter((a) => a.id !== id);
  });
  return { removed: true };
}

export function updateAssignment(id: ID, patch: Partial<AssessmentAssignment>) {
  return mutate((data) => {
    const a = data.assessmentAssignments.find((x) => x.id === id);
    if (!a) return undefined;
    Object.assign(a, patch, { updatedAt: nowIso() });
    return a;
  });
}

/** Derived status — "overdue" is never stored, always calculated. */
export function effectiveStatus(
  a: AssessmentAssignment,
  today: ISODate = todayIso(),
): AssessmentAssignmentStatus | "overdue" {
  if (a.status === "completed" || a.status === "finalized") return a.status;
  if (a.dueDate && a.dueDate < today) return "overdue";
  return a.status;
}

export function isAssignmentDone(a: AssessmentAssignment) {
  return a.status === "completed" || a.status === "finalized";
}

/* ------------------------------------------------------------------ */
/* Completing assessments                                              */
/* ------------------------------------------------------------------ */

function extractMetrics(templateId: ID, version: number, values: Record<string, FormValue>) {
  const defs = templateVersion(templateId, version)?.metrics ?? [];
  const metrics: Record<string, number> = {};
  defs.forEach((d) => {
    const raw = values[d.key];
    const num = typeof raw === "string" ? Number(raw) : typeof raw === "boolean" ? null : null;
    if (num != null && Number.isFinite(num) && String(raw).trim() !== "") metrics[d.key] = num;
  });
  return metrics;
}

export function completeAssessment(input: {
  assignmentId?: ID | null;
  clientId: ID;
  templateId: ID;
  practitionerStaffId: ID;
  performedDate?: ISODate;
  values: Record<string, FormValue>;
  summary?: string;
  recommendations?: string;
  finalize?: boolean;
  /** Universal-engine capture. */
  itemResults?: AssessmentItemResults;
  locationId?: ID | null;
  sectionNotes?: Record<string, string>;
  assessmentNote?: string;
  closing?: Record<string, string>;
  outcome?: string;
  reassessmentRecommendation?: string;
  media?: AssessmentMedia[];
  workflowStatus?: CompletionWorkflowStatus;
}) {
  const assignment = getAssignment(input.assignmentId);
  const version = assignment?.templateVersion ?? getTemplate(input.templateId)?.currentVersion ?? 1;
  const performedDate = input.performedDate ?? todayIso();
  const blueprint = templateVersion(input.templateId, version)?.blueprint;
  const scores =
    blueprint && input.itemResults ? computeScores(blueprint, input.itemResults) : undefined;
  const values =
    blueprint && input.itemResults
      ? { ...resultsToValues(blueprint, input.itemResults), ...input.values }
      : input.values;

  const record = mutate((data) => {
    const created: CompletedAssessment = {
      ...audit(nextId("acmp")),
      clientId: input.clientId,
      templateId: input.templateId,
      templateVersion: version,
      assignmentId: assignment?.id ?? null,
      cycleId: assignment?.cycleId ?? null,
      performedDate,
      practitionerStaffId: input.practitionerStaffId,
      values,
      metrics: {
        ...extractMetrics(input.templateId, version, values),
        ...(scores ? scores.items : {}),
      },
      ...(input.summary ? { summary: input.summary } : {}),
      ...(input.recommendations ? { recommendations: input.recommendations } : {}),
      status: input.finalize ? "finalized" : "completed",
      finalizedByStaffId: input.finalize ? input.practitionerStaffId : null,
      finalizedAt: input.finalize ? nowIso() : null,
      workflowStatus: input.workflowStatus ?? (input.finalize ? "reviewed" : "completed"),
      locationId: input.locationId ?? null,
      ...(input.itemResults ? { itemResults: input.itemResults } : {}),
      ...(scores?.sections.length ? { sectionScores: scores.sections as SectionScore[] } : {}),
      overallScore: scores?.overall ?? null,
      overallScoreLabel: scores?.overallLabel ?? null,
      ...(input.sectionNotes ? { sectionNotes: input.sectionNotes } : {}),
      ...(input.assessmentNote ? { assessmentNote: input.assessmentNote } : {}),
      ...(input.closing ? { closing: input.closing } : {}),
      ...(input.outcome ? { outcome: input.outcome } : {}),
      ...(input.reassessmentRecommendation
        ? { reassessmentRecommendation: input.reassessmentRecommendation }
        : {}),
      ...(input.media?.length ? { media: input.media } : {}),
      amendments: [],
    };
    data.completedAssessments.push(created);
    if (assignment) {
      const a = data.assessmentAssignments.find((x) => x.id === assignment.id);
      if (a) {
        a.status = input.finalize ? "finalized" : "completed";
        a.completedDate = performedDate;
        a.finalizedDate = input.finalize ? performedDate : null;
        a.completedAssessmentId = created.id;
        a.updatedAt = nowIso();
      }
    }
    return created;
  });

  if (assignment?.cycleId) syncCycleReview(assignment.cycleId);
  return record;
}

export function finalizeAssessment(id: ID, staffId: ID) {
  return mutate((data) => {
    const c = data.completedAssessments.find((x) => x.id === id);
    if (!c) return undefined;
    c.status = "finalized";
    c.finalizedByStaffId = staffId;
    c.finalizedAt = nowIso();
    c.updatedAt = nowIso();
    const a = data.assessmentAssignments.find((x) => x.id === c.assignmentId);
    if (a) {
      a.status = "finalized";
      a.finalizedDate = todayIso();
      a.updatedAt = nowIso();
    }
    c.workflowStatus = "reviewed";
    return c;
  });
}

/**
 * Corrections never silently replace a record: the change is applied and an
 * amendment entry documenting who / when / why is appended.
 */
export function amendCompletedAssessment(
  id: ID,
  staffId: ID,
  reason: string,
  patch: {
    itemResults?: AssessmentItemResults;
    sectionNotes?: Record<string, string>;
    assessmentNote?: string;
    closing?: Record<string, string>;
    outcome?: string;
    recommendations?: string;
    performedDate?: ISODate;
  },
) {
  return mutate((data) => {
    const c = data.completedAssessments.find((x) => x.id === id);
    if (!c) return undefined;
    const changes: string[] = [];
    const blueprint = templateVersion(c.templateId, c.templateVersion)?.blueprint;

    if (patch.itemResults) {
      changes.push("Responses corrected");
      c.itemResults = patch.itemResults;
      if (blueprint) {
        const scores = computeScores(blueprint, patch.itemResults);
        c.values = { ...resultsToValues(blueprint, patch.itemResults) };
        c.metrics = {
          ...extractMetrics(c.templateId, c.templateVersion, c.values),
          ...scores.items,
        };
        c.sectionScores = scores.sections;
        c.overallScore = scores.overall ?? null;
        c.overallScoreLabel = scores.overallLabel ?? null;
      }
    }
    if (patch.sectionNotes) {
      changes.push("Section notes updated");
      c.sectionNotes = patch.sectionNotes;
    }
    if (patch.assessmentNote !== undefined) {
      changes.push("Assessment note updated");
      c.assessmentNote = patch.assessmentNote;
    }
    if (patch.closing) {
      changes.push("Closing documentation updated");
      c.closing = patch.closing;
    }
    if (patch.outcome !== undefined) {
      changes.push("Outcome updated");
      c.outcome = patch.outcome;
    }
    if (patch.recommendations !== undefined) {
      changes.push("Recommendations updated");
      c.recommendations = patch.recommendations;
    }
    if (patch.performedDate) {
      changes.push(`Date changed to ${patch.performedDate}`);
      c.performedDate = patch.performedDate;
    }

    const amendment: AssessmentAmendment = {
      at: nowIso(),
      byStaffId: staffId,
      reason,
      changes,
    };
    c.amendments = [...(c.amendments ?? []), amendment];
    c.updatedAt = nowIso();
    return c;
  });
}

export function listCompleted(clientId?: ID): CompletedAssessment[] {
  return getDataset()
    .completedAssessments.filter((c) => !clientId || c.clientId === clientId)
    .slice()
    .sort((a, b) => b.performedDate.localeCompare(a.performedDate));
}

export function getCompleted(id?: ID | null) {
  return id ? getDataset().completedAssessments.find((c) => c.id === id) : undefined;
}

/* ------------------------------------------------------------------ */
/* Quarterly reassessment cycles                                       */
/* ------------------------------------------------------------------ */

export function listCycles(clientId?: ID): QuarterlyCycle[] {
  return getDataset()
    .quarterlyCycles.filter((c) => !clientId || c.clientId === clientId)
    .slice()
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
}

export function currentCycle(clientId: ID): QuarterlyCycle | undefined {
  return listCycles(clientId).find((c) => c.closedStatus !== "complete");
}

export function lastCompletedCycle(clientId: ID) {
  return listCycles(clientId).find((c) => c.closedStatus === "complete");
}

export function cycleAssignments(cycleId: ID) {
  return getDataset().assessmentAssignments.filter((a) => a.cycleId === cycleId);
}

export function reviewForCycle(cycleId: ID) {
  return getDataset().resultsReviews.find((r) => r.cycleId === cycleId);
}

/** Starts a reassessment cycle with an individualized template list. */
export function startCycle(input: {
  clientId: ID;
  dueDate: ISODate;
  templateIds: ID[];
  practitionerStaffId?: ID | null;
}) {
  const previous = listCycles(input.clientId);
  const cycle = mutate((data) => {
    const created: QuarterlyCycle = {
      ...audit(nextId("acyc")),
      clientId: input.clientId,
      cycleNumber: previous.length + 1,
      dueDate: input.dueDate,
      closedStatus: null,
    };
    data.quarterlyCycles.push(created);
    return created;
  });
  input.templateIds.forEach((templateId) =>
    assignAssessment({
      clientId: input.clientId,
      templateId,
      purpose: "reassessment",
      cycleId: cycle.id,
      dueDate: input.dueDate,
      practitionerStaffId: input.practitionerStaffId ?? null,
    }),
  );
  return cycle;
}

/** Creates the "results review needed" record once required work is done. */
export function syncCycleReview(cycleId: ID) {
  const assignments = cycleAssignments(cycleId);
  const required = assignments.filter((a) => a.requirement === "required");
  const allDone = required.length > 0 && required.every(isAssignmentDone);
  const existing = reviewForCycle(cycleId);
  if (!allDone || existing) return existing;
  const cycle = getDataset().quarterlyCycles.find((c) => c.id === cycleId);
  if (!cycle) return undefined;
  return mutate((data) => {
    const review: ResultsReview = {
      ...audit(nextId("arev")),
      cycleId,
      clientId: cycle.clientId,
      status: "needed",
      reviewerStaffId: null,
    };
    data.resultsReviews.push(review);
    return review;
  });
}

export function cycleStatus(cycle: QuarterlyCycle, today: ISODate = todayIso()): QuarterlyCycleStatus {
  if (cycle.closedStatus === "complete") return "complete";
  const review = reviewForCycle(cycle.id);
  if (review?.status === "scheduled") return "results_review_scheduled";
  if (review?.status === "needed") return "results_review_needed";

  const assignments = cycleAssignments(cycle.id);
  const required = assignments.filter((a) => a.requirement === "required");
  const done = required.filter(isAssignmentDone).length;
  if (required.length > 0 && done === required.length) return "assessments_completed";
  if (done > 0) return "partially_completed";
  if (assignments.some((a) => a.status === "scheduled" || a.status === "in_progress")) return "scheduled";

  const days = daysUntil(cycle.dueDate, today);
  if (days == null) return "upcoming";
  if (days < 0) return "overdue";
  if (days === 0) return "due";
  if (days <= DUE_SOON_WINDOW_DAYS) return "due_soon";
  return "upcoming";
}

/* ------------------------------------------------------------------ */
/* Quarterly Results Review                                            */
/* ------------------------------------------------------------------ */

export function assignReviewer(reviewId: ID, staffId: ID) {
  return mutate((data) => {
    const r = data.resultsReviews.find((x) => x.id === reviewId);
    if (!r) return undefined;
    r.reviewerStaffId = staffId;
    r.updatedAt = nowIso();
    return r;
  });
}

export function scheduleReview(reviewId: ID, date: ISODate, time: string, staffId?: ID | null) {
  return mutate((data) => {
    const r = data.resultsReviews.find((x) => x.id === reviewId);
    if (!r) return undefined;
    r.scheduledDate = date;
    r.scheduledTime = time;
    if (staffId) r.reviewerStaffId = staffId;
    r.status = "scheduled";
    r.updatedAt = nowIso();
    return r;
  });
}

/**
 * Completing the review closes the quarterly cycle, records the practitioner's
 * documentation and establishes the next reassessment date.
 */
export function completeReview(
  reviewId: ID,
  input: {
    servicesRemainAppropriate: "yes" | "with_changes" | "no";
    recommendations: string;
    changesToProgram?: string;
    nextSteps?: string;
    completedDate?: ISODate;
    carryForwardTemplates?: boolean;
  },
) {
  const review = getDataset().resultsReviews.find((r) => r.id === reviewId);
  if (!review) return undefined;
  const completedDate = input.completedDate ?? todayIso();
  const nextDue = addDays(completedDate, REASSESSMENT_INTERVAL_DAYS);

  mutate((data) => {
    const r = data.resultsReviews.find((x) => x.id === reviewId)!;
    r.status = "completed";
    r.completedDate = completedDate;
    r.servicesRemainAppropriate = input.servicesRemainAppropriate;
    r.recommendations = input.recommendations;
    if (input.changesToProgram) r.changesToProgram = input.changesToProgram;
    if (input.nextSteps) r.nextSteps = input.nextSteps;
    r.updatedAt = nowIso();

    const c = data.quarterlyCycles.find((x) => x.id === r.cycleId);
    if (c) {
      c.closedStatus = "complete";
      c.completedDate = completedDate;
      c.nextDueDate = nextDue;
      c.updatedAt = nowIso();
    }
  });

  if (input.carryForwardTemplates !== false) {
    const templateIds = [
      ...new Set(cycleAssignments(review.cycleId).map((a) => a.templateId)),
    ];
    if (templateIds.length) {
      startCycle({ clientId: review.clientId, dueDate: nextDue, templateIds });
    }
  }
  return nextDue;
}

export function listReviews(clientId?: ID) {
  return getDataset().resultsReviews.filter((r) => !clientId || r.clientId === clientId);
}

/* ------------------------------------------------------------------ */
/* Service placement documentation                                     */
/* ------------------------------------------------------------------ */

export function documentPlacement(input: {
  clientId: ID;
  practitionerStaffId: ID;
  outcome: PlacementOutcome;
  requestedServiceId?: ID | null;
  recommendedServiceId?: ID | null;
  rationale: string;
  restrictions?: string;
  additionalAssessmentRequired?: boolean;
  followUpRequired?: boolean;
  onboardingCaseId?: ID | null;
}) {
  return mutate((data) => {
    const record: PlacementRecommendation = {
      ...audit(nextId("aplc")),
      clientId: input.clientId,
      practitionerStaffId: input.practitionerStaffId,
      outcome: input.outcome,
      requestedServiceId: input.requestedServiceId ?? null,
      recommendedServiceId: input.recommendedServiceId ?? null,
      recommendationDate: todayIso(),
      rationale: input.rationale,
      ...(input.restrictions ? { restrictions: input.restrictions } : {}),
      additionalAssessmentRequired: input.additionalAssessmentRequired ?? false,
      followUpRequired: input.followUpRequired ?? false,
      onboardingCaseId: input.onboardingCaseId ?? null,
    };
    data.placementRecommendations.push(record);
    return record;
  });
}

export function listPlacements(clientId?: ID) {
  return getDataset()
    .placementRecommendations.filter((p) => !clientId || p.clientId === clientId)
    .slice()
    .sort((a, b) => b.recommendationDate.localeCompare(a.recommendationDate));
}

/* ------------------------------------------------------------------ */
/* Longitudinal comparison                                             */
/* ------------------------------------------------------------------ */

export interface MetricPoint {
  date: ISODate;
  value: number;
  completedId: ID;
}

export interface MetricSeries {
  key: string;
  label: string;
  unit?: string | undefined;
  domain: MetricDomain;
  direction: "higher_better" | "lower_better" | "neutral";
  points: MetricPoint[];
}

/**
 * Series are grouped per template, so unrelated assessments are never merged
 * into a single score. Only metrics from the same template are compared.
 */
export function metricSeriesFor(clientId: ID, templateId: ID): MetricSeries[] {
  const records = listCompleted(clientId)
    .filter((c) => c.templateId === templateId)
    .slice()
    .sort((a, b) => a.performedDate.localeCompare(b.performedDate));
  if (!records.length) return [];
  const defs = new Map<string, MetricSeries>();
  records.forEach((rec) => {
    const version = templateVersion(templateId, rec.templateVersion);
    version?.metrics.forEach((m) => {
      const value = rec.metrics[m.key];
      if (value == null) return;
      const series =
        defs.get(m.key) ??
        ({
          key: m.key,
          label: m.label,
          unit: m.unit,
          domain: m.domain,
          direction: m.direction,
          points: [],
        } satisfies MetricSeries);
      series.points.push({ date: rec.performedDate, value, completedId: rec.id });
      defs.set(m.key, series);
    });
  });
  return [...defs.values()];
}

export interface ComparisonRow {
  label: string;
  unit?: string | undefined;
  domain: MetricDomain;
  baseline?: number | undefined;
  previous?: number | undefined;
  current?: number | undefined;
  change?: number | undefined;
  /** Only meaningful when the reference value is non-zero. */
  percentChange?: number | undefined;
  trend?: "up" | "down" | "flat" | undefined;
  improved?: boolean | undefined;
}

export function comparisonRows(clientId: ID, templateId: ID): ComparisonRow[] {
  return metricSeriesFor(clientId, templateId).map((s) => {
    const baseline = s.points[0]?.value;
    const current = s.points[s.points.length - 1]?.value;
    const previous = s.points.length > 2 ? s.points[s.points.length - 2]?.value : undefined;
    const reference = previous ?? baseline;
    const change =
      current != null && reference != null && s.points.length > 1
        ? Math.round((current - reference) * 100) / 100
        : undefined;
    const improved =
      change == null || s.direction === "neutral"
        ? undefined
        : s.direction === "higher_better"
          ? change > 0
          : change < 0;
    const percentChange =
      change != null && reference != null && reference !== 0
        ? Math.round((change / Math.abs(reference)) * 1000) / 10
        : undefined;
    const trend = change == null ? undefined : change > 0 ? "up" : change < 0 ? "down" : "flat";
    return {
      label: s.label,
      unit: s.unit,
      domain: s.domain,
      baseline,
      previous,
      current,
      change,
      percentChange,
      trend,
      improved,
    };
  });
}

/** Templates that have at least two dated records for this client. */
export function comparableTemplates(clientId: ID) {
  const counts = new Map<ID, number>();
  listCompleted(clientId).forEach((c) => counts.set(c.templateId, (counts.get(c.templateId) ?? 0) + 1));
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .map(([templateId]) => getTemplate(templateId))
    .filter((t): t is AssessmentTemplate => Boolean(t));
}

/* ------------------------------------------------------------------ */
/* Reminders & leadership work queue                                   */
/* ------------------------------------------------------------------ */

export type ReminderKind =
  | "reassessment_due_soon"
  | "reassessment_due"
  | "reassessment_overdue"
  | "assessment_outstanding"
  | "results_review_needed"
  | "leadership_follow_up"
  | "upcoming_review"
  | "results_review_overdue";

export interface Reminder {
  kind: ReminderKind;
  label: string;
  clientId: ID;
  cycleId?: ID;
  dueDate?: ISODate | undefined;
  tone: "info" | "warning" | "critical";
}

export const REMINDER_LABELS: Record<ReminderKind, string> = {
  reassessment_due_soon: "Reassessment due soon",
  reassessment_due: "Reassessment due",
  reassessment_overdue: "Reassessment overdue",
  assessment_outstanding: "Assessment outstanding",
  results_review_needed: "Quarterly Results Review needed",
  leadership_follow_up: "Leadership follow-up required",
  upcoming_review: "Upcoming Results Review",
  results_review_overdue: "Results Review overdue",
};

export function reminders(clientId?: ID, today: ISODate = todayIso()): Reminder[] {
  const out: Reminder[] = [];
  const data = getDataset();

  data.quarterlyCycles
    .filter((c) => (!clientId || c.clientId === clientId) && c.closedStatus !== "complete")
    .forEach((cycle) => {
      const status = cycleStatus(cycle, today);
      const base = { clientId: cycle.clientId, cycleId: cycle.id, dueDate: cycle.dueDate };
      if (status === "due_soon")
        out.push({ ...base, kind: "reassessment_due_soon", label: REMINDER_LABELS.reassessment_due_soon, tone: "info" });
      if (status === "due")
        out.push({ ...base, kind: "reassessment_due", label: REMINDER_LABELS.reassessment_due, tone: "warning" });
      if (status === "overdue")
        out.push({ ...base, kind: "reassessment_overdue", label: REMINDER_LABELS.reassessment_overdue, tone: "critical" });

      const review = reviewForCycle(cycle.id);
      if (review?.status === "needed") {
        out.push({ ...base, kind: "results_review_needed", label: REMINDER_LABELS.results_review_needed, tone: "warning" });
        if (!review.reviewerStaffId || !review.scheduledDate) {
          out.push({ ...base, kind: "leadership_follow_up", label: REMINDER_LABELS.leadership_follow_up, tone: "critical" });
        }
      }
      if (review?.status === "scheduled" && review.scheduledDate) {
        const days = daysUntil(review.scheduledDate, today) ?? 0;
        if (days < 0) {
          out.push({ ...base, dueDate: review.scheduledDate, kind: "results_review_overdue", label: REMINDER_LABELS.results_review_overdue, tone: "critical" });
        } else if (days <= 7) {
          out.push({ ...base, dueDate: review.scheduledDate, kind: "upcoming_review", label: REMINDER_LABELS.upcoming_review, tone: "info" });
        }
      }
    });

  data.assessmentAssignments
    .filter((a) => (!clientId || a.clientId === clientId) && !isAssignmentDone(a))
    .forEach((a) => {
      if (a.requirement === "required") {
        const overdue = effectiveStatus(a, today) === "overdue";
        out.push({
          kind: "assessment_outstanding",
          label: `${REMINDER_LABELS.assessment_outstanding}: ${templateName(a.templateId)}`,
          clientId: a.clientId,
          ...(a.cycleId ? { cycleId: a.cycleId } : {}),
          dueDate: a.dueDate ?? undefined,
          tone: overdue ? "warning" : "info",
        });
      }
    });

  return out;
}

export interface QueueRow {
  clientId: ID;
  cycle?: QuarterlyCycle | undefined;
  status: QuarterlyCycleStatus;
  dueDate?: ISODate | undefined;
  requiredTotal: number;
  requiredDone: number;
  practitionerIds: ID[];
  review?: ResultsReview | undefined;
  nextDueDate?: ISODate | undefined;
}

export function reassessmentQueue(today: ISODate = todayIso()): QueueRow[] {
  return listCycles()
    .map((cycle) => {
      const assignments = cycleAssignments(cycle.id);
      const required = assignments.filter((a) => a.requirement === "required");
      return {
        clientId: cycle.clientId,
        cycle,
        status: cycleStatus(cycle, today),
        dueDate: cycle.dueDate,
        requiredTotal: required.length,
        requiredDone: required.filter(isAssignmentDone).length,
        practitionerIds: [
          ...new Set(assignments.map((a) => a.practitionerStaffId).filter((x): x is ID => Boolean(x))),
        ],
        review: reviewForCycle(cycle.id),
        nextDueDate: cycle.nextDueDate ?? undefined,
      } satisfies QueueRow;
    })
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
}
