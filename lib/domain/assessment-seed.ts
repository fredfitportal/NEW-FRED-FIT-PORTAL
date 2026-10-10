/**
 * Seed content for the Assessment Engine — templates plus synthetic demo
 * clients that demonstrate every stage of the quarterly cycle.
 *
 * All client data here is fictitious. No real client information is present.
 */

import type { FormSchema } from "./form-schema";
import type {
  AssessmentAssignment,
  AssessmentMetricDef,
  AssessmentTemplate,
  AssessmentTemplateVersion,
  CompletedAssessment,
  PlacementRecommendation,
  QuarterlyCycle,
  ResultsReview,
} from "./assessment-types";
import type { Client } from "./types";

const NOW = "2026-01-01T00:00:00.000Z";
const meta = (id: string) => ({ id, createdAt: NOW, updatedAt: NOW, archivedAt: null });

const CLINICAL_VIEW = ["role-owner", "role-leadership", "role-trainer", "role-mes"];
const ALL_PRACTITIONERS = [
  "role-owner",
  "role-leadership",
  "role-trainer",
  "role-mes",
  "role-rdn",
  "role-recovery",
];

interface TemplateSeed {
  key: string;
  name: string;
  category: string;
  description: string;
  performRoleIds: string[];
  viewRoleIds: string[];
  reassessmentDefault: boolean;
  sections: FormSchema["sections"];
  metrics: AssessmentMetricDef[];
}

const TEMPLATE_SEEDS: TemplateSeed[] = [
  {
    key: "initial_physical",
    name: "Initial / Physical Assessment",
    category: "general",
    description: "Baseline physical assessment performed during onboarding and repeated quarterly.",
    performRoleIds: ["role-owner", "role-leadership", "role-trainer", "role-mes"],
    viewRoleIds: CLINICAL_VIEW,
    reassessmentDefault: true,
    sections: [
      {
        key: "vitals",
        title: "Baseline measures",
        fields: [
          { key: "resting_hr", label: "Resting heart rate", type: "number", hint: "bpm" },
          { key: "systolic", label: "Systolic BP", type: "number" },
          { key: "diastolic", label: "Diastolic BP", type: "number" },
        ],
      },
      {
        key: "capacity",
        title: "Functional capacity",
        fields: [
          { key: "sit_to_stand_30s", label: "30-second sit-to-stand (reps)", type: "number" },
          { key: "plank_hold_sec", label: "Plank hold (seconds)", type: "number" },
          { key: "shoulder_flexion_deg", label: "Shoulder flexion (degrees)", type: "number" },
          {
            key: "observations",
            label: "Practitioner observations",
            type: "textarea",
            full: true,
            rows: 4,
          },
        ],
      },
    ],
    metrics: [
      { key: "resting_hr", label: "Resting heart rate", unit: "bpm", domain: "clinical", direction: "lower_better", valueType: "numeric" },
      { key: "sit_to_stand_30s", label: "30s sit-to-stand", unit: "reps", domain: "strength", direction: "higher_better", valueType: "numeric" },
      { key: "plank_hold_sec", label: "Plank hold", unit: "sec", domain: "strength", direction: "higher_better", valueType: "numeric" },
      { key: "shoulder_flexion_deg", label: "Shoulder flexion", unit: "°", domain: "mobility", direction: "higher_better", valueType: "numeric" },
    ],
  },
  {
    key: "inbody",
    name: "InBody",
    category: "general",
    description: "Body composition analysis.",
    performRoleIds: ALL_PRACTITIONERS,
    viewRoleIds: [...CLINICAL_VIEW, "role-rdn"],
    reassessmentDefault: true,
    sections: [
      {
        key: "composition",
        title: "Body composition",
        fields: [
          { key: "weight_lb", label: "Weight (lb)", type: "number", required: true },
          { key: "skeletal_muscle_lb", label: "Skeletal muscle mass (lb)", type: "number" },
          { key: "body_fat_pct", label: "Body fat (%)", type: "number" },
          { key: "visceral_fat_level", label: "Visceral fat level", type: "number" },
          { key: "notes", label: "Notes", type: "textarea", full: true, rows: 3 },
        ],
      },
    ],
    metrics: [
      { key: "weight_lb", label: "Weight", unit: "lb", domain: "body_composition", direction: "neutral", valueType: "numeric" },
      { key: "skeletal_muscle_lb", label: "Skeletal muscle mass", unit: "lb", domain: "body_composition", direction: "higher_better", valueType: "numeric" },
      { key: "body_fat_pct", label: "Body fat", unit: "%", domain: "body_composition", direction: "lower_better", valueType: "numeric" },
      { key: "visceral_fat_level", label: "Visceral fat level", domain: "body_composition", direction: "lower_better", valueType: "numeric" },
    ],
  },
  {
    key: "gait",
    name: "Gait Analysis",
    category: "general",
    description: "Walking mechanics, speed and symmetry.",
    performRoleIds: ["role-owner", "role-mes", "role-trainer"],
    viewRoleIds: CLINICAL_VIEW,
    reassessmentDefault: true,
    sections: [
      {
        key: "gait",
        title: "Gait metrics",
        fields: [
          { key: "gait_speed_mps", label: "Gait speed (m/s)", type: "number" },
          { key: "stride_length_in", label: "Average stride length (in)", type: "number" },
          { key: "symmetry_pct", label: "Left/right symmetry (%)", type: "number" },
          { key: "gait_observations", label: "Observations", type: "textarea", full: true, rows: 3 },
        ],
      },
    ],
    metrics: [
      { key: "gait_speed_mps", label: "Gait speed", unit: "m/s", domain: "gait", direction: "higher_better", valueType: "numeric" },
      { key: "stride_length_in", label: "Stride length", unit: "in", domain: "gait", direction: "higher_better", valueType: "numeric" },
      { key: "symmetry_pct", label: "Gait symmetry", unit: "%", domain: "gait", direction: "higher_better", valueType: "numeric" },
    ],
  },
  {
    key: "fms",
    name: "Functional Movement Screen (FMS)",
    category: "general",
    description: "Seven-movement screen scored 0–3 per movement.",
    performRoleIds: ["role-owner", "role-trainer", "role-mes"],
    viewRoleIds: CLINICAL_VIEW,
    reassessmentDefault: true,
    sections: [
      {
        key: "movements",
        title: "Movement scores (0–3)",
        fields: [
          { key: "deep_squat", label: "Deep squat", type: "number" },
          { key: "hurdle_step", label: "Hurdle step", type: "number" },
          { key: "inline_lunge", label: "In-line lunge", type: "number" },
          { key: "shoulder_mobility", label: "Shoulder mobility", type: "number" },
          { key: "active_slr", label: "Active straight-leg raise", type: "number" },
          { key: "trunk_pushup", label: "Trunk stability push-up", type: "number" },
          { key: "rotary_stability", label: "Rotary stability", type: "number" },
          { key: "fms_total", label: "FMS composite total (0–21)", type: "number" },
          { key: "pain_present", label: "Pain reported during any movement", type: "checkbox", full: true },
          { key: "fms_notes", label: "Practitioner observations", type: "textarea", full: true, rows: 3 },
        ],
      },
    ],
    metrics: [
      { key: "fms_total", label: "FMS composite", unit: "/21", domain: "movement", direction: "higher_better", valueType: "score" },
      { key: "deep_squat", label: "Deep squat", unit: "/3", domain: "movement", direction: "higher_better", valueType: "score" },
      { key: "shoulder_mobility", label: "Shoulder mobility", unit: "/3", domain: "movement", direction: "higher_better", valueType: "score" },
      { key: "active_slr", label: "Active straight-leg raise", unit: "/3", domain: "movement", direction: "higher_better", valueType: "score" },
    ],
  },
  {
    key: "fall_risk",
    name: "Fall Risk Screening",
    category: "general",
    description: "Balance and fall-risk battery for higher-risk clients.",
    performRoleIds: ["role-owner", "role-mes", "role-trainer"],
    viewRoleIds: CLINICAL_VIEW,
    reassessmentDefault: true,
    sections: [
      {
        key: "battery",
        title: "Balance battery",
        fields: [
          { key: "tug_seconds", label: "Timed Up & Go (seconds)", type: "number" },
          { key: "berg_balance", label: "Berg Balance Scale (0–56)", type: "number" },
          { key: "single_leg_stance_sec", label: "Single-leg stance (seconds)", type: "number" },
          { key: "falls_past_year", label: "Reported falls in past 12 months", type: "number" },
          { key: "fall_notes", label: "Observations", type: "textarea", full: true, rows: 3 },
        ],
      },
    ],
    metrics: [
      { key: "tug_seconds", label: "Timed Up & Go", unit: "sec", domain: "balance_fall_risk", direction: "lower_better", valueType: "numeric" },
      { key: "berg_balance", label: "Berg Balance Scale", unit: "/56", domain: "balance_fall_risk", direction: "higher_better", valueType: "score" },
      { key: "single_leg_stance_sec", label: "Single-leg stance", unit: "sec", domain: "balance_fall_risk", direction: "higher_better", valueType: "numeric" },
      { key: "falls_past_year", label: "Falls reported (12 mo)", domain: "balance_fall_risk", direction: "lower_better", valueType: "numeric" },
    ],
  },
  {
    key: "wheelchair",
    name: "Wheelchair Assessment",
    category: "general",
    description: "Seated function, transfers and upper-body capacity for wheelchair users.",
    performRoleIds: ["role-owner", "role-mes"],
    viewRoleIds: CLINICAL_VIEW,
    reassessmentDefault: true,
    sections: [
      {
        key: "seated",
        title: "Seated function",
        fields: [
          { key: "transfer_independence", label: "Transfer independence", type: "select", options: ["Independent", "Supervision", "Minimal assist", "Moderate assist", "Dependent"] },
          { key: "seated_reach_in", label: "Seated forward reach (in)", type: "number" },
          { key: "propulsion_6min_ft", label: "6-minute propulsion distance (ft)", type: "number" },
          { key: "grip_strength_lb", label: "Grip strength (lb)", type: "number" },
          { key: "skin_pressure_notes", label: "Positioning / pressure observations", type: "textarea", full: true, rows: 3 },
        ],
      },
    ],
    metrics: [
      { key: "seated_reach_in", label: "Seated forward reach", unit: "in", domain: "mobility", direction: "higher_better", valueType: "numeric" },
      { key: "propulsion_6min_ft", label: "6-min propulsion distance", unit: "ft", domain: "strength", direction: "higher_better", valueType: "numeric" },
      { key: "grip_strength_lb", label: "Grip strength", unit: "lb", domain: "strength", direction: "higher_better", valueType: "numeric" },
    ],
  },
  {
    key: "pilates",
    name: "Pilates Assessment",
    category: "pilates",
    description: "Core control, alignment and apparatus readiness.",
    performRoleIds: ["role-owner", "role-trainer"],
    viewRoleIds: CLINICAL_VIEW,
    reassessmentDefault: false,
    sections: [
      {
        key: "control",
        title: "Control & alignment",
        fields: [
          { key: "core_control_score", label: "Core control (0–5)", type: "number" },
          { key: "pelvic_alignment", label: "Pelvic alignment", type: "select", options: ["Neutral", "Anterior tilt", "Posterior tilt", "Lateral shift"] },
          { key: "roll_up_score", label: "Roll-up quality (0–5)", type: "number" },
          { key: "pilates_notes", label: "Observations", type: "textarea", full: true, rows: 3 },
        ],
      },
    ],
    metrics: [
      { key: "core_control_score", label: "Core control", unit: "/5", domain: "movement", direction: "higher_better", valueType: "score" },
      { key: "roll_up_score", label: "Roll-up quality", unit: "/5", domain: "movement", direction: "higher_better", valueType: "score" },
    ],
  },
  {
    key: "medical_exercise",
    name: "Medical Exercise / Musculoskeletal Assessment",
    category: "medical_exercise",
    description: "Musculoskeletal findings and client-reported function for Medical Exercise clients.",
    performRoleIds: ["role-owner", "role-mes"],
    viewRoleIds: ["role-owner", "role-leadership", "role-mes"],
    reassessmentDefault: true,
    sections: [
      {
        key: "findings",
        title: "Findings",
        fields: [
          { key: "primary_region", label: "Primary region of concern", type: "text" },
          { key: "pain_scale", label: "Client-reported pain (0–10)", type: "number" },
          { key: "rom_deficit_deg", label: "Range-of-motion deficit (degrees)", type: "number" },
          { key: "function_score", label: "Client-reported function (0–100)", type: "number" },
          { key: "clinical_notes", label: "Practitioner findings", type: "textarea", full: true, rows: 4 },
          { key: "referral_recommended", label: "Outside provider communication recommended", type: "checkbox", full: true },
        ],
      },
    ],
    metrics: [
      { key: "pain_scale", label: "Reported pain", unit: "/10", domain: "client_reported", direction: "lower_better", valueType: "score" },
      { key: "rom_deficit_deg", label: "ROM deficit", unit: "°", domain: "mobility", direction: "lower_better", valueType: "numeric" },
      { key: "function_score", label: "Reported function", unit: "/100", domain: "client_reported", direction: "higher_better", valueType: "score" },
    ],
  },
  {
    key: "apparatix",
    name: "Apparatix Assessment",
    category: "apparatix",
    description: "Apparatix readiness screen used in the 3-step Apparatix onboarding pathway.",
    performRoleIds: ["role-owner", "role-trainer", "role-mes"],
    viewRoleIds: CLINICAL_VIEW,
    reassessmentDefault: true,
    sections: [
      {
        key: "readiness",
        title: "Apparatix readiness",
        fields: [
          { key: "station_tolerance", label: "Stations tolerated (of 8)", type: "number" },
          { key: "circuit_time_min", label: "Circuit completion time (minutes)", type: "number" },
          { key: "rpe", label: "Session RPE (0–10)", type: "number" },
          { key: "modifications_needed", label: "Modifications needed", type: "textarea", full: true, rows: 3 },
        ],
      },
    ],
    metrics: [
      { key: "station_tolerance", label: "Stations tolerated", unit: "/8", domain: "strength", direction: "higher_better", valueType: "score" },
      { key: "circuit_time_min", label: "Circuit time", unit: "min", domain: "strength", direction: "lower_better", valueType: "numeric" },
    ],
  },
  {
    key: "nutrition",
    name: "Nutrition Assessment",
    category: "nutrition",
    description: "Registered dietitian intake and follow-up assessment.",
    performRoleIds: ["role-owner", "role-rdn"],
    viewRoleIds: ["role-owner", "role-leadership", "role-rdn"],
    reassessmentDefault: false,
    sections: [
      {
        key: "intake",
        title: "Nutrition status",
        fields: [
          { key: "avg_daily_protein_g", label: "Average daily protein (g)", type: "number" },
          { key: "hydration_oz", label: "Average daily hydration (oz)", type: "number" },
          { key: "readiness_score", label: "Readiness to change (0–10)", type: "number" },
          { key: "rdn_notes", label: "Dietitian notes", type: "textarea", full: true, rows: 4 },
        ],
      },
    ],
    metrics: [
      { key: "avg_daily_protein_g", label: "Daily protein", unit: "g", domain: "nutrition", direction: "higher_better", valueType: "numeric" },
      { key: "hydration_oz", label: "Daily hydration", unit: "oz", domain: "nutrition", direction: "higher_better", valueType: "numeric" },
      { key: "readiness_score", label: "Readiness to change", unit: "/10", domain: "client_reported", direction: "higher_better", valueType: "score" },
    ],
  },
];

export const ASSESSMENT_TEMPLATES: AssessmentTemplate[] = TEMPLATE_SEEDS.map((t, i) => ({
  ...meta(`atpl-${t.key}`),
  key: t.key,
  name: t.name,
  category: t.category,
  description: t.description,
  isActive: true,
  currentVersion: 1,
  performRoleIds: t.performRoleIds,
  viewRoleIds: t.viewRoleIds,
  reassessmentDefault: t.reassessmentDefault,
  displayOrder: i,
})) as AssessmentTemplate[];

export const ASSESSMENT_TEMPLATE_VERSIONS: AssessmentTemplateVersion[] = TEMPLATE_SEEDS.map((t) => ({
  ...meta(`atplv-${t.key}-1`),
  templateId: `atpl-${t.key}`,
  version: 1,
  publishedAt: NOW,
  schema: {
    templateKey: t.key,
    version: "1",
    title: t.name,
    surface: "secure",
    sections: t.sections,
  },
  metrics: t.metrics,
}));

/* ------------------------------------------------------------------ */
/* Synthetic demo clients covering every workflow stage                */
/* ------------------------------------------------------------------ */

const clientBase = (
  id: string,
  clientNumber: string,
  firstName: string,
  lastName: string,
  extra: Partial<Client>,
): Client =>
  ({
    ...meta(id),
    clientNumber,
    firstName,
    lastName,
    dateOfBirth: "1972-05-14",
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@demo.fredfitportal.com`,
    phone: "540-555-0100",
    status: "active",
    dateJoined: "2026-01-12",
    primaryLocationId: "loc-cowan",
    alerts: [],
    onboardingStatus: "complete",
    ...extra,
  }) as Client;

export const ASSESSMENT_DEMO_CLIENTS: Client[] = [
  clientBase("acl-1", "DEMO-A01", "Marla", "Bennett", {
    goals: "Return to hiking without knee pain.",
    onboardingStatus: "in_progress",
    status: "onboarding",
  }),
  clientBase("acl-2", "DEMO-A02", "Harold", "Pike", {
    goals: "Stay independent and steady on stairs.",
    dateOfBirth: "1948-03-02",
    alerts: ["History of two falls in the past year"],
    onboardingStatus: "in_progress",
    status: "onboarding",
  }),
  clientBase("acl-3", "DEMO-A03", "Renee", "Oyelaran", {
    goals: "Build upper-body endurance for daily transfers.",
    dateOfBirth: "1985-11-20",
    alerts: ["Wheelchair user — seated programming only"],
    onboardingStatus: "in_progress",
    status: "onboarding",
  }),
  clientBase("acl-4", "DEMO-A04", "Tomas", "Reyes", {
    goals: "Try Apparatix circuits twice a week.",
    dateOfBirth: "1966-07-09",
    primaryLocationId: "loc-william",
    onboardingStatus: "in_progress",
    status: "onboarding",
  }),
  clientBase("acl-5", "DEMO-A05", "Denise", "Hollowell", {
    goals: "Keep making strength gains after knee replacement.",
    dateOfBirth: "1959-09-30",
    dateJoined: "2025-02-03",
  }),
  clientBase("acl-6", "DEMO-A06", "Craig", "Nakamura", {
    goals: "Lower body fat and improve movement quality.",
    dateOfBirth: "1978-01-17",
    dateJoined: "2024-10-14",
  }),
  clientBase("acl-7", "DEMO-A07", "Yvette", "Sandoval", {
    goals: "Long-term body composition and balance progress.",
    dateOfBirth: "1963-06-06",
    dateJoined: "2024-03-11",
  }),
];

/* Assignments / completed work / cycles are generated relative to a fixed
 * demo "today" so the seeded queue always shows every stage. */
const TODAY = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const shift = (days: number) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  return iso(d);
};

let seq = 0;
const nid = (p: string) => `${p}-seed-${++seq}`;

function assignment(
  clientId: string,
  templateKey: string,
  opts: Partial<AssessmentAssignment> = {},
): AssessmentAssignment {
  return {
    ...meta(nid("aasg")),
    clientId,
    templateId: `atpl-${templateKey}`,
    templateVersion: 1,
    purpose: "onboarding",
    requirement: "required",
    assignedDate: shift(-20),
    status: "not_started",
    cycleId: null,
    practitionerStaffId: "staff-9",
    dueDate: shift(10),
    ...opts,
  };
}

function completed(
  clientId: string,
  templateKey: string,
  performedDate: string,
  metrics: Record<string, number>,
  opts: Partial<CompletedAssessment> = {},
): CompletedAssessment {
  return {
    ...meta(nid("acmp")),
    clientId,
    templateId: `atpl-${templateKey}`,
    templateVersion: 1,
    performedDate,
    practitionerStaffId: "staff-9",
    values: Object.fromEntries(Object.entries(metrics).map(([k, v]) => [k, String(v)])),
    metrics,
    status: "finalized",
    finalizedByStaffId: "staff-9",
    finalizedAt: `${performedDate}T18:00:00.000Z`,
    ...opts,
  };
}

const assignments: AssessmentAssignment[] = [];
const completedAssessments: CompletedAssessment[] = [];
const cycles: QuarterlyCycle[] = [];
const reviews: ResultsReview[] = [];
const placements: PlacementRecommendation[] = [];

/* acl-1 — Initial Assessment + FMS, onboarding in progress */
assignments.push(
  assignment("acl-1", "initial_physical", { practitionerStaffId: "staff-3", status: "scheduled", appointmentDate: shift(3) }),
  assignment("acl-1", "fms", { practitionerStaffId: "staff-3", reason: "Movement quality baseline before programming." }),
);

/* acl-2 — Initial Assessment + Fall Risk Screening, one done */
const a2Init = assignment("acl-2", "initial_physical", {
  status: "finalized",
  completedDate: shift(-6),
  finalizedDate: shift(-6),
});
const a2Done = completed("acl-2", "initial_physical", shift(-6), {
  resting_hr: 74,
  sit_to_stand_30s: 9,
  plank_hold_sec: 18,
  shoulder_flexion_deg: 142,
}, { assignmentId: a2Init.id });
a2Init.completedAssessmentId = a2Done.id;
assignments.push(a2Init, assignment("acl-2", "fall_risk", { dueDate: shift(-2), reason: "Two reported falls in the past year." }));
completedAssessments.push(a2Done);

/* acl-3 — Initial Assessment + Wheelchair Assessment */
assignments.push(
  assignment("acl-3", "initial_physical", { status: "in_progress" }),
  assignment("acl-3", "wheelchair", { reason: "Seated function baseline for transfer goals." }),
);

/* acl-4 — Apparatix 3-step onboarding pathway */
const a4App = assignment("acl-4", "apparatix", {
  practitionerStaffId: "staff-8",
  status: "finalized",
  completedDate: shift(-8),
  finalizedDate: shift(-8),
});
const a4AppDone = completed("acl-4", "apparatix", shift(-8), { station_tolerance: 6, circuit_time_min: 34 }, {
  assignmentId: a4App.id,
  practitionerStaffId: "staff-8",
  recommendations: "Tolerated six of eight stations. Recommend modified pulling stations.",
});
a4App.completedAssessmentId = a4AppDone.id;
const a4In = assignment("acl-4", "inbody", {
  practitionerStaffId: "staff-8",
  status: "finalized",
  completedDate: shift(-8),
  finalizedDate: shift(-8),
});
const a4InDone = completed("acl-4", "inbody", shift(-8), {
  weight_lb: 198,
  skeletal_muscle_lb: 78,
  body_fat_pct: 29.4,
  visceral_fat_level: 12,
}, { assignmentId: a4In.id, practitionerStaffId: "staff-8" });
a4In.completedAssessmentId = a4InDone.id;
assignments.push(a4App, a4In);
completedAssessments.push(a4AppDone, a4InDone);
placements.push({
  ...meta(nid("aplc")),
  clientId: "acl-4",
  requestedServiceId: "svc-apparatix",
  recommendedServiceId: "svc-apparatix",
  outcome: "appropriate_with_modifications",
  recommendationDate: shift(-7),
  practitionerStaffId: "staff-8",
  rationale:
    "Completed Apparatix Assessment and InBody. Tolerated circuit well; pulling stations need a modified setup.",
  restrictions: "Modified pulling stations; no overhead loading for first 4 weeks.",
  additionalAssessmentRequired: false,
  followUpRequired: true,
});

/* acl-5 — quarterly reassessment due soon */
const c5: QuarterlyCycle = {
  ...meta(nid("acyc")),
  clientId: "acl-5",
  cycleNumber: 4,
  dueDate: shift(12),
};
cycles.push(c5);
assignments.push(
  assignment("acl-5", "initial_physical", { purpose: "reassessment", cycleId: c5.id, dueDate: c5.dueDate, practitionerStaffId: "staff-9" }),
  assignment("acl-5", "inbody", { purpose: "reassessment", cycleId: c5.id, dueDate: c5.dueDate, practitionerStaffId: "staff-9" }),
  assignment("acl-5", "fall_risk", { purpose: "reassessment", cycleId: c5.id, dueDate: c5.dueDate, requirement: "optional", practitionerStaffId: "staff-9" }),
);

/* acl-6 — assessments complete, results review still needs scheduling */
const c6: QuarterlyCycle = {
  ...meta(nid("acyc")),
  clientId: "acl-6",
  cycleNumber: 3,
  dueDate: shift(-4),
};
cycles.push(c6);
[
  ["initial_physical", { resting_hr: 62, sit_to_stand_30s: 19, plank_hold_sec: 74, shoulder_flexion_deg: 168 }],
  ["inbody", { weight_lb: 186, skeletal_muscle_lb: 84, body_fat_pct: 21.2, visceral_fat_level: 8 }],
  ["fms", { fms_total: 16, deep_squat: 2, shoulder_mobility: 3, active_slr: 2 }],
].forEach(([key, metrics]) => {
  const asg = assignment("acl-6", key as string, {
    purpose: "reassessment",
    cycleId: c6.id,
    dueDate: c6.dueDate,
    status: "finalized",
    completedDate: shift(-5),
    finalizedDate: shift(-5),
    practitionerStaffId: "staff-3",
  });
  const cmp = completed("acl-6", key as string, shift(-5), metrics as Record<string, number>, {
    assignmentId: asg.id,
    cycleId: c6.id,
    practitionerStaffId: "staff-3",
  });
  asg.completedAssessmentId = cmp.id;
  assignments.push(asg);
  completedAssessments.push(cmp);
});
reviews.push({
  ...meta(nid("arev")),
  cycleId: c6.id,
  clientId: "acl-6",
  status: "needed",
  reviewerStaffId: null,
});

/* acl-7 — three completed periods for longitudinal comparison */
const periods = [
  { date: "2025-09-15", inbody: { weight_lb: 212, skeletal_muscle_lb: 71, body_fat_pct: 38.1, visceral_fat_level: 14 }, fall: { tug_seconds: 14.2, berg_balance: 44, single_leg_stance_sec: 6, falls_past_year: 2 } },
  { date: "2026-01-08", inbody: { weight_lb: 204, skeletal_muscle_lb: 74, body_fat_pct: 34.6, visceral_fat_level: 12 }, fall: { tug_seconds: 12.1, berg_balance: 49, single_leg_stance_sec: 11, falls_past_year: 1 } },
  { date: shift(-30), inbody: { weight_lb: 196, skeletal_muscle_lb: 77, body_fat_pct: 31.2, visceral_fat_level: 10 }, fall: { tug_seconds: 10.4, berg_balance: 53, single_leg_stance_sec: 18, falls_past_year: 0 } },
];
periods.forEach((p, idx) => {
  const cyc: QuarterlyCycle = {
    ...meta(nid("acyc")),
    clientId: "acl-7",
    cycleNumber: idx + 1,
    dueDate: p.date,
    closedStatus: "complete",
    completedDate: p.date,
    nextDueDate: periods[idx + 1]?.date ?? shift(60),
  };
  cycles.push(cyc);
  (["inbody", "fall_risk"] as const).forEach((key) => {
    const metrics = key === "inbody" ? p.inbody : p.fall;
    const asg = assignment("acl-7", key, {
      purpose: "reassessment",
      cycleId: cyc.id,
      dueDate: p.date,
      assignedDate: p.date,
      status: "finalized",
      completedDate: p.date,
      finalizedDate: p.date,
      practitionerStaffId: "staff-9",
    });
    const cmp = completed("acl-7", key, p.date, metrics, { assignmentId: asg.id, cycleId: cyc.id });
    asg.completedAssessmentId = cmp.id;
    assignments.push(asg);
    completedAssessments.push(cmp);
  });
  reviews.push({
    ...meta(nid("arev")),
    cycleId: cyc.id,
    clientId: "acl-7",
    status: "completed",
    reviewerStaffId: idx % 2 === 0 ? "staff-8" : "staff-1",
    scheduledDate: p.date,
    completedDate: p.date,
    servicesRemainAppropriate: "yes",
    recommendations: "Continue current programming; progress is on track.",
    nextSteps: "Reassess next quarter.",
  });
});

export const ASSESSMENT_ASSIGNMENTS = assignments;
export const COMPLETED_ASSESSMENTS = completedAssessments;
export const QUARTERLY_CYCLES = cycles;
export const RESULTS_REVIEWS = reviews;
export const PLACEMENT_RECOMMENDATIONS = placements;
