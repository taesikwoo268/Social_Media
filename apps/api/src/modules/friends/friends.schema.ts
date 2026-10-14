import { z } from "zod";
export const createFriendRequestSchema = z.object({ userId: z.uuid() });
export const friendActionSchema = z.object({
  id: z.uuid(),
  action: z.enum(["accept", "reject", "cancel"]),
});
export const friendUserParamSchema = z.object({ userId: z.uuid() });
