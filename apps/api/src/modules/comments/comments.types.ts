import type { z } from "zod";
import type {
  createCommentSchema,
  updateCommentSchema,
} from "./comments.schema";
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CommentViewer = { id: string; role: "user" | "admin" };
