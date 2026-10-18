import { badRequest, forbidden, notFound } from "../../errors";
import { mediaUrl } from "../../utils";
import { conversationsRepository } from "../conversations/conversations.repository";
import { requireConversationMember } from "../conversations/conversations.service";
import { friendsRepository } from "../friends/friends.repository";
import { messagesRepository } from "./messages.repository";
import type {
  CreateMessageInput,
  MessageListQuery,
  MessageViewer,
  UpdateMessageInput,
} from "./messages.types";

type MessageRow = NonNullable<
  Awaited<ReturnType<typeof messagesRepository.byId>>
>;

function serialize(row: MessageRow, viewerId: string) {
  return {
    id: row.id,
    sequence: row.sequence,
    conversationId: row.conversationId,
    content: row.deletedAt ? "" : row.content,
    replyToId: row.replyToId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    mine: row.senderId === viewerId,
    sender: {
      id: row.senderId,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: mediaUrl(row.avatarMediaId),
    },
  };
}

async function requireOwnedMessage(id: string, viewerId: string) {
  const message = await messagesRepository.byId(id);
  if (!message) throw notFound("Không tìm thấy tin nhắn");
  await requireConversationMember(message.conversationId, viewerId);
  if (message.senderId !== viewerId)
    throw forbidden("Bạn chỉ có thể thay đổi tin nhắn của mình");
  if (message.deletedAt) throw badRequest("Tin nhắn đã bị xóa");
  return message;
}

export const messagesService = {
  async list(
    conversationId: string,
    query: MessageListQuery,
    viewerId: string,
  ) {
    await requireConversationMember(conversationId, viewerId);
    const rows = await messagesRepository.list(
      conversationId,
      query.beforeSequence,
      query.limit,
    );
    const hasMore = rows.length > query.limit;
    const page = rows.slice(0, query.limit);
    const oldest = page[page.length - 1];
    return {
      items: [...page].reverse().map((row) => serialize(row, viewerId)),
      nextCursor: hasMore && oldest ? String(oldest.sequence) : null,
    };
  },

  async create(
    conversationId: string,
    input: CreateMessageInput,
    viewer: MessageViewer,
  ) {
    await requireConversationMember(conversationId, viewer.id);
    const otherId = await conversationsRepository.otherMemberId(
      conversationId,
      viewer.id,
    );
    if (!otherId || !(await friendsRepository.areFriends(viewer.id, otherId)))
      throw forbidden("Hai người không còn là bạn bè");
    if (
      input.replyToId &&
      !(await messagesRepository.reply(input.replyToId, conversationId))
    ) {
      throw badRequest("Tin nhắn trả lời không hợp lệ");
    }
    const created = await messagesRepository.create(
      conversationId,
      viewer.id,
      input,
    );
    if (created.conversationId !== conversationId)
      throw badRequest("Mã gửi tin nhắn đã được sử dụng");
    const message = await messagesRepository.byId(created.id);
    if (!message) throw new Error("Could not load message");
    return { message: serialize(message, viewer.id), created: created.created };
  },

  async update(id: string, input: UpdateMessageInput, viewerId: string) {
    await requireOwnedMessage(id, viewerId);
    await messagesRepository.update(id, input.content);
    return serialize((await messagesRepository.byId(id))!, viewerId);
  },

  async remove(id: string, viewerId: string) {
    await requireOwnedMessage(id, viewerId);
    await messagesRepository.softDelete(id);
  },
};
