import { z } from "zod";

export const ToolsSchema = z.object({
  tools: z.array(
    z.object({
      id: z.string().trim().min(1),
      json: z
        .string()
        .trim()
        .refine((val) => {
          try {
            JSON.parse(val);
            return true;
          } catch {
            return false;
          }
        }),
      enabled: z.boolean(),
    })
  ),
});

export type Tools = z.infer<typeof ToolsSchema>;
