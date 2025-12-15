import { getJwt, toJwtStorageKey } from "@/src/utils/storage";
import { useMemo, useSyncExternalStore } from "react";

type StorageChangeListener = Parameters<
  typeof browser.storage.onChanged.addListener
>[0];

// TODO: useJWTと言っているが、JWTじゃなかった場合にどうするか
// TODO: JWTの有効期限切れとかも考慮して、null返すようにするとかもありかもしれん
function createJwtStore(host: string) {
  const key = toJwtStorageKey(host);
  let currentValue: string | null = null;
  const listeners = new Set<() => void>();

  getJwt(host).then((value) => {
    currentValue = value;
    listeners.forEach((listener) => listener());
  });

  const storageListener: StorageChangeListener = (changes, areaName) => {
    if (areaName === "local" && key in changes) {
      const newValue = changes[key].newValue;
      currentValue = typeof newValue === "string" ? newValue : null;
      listeners.forEach((listener) => listener());
    }
  };

  browser.storage.onChanged.addListener(storageListener);

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          browser.storage.onChanged.removeListener(storageListener);
        }
      };
    },
    getSnapshot() {
      return currentValue;
    },
  };
}

export function useJwt(host: string): string | null {
  const store = useMemo(() => createJwtStore(host), [host]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
