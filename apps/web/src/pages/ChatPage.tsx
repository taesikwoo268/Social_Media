import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  LoaderCircle,
  MessageCircle,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { ChatMessage, ConversationSummary, Page } from "@circle/shared";
import { api, assetUrl } from "../api";
import { AppAvatar as Avatar } from "@/components/app-avatar";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ConversationPage = Page<ConversationSummary> & { unreadCount: number };
type MessagePage = Page<ChatMessage>;

const chatTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));

export function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [content, setContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const markedMessageRef = useRef<string | null>(null);

  const conversations = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api<ConversationPage>("/conversations"),
    refetchInterval: 5_000,
  });

  const selected = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => api<ConversationSummary>(`/conversations/${conversationId}`),
    enabled: Boolean(conversationId),
  });

  const messages = useInfiniteQuery({
    queryKey: ["messages", conversationId],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api<MessagePage>(
        `/conversations/${conversationId}/messages?limit=50${
          pageParam ? `&beforeSequence=${pageParam}` : ""
        }`,
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(conversationId),
    refetchInterval: 3_000,
  });

  const allMessages = useMemo(
    () =>
      messages.data
        ? [...messages.data.pages].reverse().flatMap((page) => page.items)
        : [],
    [messages.data],
  );

  const refreshChat = () => {
    client.invalidateQueries({ queryKey: ["messages", conversationId] });
    client.invalidateQueries({ queryKey: ["conversations"] });
    client.invalidateQueries({ queryKey: ["conversation", conversationId] });
  };

  const send = useMutation({
    mutationFn: (text: string) =>
      api<ChatMessage>(`/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          clientMessageId: crypto.randomUUID(),
          content: text,
        }),
      }),
    onSuccess: () => {
      setContent("");
      refreshChat();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const edit = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      api<ChatMessage>(`/messages/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
      }),
    onSuccess: refreshChat,
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/messages/${id}`, { method: "DELETE" }),
    onSuccess: refreshChat,
    onError: (error: Error) => toast.error(error.message),
  });

  const latest = allMessages.at(-1);
  useEffect(() => {
    if (!conversationId || !latest || markedMessageRef.current === latest.id)
      return;
    markedMessageRef.current = latest.id;
    api(`/conversations/${conversationId}/read`, {
      method: "POST",
      body: JSON.stringify({ messageId: latest.id }),
    })
      .then(() => client.invalidateQueries({ queryKey: ["conversations"] }))
      .catch(() => {
        markedMessageRef.current = null;
      });
  }, [client, conversationId, latest]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [latest?.id]);

  const submit = () => {
    const text = content.trim();
    if (text && !send.isPending) send.mutate(text);
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="h-[calc(100vh-5rem)] p-3 sm:p-6 lg:h-screen">
      <Card className="mx-auto grid h-full max-w-5xl overflow-hidden p-0 lg:grid-cols-[320px_1fr]">
        <section
          className={cn(
            "min-w-0 border-r border-line",
            conversationId && "hidden lg:block",
          )}
        >
          <div className="border-b border-line p-5">
            <h1 className="font-display text-2xl font-semibold">Tin nhắn</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Trò chuyện riêng với bạn bè
            </p>
          </div>
          <div className="h-[calc(100%-5.25rem)] overflow-y-auto p-2">
            {conversations.isPending ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((item) => (
                  <Skeleton
                    key={item}
                    className="h-20"
                  />
                ))}
              </div>
            ) : conversations.data?.items.length ? (
              conversations.data.items.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => navigate(`/messages/${conversation.id}`)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl p-3 text-left",
                    "transition hover:bg-sand",
                    conversation.id === conversationId && "bg-sand",
                  )}
                >
                  <Avatar
                    src={assetUrl(conversation.participant.avatarUrl)}
                    name={conversation.participant.displayName}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <b className="truncate text-sm">
                        {conversation.participant.displayName}
                      </b>
                      {conversation.unreadCount > 0 && (
                        <i className="rounded-full bg-coral px-2 py-0.5 text-[10px] not-italic text-white">
                          {conversation.unreadCount}
                        </i>
                      )}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {conversation.lastMessage?.deletedAt
                        ? "Tin nhắn đã bị xóa"
                        : conversation.lastMessage?.content ||
                          "Bắt đầu cuộc trò chuyện"}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <EmptyState
                icon={<MessageCircle />}
                title="Chưa có cuộc trò chuyện"
                copy="Mở hồ sơ của một người bạn để bắt đầu nhắn tin."
              />
            )}
          </div>
        </section>

        <section
          className={cn(
            "min-w-0 grid-rows-[auto_1fr_auto]",
            conversationId ? "grid" : "hidden lg:grid",
          )}
        >
          {conversationId ? (
            <>
              <header className="flex h-[76px] items-center gap-3 border-b border-line px-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => navigate("/messages")}
                  aria-label="Quay lại"
                >
                  <ArrowLeft size={19} />
                </Button>
                {selected.data && (
                  <>
                    <Avatar
                      src={assetUrl(selected.data.participant.avatarUrl)}
                      name={selected.data.participant.displayName}
                    />
                    <Link to={`/u/${selected.data.participant.username}`}>
                      <b className="block text-sm">
                        {selected.data.participant.displayName}
                      </b>
                      <small className="text-muted-foreground">
                        @{selected.data.participant.username}
                      </small>
                    </Link>
                  </>
                )}
              </header>

              <div className="overflow-y-auto px-4 py-5 sm:px-6">
                {messages.hasNextPage && (
                  <div className="mb-5 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={messages.isFetchingNextPage}
                      onClick={() => messages.fetchNextPage()}
                    >
                      Xem tin nhắn cũ hơn
                    </Button>
                  </div>
                )}
                {messages.isPending ? (
                  <div className="space-y-3">
                    <Skeleton className="h-14 w-2/3" />
                    <Skeleton className="ml-auto h-14 w-1/2" />
                  </div>
                ) : allMessages.length ? (
                  <div className="space-y-2">
                    {allMessages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "group flex",
                          message.mine ? "justify-end" : "justify-start",
                        )}
                      >
                        <div className="max-w-[82%]">
                          <div
                            className={cn(
                              "rounded-2xl px-3.5 py-2.5 text-sm leading-6",
                              message.mine
                                ? "rounded-br-md bg-sage-dark text-white"
                                : "rounded-bl-md bg-sand text-ink",
                              message.deletedAt && "italic opacity-60",
                            )}
                          >
                            {message.deletedAt
                              ? "Tin nhắn đã bị xóa"
                              : message.content}
                          </div>
                          <div
                            className={cn(
                              "mt-1 flex items-center gap-1 text-[10px] text-muted-foreground",
                              message.mine && "justify-end",
                            )}
                          >
                            <span>{chatTime(message.createdAt)}</span>
                            {message.mine &&
                              !message.deletedAt &&
                              message.updatedAt !== message.createdAt && (
                                <span>· đã sửa</span>
                              )}
                            {message.mine && !message.deletedAt && (
                              <span className="ml-1 flex opacity-0 transition group-hover:opacity-100">
                                <button
                                  type="button"
                                  className="p-1 hover:text-ink"
                                  aria-label="Sửa tin nhắn"
                                  onClick={() => {
                                    const next = window
                                      .prompt("Sửa tin nhắn", message.content)
                                      ?.trim();
                                    if (next && next !== message.content)
                                      edit.mutate({
                                        id: message.id,
                                        content: next,
                                      });
                                  }}
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="p-1 hover:text-coral"
                                  aria-label="Xóa tin nhắn"
                                  onClick={() => {
                                    if (window.confirm("Xóa tin nhắn này?"))
                                      remove.mutate(message.id);
                                  }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                ) : (
                  <EmptyState
                    icon={<MessageCircle />}
                    title="Hãy gửi lời chào"
                    copy="Tin nhắn chỉ hiển thị với hai người trong cuộc trò chuyện."
                  />
                )}
              </div>

              <div className="border-t border-line p-3 sm:p-4">
                <div className="flex items-end gap-2">
                  <Textarea
                    value={content}
                    maxLength={4000}
                    rows={1}
                    placeholder="Nhập tin nhắn..."
                    className="max-h-36 min-h-11"
                    onChange={(event) => setContent(event.target.value)}
                    onKeyDown={onComposerKeyDown}
                  />
                  <Button
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    disabled={!content.trim() || send.isPending}
                    onClick={submit}
                    aria-label="Gửi tin nhắn"
                  >
                    {send.isPending ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <Send />
                    )}
                  </Button>
                </div>
                <p className="mt-1.5 text-right text-[10px] text-muted-foreground">
                  Enter để gửi · Shift + Enter để xuống dòng
                </p>
              </div>
            </>
          ) : (
            <EmptyState
              icon={<MessageCircle />}
              title="Chọn một cuộc trò chuyện"
              copy="Tin nhắn mới sẽ xuất hiện tự động."
            />
          )}
        </section>
      </Card>
    </div>
  );
}
