export const USER_ROLES = ["user", "admin"] as const;
export const ACCOUNT_STATUSES = ["active", "suspended"] as const;
export const FRIEND_REQUEST_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "cancelled",
] as const;
export const POST_VISIBILITIES = ["public", "friends"] as const;
export const POST_MODERATION_STATUSES = [
  "visible",
  "hidden",
  "deleted",
] as const;
export const MEDIA_PURPOSES = ["avatar", "cover", "post"] as const;
export const NOTIFICATION_TYPES = [
  "friend_request",
  "friend_accepted",
  "post_like",
  "comment",
  "reply",
] as const;
export const CONVERSATION_TYPES = ["direct"] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];
export type FriendRequestStatus = (typeof FRIEND_REQUEST_STATUSES)[number];
export type PostVisibility = (typeof POST_VISIBILITIES)[number];
export type PostModerationStatus = (typeof POST_MODERATION_STATUSES)[number];
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type ConversationType = (typeof CONVERSATION_TYPES)[number];

export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
export interface SessionUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
  status: AccountStatus;
  avatarUrl: string | null;
}

export interface ChatUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface ChatMessage {
  id: string;
  sequence: number;
  conversationId: string;
  content: string;
  sender: ChatUser;
  replyToId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  mine: boolean;
}

export interface ConversationSummary {
  id: string;
  participant: ChatUser;
  lastMessage: ChatMessage | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export const MEDIA_LIMITS = {
  avatar: 5_242_880,
  cover: 10_485_760,
  post: 5_242_880,
} as const;
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function encodeCursor(createdAt: string | Date, id: string) {
  return btoa(JSON.stringify([new Date(createdAt).toISOString(), id]));
}

export function decodeCursor(cursor?: string | null): [Date, string] | null {
  if (!cursor) return null;
  try {
    const [date, id] = JSON.parse(atob(cursor));
    if (typeof date !== "string" || typeof id !== "string") return null;
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? null : [parsed, id];
  } catch {
    return null;
  }
}

export type RealtimeServerEvent =
  | {
      type: "connection.ready";
      payload: { userId: string };
    }
  | {
      type: "message.created";
      requestId?: string;
      payload: { conversationId: string; message: ChatMessage };
    }
  | {
      type: "message.updated";
      requestId?: string;
      payload: { conversationId: string; message: ChatMessage };
    }
  | {
      type: "message.deleted";
      requestId?: string;
      payload: { conversationId: string; messageId: string };
    }
  | {
      type: "conversation.read";
      requestId?: string;
      payload: {
        conversationId: string;
        userId: string;
        messageId: string;
        sequence: number;
      };
    }
  | {
      type: "typing.changed";
      payload: {
        conversationId: string;
        userId: string;
        typing: boolean;
      };
    }
  | {
      type: "pong";
      requestId?: string;
      payload: { timestamp: number };
    }
  | {
      type: "error";
      requestId?: string;
      payload: { code: string; message: string };
    };

export type RealtimeClientEvent =
  | {
      type: "ping";
      requestId: string;
    }
  | {
      type: "message.send";
      requestId: string;
      payload: {
        conversationId: string;
        clientMessageId: string;
        content: string;
        replyToId?: string;
      };
    }
  | {
      type: "message.update";
      requestId: string;
      payload: { messageId: string; content: string };
    }
  | {
      type: "message.delete";
      requestId: string;
      payload: { messageId: string };
    }
  | {
      type: "conversation.read";
      requestId: string;
      payload: { conversationId: string; messageId: string };
    }
  | {
      type: "typing.set";
      payload: {
        conversationId: string;
        typing: boolean;
      };
    };
