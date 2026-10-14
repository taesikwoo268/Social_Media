import { badRequest, forbidden, notFound } from "../../errors";
import { canCreateReply } from "../../domain";
import { mediaUrl } from "../../utils";
import { notificationsService } from "../notifications/notifications.service";
import { getVisiblePost } from "../posts/posts.service";
import { commentsRepository } from "./comments.repository";
import type {
  CommentViewer,
  CreateCommentInput,
  UpdateCommentInput,
} from "./comments.types";

export const commentsService = {
  async list(postId: string, viewer: CommentViewer) {
    if (!(await getVisiblePost(postId, viewer.id, viewer.role === "admin")))
      throw notFound();
    const rows = await commentsRepository.list(postId);
    return {
      items: rows.map((row) => ({
        ...row,
        avatarUrl: mediaUrl(row.avatarMediaId),
        canEdit: row.authorId === viewer.id,
      })),
      nextCursor: null,
    };
  },
  async create(
    postId: string,
    input: CreateCommentInput,
    viewer: CommentViewer,
  ) {
    const post = await getVisiblePost(
      postId,
      viewer.id,
      viewer.role === "admin",
    );
    if (!post) throw notFound();
    let targetUserId = post.authorId;
    if (input.parentId) {
      const parent = await commentsRepository.parent(input.parentId, postId);
      if (!parent) throw notFound("Không tìm thấy bình luận gốc");
      if (!canCreateReply(parent))
        throw badRequest("Chỉ hỗ trợ trả lời một cấp");
      targetUserId = parent.authorId;
    }
    const created = await commentsRepository.create(
      postId,
      viewer.id,
      input.content,
      input.parentId,
    );
    await notificationsService.create(
      targetUserId,
      viewer.id,
      input.parentId ? "reply" : "comment",
      created.id,
    );
    return created;
  },
  async update(id: string, input: UpdateCommentInput, viewerId: string) {
    const row = await commentsRepository.byId(id);
    if (!row || row.deletedAt) throw notFound();
    if (row.authorId !== viewerId) throw forbidden();
    return commentsRepository.update(id, input.content);
  },
  async remove(id: string, viewer: CommentViewer) {
    const row = await commentsRepository.byId(id);
    if (!row) throw notFound();
    if (row.authorId !== viewer.id && viewer.role !== "admin")
      throw forbidden();
    await commentsRepository.remove(id);
  },
};
