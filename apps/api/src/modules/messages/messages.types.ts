import { z } from "zod";
import {
  createMessageSchema,
  messageListQuerySchema,
  updateMessageSchema,
} from "./messages.schema";

export type MessageListQuery = z.infer<typeof messageListQuerySchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;

export type MessageViewer = {
  id: string;
};
