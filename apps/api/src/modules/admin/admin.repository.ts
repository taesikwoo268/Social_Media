import { and, desc, eq, ilike, inArray, isNull, or } from "drizzle-orm";
import { db } from "../../db";
import {
  media,
  postMedia,
  posts,
  profiles,
  sessions,
  users,
} from "../../schema";
import type { AccountStatus, PostModerationStatus } from "@circle/shared";
export const adminRepository = {
  users(query: string) {
    const q = `%${query.trim()}%`;
    return db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        status: users.status,
        username: profiles.username,
        displayName: profiles.displayName,
        createdAt: users.createdAt,
      })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(
        or(
          ilike(users.email, q),
          ilike(profiles.username, q),
          ilike(profiles.displayName, q),
        ),
      )
      .orderBy(desc(users.createdAt))
      .limit(50);
  },
  setUserStatus(id: string, status: AccountStatus) {
    return db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ status, updatedAt: new Date() })
        .where(eq(users.id, id));
      if (status === "suspended")
        await tx
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(and(eq(sessions.userId, id), isNull(sessions.revokedAt)));
    });
  },
  moderatePost(id: string, status: PostModerationStatus) {
    return db.transaction(async (tx) => {
      await tx
        .update(posts)
        .set({
          moderationStatus: status,
          deletedAt: status === "deleted" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, id));
      if (status === "deleted") {
        const assets = await tx
          .select({ id: postMedia.mediaId })
          .from(postMedia)
          .where(eq(postMedia.postId, id));
        if (assets.length)
          await tx.delete(media).where(
            inArray(
              media.id,
              assets.map((item) => item.id),
            ),
          );
      }
    });
  },
};
