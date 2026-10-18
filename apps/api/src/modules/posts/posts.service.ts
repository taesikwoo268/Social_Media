import { decodeCursor, encodeCursor } from "@circle/shared";
import { badRequest, forbidden, notFound } from "../../errors";
import { canViewPost } from "../../domain";
import { mediaUrl, parseImage } from "../../utils";
import { friendsRepository } from "../friends/friends.repository";
import { notificationsService } from "../notifications/notifications.service";
import { postsRepository } from "./posts.repository";
import type {
  CreatePostInput,
  FeedQuery,
  PostEntity,
  UpdatePostInput,
  Viewer,
} from "./posts.types";

export async function getVisiblePost(
  postId: string,
  viewerId: string,
  isAdmin = false,
) {
  const post = await postsRepository.findById(postId);
  if (
    !post ||
    post.deletedAt ||
    (post.moderationStatus !== "visible" && !isAdmin)
  )
    return null;
  return canViewPost({
    viewerId,
    authorId: post.authorId,
    visibility: post.visibility,
    admin: isAdmin,
    friends: await friendsRepository.areFriends(post.authorId, viewerId),
  })
    ? post
    : null;
}

export async function serializePost(post: PostEntity, viewerId: string) {
  const details = await postsRepository.details(
    post.id,
    post.authorId,
    viewerId,
  );
  return {
    id: post.id,
    content: post.content,
    visibility: post.visibility,
    moderationStatus: post.moderationStatus,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: {
      ...details.author,
      avatarUrl: mediaUrl(details.author?.avatarMediaId ?? null),
    },
    media: details.mediaRows.map((item) => ({
      id: item.id,
      url: mediaUrl(item.id),
      mimeType: item.mimeType,
    })),
    likeCount: details.likeCount,
    commentCount: details.commentCount,
    liked: details.liked,
    canEdit: viewerId === post.authorId,
  };
}

export const postsService = {
  async create(input: CreatePostInput, viewer: Viewer) {
    const files = !input.images
      ? []
      : Array.isArray(input.images)
        ? input.images
        : [input.images];
    if (!input.content.trim() && !files.length)
      throw badRequest("Bài viết cần nội dung hoặc ảnh");
    const assets = await Promise.all(
      files.map((file) => parseImage(file, "post")),
    );
    return serializePost(
      await postsRepository.create(
        viewer.id,
        input.content.trim(),
        input.visibility,
        assets,
      ),
      viewer.id,
    );
  },
  async get(id: string, viewer: Viewer) {
    const post = await getVisiblePost(id, viewer.id, viewer.role === "admin");
    if (!post) throw notFound("Không tìm thấy bài viết");
    return serializePost(post, viewer.id);
  },
  async update(id: string, input: UpdatePostInput, viewer: Viewer) {
    const post = await postsRepository.findById(id);
    if (!post || post.deletedAt) throw notFound();
    if (post.authorId !== viewer.id) throw forbidden();
    return serializePost(
      await postsRepository.update(id, input.content.trim(), input.visibility),
      viewer.id,
    );
  },
  async remove(id: string, viewer: Viewer) {
    const post = await postsRepository.findById(id);
    if (!post) throw notFound();
    if (post.authorId !== viewer.id && viewer.role !== "admin")
      throw forbidden();
    await postsRepository.softDelete(id);
  },
  async like(id: string, viewer: Viewer) {
    const post = await getVisiblePost(id, viewer.id, viewer.role === "admin");
    if (!post) throw notFound();
    const inserted = await postsRepository.like(id, viewer.id);
    if (inserted.length)
      await notificationsService.create(
        post.authorId,
        viewer.id,
        "post_like",
        id,
      );
  },
  unlike(id: string, viewerId: string) {
    return postsRepository.unlike(id, viewerId);
  },
  async feed(query: FeedQuery, viewer: Viewer) {
    const rows = await postsRepository.listFeed(
      [viewer.id, ...(await postsRepository.friendIds(viewer.id))],
      decodeCursor(query.cursor),
    );
    const page = rows.slice(0, 10);
    const lastPost = page[page.length - 1];
    return {
      items: await Promise.all(
        page.map((post) => serializePost(post, viewer.id)),
      ),
      nextCursor:
        rows.length > 10 && lastPost
          ? encodeCursor(lastPost.createdAt, lastPost.id)
          : null,
    };
  },
};
