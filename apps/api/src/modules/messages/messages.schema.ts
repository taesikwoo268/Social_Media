import { z } from "zod";

export const conversationMessagesParamSchema = z.object({
  id: z.string().uuid(),
});

export const messageParamSchema = z.object({
  id: z.string().uuid(),
});

export const messageListQuerySchema = z.object({
  beforeSequence: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

export const createMessageSchema = z.object({
  clientMessageId: z.string().uuid(),
  content: z.string().trim().min(1).max(4000),
  replyToId: z.string().uuid().optional(),
});

export const updateMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});
