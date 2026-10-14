import { and, count, desc, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { db } from "../../db";
import {
  comments,
  friendships,
  media,
  postLikes,
  postMedia,
  posts,
  profiles,
  users,
} from "../../schema";
import type { PostVisibility } from "@circle/shared";

export const postsRepository = {
  async findById(id: string) {
    const [row] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);
    return row ?? null;
  },

  async details(postId: string, authorId: string, viewerId: string) {
    const [[author], mediaRows, [likes], [commentCount], [liked]] =
      await Promise.all([
        db
          .select({
            id: users.id,
            username: profiles.username,
            displayName: profiles.displayName,
            avatarMediaId: profiles.avatarMediaId,
          })
          .from(users)
          .innerJoin(profiles, eq(profiles.userId, users.id))
          .where(eq(users.id, authorId))
          .limit(1),
        db
          .select({
            id: media.id,
            mimeType: media.mimeType,
            position: postMedia.position,
          })
          .from(postMedia)
          .innerJoin(media, eq(media.id, postMedia.mediaId))
          .where(eq(postMedia.postId, postId))
          .orderBy(postMedia.position),
        db
          .select({ value: count() })
          .from(postLikes)
          .where(eq(postLikes.postId, postId)),
        db
          .select({ value: count() })
          .from(comments)
          .where(and(eq(comments.postId, postId), isNull(comments.deletedAt))),
        db
          .select({ value: postLikes.userId })
          .from(postLikes)
          .where(
            and(eq(postLikes.postId, postId), eq(postLikes.userId, viewerId)),
          )
          .limit(1),
      ]);
    return {
      author,
      mediaRows,
      likeCount: Number(likes?.value ?? 0),
      commentCount: Number(commentCount?.value ?? 0),
      liked: Boolean(liked),
    };
  },

  async friendIds(userId: string) {
    const rows = await db
      .select()
      .from(friendships)
      .where(
        or(
          eq(friendships.userLowId, userId),
          eq(friendships.userHighId, userId),
        ),
      );
    return rows.map((row) =>
      row.userLowId === userId ? row.userHighId : row.userLowId,
    );
  },

  listFeed(authorIds: string[], cursor: [Date, string] | null) {
    return db
      .select()
      .from(posts)
      .where(
        and(
          isNull(posts.deletedAt),
          eq(posts.moderationStatus, "visible"),
          or(
            eq(posts.visibility, "public"),
            inArray(posts.authorId, authorIds),
          ),
          cursor
            ? or(
                lt(posts.createdAt, cursor[0]),
                and(eq(posts.createdAt, cursor[0]), lt(posts.id, cursor[1])),
              )
            : undefined,
        ),
      )
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(11);
  },

  create(
    authorId: string,
    content: string,
    visibility: PostVisibility,
    assets: Awaited<ReturnType<typeof import("../../utils").parseImage>>[],
  ) {
    return db.transaction(async (tx) => {
      const [created] = await tx
        .insert(posts)
        .values({ authorId, content, visibility })
        .returning();
      if (!created) throw new Error("Could not create post");
      for (let index = 0; index < assets.length; index++) {
        const [asset] = await tx
          .insert(media)
          .values({ ownerId: authorId, purpose: "post", ...assets[index]! })
          .returning({ id: media.id });
        if (!asset) throw new Error("Could not store post media");
        await tx
          .insert(postMedia)
          .values({ postId: created.id, mediaId: asset.id, position: index });
      }
      return created;
    });
  },

  async update(id: string, content: string, visibility: PostVisibility) {
    const [row] = await db
      .update(posts)
      .set({ content, visibility, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    if (!row) throw new Error("Could not update post");
    return row;
  },

  async softDelete(id: string) {
    await db.transaction(async (tx) => {
      const assets = await tx
        .select({ id: postMedia.mediaId })
        .from(postMedia)
        .where(eq(postMedia.postId, id));
      await tx
        .update(posts)
        .set({ moderationStatus: "deleted", deletedAt: new Date() })
        .where(eq(posts.id, id));
      if (assets.length)
        await tx.delete(media).where(
          inArray(
            media.id,
            assets.map((item) => item.id),
          ),
        );
    });
  },

  like(postId: string, userId: string) {
    return db
      .insert(postLikes)
      .values({ postId, userId })
      .onConflictDoNothing()
      .returning({ userId: postLikes.userId });
  },

  unlike(postId: string, userId: string) {
    return db
      .delete(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
  },
};
