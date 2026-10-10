import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader } from "@/components/app/PageHeader";
import { StatusPill } from "@/components/app/StatusPill";
import { repository } from "@/lib/domain/repository";

export const Route = createFileRoute("/_authenticated/services/")({
  head: () => ({
    meta: [
      { title: "Services — FredFit Portal" },
      {
        name: "description",
        content:
          "Personal Training, Pilates, Medical Exercise, Nutrition, Recovery and Apparatix service lines at Fredericksburg Fitness Studio.",
      },
      { property: "og:title", content: "Services — FredFit Portal" },
      { property: "og:description", content: "Every FFS service line and its client enrollments." },
    ],
  }),
  component: ServicesIndex,
});

const LINKS = [
  { label: "Personal Training", to: "/services/personal-training", category: "personal_training" },
  { label: "Pilates", to: "/services/pilates", category: "pilates" },
  { label: "Medical Exercise", to: "/services/medical-exercise", category: "medical_exercise" },
  { label: "Nutrition", to: "/services/nutrition", category: "nutrition" },
  { label: "Recovery", to: "/services/recovery", category: "recovery" },
  { label: "Apparatix", to: "/services/apparatix", category: "apparatix" },
];

function ServicesIndex() {
  const services = repository.listServices();
  const enrollments = repository.listEnrollments();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Service lines"
        title="Services"
        description="Each service line has its own workspace. Clients only appear where they are actually enrolled, so no profile carries services it does not use."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {LINKS.map((link) => {
          const lineServices = services.filter((s) => s.category === link.category);
          const active = enrollments.filter(
            (e) =>
              lineServices.some((s) => s.id === e.serviceId) &&
              (e.status === "active" || e.status === "referral_pending"),
          );
          return (
            <Link
              key={link.to}
              to={link.to}
              className="surface-card group p-6 transition-shadow hover:shadow-[var(--shadow-lift)]"
            >
              <h2 className="text-base font-semibold text-foreground group-hover:text-primary">
                {link.label}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {lineServices.map((s) => s.subCategory ?? s.name).join(" · ")}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <StatusPill status="active" label={`${active.length} enrolled`} />
                {lineServices.some((s) => s.superbillPossible) ? (
                  <StatusPill tone="info" label="Superbill possible" />
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
