import { z } from "zod";

export const postVisibilitySchema = z.enum(["public", "friends"]);
export const createPostSchema = z.object({
  content: z.string().max(5000).default(""),
  visibility: postVisibilitySchema,
  images: z
    .union([z.instanceof(File), z.array(z.instanceof(File)).max(4)])
    .optional(),
});
export const updatePostSchema = z.object({
  content: z.string().max(5000),
  visibility: postVisibilitySchema,
});
export const feedQuerySchema = z.object({ cursor: z.string().optional() });
