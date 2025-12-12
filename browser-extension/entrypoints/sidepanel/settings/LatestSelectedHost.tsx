import { JWT_SNIFFER_HOSTS } from "@/src/Contract";
import { getLatestTargetHost, saveLatestTargetHost } from "@/src/utils/storage";
import React, { createContext, useEffect, useState } from "react";

type ContextValue = {
  latestHost: string;
  setLatestHost: (host: string) => void;
};

const LatestTargetHostContext = createContext<ContextValue | null>(null);

export function LatestTargetHostProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [host, setHost] = useState<string | "">("");
  const setLatestHost = useCallback((host: string) => {
    setHost(host);
    saveLatestTargetHost(host);
  }, []);

  useEffect(() => {
    let mounted = true;

    getLatestTargetHost()
      .then((s) => {
        if (mounted && s) {
          setHost(s);
        } else if (mounted) {
          setHost(JWT_SNIFFER_HOSTS.at(0) || "");
        }
      })
      .catch(() => {
        setHost(JWT_SNIFFER_HOSTS.at(0) || "");
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <LatestTargetHostContext.Provider
      value={{ latestHost: host, setLatestHost }}
    >
      {children}
    </LatestTargetHostContext.Provider>
  );
}

export function useLatestTargetHost() {
  const context = React.useContext(LatestTargetHostContext);
  if (!context) {
    throw new Error(
      "useLatestTargetHost must be used within a LatestTargetHostProvider"
    );
  }
  return context;
}
