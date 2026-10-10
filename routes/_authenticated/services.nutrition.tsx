import { createFileRoute } from "@tanstack/react-router";

import { ServiceLinePage } from "@/components/app/ServiceLinePage";

export const Route = createFileRoute("/_authenticated/services/nutrition")({
  head: () => ({
    meta: [
      { title: "Nutrition — FredFit Portal" },
      {
        name: "description",
        content:
          "Virtual Registered Dietitian appointments, Google Meet scheduling and session summaries at FFS.",
      },
      { property: "og:title", content: "Nutrition — FredFit Portal" },
      { property: "og:description", content: "Virtual RDN care and delivery workspace." },
    ],
  }),
  component: () => (
    <ServiceLinePage
      category="nutrition"
      title="Nutrition"
      description="Registered Dietitian care, currently delivered virtually. FredFit Portal stays the authoritative scheduling system; Google Calendar and Google Meet are synchronized from it."
      placeholderTitle="Nutrition workspace & Google Workspace sync"
      planned={[
        "Create/update/cancel the matching Google Calendar event",
        "Generate and store the Google Meet link on the appointment",
        "Store external calendar event id and sync status",
        "Dietitian session summary after every visit",
        "Approved client-facing summary publishing",
        "Superbill generation where the service qualifies",
      ]}
      footnote="Google OAuth and API credentials will be supplied through protected environment secrets — never hard-coded — and no real Google credentials are used in this demo environment."
    />
  ),
});
