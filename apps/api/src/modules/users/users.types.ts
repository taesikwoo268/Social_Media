import type { z } from "zod";
import type {
  profileMediaSchema,
  searchUsersSchema,
  updateProfileSchema,
} from "./users.schema";
export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ProfileMediaInput = z.infer<typeof profileMediaSchema>;
