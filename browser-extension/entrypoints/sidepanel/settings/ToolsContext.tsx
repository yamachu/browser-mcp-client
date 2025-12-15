import { getTools, saveTools } from "@/src/utils/storage";
import React, { createContext, useCallback, useEffect, useState } from "react";
import { DEFAULT_TOOLS, FormToolsSchema, OutputTools } from "./schema";

type ContextValue = {
  tools: OutputTools;
  setTools: (t: OutputTools) => void;
};

export const ToolsContext = createContext<ContextValue>(
  null as unknown as ContextValue
);

export function ToolsProvider({ children }: { children: React.ReactNode }) {
  const [tools, setToolsState] = useState<OutputTools>(DEFAULT_TOOLS);

  useEffect(() => {
    let mounted = true;

    getTools()
      .then((t) => {
        if (mounted && t) {
          try {
            const parsed = FormToolsSchema.parse(t);
            setToolsState(parsed);
          } catch (e) {
            console.error("Failed to parse tools", e);
            setToolsState(DEFAULT_TOOLS);
          }
        } else if (mounted) {
          setToolsState(DEFAULT_TOOLS);
        }
      })
      .catch(() => {
        if (mounted) setToolsState(DEFAULT_TOOLS);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setTools = useCallback((t: OutputTools) => {
    setToolsState(t);
    saveTools(t);
  }, []);

  return (
    <ToolsContext.Provider value={{ tools, setTools }}>
      {children}
    </ToolsContext.Provider>
  );
}
