import { useCallback, useState } from "react";
import { readJSON, writeJSON } from "../lib/storage";

/** A Set of ids remembered in this browser (e.g. jobs already downloaded). */
export function useStoredSet(key: string) {
  const [set, setSet] = useState<ReadonlySet<string>>(() => new Set(readJSON<string[]>(key, [])));
  const add = useCallback((id: string) => {
    setSet(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev).add(id);
      writeJSON(key, [...next]);
      return next;
    });
  }, [key]);
  return [set, add] as const;
}

export function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => readJSON<T>(key, initial));
  const update = useCallback((v: T) => { setValue(v); writeJSON(key, v); }, [key]);
  return [value, update] as const;
}
