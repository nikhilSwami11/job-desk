import { useCallback, useEffect, useRef, useState } from "react";

export function useToast(ms = 2200) {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const say = useCallback((m: string) => {
    setMessage(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(""), ms);
  }, [ms]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [message, say] as const;
}
