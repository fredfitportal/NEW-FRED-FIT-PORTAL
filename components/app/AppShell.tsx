import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Dumbbell,
  Heart,
  Home,
  ListChecks,
  type LucideIcon,
  Menu,
  MessageCircle,
  Settings,
  Sparkles,
  LogOut,
  UserPlus,
  Users,
  UsersRound,
  Gauge,
  LayoutGrid,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import ffsLogo from "@/assets/ffs-logo.png";
import { toast } from "sonner";

import { useDemoData } from "@/hooks/useDemoData";
import { repository, staffDisplayName } from "@/lib/domain/repository";
import { setCurrentStaffId, useSession } from "@/lib/domain/session";
import { resetDemoData } from "@/lib/domain/store";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Modules without a route yet are shown disabled rather than as dead links. */
  comingLater?: boolean;
  children?: { label: string; to: string }[];
}

const NAV: NavItem[] = [
  { label: "Home", to: "/", icon: Home },
  { label: "Schedule", to: "/schedule", icon: CalendarDays },
  { label: "Group Classes", to: "/classes", icon: LayoutGrid },
  { label: "Sellable Capacity", to: "/capacity", icon: Gauge },
  { label: "Clients", to: "/clients", icon: Users },
  { label: "Leads", to: "/leads", icon: Sparkles },
  { label: "Onboarding", to: "/onboarding", icon: UserPlus },
  { label: "Exercise Programs", comingLater: true, to: "/exercise-programs", icon: Dumbbell },
  { label: "Assessments", to: "/assessments", icon: ClipboardCheck },
  {
    label: "Services",
    to: "/services",
    icon: Heart,
    children: [
      { label: "Personal Training", to: "/services/personal-training" },
      { label: "Pilates", to: "/services/pilates" },
      { label: "Medical Exercise", to: "/services/medical-exercise" },
      { label: "Nutrition", to: "/services/nutrition" },
      { label: "Recovery", to: "/services/recovery" },
      { label: "Apparatix", to: "/services/apparatix" },
    ],
  },
  { label: "Messages", comingLater: true, to: "/messages", icon: MessageCircle },
  { label: "Tasks", to: "/tasks", icon: ListChecks },
  { label: "Team", to: "/team", icon: UsersRound },
  { label: "Reports", comingLater: true, to: "/reports", icon: BarChart3 },
  { label: "Business Config", to: "/admin", icon: Settings },
];

function BrandMark() {
  return (
    <Link to="/" className="flex items-center gap-3 px-2 py-1">
      <img
        src={ffsLogo}
        alt="Fredericksburg Fitness Studio"
        className="h-10 w-auto max-w-40 object-contain"
      />
      <span className="leading-tight">
        <span className="block font-[family-name:var(--font-display)] text-base font-semibold text-foreground">
          FredFit Portal
        </span>
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [openGroups, setOpenGroups] = useState<string[]>(
    pathname.startsWith("/services") ? ["Services"] : [],
  );

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <nav className="flex flex-col gap-1" aria-label="Primary">
      {NAV.map((item) => {
        const Icon = item.icon;
        if (item.comingLater) {
          return (
            <div
              key={item.label}
              title="Coming in a later build"
              aria-disabled="true"
              className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/35"
            >
              <Icon className="size-4" />
              {item.label}
              <span className="ml-auto text-[10px] uppercase tracking-wider">Later build</span>
            </div>
          );
        }
        const activeItem = isActive(item.to);
        const expanded = openGroups.includes(item.label);
        return (
          <div key={item.label}>
            <div className="flex items-center">
              <Link
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  activeItem
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className={cn("size-4", activeItem && "text-primary")} />
                {item.label}
              </Link>
              {item.children ? (
                <button
                  type="button"
                  aria-label={`Toggle ${item.label} sub-navigation`}
                  aria-expanded={expanded}
                  onClick={() =>
                    setOpenGroups((prev) =>
                      prev.includes(item.label)
                        ? prev.filter((g) => g !== item.label)
                        : [...prev, item.label],
                    )
                  }
                  className="ml-1 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent/60"
                >
                  <ChevronDown
                    className={cn("size-4 transition-transform", expanded && "rotate-180")}
                  />
                </button>
              ) : null}
            </div>
            {item.children && expanded ? (
              <div className="mb-1 ml-6 mt-1 flex flex-col gap-0.5 border-l border-sidebar-border pl-3">
                {item.children.map((child) => (
                  <Link
                    key={child.to}
                    to={child.to}
                    onClick={onNavigate}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm transition-colors",
                      pathname === child.to
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function SignedInAs() {
  useDemoData();
  const session = useSession();
  const staff = repository.listStaff();

  return (
    <div className="space-y-2 rounded-2xl bg-sidebar-accent/60 px-3 py-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
        Acting as (demo user)
      </p>
      <select
        aria-label="Acting as demo user"
        value={session.staffId}
        onChange={(e) => setCurrentStaffId(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
      >
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {staffDisplayName(s)} — {s.jobTitle}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">
        {session.isLeadership
          ? "Leadership: may authorize makeups and credits."
          : "Standard staff: cannot authorize credits."}
      </p>
      <button
        type="button"
        onClick={() => {
          resetDemoData();
          toast.success("Demo data reset to the original seed.");
        }}
        className="w-full rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        Reset demo data
      </button>
    </div>
  );
}

function AccountActions() {
  const signOut = async () => {
    await supabase.auth.signOut();
  };
  return (
    <Button variant="ghost" className="mt-2 w-full justify-start" onClick={signOut}>
      <LogOut />
      Sign out
    </Button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 lg:flex">
        <BrandMark />
        <div className="mt-6 flex-1 overflow-y-auto pr-1">
          <NavLinks />
        </div>
        <div className="mt-4">
          <SignedInAs />
          <AccountActions />
        </div>
      </aside>

      <div className="lg:pl-72">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className="rounded-xl border border-border p-2 text-foreground"
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-80 bg-sidebar p-4">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <BrandMark />
              <div className="mt-6 overflow-y-auto">
                <NavLinks onNavigate={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <BrandMark />
        </div>

        <div className="flex items-center justify-center gap-2 bg-accent/12 px-4 py-2 text-center text-xs font-medium text-accent-foreground/90">
          <Sparkles className="size-3.5 text-accent" />
          Demo / development environment — all people, records and appointments shown are
          fictional synthetic data.
        </div>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
