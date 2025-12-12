import { z } from "zod";

export const SettingsSchema = z.object({
  apiBaseUrl: z.string(),
  provider: z.enum(["openai", "anthropic"]),
  model: z.string(),
  token: z.string().nullable(),
});

export type Settings = z.infer<typeof SettingsSchema>;
