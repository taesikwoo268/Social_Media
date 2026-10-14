import type { z } from "zod";
import type {
  createFriendRequestSchema,
  friendActionSchema,
} from "./friends.schema";
export type CreateFriendRequestInput = z.infer<
  typeof createFriendRequestSchema
>;
export type FriendActionInput = z.infer<typeof friendActionSchema>;
