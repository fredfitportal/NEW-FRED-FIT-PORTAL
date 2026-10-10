import { useEffect, useSyncExternalStore } from "react";

import { hydrateSession } from "@/lib/domain/session";
import { maintainRecurringSeries } from "@/lib/domain/series";
import { getVersion, hydrateFromStorage, subscribe } from "@/lib/domain/store";

/**
 * Subscribes a component to the demo data store so every repository write
 * re-renders the UI. Also restores persisted demo data after hydration (never
 * during SSR, so the server and first client render stay identical).
 */
export function useDemoData(): number {
  const version = useSyncExternalStore(subscribe, getVersion, () => 0);
  useEffect(() => {
    hydrateSession();
    hydrateFromStorage();
    /*
     * Active recurring schedules keep themselves stocked with future
     * occurrences from their CURRENT pattern, so a permanent day/time/provider
     * change never reverts once the pre-generated rows run out.
     */
    maintainRecurringSeries();
  }, []);
  return version;
}
