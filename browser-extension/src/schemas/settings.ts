import { z } from "zod";

export const SettingsSchema = z.object({
  apiBaseUrl: z.string().trim().min(1),
  provider: z.enum(["openai", "anthropic"]),
  model: z.string().trim().min(1),
  token: z.string().nullable(),
});

export type Settings = z.infer<typeof SettingsSchema>;
