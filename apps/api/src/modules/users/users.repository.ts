import { and, desc, eq, ilike, isNull, ne, or } from "drizzle-orm";
import { db } from "../../db";
import { friendRequests, media, posts, profiles, users } from "../../schema";
import type { UpdateProfileInput } from "./users.types";

export const usersRepository = {
  search(query: string, excludeId: string) {
    const q = `%${query.trim()}%`;
    return db
      .select({
        id: users.id,
        username: profiles.username,
        displayName: profiles.displayName,
        bio: profiles.bio,
        avatarMediaId: profiles.avatarMediaId,
      })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(
        and(
          eq(users.status, "active"),
          ne(users.id, excludeId),
          or(ilike(profiles.username, q), ilike(profiles.displayName, q)),
        ),
      )
      .limit(20);
  },

  async byUsername(username: string) {
    const [row] = await db
      .select({
        id: users.id,
        username: profiles.username,
        displayName: profiles.displayName,
        bio: profiles.bio,
        avatarMediaId: profiles.avatarMediaId,
        coverMediaId: profiles.coverMediaId,
      })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(profiles.username, username))
      .limit(1);
    return row ?? null;
  },

  async pendingRequest(a: string, b: string) {
    const [row] = await db
      .select({ id: friendRequests.id, senderId: friendRequests.senderId })
      .from(friendRequests)
      .where(
        and(
          or(
            and(
              eq(friendRequests.senderId, a),
              eq(friendRequests.receiverId, b),
            ),
            and(
              eq(friendRequests.senderId, b),
              eq(friendRequests.receiverId, a),
            ),
          ),
          eq(friendRequests.status, "pending"),
        ),
      )
      .limit(1);
    return row ?? null;
  },

  listPosts(userId: string, publicOnly: boolean) {
    return db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.authorId, userId),
          isNull(posts.deletedAt),
          eq(posts.moderationStatus, "visible"),
          publicOnly ? eq(posts.visibility, "public") : undefined,
        ),
      )
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(30);
  },

  async usernameTaken(username: string, excludeId: string) {
    const [row] = await db
      .select({ id: profiles.userId })
      .from(profiles)
      .where(
        and(eq(profiles.username, username), ne(profiles.userId, excludeId)),
      )
      .limit(1);
    return Boolean(row);
  },

  updateProfile(userId: string, values: Partial<UpdateProfileInput>) {
    return db.update(profiles).set(values).where(eq(profiles.userId, userId));
  },

  async currentMedia(userId: string, purpose: "avatar" | "cover") {
    const column =
      purpose === "avatar" ? profiles.avatarMediaId : profiles.coverMediaId;
    const [row] = await db
      .select({ id: column })
      .from(profiles)
      .where(eq(profiles.userId, userId));
    return row?.id ?? null;
  },

  async saveMedia(
    userId: string,
    purpose: "avatar" | "cover",
    image: Awaited<ReturnType<(typeof import("../../utils"))["parseImage"]>>,
  ) {
    const [created] = await db
      .insert(media)
      .values({ ownerId: userId, purpose, ...image })
      .returning({ id: media.id });
    if (!created) throw new Error("Could not store media");
    await db
      .update(profiles)
      .set(
        purpose === "avatar"
          ? { avatarMediaId: created.id }
          : { coverMediaId: created.id },
      )
      .where(eq(profiles.userId, userId));
    return created.id;
  },

  deleteMedia(id: string, ownerId: string) {
    return db
      .delete(media)
      .where(and(eq(media.id, id), eq(media.ownerId, ownerId)));
  },
};
