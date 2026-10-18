import type { z } from "zod";
import type {
  createDirectConversationSchema,
  markConversationReadSchema,
} from "./conversations.schema";

export type CreateDirectConversationInput = z.infer<
  typeof createDirectConversationSchema
>;
export type MarkConversationReadInput = z.infer<
  typeof markConversationReadSchema
>;
export type ConversationViewer = {
  id: string;
  role: "user" | "admin";
};
