import { createFileRoute } from "@tanstack/react-router";

import { PublicBookingFlow } from "@/components/app/PublicBookingFlow";

export const Route = createFileRoute("/book/apparatix-assessment")({
  head: () => ({
    meta: [
      { title: "Book Your Apparatix Assessment — Fredericksburg Fitness Studio" },
      {
        name: "description",
        content:
          "Reserve your private 60-minute Initial Apparatix Assessment at the Fredericksburg Fitness Studio Pilates Studio on William Street.",
      },
      { property: "og:title", content: "Book Your Apparatix Assessment" },
      {
        property: "og:description",
        content: "Private 60-minute Initial Apparatix Assessment with Jennifer Scherer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PublicBookingFlow slug="apparatix-assessment" />,
});
