import { Elysia } from "elysia";
import type { ChatMessage, RealtimeServerEvent } from "@circle/shared";
import { requireUser } from "../../auth";
import { ApiException } from "../../errors";
import { accessToken, isAllowedOrigin } from "../../shared/http";
import { conversationsRepository } from "../conversations/conversations.repository";
import {
  conversationsService,
  requireConversationMember,
} from "../conversations/conversations.service";
import { friendsRepository } from "../friends/friends.repository";
import { messagesService } from "../messages/messages.service";
import { socketEventSchema } from "./realtime.schema";

const userTopic = (userId: string) => `user:${userId}`;
const stringifyEvent = (event: RealtimeServerEvent) => JSON.stringify(event);

function parseSocketMessage(rawMessage: unknown) {
  if (typeof rawMessage !== "string") return rawMessage;
  try {
    return JSON.parse(rawMessage);
  } catch {
    return rawMessage;
  }
}

function createSocketError(error: unknown, requestId?: string) {
  if (error instanceof ApiException) {
    return {
      type: "error" as const,
      requestId,
      payload: { code: error.code, message: error.message },
    };
  }
  console.error(error);
  return {
    type: "error" as const,
    requestId,
    payload: {
      code: "INTERNAL_ERROR",
      message: "Đã có lỗi xảy ra",
    },
  };
}

type ServiceMessage = Awaited<ReturnType<typeof messagesService.update>>;

function forSocket(message: ServiceMessage, mine = message.mine): ChatMessage {
  return {
    ...message,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    deletedAt: message.deletedAt?.toISOString() ?? null,
    mine,
  };
}

export const realtimeRoutes = new Elysia({ name: "realtime-routes" })
  .resolve(async ({ request, cookie }) => {
    if (!isAllowedOrigin(request.headers.get("origin"))) {
      throw new ApiException(
        403,
        "INVALID_ORIGIN",
        "Nguồn yêu cầu không hợp lệ",
      );
    }
    return { socketUser: await requireUser(accessToken(cookie)) };
  })
  .ws("/ws", {
    maxPayloadLength: 16 * 1024,
    idleTimeout: 60,
    backpressureLimit: 1024 * 1024,
    closeOnBackpressureLimit: true,

    open(ws) {
      const userId = ws.data.socketUser.id;
      ws.subscribe(userTopic(userId));
      ws.send(
        stringifyEvent({
          type: "connection.ready",
          payload: { userId },
        }),
      );
    },

    async message(ws, rawMessage) {
      const parsed = socketEventSchema.safeParse(
        parseSocketMessage(rawMessage),
      );
      if (!parsed.success) {
        ws.send(
          stringifyEvent({
            type: "error",
            payload: {
              code: "INVALID_EVENT",
              message: "Sự kiện WebSocket không hợp lệ",
            },
          }),
        );
        return;
      }

      const event = parsed.data;
      const viewer = ws.data.socketUser;

      try {
        if (event.type === "ping") {
          ws.send(
            stringifyEvent({
              type: "pong",
              requestId: event.requestId,
              payload: { timestamp: Date.now() },
            }),
          );
          return;
        }

        if (!(await friendsRepository.activeUser(viewer.id))) {
          ws.close(1008, "Tài khoản không còn hoạt động");
          return;
        }

        if (event.type === "typing.set") {
          await requireConversationMember(
            event.payload.conversationId,
            viewer.id,
          );
          const otherUserId = await conversationsRepository.otherMemberId(
            event.payload.conversationId,
            viewer.id,
          );
          if (otherUserId) {
            ws.publish(
              userTopic(otherUserId),
              stringifyEvent({
                type: "typing.changed",
                payload: {
                  conversationId: event.payload.conversationId,
                  userId: viewer.id,
                  typing: event.payload.typing,
                },
              }),
            );
          }
          return;
        }

        if (event.type === "message.send") {
          const { conversationId, ...input } = event.payload;
          const result = await messagesService.create(
            conversationId,
            input,
            viewer,
          );
          const senderMessage = forSocket(result.message);
          ws.send(
            stringifyEvent({
              type: "message.created",
              requestId: event.requestId,
              payload: { conversationId, message: senderMessage },
            }),
          );
          if (!result.created) return;

          const otherUserId = await conversationsRepository.otherMemberId(
            conversationId,
            viewer.id,
          );
          ws.publish(
            userTopic(viewer.id),
            stringifyEvent({
              type: "message.created",
              payload: { conversationId, message: senderMessage },
            }),
          );
          if (otherUserId) {
            ws.publish(
              userTopic(otherUserId),
              stringifyEvent({
                type: "message.created",
                payload: {
                  conversationId,
                  message: forSocket(result.message, false),
                },
              }),
            );
          }
          return;
        }

        if (event.type === "message.update") {
          const message = await messagesService.update(
            event.payload.messageId,
            { content: event.payload.content },
            viewer.id,
          );
          const otherUserId = await conversationsRepository.otherMemberId(
            message.conversationId,
            viewer.id,
          );
          const senderMessage = forSocket(message);
          const senderEvent = {
            type: "message.updated" as const,
            payload: {
              conversationId: message.conversationId,
              message: senderMessage,
            },
          };
          ws.send(
            stringifyEvent({ ...senderEvent, requestId: event.requestId }),
          );
          ws.publish(userTopic(viewer.id), stringifyEvent(senderEvent));
          if (otherUserId) {
            ws.publish(
              userTopic(otherUserId),
              stringifyEvent({
                type: "message.updated",
                payload: {
                  conversationId: message.conversationId,
                  message: forSocket(message, false),
                },
              }),
            );
          }
          return;
        }

        if (event.type === "message.delete") {
          const removed = await messagesService.remove(
            event.payload.messageId,
            viewer.id,
          );
          const outgoing = {
            type: "message.deleted" as const,
            payload: {
              conversationId: removed.conversationId,
              messageId: removed.id,
            },
          };
          ws.send(stringifyEvent({ ...outgoing, requestId: event.requestId }));
          ws.publish(userTopic(viewer.id), stringifyEvent(outgoing));
          const otherUserId = await conversationsRepository.otherMemberId(
            removed.conversationId,
            viewer.id,
          );
          if (otherUserId) {
            ws.publish(userTopic(otherUserId), stringifyEvent(outgoing));
          }
          return;
        }

        const { conversationId, messageId } = event.payload;
        const read = await conversationsService.markRead(
          conversationId,
          { messageId },
          viewer.id,
        );
        const outgoing = {
          type: "conversation.read" as const,
          payload: {
            conversationId,
            messageId,
            userId: viewer.id,
            sequence: read.sequence,
          },
        };
        ws.send(stringifyEvent({ ...outgoing, requestId: event.requestId }));
        ws.publish(userTopic(viewer.id), stringifyEvent(outgoing));
        const otherUserId = await conversationsRepository.otherMemberId(
          conversationId,
          viewer.id,
        );
        if (otherUserId) {
          ws.publish(userTopic(otherUserId), stringifyEvent(outgoing));
        }
      } catch (error) {
        ws.send(
          stringifyEvent(
            createSocketError(
              error,
              "requestId" in event ? event.requestId : undefined,
            ),
          ),
        );
      }
    },

    close(ws) {
      ws.unsubscribe(userTopic(ws.data.socketUser.id));
    },
  });
