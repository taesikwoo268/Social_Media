import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db";
import { comments, profiles, users } from "../../schema";

export const commentsRepository = {
  list(postId: string) {
    return db
      .select({
        id: comments.id,
        postId: comments.postId,
        parentId: comments.parentId,
        content: comments.content,
        createdAt: comments.createdAt,
        authorId: users.id,
        username: profiles.username,
        displayName: profiles.displayName,
        avatarMediaId: profiles.avatarMediaId,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.authorId))
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(and(eq(comments.postId, postId), isNull(comments.deletedAt)))
      .orderBy(comments.createdAt);
  },

  async parent(id: string, postId: string) {
    const [row] = await db
      .select({
        id: comments.id,
        parentId: comments.parentId,
        authorId: comments.authorId,
      })
      .from(comments)
      .where(
        and(
          eq(comments.id, id),
          eq(comments.postId, postId),
          isNull(comments.deletedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  },

  async create(
    postId: string,
    authorId: string,
    content: string,
    parentId?: string,
  ) {
    const [row] = await db
      .insert(comments)
      .values({ postId, authorId, parentId: parentId ?? null, content })
      .returning();
    if (!row) throw new Error("Could not create comment");
    return row;
  },

  async byId(id: string) {
    const [row] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, id))
      .limit(1);
    return row ?? null;
  },

  async update(id: string, content: string) {
    const [row] = await db
      .update(comments)
      .set({ content, updatedAt: new Date() })
      .where(eq(comments.id, id))
      .returning();
    return row;
  },

  remove(id: string) {
    return db
      .update(comments)
      .set({ deletedAt: new Date(), content: "" })
      .where(eq(comments.id, id));
  },
};
