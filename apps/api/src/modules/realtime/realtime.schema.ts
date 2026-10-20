import { z } from "zod";

export const sendMessageEventSchema = z.object({
  type: z.literal("message.send"),
  requestId: z.string().uuid(),
  payload: z.object({
    conversationId: z.string().uuid(),
    clientMessageId: z.string().uuid(),
    content: z.string().trim().min(1).max(4000),
    replyToId: z.string().uuid().optional(),
  }),
});

export const readConversationEventSchema = z.object({
  type: z.literal("conversation.read"),
  requestId: z.string().uuid(),
  payload: z.object({
    conversationId: z.string().uuid(),
    messageId: z.string().uuid(),
  }),
});

export const pingEventSchema = z.object({
  type: z.literal("ping"),
  requestId: z.string().uuid(),
});

export const updateMessageEventSchema = z.object({
  type: z.literal("message.update"),
  requestId: z.string().uuid(),
  payload: z.object({
    messageId: z.string().uuid(),
    content: z.string().trim().min(1).max(4000),
  }),
});

export const deleteMessageEventSchema = z.object({
  type: z.literal("message.delete"),
  requestId: z.string().uuid(),
  payload: z.object({
    messageId: z.string().uuid(),
  }),
});

export const typingEventSchema = z.object({
  type: z.literal("typing.set"),
  payload: z.object({
    conversationId: z.string().uuid(),
    typing: z.boolean(),
  }),
});

export const socketEventSchema = z.discriminatedUnion("type", [
  sendMessageEventSchema,
  updateMessageEventSchema,
  deleteMessageEventSchema,
  readConversationEventSchema,
  typingEventSchema,
  pingEventSchema,
]);
