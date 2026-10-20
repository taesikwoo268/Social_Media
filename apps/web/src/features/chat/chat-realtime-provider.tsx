import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { RealtimeServerEvent } from "@circle/shared";
import { chatSocket } from "./chat-socket";

export type ChatRealtimeValue = {
  connected: boolean;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  updateMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  markRead: (conversationId: string, messageId: string) => Promise<void>;
  setTyping: (conversationId: string, typing: boolean) => void;
  typingConversationIds: ReadonlySet<string>;
};

export const ChatRealtimeContext = createContext<ChatRealtimeValue | null>(
  null,
);

export function ChatRealtimeProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(chatSocket.connected);
  const [typingConversationIds, setTypingConversationIds] = useState(
    () => new Set<string>(),
  );
  const typingTimers = useRef(new Map<string, number>());

  useEffect(() => {
    const unsubscribeStatus = chatSocket.subscribeStatus((value) => {
      setConnected(value);
      if (!value) setTypingConversationIds(new Set());
    });
    const unsubscribeEvent = chatSocket.subscribe(
      (event: RealtimeServerEvent) => {
        if (event.type === "connection.ready") {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          queryClient.invalidateQueries({ queryKey: ["messages"] });
          return;
        }

        if (event.type === "error") {
          if (!event.requestId) toast.error(event.payload.message);
          return;
        }

        if (event.type === "typing.changed") {
          const { conversationId, typing } = event.payload;
          const previousTimer = typingTimers.current.get(conversationId);
          if (previousTimer) window.clearTimeout(previousTimer);

          setTypingConversationIds((current) => {
            const next = new Set(current);
            if (typing) next.add(conversationId);
            else next.delete(conversationId);
            return next;
          });

          if (typing) {
            const timer = window.setTimeout(() => {
              typingTimers.current.delete(conversationId);
              setTypingConversationIds((current) => {
                const next = new Set(current);
                next.delete(conversationId);
                return next;
              });
            }, 4_000);
            typingTimers.current.set(conversationId, timer);
          } else {
            typingTimers.current.delete(conversationId);
          }
          return;
        }

        if (
          event.type === "message.created" ||
          event.type === "message.updated" ||
          event.type === "message.deleted" ||
          event.type === "conversation.read"
        ) {
          const conversationId = event.payload.conversationId;
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          queryClient.invalidateQueries({
            queryKey: ["conversation", conversationId],
          });
          queryClient.invalidateQueries({
            queryKey: ["messages", conversationId],
          });
        }
      },
    );

    chatSocket.connect();
    return () => {
      unsubscribeEvent();
      unsubscribeStatus();
      chatSocket.disconnect();
      for (const timer of typingTimers.current.values()) {
        window.clearTimeout(timer);
      }
      typingTimers.current.clear();
    };
  }, [queryClient]);

  const publishTyping = useCallback(
    (conversationId: string, typing: boolean) => {
      if (!chatSocket.connected) return;
      chatSocket.send({
        type: "typing.set",
        payload: { conversationId, typing },
      });
    },
    [],
  );

  const value = useMemo<ChatRealtimeValue>(
    () => ({
      connected,
      async sendMessage(conversationId, content) {
        await chatSocket.request({
          type: "message.send",
          requestId: crypto.randomUUID(),
          payload: {
            conversationId,
            clientMessageId: crypto.randomUUID(),
            content,
          },
        });
      },
      async updateMessage(messageId, content) {
        await chatSocket.request({
          type: "message.update",
          requestId: crypto.randomUUID(),
          payload: { messageId, content },
        });
      },
      async deleteMessage(messageId) {
        await chatSocket.request({
          type: "message.delete",
          requestId: crypto.randomUUID(),
          payload: { messageId },
        });
      },
      async markRead(conversationId, messageId) {
        await chatSocket.request({
          type: "conversation.read",
          requestId: crypto.randomUUID(),
          payload: { conversationId, messageId },
        });
      },
      setTyping: publishTyping,
      typingConversationIds,
    }),
    [connected, publishTyping, typingConversationIds],
  );

  return (
    <ChatRealtimeContext.Provider value={value}>
      {children}
    </ChatRealtimeContext.Provider>
  );
}
