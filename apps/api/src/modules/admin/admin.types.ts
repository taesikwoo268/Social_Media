import type { z } from "zod";
import type {
  adminPostModerationSchema,
  adminUserStatusSchema,
  adminUsersQuerySchema,
} from "./admin.schema";
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
export type AdminUserStatusInput = z.infer<typeof adminUserStatusSchema>;
export type AdminPostModerationInput = z.infer<
  typeof adminPostModerationSchema
>;
