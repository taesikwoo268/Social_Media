import { and, count, desc, eq, gt, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  conversationMembers,
  conversations,
  directConversations,
  messages,
  profiles,
  users,
} from "../../schema";

type ConversationBase = {
  id: string;
  createdAt: Date;
  lastMessageAt: Date | null;
  lastReadSequence: number;
  userLowId: string;
  userHighId: string;
};

async function hydrate(rows: ConversationBase[], viewerId: string) {
  if (!rows.length) return [];
  const conversationIds = rows.map((row) => row.id);
  const participantIds = rows.map((row) =>
    row.userLowId === viewerId ? row.userHighId : row.userLowId,
  );
  const [participants, latestMessages, unreadRows] = await Promise.all([
    db
      .select({
        id: users.id,
        username: profiles.username,
        displayName: profiles.displayName,
        avatarMediaId: profiles.avatarMediaId,
      })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(inArray(users.id, participantIds)),
    db
      .selectDistinctOn([messages.conversationId], {
        id: messages.id,
        sequence: messages.sequence,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        clientMessageId: messages.clientMessageId,
        replyToId: messages.replyToId,
        content: messages.content,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        deletedAt: messages.deletedAt,
        username: profiles.username,
        displayName: profiles.displayName,
        avatarMediaId: profiles.avatarMediaId,
      })
      .from(messages)
      .innerJoin(users, eq(users.id, messages.senderId))
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(inArray(messages.conversationId, conversationIds))
      .orderBy(messages.conversationId, desc(messages.sequence)),
    db
      .select({ conversationId: messages.conversationId, value: count() })
      .from(messages)
      .where(
        and(
          ne(messages.senderId, viewerId),
          or(
            ...rows.map((row) =>
              and(
                eq(messages.conversationId, row.id),
                gt(messages.sequence, row.lastReadSequence),
              ),
            ),
          ),
        ),
      )
      .groupBy(messages.conversationId),
  ]);
  const participantMap = new Map(participants.map((item) => [item.id, item]));
  const messageMap = new Map(
    latestMessages.map((item) => [item.conversationId, item]),
  );
  const unreadMap = new Map(
    unreadRows.map((item) => [item.conversationId, Number(item.value)]),
  );
  return rows.map((row) => ({
    ...row,
    participant: participantMap.get(
      row.userLowId === viewerId ? row.userHighId : row.userLowId,
    )!,
    lastMessage: messageMap.get(row.id) ?? null,
    unreadCount: unreadMap.get(row.id) ?? 0,
  }));
}

async function findDirectByPair(userLowId: string, userHighId: string) {
  const [row] = await db
    .select({ id: directConversations.conversationId })
    .from(directConversations)
    .where(
      and(
        eq(directConversations.userLowId, userLowId),
        eq(directConversations.userHighId, userHighId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export const conversationsRepository = {
  findDirectByPair,

  async createDirect(userLowId: string, userHighId: string) {
    try {
      return await db.transaction(async (tx) => {
        const [conversation] = await tx
          .insert(conversations)
          .values({ type: "direct" })
          .returning({ id: conversations.id });
        if (!conversation) throw new Error("Could not create conversation");
        await tx.insert(conversationMembers).values([
          { conversationId: conversation.id, userId: userLowId },
          { conversationId: conversation.id, userId: userHighId },
        ]);
        await tx.insert(directConversations).values({
          conversationId: conversation.id,
          userLowId,
          userHighId,
        });
        return conversation;
      });
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        const existing = await findDirectByPair(userLowId, userHighId);
        if (existing) return existing;
      }
      throw error;
    }
  },

  async member(conversationId: string, userId: string) {
    const [row] = await db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, userId),
        ),
      )
      .limit(1);
    return row ?? null;
  },

  async otherMemberId(conversationId: string, userId: string) {
    const [row] = await db
      .select({ userId: conversationMembers.userId })
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          ne(conversationMembers.userId, userId),
        ),
      )
      .limit(1);
    return row?.userId ?? null;
  },

  async list(userId: string) {
    const rows = await db
      .select({
        id: conversations.id,
        createdAt: conversations.createdAt,
        lastMessageAt: conversations.lastMessageAt,
        lastReadSequence: conversationMembers.lastReadSequence,
        userLowId: directConversations.userLowId,
        userHighId: directConversations.userHighId,
      })
      .from(conversationMembers)
      .innerJoin(
        conversations,
        eq(conversations.id, conversationMembers.conversationId),
      )
      .innerJoin(
        directConversations,
        eq(directConversations.conversationId, conversations.id),
      )
      .where(eq(conversationMembers.userId, userId))
      .orderBy(
        desc(
          sql`coalesce(${conversations.lastMessageAt}, ${conversations.createdAt})`,
        ),
        desc(conversations.id),
      )
      .limit(30);
    return hydrate(rows, userId);
  },

  async get(id: string, userId: string) {
    const rows = await db
      .select({
        id: conversations.id,
        createdAt: conversations.createdAt,
        lastMessageAt: conversations.lastMessageAt,
        lastReadSequence: conversationMembers.lastReadSequence,
        userLowId: directConversations.userLowId,
        userHighId: directConversations.userHighId,
      })
      .from(conversationMembers)
      .innerJoin(
        conversations,
        eq(conversations.id, conversationMembers.conversationId),
      )
      .innerJoin(
        directConversations,
        eq(directConversations.conversationId, conversations.id),
      )
      .where(
        and(eq(conversations.id, id), eq(conversationMembers.userId, userId)),
      )
      .limit(1);
    return (await hydrate(rows, userId))[0] ?? null;
  },

  markRead(conversationId: string, userId: string, sequence: number) {
    return db
      .update(conversationMembers)
      .set({
        lastReadSequence: sql`greatest(${conversationMembers.lastReadSequence}, ${sequence})`,
      })
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, userId),
        ),
      );
  },
};
