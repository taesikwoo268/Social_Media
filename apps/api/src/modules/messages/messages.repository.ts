import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "../../db";
import { conversations, messages, profiles, users } from "../../schema";
import type { CreateMessageInput } from "./messages.types";

const messageSelection = {
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
};

export const messagesRepository = {
  list(
    conversationId: string,
    beforeSequence: number | undefined,
    limit: number,
  ) {
    return db
      .select(messageSelection)
      .from(messages)
      .innerJoin(users, eq(users.id, messages.senderId))
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(
        beforeSequence
          ? and(
              eq(messages.conversationId, conversationId),
              lt(messages.sequence, beforeSequence),
            )
          : eq(messages.conversationId, conversationId),
      )
      .orderBy(desc(messages.sequence))
      .limit(limit + 1);
  },

  async byId(id: string) {
    const [row] = await db
      .select(messageSelection)
      .from(messages)
      .innerJoin(users, eq(users.id, messages.senderId))
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(messages.id, id))
      .limit(1);
    return row ?? null;
  },

  async reply(id: string, conversationId: string) {
    const [row] = await db
      .select({ id: messages.id })
      .from(messages)
      .where(
        and(eq(messages.id, id), eq(messages.conversationId, conversationId)),
      )
      .limit(1);
    return row ?? null;
  },

  async create(
    conversationId: string,
    senderId: string,
    input: CreateMessageInput,
  ) {
    return db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(messages)
        .values({
          conversationId,
          senderId,
          clientMessageId: input.clientMessageId,
          content: input.content,
          replyToId: input.replyToId,
        })
        .onConflictDoNothing({
          target: [messages.senderId, messages.clientMessageId],
        })
        .returning({ id: messages.id });

      let result = inserted
        ? { id: inserted.id, conversationId, created: true }
        : null;
      if (!result) {
        const [existing] = await tx
          .select({
            id: messages.id,
            conversationId: messages.conversationId,
          })
          .from(messages)
          .where(
            and(
              eq(messages.senderId, senderId),
              eq(messages.clientMessageId, input.clientMessageId),
            ),
          )
          .limit(1);
        if (existing) result = { ...existing, created: false };
      } else {
        const now = new Date();
        await tx
          .update(conversations)
          .set({ lastMessageAt: now, updatedAt: now })
          .where(eq(conversations.id, conversationId));
      }

      if (!result) throw new Error("Could not create message");
      return result;
    });
  },

  update(id: string, content: string) {
    return db
      .update(messages)
      .set({ content, updatedAt: new Date() })
      .where(eq(messages.id, id));
  },

  softDelete(id: string) {
    return db
      .update(messages)
      .set({ content: "", deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(messages.id, id));
  },
};
