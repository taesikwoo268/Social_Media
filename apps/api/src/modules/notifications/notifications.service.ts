import type { NotificationType } from "@circle/shared";
import { mediaUrl } from "../../utils";
import { notificationsRepository } from "./notifications.repository";
export const notificationsService = {
  create(
    userId: string,
    actorId: string,
    type: NotificationType,
    entityId?: string,
  ) {
    if (userId === actorId) return;
    return notificationsRepository.create(userId, actorId, type, entityId);
  },
  async list(userId: string) {
    const [rows, unreadCount] = await Promise.all([
      notificationsRepository.list(userId),
      notificationsRepository.unreadCount(userId),
    ]);
    return {
      items: rows.map((row) => ({
        ...row,
        avatarUrl: mediaUrl(row.avatarMediaId),
      })),
      nextCursor: null,
      unreadCount,
    };
  },
  readAll: (userId: string) => notificationsRepository.readAll(userId),
  read: (id: string, userId: string) =>
    notificationsRepository.read(id, userId),
};
