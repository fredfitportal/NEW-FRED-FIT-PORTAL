import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/PageHeader";
import { StatusPill } from "@/components/app/StatusPill";
import { Field, fieldClass } from "@/components/app/form-primitives";
import { Button } from "@/components/ui/button";
import { useDemoData } from "@/hooks/useDemoData";
import {
  listFormTemplates,
  listPublicBookingConfigs,
  listResources,
  saveResource,
  updatePublicBookingConfig,
  updateServiceConfig,
} from "@/lib/domain/operations";
import { formatUsd, repository } from "@/lib/domain/repository";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Business Configuration — FredFit Portal" },
      {
        name: "description",
        content:
          "Configure Fredericksburg Fitness Studio locations, rooms and equipment capacity, service lines, class sizes and public booking links.",
      },
      { property: "og:title", content: "Business Configuration — FredFit Portal" },
      {
        property: "og:description",
        content: "FFS locations, resources, class capacity and public booking configuration.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  useDemoData();
  const locations = repository.listLocations();
  const services = repository.listServices();
  const configs = listPublicBookingConfigs();
  const templates = listFormTemplates();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Business configuration"
        description="Locations, rooms, equipment capacity, service lines, class sizes and public booking links are configuration — never hard-coded."
      />

      <section className="space-y-4">
        <h2 className="page-heading text-xl">Locations, rooms & equipment</h2>
        {locations.map((location) => {
          const resources = listResources(location.id);
          return (
            <div key={location.id} className="surface-card space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{location.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {location.addressLine1}, {location.city}, {location.state} {location.postalCode}
                  </p>
                </div>
                <StatusPill status={location.isActive ? "active" : "inactive"} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {resources.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span className="text-foreground">{r.name}</span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {r.kind === "capacity" ? "Capacity" : "Exclusive"}
                      <input
                        type="number"
                        min={1}
                        defaultValue={r.capacity}
                        className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm"
                        onBlur={(e) =>
                          saveResource({
                            id: r.id,
                            locationId: r.locationId,
                            name: r.name,
                            kind: r.kind,
                            capacity: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                      />
                    </span>
                  </div>
                ))}
                {resources.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No rooms or equipment recorded for this location yet.
                  </p>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Rooms and equipment beyond those listed are awaiting confirmation from FFS
                leadership.
              </p>
            </div>
          );
        })}
      </section>

      <section className="space-y-4">
        <h2 className="page-heading text-xl">Service lines & class capacity</h2>
        <div className="surface-card divide-y divide-border">
          {services
            .filter((s) => s.isActive)
            .map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="min-w-48 flex-1 text-sm font-medium text-foreground">{s.name}</span>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {s.category.replace(/_/g, " ")}
                </span>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Duration
                  <input
                    type="number"
                    min={5}
                    step={5}
                    defaultValue={s.defaultDurationMinutes}
                    className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
                    onBlur={(e) =>
                      updateServiceConfig(s.id, {
                        defaultDurationMinutes: Math.max(5, Number(e.target.value) || 5),
                      })
                    }
                  />
                </label>
                {s.isGroupClass ? (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Class capacity
                    <input
                      type="number"
                      min={1}
                      defaultValue={s.classCapacity ?? 6}
                      className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm"
                      onBlur={(e) =>
                        updateServiceConfig(s.id, {
                          classCapacity: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                    />
                  </label>
                ) : (
                  <span className="text-xs text-muted-foreground">Individual session</span>
                )}
              </div>
            ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="page-heading text-xl">Public booking links</h2>
        {configs.map((config) => (
          <div key={config.id} className="surface-card space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{config.publicTitle}</p>
                <a
                  className="text-sm text-primary hover:underline"
                  href={`/book/${config.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  /book/{config.slug}
                </a>
              </div>
              <StatusPill status={config.isActive ? "active" : "inactive"} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Duration (minutes)">
                <input
                  type="number"
                  className={fieldClass}
                  defaultValue={config.durationMinutes}
                  onBlur={(e) =>
                    updatePublicBookingConfig(config.id, {
                      durationMinutes: Number(e.target.value) || config.durationMinutes,
                    })
                  }
                />
              </Field>
              <Field label="Price (USD)">
                <input
                  type="number"
                  step="0.01"
                  className={fieldClass}
                  defaultValue={config.priceUsd ?? 0}
                  disabled={!config.paymentRequired}
                  onBlur={(e) =>
                    updatePublicBookingConfig(config.id, { priceUsd: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="QuickBooks payment link">
                <input
                  className={fieldClass}
                  defaultValue={config.externalPaymentUrl ?? ""}
                  disabled={!config.paymentRequired}
                  onBlur={(e) =>
                    updatePublicBookingConfig(config.id, { externalPaymentUrl: e.target.value })
                  }
                />
              </Field>
            </div>

            <p className="text-sm text-muted-foreground">
              {config.paymentRequired
                ? `Payment required — ${formatUsd(config.priceUsd ?? 0)} collected by QuickBooks. FredFit Portal never processes card data and never marks a payment paid on its own.`
                : "No payment required."}
            </p>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updatePublicBookingConfig(config.id, { isActive: !config.isActive });
                toast.success(config.isActive ? "Booking link disabled" : "Booking link enabled");
              }}
            >
              {config.isActive ? "Disable booking link" : "Enable booking link"}
            </Button>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="page-heading text-xl">Forms & documents</h2>
        <div className="surface-card divide-y divide-border">
          {templates.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t.name} <span className="text-muted-foreground">({t.version})</span>
                </p>
                <p className="max-w-2xl text-sm text-muted-foreground">{t.description}</p>
              </div>
              <StatusPill
                label={t.contentStatus === "approved" ? "Approved" : "Awaiting FFS content"}
                tone={t.contentStatus === "approved" ? "positive" : "warning"}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
