import { createFileRoute } from "@tanstack/react-router";

import { ServiceLinePage } from "@/components/app/ServiceLinePage";

export const Route = createFileRoute("/_authenticated/services/personal-training")({
  head: () => ({
    meta: [
      { title: "Personal Training — FredFit Portal" },
      {
        name: "description",
        content: "Personal Training enrollments, providers and session documentation at FFS.",
      },
      { property: "og:title", content: "Personal Training — FredFit Portal" },
      { property: "og:description", content: "Personal Training clients and delivery workspace." },
    ],
  }),
  component: () => (
    <ServiceLinePage
      category="personal_training"
      title="Personal Training"
      description="One-to-one strength and conditioning delivered by the FFS training team."
      placeholderTitle="Training delivery workspace"
      planned={[
        "Session note after every completed session",
        "Program assignment from the exercise library",
        "Trainer caseload and utilization views",
        "Makeup credit handling for cancellations",
        "Reassessment scheduling prompts",
        "Client progress summaries",
      ]}
    />
  ),
});
