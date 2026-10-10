import { createFileRoute } from "@tanstack/react-router";

import { ServiceLinePage } from "@/components/app/ServiceLinePage";

export const Route = createFileRoute("/_authenticated/services/apparatix")({
  head: () => ({
    meta: [
      { title: "Apparatix — FredFit Portal" },
      {
        name: "description",
        content: "Apparatix memberships, reservations and credit balances at FFS.",
      },
      { property: "og:title", content: "Apparatix — FredFit Portal" },
      { property: "og:description", content: "Apparatix membership and credit tracking." },
    ],
  }),
  component: () => (
    <ServiceLinePage
      category="apparatix"
      title="Apparatix"
      description="Apparatix membership, reservations and credits. Credit balances are always derived from the ledger so staff can explain exactly how a balance was reached."
      placeholderTitle="Apparatix workspace"
      planned={[
        "Membership frequency and reservation management",
        "Credit earned / used / expiring views",
        "Configurable cancellation-to-credit rules",
        "Apparatix assessment and level progression",
        "Client-facing credit balance in the portal",
        "Waitlists for full reservations",
      ]}
      footnote="Cancellation and credit rules are configuration, not hard-coded logic. Leadership will set notice windows, credit value, eligible services, expiration, transferability and maximum balances in Admin."
    />
  ),
});
