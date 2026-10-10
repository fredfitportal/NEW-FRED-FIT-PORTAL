import { createFileRoute } from "@tanstack/react-router";

import { ServiceLinePage } from "@/components/app/ServiceLinePage";

export const Route = createFileRoute("/_authenticated/services/pilates")({
  head: () => ({
    meta: [
      { title: "Pilates — FredFit Portal" },
      {
        name: "description",
        content: "Pilates enrollments, instructors and session documentation at FFS.",
      },
      { property: "og:title", content: "Pilates — FredFit Portal" },
      { property: "og:description", content: "Pilates clients and delivery workspace." },
    ],
  }),
  component: () => (
    <ServiceLinePage
      category="pilates"
      title="Pilates"
      description="Reformer and mat Pilates delivered by certified FFS instructors."
      placeholderTitle="Pilates delivery workspace"
      planned={[
        "Session note after every completed session",
        "Pilates assessment and level progression",
        "Equipment and studio scheduling",
        "Makeup credit handling",
        "Instructor caseload views",
        "Client progress summaries",
      ]}
    />
  ),
});
