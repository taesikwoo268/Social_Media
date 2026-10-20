import { badRequest, forbidden, notFound } from "../../errors";
import { mediaUrl, normalizePair } from "../../utils";
import { friendsRepository } from "../friends/friends.repository";
import { messagesRepository } from "../messages/messages.repository";
import { conversationsRepository } from "./conversations.repository";
import type {
  ConversationViewer,
  CreateDirectConversationInput,
  MarkConversationReadInput,
} from "./conversations.types";

function serializeMessage(
  row: NonNullable<
    Awaited<ReturnType<typeof conversationsRepository.get>>
  >["lastMessage"],
  viewerId: string,
) {
  if (!row) return null;
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

function serializeConversation(
  row: NonNullable<Awaited<ReturnType<typeof conversationsRepository.get>>>,
  viewerId: string,
) {
  return {
    id: row.id,
    participant: {
      id: row.participant.id,
      username: row.participant.username,
      displayName: row.participant.displayName,
      avatarUrl: mediaUrl(row.participant.avatarMediaId),
    },
    lastMessage: serializeMessage(row.lastMessage, viewerId),
    lastMessageAt: row.lastMessageAt,
    unreadCount: row.unreadCount,
  };
}

export async function requireConversationMember(
  conversationId: string,
  userId: string,
) {
  const member = await conversationsRepository.member(conversationId, userId);
  if (!member) throw notFound("Không tìm thấy cuộc trò chuyện");
  return member;
}

export const conversationsService = {
  async createDirect(
    input: CreateDirectConversationInput,
    viewer: ConversationViewer,
  ) {
    if (input.userId === viewer.id)
      throw badRequest("Không thể trò chuyện với chính mình");
    if (!(await friendsRepository.activeUser(input.userId)))
      throw notFound("Không tìm thấy người dùng");
    if (!(await friendsRepository.areFriends(viewer.id, input.userId)))
      throw forbidden("Chỉ có thể nhắn tin với bạn bè");
    const [low, high] = normalizePair(viewer.id, input.userId);
    const existing = await conversationsRepository.findDirectByPair(low, high);
    const conversation =
      existing ?? (await conversationsRepository.createDirect(low, high));
    return this.get(conversation.id, viewer.id);
  },

  async list(userId: string) {
    const rows = await conversationsRepository.list(userId);
    return {
      items: rows.map((row) => serializeConversation(row, userId)),
      nextCursor: null,
      unreadCount: rows.reduce((total, row) => total + row.unreadCount, 0),
    };
  },

  async get(id: string, userId: string) {
    const row = await conversationsRepository.get(id, userId);
    if (!row) throw notFound("Không tìm thấy cuộc trò chuyện");
    return serializeConversation(row, userId);
  },

  async markRead(id: string, input: MarkConversationReadInput, userId: string) {
    await requireConversationMember(id, userId);
    const message = await messagesRepository.byId(input.messageId);
    if (!message || message.conversationId !== id)
      throw badRequest("Tin nhắn không thuộc cuộc trò chuyện");
    await conversationsRepository.markRead(id, userId, message.sequence);
    return { sequence: message.sequence };
  },
};
