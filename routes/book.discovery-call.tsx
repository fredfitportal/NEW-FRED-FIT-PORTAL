import { createFileRoute } from "@tanstack/react-router";

import { PublicBookingFlow } from "@/components/app/PublicBookingFlow";

export const Route = createFileRoute("/book/discovery-call")({
  head: () => ({
    meta: [
      { title: "Schedule Your Free 30-Minute Discovery Call — Fredericksburg Fitness Studio" },
      {
        name: "description",
        content:
          "Book a free 30-minute discovery call with Fredericksburg Fitness Studio. Tell us your goals and we'll help you find the right starting point.",
      },
      { property: "og:title", content: "Free 30-Minute Discovery Call" },
      {
        property: "og:description",
        content: "A free, no-pressure conversation about your goals with Fredericksburg Fitness Studio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PublicBookingFlow slug="discovery-call" />,
});
