import { createFileRoute } from "@tanstack/react-router";

import { ServiceLinePage } from "@/components/app/ServiceLinePage";

export const Route = createFileRoute("/_authenticated/services/medical-exercise")({
  head: () => ({
    meta: [
      { title: "Medical Exercise — FredFit Portal" },
      {
        name: "description",
        content:
          "Medical Exercise enrollments, referral status and structured session documentation at FFS.",
      },
      { property: "og:title", content: "Medical Exercise — FredFit Portal" },
      { property: "og:description", content: "Medical Exercise clients and delivery workspace." },
    ],
  }),
  component: () => (
    <ServiceLinePage
      category="medical_exercise"
      title="Medical Exercise"
      description="Referral-informed programming delivered by Medical Exercise Specialists."
      placeholderTitle="Medical Exercise workspace"
      planned={[
        "Referral intake and physician information",
        "Structured session note after every session",
        "Medical Exercise assessment and reassessment",
        "Precautions and contraindications surfaced at point of care",
        "Progress reporting back to referring providers",
        "Superbill eligibility review",
      ]}
    />
  ),
});
