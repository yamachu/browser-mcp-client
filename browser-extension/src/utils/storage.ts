import { SettingsSchema, type Settings } from "../schemas/settings";

export const STORAGE_KEYS = {
  JWT: "jwt",
  AGENT: "agent",
  LATEST_SELECTED_HOST: "latest_selected_host",
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

export function toAgentStorageKey(host: string): string {
  return `${STORAGE_KEYS.AGENT}_${host}`;
}

export async function saveAgent(host: string, agent: Settings): Promise<void> {
  await browser.storage.local.set({
    [toAgentStorageKey(host)]: JSON.stringify(agent),
  });
}

export async function getAgent(host: string): Promise<Settings | null> {
  const key = toAgentStorageKey(host);
  const result = await browser.storage.local.get(key);
  const value = result[key];
  if (typeof value !== "string") {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    return SettingsSchema.parse(parsed);
  } catch {
    return null;
  }
}

export async function saveLatestTargetHost(host: string): Promise<void> {
  await browser.storage.local.set({
    [STORAGE_KEYS.LATEST_SELECTED_HOST]: host,
  });
}

export async function getLatestTargetHost(): Promise<string | null> {
  const key = STORAGE_KEYS.LATEST_SELECTED_HOST;
  const result = await browser.storage.local.get(key);
  const value = result[key];
  return typeof value === "string" ? value : null;
}
