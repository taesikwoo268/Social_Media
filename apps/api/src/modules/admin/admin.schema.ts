import { z } from "zod";
export const adminUsersQuerySchema = z.object({
  q: z.string().max(100).optional().default(""),
});
export const adminUserStatusSchema = z.object({
  status: z.enum(["active", "suspended"]),
});
export const adminPostModerationSchema = z.object({
  status: z.enum(["visible", "hidden", "deleted"]),
});
export const adminIdParamSchema = z.object({ id: z.uuid() });
