"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "patrimoine-jeu:help-enabled";

interface HelpContextValue {
  enabled: boolean;
  toggle: () => void;
}

const HelpContext = createContext<HelpContextValue>({ enabled: true, toggle: () => {} });

export function HelpProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setEnabled(stored === "1");
  }, []);

  function toggle() {
    setEnabled((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return <HelpContext.Provider value={{ enabled, toggle }}>{children}</HelpContext.Provider>;
}

export function useHelp(): HelpContextValue {
  return useContext(HelpContext);
}
