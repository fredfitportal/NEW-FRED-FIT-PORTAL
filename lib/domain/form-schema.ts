/**
 * SHARED FORM ARCHITECTURE.
 *
 * Every FredFit Portal form — public lead capture and secure health intake
 * alike — is described by data here and rendered by ONE component
 * (`src/components/app/DynamicForm.tsx`). New forms are configuration, not new
 * code, and every answer is stored as a structured key/value payload so staff
 * views can read individual answers instead of a blob of prose.
 *
 * Health information is NEVER placed on a public form. Public schemas are
 * marked `surface: "public"`; health intake is `surface: "secure"` and is only
 * reachable through a client-specific secure link.
 */

export type FormValue = string | string[] | boolean;

export type FormFieldType =
  | "text"
  | "textarea"
  | "email"
  | "tel"
  | "date"
  | "number"
  | "select"
  | "radio"
  | "multiselect"
  | "checkbox";

export interface FormCondition {
  /** Key of the field this one depends on. */
  key: string;
  /** Show when the answer equals this value. */
  equals?: FormValue;
  /** Show when a multiselect answer includes this option. */
  includes?: string;
  /** Show when a multiselect answer does NOT include this option. */
  excludes?: string;
  /** Show when the answer is any non-empty / true value. */
  answered?: boolean;
  /** Show when the answer is NOT one of these values. */
  notOneOf?: string[];
}

export interface FormFieldDef {
  key: string;
  label: string;
  type: FormFieldType;
  options?: string[];
  required?: boolean;
  hint?: string;
  placeholder?: string;
  rows?: number;
  /** Conditional logic — the field only renders when every rule passes. */
  showIf?: FormCondition[];
  /** Layout hint only. */
  full?: boolean;
}

export interface FormSectionDef {
  key: string;
  title: string;
  description?: string;
  fields: FormFieldDef[];
}

export interface FormSchema {
  templateKey: string;
  version: string;
  title: string;
  intro?: string;
  surface: "public" | "secure";
  sections: FormSectionDef[];
}

/* ------------------------------------------------------------------ */
/* Conditional logic + validation                                      */
/* ------------------------------------------------------------------ */

function isEmpty(value: FormValue | undefined) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return value === false;
}

export function isFieldVisible(field: FormFieldDef, values: Record<string, FormValue>) {
  if (!field.showIf?.length) return true;
  return field.showIf.every((rule) => {
    const current = values[rule.key];
    if (rule.includes !== undefined) {
      return Array.isArray(current) && current.includes(rule.includes);
    }
    if (rule.excludes !== undefined) {
      return Array.isArray(current) && current.length > 0 && !current.includes(rule.excludes);
    }
    if (rule.equals !== undefined) return current === rule.equals;
    if (rule.notOneOf) return typeof current === "string" && !rule.notOneOf.includes(current);
    if (rule.answered) return !isEmpty(current);
    return true;
  });
}

export function visibleFields(schema: FormSchema, values: Record<string, FormValue>) {
  return schema.sections.flatMap((section) =>
    section.fields.filter((field) => isFieldVisible(field, values)),
  );
}

/** Returns a map of fieldKey -> error message for every visible required gap. */
export function validateForm(schema: FormSchema, values: Record<string, FormValue>) {
  const errors: Record<string, string> = {};
  visibleFields(schema, values).forEach((field) => {
    if (field.required && isEmpty(values[field.key])) {
      errors[field.key] = "This answer is required.";
    }
    const value = values[field.key];
    if (field.type === "email" && typeof value === "string" && value.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        errors[field.key] = "Please enter a valid email address.";
      }
    }
    if (typeof value === "string" && value.length > 2000) {
      errors[field.key] = "Please keep this answer under 2000 characters.";
    }
  });
  return errors;
}

/** Only visible answers are stored — hidden branches never leak stale values. */
export function collectPayload(schema: FormSchema, values: Record<string, FormValue>) {
  const payload: Record<string, FormValue> = {};
  visibleFields(schema, values).forEach((field) => {
    const value = values[field.key];
    if (value !== undefined && !isEmpty(value)) payload[field.key] = value;
  });
  return payload;
}

export function fieldLabel(schema: FormSchema, key: string) {
  for (const section of schema.sections) {
    const field = section.fields.find((f) => f.key === key);
    if (field) return field.label;
  }
  return key;
}

/* ------------------------------------------------------------------ */
/* Discovery Call — PUBLIC lead form (no health information)           */
/* ------------------------------------------------------------------ */

export const DISCOVERY_INTEREST_OPTIONS = [
  "Personal Training",
  "Partner Personal Training",
  "Trio Personal Training",
  "Pilates",
  "Partner Pilates",
  "Trio Pilates",
  "Medical Exercise",
  "Corrective Exercise",
  "Registered Dietitian / Nutrition",
  "Massage Therapy",
  "Assisted Stretching",
  "Apparatix",
  "Apparatix Plus",
  "5-Step Onboarding",
  "Not sure — help me decide",
];

export const DISCOVERY_CALL_FORM: FormSchema = {
  templateKey: "discovery_call",
  version: "v1",
  title: "Discovery Call Request",
  surface: "public",
  intro:
    "This is a free 30-minute phone call. Please don't share medical details here — health history is always collected later through your private, secure link.",
  sections: [
    {
      key: "about_you",
      title: "About you",
      fields: [
        { key: "firstName", label: "First name", type: "text", required: true },
        { key: "lastName", label: "Last name", type: "text", required: true },
        { key: "email", label: "Email", type: "email", required: true },
        {
          key: "phone",
          label: "Phone number for the call",
          type: "tel",
          required: true,
          hint: "We call you at this number.",
        },
        {
          key: "preferredContactMethod",
          label: "Preferred contact method",
          type: "select",
          options: ["Phone call", "Text message", "Email"],
          required: true,
        },
        {
          key: "bestTimeToReach",
          label: "Best time of day to reach you",
          type: "select",
          options: ["Early morning", "Mid-morning", "Midday", "Afternoon", "Evening"],
        },
      ],
    },
    {
      key: "goals",
      title: "What you're looking for",
      fields: [
        {
          key: "interests",
          label: "What are you interested in?",
          type: "multiselect",
          options: DISCOVERY_INTEREST_OPTIONS,
          required: true,
          full: true,
        },
        {
          key: "notSureDetail",
          label: "Tell us a little about what you're weighing up",
          type: "textarea",
          rows: 2,
          full: true,
          showIf: [{ key: "interests", includes: "Not sure — help me decide" }],
        },
        {
          key: "apparatixExperience",
          label: "Have you used Pilates apparatus (reformer, tower, chair) before?",
          type: "radio",
          options: ["Yes, regularly", "A little", "Never"],
          full: true,
          showIf: [{ key: "interests", includes: "Apparatix" }],
        },
        {
          key: "whatPrompted",
          label: "What prompted you to reach out to us?",
          type: "textarea",
          rows: 3,
          required: true,
          full: true,
        },
        {
          key: "helpWith",
          label: "What would you most like help with?",
          type: "textarea",
          rows: 3,
          required: true,
          full: true,
        },
        {
          key: "successLooksLike",
          label: "If working with us went really well, what would success look like for you?",
          type: "textarea",
          rows: 3,
          required: true,
          full: true,
          hint: "We keep this with your record so every professional you work with knows what matters to you.",
        },
        {
          key: "biggestChallenge",
          label: "What is the biggest challenge getting in the way right now?",
          type: "textarea",
          rows: 3,
          full: true,
        },
        {
          key: "timeline",
          label: "When are you hoping to start?",
          type: "select",
          options: ["Right away", "Within a month", "In 1-3 months", "Just exploring"],
        },
        {
          key: "previousClient",
          label: "Have you trained with Fredericksburg Fitness Studio before?",
          type: "radio",
          options: ["Yes", "No"],
        },
        {
          key: "previousClientWhen",
          label: "Roughly when was that, and who did you work with?",
          type: "text",
          full: true,
          showIf: [{ key: "previousClient", equals: "Yes" }],
        },
      ],
    },
    {
      key: "referral",
      title: "How you found us",
      fields: [
        {
          key: "referralSource",
          label: "How did you hear about Fredericksburg Fitness Studio?",
          type: "select",
          required: true,
          options: [
            "Google",
            "Facebook",
            "Instagram",
            "Friend / family referral",
            "Current client referral",
            "Physician / healthcare provider",
            "Local event",
            "Television / media",
            "Podcast",
            "Website",
            "Other",
          ],
        },
        {
          key: "referralDetail",
          label: "Who referred you, or where did you see us?",
          type: "text",
          showIf: [
            {
              key: "referralSource",
              notOneOf: ["", "Google", "Facebook", "Instagram", "Website"],
            },
          ],
        },
        {
          key: "anythingElse",
          label: "Anything else you'd like us to know before we speak? (optional)",
          type: "textarea",
          rows: 2,
          full: true,
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Apparatix Health History — SECURE client intake                     */
/* ------------------------------------------------------------------ */

const CONDITION_OPTIONS = [
  "High blood pressure",
  "Heart condition",
  "Stroke",
  "Diabetes",
  "Asthma or breathing condition",
  "Osteoporosis or osteopenia",
  "Arthritis",
  "Herniated or bulging disc",
  "Scoliosis",
  "Joint replacement",
  "Chronic pain",
  "Balance or dizziness issues",
  "Neurological condition",
  "Cancer (current or past)",
  "None of these",
];

export const APPARATIX_HEALTH_HISTORY_FORM: FormSchema = {
  templateKey: "apparatix_health_history",
  version: "v1",
  title: "Apparatix Health History Form",
  surface: "secure",
  intro:
    "This form is private to you and is shared only with the Fredericksburg Fitness Studio professionals working with you. Answer as completely as you can — it directly shapes how your assessment is run.",
  sections: [
    {
      key: "basics",
      title: "Your details",
      fields: [
        { key: "dateOfBirth", label: "Date of birth", type: "date", required: true },
        {
          key: "emergencyContactName",
          label: "Emergency contact name",
          type: "text",
          required: true,
        },
        {
          key: "emergencyContactPhone",
          label: "Emergency contact phone",
          type: "tel",
          required: true,
        },
        {
          key: "primaryCarePhysician",
          label: "Primary care physician (optional)",
          type: "text",
        },
      ],
    },
    {
      key: "activity",
      title: "Activity and experience",
      fields: [
        {
          key: "activityLevel",
          label: "How would you describe your current activity level?",
          type: "radio",
          required: true,
          options: [
            "Mostly sedentary",
            "Lightly active (1-2 days a week)",
            "Moderately active (3-4 days a week)",
            "Very active (5+ days a week)",
          ],
          full: true,
        },
        {
          key: "apparatusExperience",
          label: "Experience with Pilates apparatus",
          type: "radio",
          required: true,
          options: ["None", "Some (a few sessions)", "Experienced"],
          full: true,
        },
        {
          key: "apparatusDetail",
          label: "Where and how long did you practice?",
          type: "text",
          full: true,
          showIf: [{ key: "apparatusExperience", notOneOf: ["", "None"] }],
        },
        {
          key: "goals",
          label: "What do you want Apparatix to do for you?",
          type: "textarea",
          rows: 3,
          required: true,
          full: true,
        },
      ],
    },
    {
      key: "health",
      title: "Health history",
      description:
        "Tell us about anything that could affect how you move. Nothing here disqualifies you — it helps us adapt.",
      fields: [
        {
          key: "conditions",
          label: "Have you been diagnosed with any of the following?",
          type: "multiselect",
          options: CONDITION_OPTIONS,
          required: true,
          full: true,
        },
        {
          key: "conditionDetail",
          label: "Please tell us more about the conditions you selected",
          type: "textarea",
          rows: 3,
          required: true,
          full: true,
          showIf: [{ key: "conditions", excludes: "None of these" }],
        },
        {
          key: "cardiacClearance",
          label: "Has a physician cleared you for exercise since that diagnosis?",
          type: "radio",
          options: ["Yes", "No", "Not sure"],
          full: true,
          showIf: [{ key: "conditions", includes: "Heart condition" }],
        },
        {
          key: "boneDensityDetail",
          label: "When was your most recent bone density scan, and what did it show?",
          type: "text",
          full: true,
          showIf: [{ key: "conditions", includes: "Osteoporosis or osteopenia" }],
        },
        {
          key: "recentSurgery",
          label: "Have you had surgery in the last two years?",
          type: "radio",
          options: ["Yes", "No"],
          required: true,
        },
        {
          key: "surgeryDetail",
          label: "What surgery, and when?",
          type: "textarea",
          rows: 2,
          required: true,
          full: true,
          showIf: [{ key: "recentSurgery", equals: "Yes" }],
        },
        {
          key: "currentPain",
          label: "Are you currently in pain anywhere?",
          type: "radio",
          options: ["Yes", "No"],
          required: true,
        },
        {
          key: "painLocation",
          label: "Where is the pain, and how would you rate it out of 10?",
          type: "textarea",
          rows: 2,
          required: true,
          full: true,
          showIf: [{ key: "currentPain", equals: "Yes" }],
        },
        {
          key: "medications",
          label: "Are you taking any medications that affect exercise, balance or heart rate?",
          type: "radio",
          options: ["Yes", "No"],
          required: true,
        },
        {
          key: "medicationDetail",
          label: "Which medications?",
          type: "textarea",
          rows: 2,
          full: true,
          showIf: [{ key: "medications", equals: "Yes" }],
        },
        {
          key: "pregnancyStatus",
          label: "Are you currently pregnant or within 12 weeks postpartum?",
          type: "radio",
          options: ["Pregnant", "Postpartum", "Neither", "Prefer not to say"],
          full: true,
        },
        {
          key: "pregnancyDetail",
          label: "How many weeks, and do you have provider clearance to exercise?",
          type: "text",
          full: true,
          showIf: [{ key: "pregnancyStatus", notOneOf: ["", "Neither", "Prefer not to say"] }],
        },
        {
          key: "movementRestrictions",
          label: "Any movements you have been told to avoid?",
          type: "textarea",
          rows: 2,
          full: true,
        },
      ],
    },
    {
      key: "acknowledgement",
      title: "Acknowledgement",
      fields: [
        {
          key: "accurate",
          label: "The information above is accurate and complete to the best of my knowledge.",
          type: "checkbox",
          required: true,
          full: true,
        },
        {
          key: "notifyChanges",
          label: "I will tell my Fredericksburg Fitness Studio professional if anything changes.",
          type: "checkbox",
          required: true,
          full: true,
        },
      ],
    },
  ],
};

export const FORM_SCHEMAS: FormSchema[] = [DISCOVERY_CALL_FORM, APPARATIX_HEALTH_HISTORY_FORM];

export function schemaForTemplate(key: string) {
  return FORM_SCHEMAS.find((s) => s.templateKey === key);
}
