import type { z } from "zod";
import type {
  createPostSchema,
  feedQuerySchema,
  updatePostSchema,
} from "./posts.schema";
import type { posts } from "../../schema";

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type FeedQuery = z.infer<typeof feedQuerySchema>;
export type Viewer = { id: string; role: "user" | "admin" };
export type PostEntity = typeof posts.$inferSelect;
