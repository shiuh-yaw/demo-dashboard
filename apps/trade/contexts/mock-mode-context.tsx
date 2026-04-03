"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const MOCK_MODE_KEY = "trade-mock-mode";

interface MockModeContextValue {
  isMockMode: boolean;
  setMockMode: (value: boolean) => void;
  toggleMockMode: () => void;
}

const MockModeContext = createContext<MockModeContextValue | null>(null);

export function MockModeProvider({ children }: { children: React.ReactNode }) {
  const [isMockMode, setMockModeState] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(MOCK_MODE_KEY);
    if (stored !== null) {
      setMockModeState(stored === "true");
    }
  }, []);

  const setMockMode = useCallback((value: boolean) => {
    setMockModeState(value);
    localStorage.setItem(MOCK_MODE_KEY, String(value));
  }, []);

  const toggleMockMode = useCallback(() => {
    setMockModeState((prev) => {
      const next = !prev;
      localStorage.setItem(MOCK_MODE_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <MockModeContext.Provider
      value={{ isMockMode, setMockMode, toggleMockMode }}
    >
      {children}
    </MockModeContext.Provider>
  );
}

export function useMockMode(): MockModeContextValue {
  const ctx = useContext(MockModeContext);
  if (!ctx) {
    return {
      isMockMode: false,
      setMockMode: () => {},
      toggleMockMode: () => {},
    };
  }
  return ctx;
}
