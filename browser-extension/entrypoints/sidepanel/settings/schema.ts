import { JWT_SNIFFER_HOSTS } from "@/src/Contract";
import { SettingsSchema } from "@/src/schemas/settings";
import { z } from "zod";

export const FormSettingsSchema = SettingsSchema.extend({
  currentHost: z.enum(["", ...JWT_SNIFFER_HOSTS]).refine((val) => val !== "", {
    message: "Host is required",
  }),
  jwtAutoRefresh: z.boolean().default(true),
})
  .refine((data) => {
    return !(
      !data.jwtAutoRefresh &&
      (data.token === undefined || data.token === "")
    );
  })
  .transform((obj) => {
    if (obj.jwtAutoRefresh) {
      const { token: _, jwtAutoRefresh: __, ...rest } = obj;
      return { ...rest, token: null };
    }
    const { jwtAutoRefresh: _, ...rest } = obj;
    return rest;
  });

export type Settings = z.input<typeof FormSettingsSchema>;
export type OutputSettings = z.output<typeof FormSettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  currentHost: "",
  apiBaseUrl: "",
  provider: "openai",
  model: "",
  token: null,
  jwtAutoRefresh: true,
};
