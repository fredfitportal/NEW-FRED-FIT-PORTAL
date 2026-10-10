import { initials, staffDisplayName } from "@/lib/domain/repository";
import type { StaffMember } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/** Circular provider photo with a polished initials fallback. */
export function StaffAvatar({
  staff,
  size = "md",
  className,
}: {
  staff: StaffMember;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const name = staffDisplayName(staff);
  const dimension = size === "sm" ? "size-7 text-[10px]" : size === "lg" ? "size-12 text-sm" : "size-9 text-xs";

  if (staff.photoUrl) {
    return (
      <img
        src={staff.photoUrl}
        alt={name}
        className={cn("shrink-0 rounded-full object-cover ring-2 ring-background", dimension, className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary/12 font-semibold uppercase tracking-wide text-primary ring-2 ring-background",
        dimension,
        className,
      )}
      title={name}
    >
      {initials(name)}
    </span>
  );
}
