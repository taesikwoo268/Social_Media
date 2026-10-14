import { z } from "zod";
export const searchUsersSchema = z.object({
  q: z.string().max(80).optional().default(""),
});
export const usernameParamSchema = z.object({
  username: z.string().min(3).max(32),
});
export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  username: z.string().trim().min(3).max(32).optional(),
  bio: z.string().max(300).nullable().optional(),
});
export const profileMediaSchema = z.object({
  purpose: z.enum(["avatar", "cover"]),
  file: z.instanceof(File),
});
