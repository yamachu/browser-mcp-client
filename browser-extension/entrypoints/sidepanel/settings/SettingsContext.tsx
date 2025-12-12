import { getAgent, saveAgent } from "@/src/utils/storage";
import React, { createContext, useEffect, useState } from "react";
import { useLatestTargetHost } from "./LatestSelectedHost";
import { DEFAULT_SETTINGS, OutputSettings } from "./schema";

type ContextValue = {
  settings: OutputSettings;
  setSettings: (s: OutputSettings) => void;
  setLatestHost: (host: string) => void;
};

export const SettingsContext = createContext<ContextValue>(
  null as unknown as ContextValue
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { latestHost: targetHost, setLatestHost } = useLatestTargetHost();
  const [settings, setSettingsState] =
    useState<OutputSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let mounted = true;

    getAgent(targetHost)
      .then((s) => {
        if (mounted && s) {
          setSettingsState({ ...s, currentHost: targetHost });
        } else if (mounted) {
          setSettingsState({
            ...DEFAULT_SETTINGS,
            currentHost: targetHost,
          });
        }
      })
      .catch(() => {
        setSettingsState({
          ...DEFAULT_SETTINGS,
          currentHost: targetHost,
        });
      });

    return () => {
      mounted = false;
    };
  }, [targetHost]);

  const setSettings = useCallback((s: OutputSettings) => {
    setSettingsState(s);
    const { currentHost, ...rest } = s;
    saveAgent(currentHost, rest);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, setSettings, setLatestHost }}>
      {children}
    </SettingsContext.Provider>
  );
}
