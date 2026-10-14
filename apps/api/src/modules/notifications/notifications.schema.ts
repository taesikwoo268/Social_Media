import { z } from "zod";
export const notificationParamSchema = z.object({ id: z.uuid() });
export const notificationsQuerySchema = z.object({
  cursor: z.string().optional(),
});
