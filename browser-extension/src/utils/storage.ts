const STORAGE_KEYS = {
  JWT: "jwt",
} as const;

export function toJwtStorageKey(host: string): string {
  return `${STORAGE_KEYS.JWT}_${host}`;
}

export async function saveJwt(host: string, token: string): Promise<void> {
  await browser.storage.local.set({ [toJwtStorageKey(host)]: token });
}

export async function getJwt(host: string): Promise<string | null> {
  const key = toJwtStorageKey(host);
  const result = await browser.storage.local.get(key);
  const value = result[key];
  return typeof value === "string" ? value : null;
}
