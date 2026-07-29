"use client";

/**
 * In-widget success notice. Actions (mint / deposit) call `notify(message)`;
 * the main screen renders it as a transient banner INSIDE the widget (not a
 * viewport-corner toast), so the confirmation reads as part of the card.
 * Auto-clears after a few seconds; a fresh notify resets the timer.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const NOTICE_MS = 4000;

interface WidgetNoticeValue {
  message: string | null;
  notify: (message: string) => void;
}

const WidgetNoticeContext = createContext<WidgetNoticeValue>({
  message: null,
  notify: () => {},
});

export function WidgetNoticeProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((next: string) => {
    setMessage(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), NOTICE_MS);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <WidgetNoticeContext.Provider value={{ message, notify }}>
      {children}
    </WidgetNoticeContext.Provider>
  );
}

export function useWidgetNotice(): WidgetNoticeValue {
  return useContext(WidgetNoticeContext);
}
