import { z } from "zod";
export const postCommentsParamSchema = z.object({ postId: z.uuid() });
export const commentParamSchema = z.object({ id: z.uuid() });
export const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  parentId: z.uuid().optional(),
});
export const updateCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});
