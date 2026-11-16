import { useMemo, useSyncExternalStore } from "react";
import { parseRoute } from "../lib/logic";
import type { Route } from "../types";

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => "");
  return useMemo(() => parseRoute(hash), [hash]);
}

export const go = (hash: string) => { window.location.hash = hash; };
