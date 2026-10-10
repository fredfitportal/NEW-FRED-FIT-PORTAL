/**
 * Calendar colour coding by service line.
 *
 * Colours are semantic design tokens declared in `src/styles.css`
 * (`--cal-*`). Never hard-code hex/tailwind palette colours in components —
 * import the helpers here so every calendar surface stays consistent.
 */

import { serviceById } from "./repository";
import type { ID } from "./types";

export type ServiceColorKey =
  | "pt"
  | "medex"
  | "pilates"
  | "recovery"
  | "nutrition"
  | "apparatix_plus"
  | "onboarding"
  | "admin";

export interface ServiceColor {
  key: ServiceColorKey;
  label: string;
  /** Solid accent (border / dot / text). */
  accentClass: string;
  /** Soft fill used for calendar chips. */
  chipClass: string;
  /** Small legend swatch. */
  dotClass: string;
}

export const SERVICE_COLORS: Record<ServiceColorKey, ServiceColor> = {
  pt: {
    key: "pt",
    label: "Personal Training",
    accentClass: "text-cal-pt",
    chipClass: "bg-cal-pt-soft border-cal-pt/45 text-cal-pt",
    dotClass: "bg-cal-pt",
  },
  medex: {
    key: "medex",
    label: "Medical Exercise",
    accentClass: "text-cal-medex",
    chipClass: "bg-cal-medex-soft border-cal-medex/45 text-cal-medex",
    dotClass: "bg-cal-medex",
  },
  pilates: {
    key: "pilates",
    label: "Pilates / Apparatix",
    accentClass: "text-cal-pilates",
    chipClass: "bg-cal-pilates-soft border-cal-pilates/45 text-cal-pilates",
    dotClass: "bg-cal-pilates",
  },
  recovery: {
    key: "recovery",
    label: "Recovery",
    accentClass: "text-cal-recovery",
    chipClass: "bg-cal-recovery-soft border-cal-recovery/45 text-cal-recovery",
    dotClass: "bg-cal-recovery",
  },
  nutrition: {
    key: "nutrition",
    label: "Nutrition",
    accentClass: "text-cal-nutrition",
    chipClass: "bg-cal-nutrition-soft border-cal-nutrition/45 text-cal-nutrition",
    dotClass: "bg-cal-nutrition",
  },
  apparatix_plus: {
    key: "apparatix_plus",
    label: "Apparatix Plus",
    accentClass: "text-cal-apparatix-plus",
    chipClass: "bg-cal-apparatix-plus-soft border-cal-apparatix-plus/45 text-cal-apparatix-plus",
    dotClass: "bg-cal-apparatix-plus",
  },
  onboarding: {
    key: "onboarding",
    label: "5-Step Onboarding",
    accentClass: "text-cal-onboarding",
    chipClass: "bg-cal-onboarding-soft border-cal-onboarding/45 text-cal-onboarding",
    dotClass: "bg-cal-onboarding",
  },
  admin: {
    key: "admin",
    label: "Admin / other",
    accentClass: "text-cal-admin",
    chipClass: "bg-cal-admin-soft border-cal-admin/40 text-cal-admin",
    dotClass: "bg-cal-admin",
  },
};

/** Explicit per-service overrides win over the category default. */
const SERVICE_OVERRIDES: Record<string, ServiceColorKey> = {
  "svc-apparatix-plus": "apparatix_plus",
  "svc-apparatix": "pilates",
  "svc-apparatix-assessment": "pilates",
};

export function colorKeyForService(serviceId?: ID | null): ServiceColorKey {
  if (!serviceId) return "admin";
  const override = SERVICE_OVERRIDES[serviceId];
  if (override) return override;
  const service = serviceById(serviceId);
  if (!service) return "admin";
  switch (service.category) {
    case "personal_training":
      return "pt";
    case "pilates":
      return "pilates";
    case "medical_exercise":
      return "medex";
    case "nutrition":
      return "nutrition";
    case "recovery":
      return "recovery";
    case "apparatix":
      return "pilates";
    case "onboarding":
      return "onboarding";
    default:
      return "admin";
  }
}

export function serviceColor(serviceId?: ID | null): ServiceColor {
  return SERVICE_COLORS[colorKeyForService(serviceId)];
}

export const CALENDAR_LEGEND: ServiceColor[] = [
  SERVICE_COLORS.pt,
  SERVICE_COLORS.medex,
  SERVICE_COLORS.pilates,
  SERVICE_COLORS.apparatix_plus,
  SERVICE_COLORS.recovery,
  SERVICE_COLORS.nutrition,
  SERVICE_COLORS.onboarding,
  SERVICE_COLORS.admin,
];
