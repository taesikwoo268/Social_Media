import type { z } from "zod";
import type { notificationsQuerySchema } from "./notifications.schema";
export type NotificationsQuery = z.infer<typeof notificationsQuerySchema>;
