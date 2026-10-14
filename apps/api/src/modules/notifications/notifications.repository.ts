import { and, count, desc, eq, isNull } from "drizzle-orm";
import type { NotificationType } from "@circle/shared";
import { db } from "../../db";
import { notifications, profiles, users } from "../../schema";
export const notificationsRepository = {
  create(
    userId: string,
    actorId: string,
    type: NotificationType,
    entityId?: string,
  ) {
    return db.insert(notifications).values({ userId, actorId, type, entityId });
  },

  list(userId: string) {
    return db
      .select({
        id: notifications.id,
        type: notifications.type,
        entityId: notifications.entityId,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
        actorId: users.id,
        username: profiles.username,
        displayName: profiles.displayName,
        avatarMediaId: profiles.avatarMediaId,
      })
      .from(notifications)
      .innerJoin(users, eq(users.id, notifications.actorId))
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(30);
  },

  async unreadCount(userId: string) {
    const [row] = await db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      );
    return Number(row?.value ?? 0);
  },

  readAll(userId: string) {
    return db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      );
  },

  read(id: string, userId: string) {
    return db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  },
};
