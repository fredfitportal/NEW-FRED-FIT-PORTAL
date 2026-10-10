import { createFileRoute } from "@tanstack/react-router";

import { ServiceLinePage } from "@/components/app/ServiceLinePage";

export const Route = createFileRoute("/_authenticated/services/recovery")({
  head: () => ({
    meta: [
      { title: "Recovery — FredFit Portal" },
      {
        name: "description",
        content: "Massage therapy, assisted stretching and future recovery services at FFS.",
      },
      { property: "og:title", content: "Recovery — FredFit Portal" },
      { property: "og:description", content: "Recovery services and delivery workspace." },
    ],
  }),
  component: () => (
    <ServiceLinePage
      category="recovery"
      title="Recovery"
      description="Recovery is a multi-service line. Massage Therapy and Assisted Stretching are configured today, and additional recovery services can be added without schema changes."
      placeholderTitle="Recovery workspace"
      planned={[
        "SOAP note after every massage session",
        "Session note after assisted stretching",
        "Additional recovery service types",
        "Provider licensing and scope tracking",
        "Room and equipment scheduling",
        "Client recovery history",
      ]}
    />
  ),
});
