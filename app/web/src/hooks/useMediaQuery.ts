import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  const subscribe = (cb: () => void) => {
    const m = window.matchMedia(query);
    m.addEventListener("change", cb);
    return () => m.removeEventListener("change", cb);
  };
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}
