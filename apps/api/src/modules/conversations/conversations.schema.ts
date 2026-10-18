import { z } from "zod";

export const createDirectConversationSchema = z.object({
  userId: z.uuid(),
});

export const conversationParamSchema = z.object({
  id: z.uuid(),
});

export const markConversationReadSchema = z.object({
  messageId: z.uuid(),
});
