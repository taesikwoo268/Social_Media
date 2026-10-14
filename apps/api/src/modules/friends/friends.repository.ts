import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "../../db";
import { friendRequests, friendships, profiles, users } from "../../schema";
import { normalizePair } from "../../utils";

export const friendsRepository = {
  async areFriends(a: string, b: string) {
    if (a === b) return true;
    const [low, high] = normalizePair(a, b);
    const [row] = await db
      .select({ id: friendships.userLowId })
      .from(friendships)
      .where(
        and(eq(friendships.userLowId, low), eq(friendships.userHighId, high)),
      )
      .limit(1);
    return Boolean(row);
  },

  incoming(userId: string) {
    return db
      .select({
        id: friendRequests.id,
        senderId: users.id,
        username: profiles.username,
        displayName: profiles.displayName,
        avatarMediaId: profiles.avatarMediaId,
        createdAt: friendRequests.createdAt,
      })
      .from(friendRequests)
      .innerJoin(users, eq(users.id, friendRequests.senderId))
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(
        and(
          eq(friendRequests.receiverId, userId),
          eq(friendRequests.status, "pending"),
        ),
      )
      .orderBy(desc(friendRequests.createdAt));
  },

  async list(userId: string) {
    const links = await db
      .select()
      .from(friendships)
      .where(
        or(
          eq(friendships.userLowId, userId),
          eq(friendships.userHighId, userId),
        ),
      );
    const ids = links.map((row) =>
      row.userLowId === userId ? row.userHighId : row.userLowId,
    );
    return ids.length
      ? db
          .select({
            id: users.id,
            username: profiles.username,
            displayName: profiles.displayName,
            avatarMediaId: profiles.avatarMediaId,
          })
          .from(users)
          .innerJoin(profiles, eq(profiles.userId, users.id))
          .where(inArray(users.id, ids))
      : [];
  },

  async activeUser(id: string) {
    const [row] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, id), eq(users.status, "active")))
      .limit(1);
    return row ?? null;
  },

  async pending(a: string, b: string) {
    const [row] = await db
      .select({ id: friendRequests.id })
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.status, "pending"),
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
        ),
      )
      .limit(1);
    return row ?? null;
  },

  async create(senderId: string, receiverId: string) {
    const [row] = await db
      .insert(friendRequests)
      .values({ senderId, receiverId })
      .returning({ id: friendRequests.id });
    if (!row) throw new Error("Could not create friend request");
    return row;
  },

  async request(id: string) {
    const [row] = await db
      .select()
      .from(friendRequests)
      .where(
        and(eq(friendRequests.id, id), eq(friendRequests.status, "pending")),
      )
      .limit(1);
    return row ?? null;
  },

  setRequestStatus(id: string, status: "accepted" | "rejected" | "cancelled") {
    return db
      .update(friendRequests)
      .set({ status, updatedAt: new Date() })
      .where(eq(friendRequests.id, id));
  },

  accept(id: string, low: string, high: string) {
    return db.transaction(async (tx) => {
      await tx
        .insert(friendships)
        .values({ userLowId: low, userHighId: high })
        .onConflictDoNothing();
      await tx
        .update(friendRequests)
        .set({ status: "accepted", updatedAt: new Date() })
        .where(eq(friendRequests.id, id));
    });
  },

  remove(low: string, high: string) {
    return db
      .delete(friendships)
      .where(
        and(eq(friendships.userLowId, low), eq(friendships.userHighId, high)),
      );
  },
};
