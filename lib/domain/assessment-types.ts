/**
 * ASSESSMENT, REASSESSMENT & QUARTERLY RESULTS REVIEW — domain model.
 *
 * Deliberately separate from the legacy read-only `AssessmentType` /
 * `AssessmentInstance` records in `types.ts` (which stay untouched so existing
 * history keeps rendering). Everything here is provider-neutral data: a future
 * Postgres backend implements the same shapes without a UI rewrite.
 *
 * Design rules encoded here:
 *  - Templates are versioned; completed work stores the version it used, so
 *    editing a template never rewrites history.
 *  - Every client has an individual assigned plan — there is no global battery.
 *  - The portal documents PRACTITIONER decisions. It never derives a diagnosis
 *    or an automatic service placement.
 */

import type {
  AssessmentBlueprint,
  AssessmentItemResults,
  AssessmentMedia,
  ReassessmentCadence,
  SectionScore,
} from "./assessment-blueprint";
import type { FormSchema, FormValue } from "./form-schema";
import type { BaseRecord, ID, ISODate, ISODateTime } from "./types";

/** Metric families. Only metrics inside the same family are ever compared. */
export type MetricDomain =
  | "body_composition"
  | "movement"
  | "balance_fall_risk"
  | "gait"
  | "strength"
  | "mobility"
  | "nutrition"
  | "clinical"
  | "client_reported";

export const METRIC_DOMAIN_LABELS: Record<MetricDomain, string> = {
  body_composition: "Body composition",
  movement: "Functional movement",
  balance_fall_risk: "Balance & fall risk",
  gait: "Gait",
  strength: "Strength",
  mobility: "Mobility",
  nutrition: "Nutrition",
  clinical: "Medical Exercise / clinical",
  client_reported: "Client-reported",
};

export interface AssessmentMetricDef {
  key: string;
  label: string;
  unit?: string;
  domain: MetricDomain;
  /** Interpretation hint for change display only — never a clinical judgement. */
  direction: "higher_better" | "lower_better" | "neutral";
  valueType: "numeric" | "score";
}

/** A template is the reusable definition. Its content lives in versions. */
export interface AssessmentTemplate extends BaseRecord {
  key: string;
  name: string;
  category: string;
  description: string;
  isActive: boolean;
  currentVersion: number;
  /** Roles allowed to perform / edit this assessment type. */
  performRoleIds: ID[];
  /** Roles allowed to view completed results of this assessment type. */
  viewRoleIds: ID[];
  /** Included in a client's default quarterly reassessment suggestion. */
  reassessmentDefault: boolean;
  /** Draft templates are not assignable; archived ones stay readable forever. */
  lifecycle?: TemplateLifecycle;
  reassessmentCadence?: ReassessmentCadence;
  /** Only used when the cadence is "custom". */
  reassessmentIntervalDays?: number | null;
}

export type TemplateLifecycle = "draft" | "active" | "archived";

export const TEMPLATE_LIFECYCLE_LABELS: Record<TemplateLifecycle, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};

export interface AssessmentTemplateVersion extends BaseRecord {
  templateId: ID;
  version: number;
  schema: FormSchema;
  metrics: AssessmentMetricDef[];
  publishedAt: ISODateTime;
  changeNote?: string;
  /**
   * Full configurable definition (answer types, bilateral, scoring, reference
   * ranges, conditions, media, closing fields, outcomes). Frozen with the
   * version — editing the template publishes a new version instead.
   */
  blueprint?: AssessmentBlueprint;
}

export type AssessmentAssignmentStatus =
  | "not_started"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "finalized";

export type AssessmentPurpose = "onboarding" | "reassessment" | "ad_hoc";

/** One row of a client's individual assessment plan. */
export interface AssessmentAssignment extends BaseRecord {
  clientId: ID;
  templateId: ID;
  templateVersion: number;
  purpose: AssessmentPurpose;
  cycleId?: ID | null;
  requirement: "required" | "optional";
  practitionerStaffId?: ID | null;
  assignedDate: ISODate;
  dueDate?: ISODate | null;
  reason?: string;
  status: AssessmentAssignmentStatus;
  appointmentId?: ID | null;
  appointmentDate?: ISODate | null;
  completedDate?: ISODate | null;
  finalizedDate?: ISODate | null;
  completedAssessmentId?: ID | null;
}

/** An immutable dated record of work actually performed. */
export interface CompletedAssessment extends BaseRecord {
  clientId: ID;
  templateId: ID;
  templateVersion: number;
  assignmentId?: ID | null;
  cycleId?: ID | null;
  performedDate: ISODate;
  practitionerStaffId: ID;
  values: Record<string, FormValue>;
  /** Structured, comparable numbers pulled out of `values`. */
  metrics: Record<string, number>;
  summary?: string;
  /** Practitioner observations / recommendations — free text, never derived. */
  recommendations?: string;
  status: "completed" | "finalized";
  finalizedByStaffId?: ID | null;
  finalizedAt?: ISODateTime | null;
  /** Workflow state of the record itself. */
  workflowStatus?: CompletionWorkflowStatus;
  locationId?: ID | null;
  /** Full per-item capture: values, left/right, manual scores, notes, media. */
  itemResults?: AssessmentItemResults;
  /** Calculated section scores frozen at completion time. */
  sectionScores?: SectionScore[];
  overallScore?: number | null;
  overallScoreLabel?: string | null;
  /** Section-level professional notes, keyed by section. */
  sectionNotes?: Record<string, string>;
  assessmentNote?: string;
  /** Structured closing fields the template enabled. */
  closing?: Record<string, string>;
  /** Practitioner-selected documentation outcome. Never derived. */
  outcome?: string;
  reassessmentRecommendation?: string;
  media?: AssessmentMedia[];
  /** Corrections are appended, never silently replacing the original record. */
  amendments?: AssessmentAmendment[];
}

export type CompletionWorkflowStatus = "draft" | "in_progress" | "completed" | "reviewed";

export const COMPLETION_WORKFLOW_LABELS: Record<CompletionWorkflowStatus, string> = {
  draft: "Draft",
  in_progress: "In progress",
  completed: "Completed",
  reviewed: "Reviewed",
};

export interface AssessmentAmendment {
  at: ISODateTime;
  byStaffId: ID;
  reason: string;
  /** Human-readable description of what changed. */
  changes: string[];
}

export type QuarterlyCycleStatus =
  | "upcoming"
  | "due_soon"
  | "due"
  | "scheduled"
  | "partially_completed"
  | "assessments_completed"
  | "results_review_needed"
  | "results_review_scheduled"
  | "complete"
  | "overdue";

export interface QuarterlyCycle extends BaseRecord {
  clientId: ID;
  cycleNumber: number;
  dueDate: ISODate;
  /** Manual override; otherwise the status is derived from the plan. */
  closedStatus?: "complete" | null;
  completedDate?: ISODate | null;
  nextDueDate?: ISODate | null;
  notes?: string;
}

export interface ResultsReview extends BaseRecord {
  cycleId: ID;
  clientId: ID;
  reviewerStaffId?: ID | null;
  status: "needed" | "scheduled" | "completed";
  scheduledDate?: ISODate | null;
  scheduledTime?: string | null;
  appointmentId?: ID | null;
  completedDate?: ISODate | null;
  servicesRemainAppropriate?: "yes" | "with_changes" | "no" | null;
  recommendations?: string;
  changesToProgram?: string;
  nextSteps?: string;
}

export type PlacementOutcome =
  | "appropriate_as_requested"
  | "appropriate_with_modifications"
  | "recommend_other_service"
  | "additional_assessment_required"
  | "outside_referral_recommended";

export const PLACEMENT_OUTCOME_LABELS: Record<PlacementOutcome, string> = {
  appropriate_as_requested: "Appropriate for requested service",
  appropriate_with_modifications: "Appropriate with modifications",
  recommend_other_service: "Recommend another FFS service",
  additional_assessment_required: "Additional assessment required before placement",
  outside_referral_recommended: "Outside healthcare referral / clearance recommended",
};

export interface PlacementRecommendation extends BaseRecord {
  clientId: ID;
  requestedServiceId?: ID | null;
  recommendedServiceId?: ID | null;
  outcome: PlacementOutcome;
  recommendationDate: ISODate;
  practitionerStaffId: ID;
  rationale: string;
  restrictions?: string;
  additionalAssessmentRequired: boolean;
  followUpRequired: boolean;
  /** Set when documented from the Apparatix 3-step program recommendation. */
  onboardingCaseId?: ID | null;
}

export const ASSIGNMENT_STATUS_LABELS: Record<AssessmentAssignmentStatus | "overdue", string> = {
  not_started: "Not started",
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  finalized: "Signed / finalized",
  overdue: "Overdue",
};

export const CYCLE_STATUS_LABELS: Record<QuarterlyCycleStatus, string> = {
  upcoming: "Upcoming",
  due_soon: "Due soon",
  due: "Due",
  scheduled: "Scheduled",
  partially_completed: "Partially completed",
  assessments_completed: "Assessments completed",
  results_review_needed: "Results review needed",
  results_review_scheduled: "Results review scheduled",
  complete: "Cycle complete",
  overdue: "Overdue",
};
