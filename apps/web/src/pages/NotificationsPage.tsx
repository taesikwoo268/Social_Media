import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  Heart,
  MessageCircle,
  UserPlus,
  Users,
} from "lucide-react";
import { api, assetUrl, formatTime } from "../api";
import { AppAvatar as Avatar } from "@/components/app-avatar";
import { EmptyState as Empty } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const copy: Record<string, string> = {
  friend_request: "đã gửi cho bạn lời mời kết bạn",
  friend_accepted: "đã chấp nhận lời mời kết bạn",
  post_like: "đã thích bài viết của bạn",
  comment: "đã bình luận về bài viết của bạn",
  reply: "đã trả lời bình luận của bạn",
};
const icons: Record<string, React.ReactNode> = {
  friend_request: <UserPlus size={14} />,
  friend_accepted: <Users size={14} />,
  post_like: <Heart size={14} />,
  comment: <MessageCircle size={14} />,
  reply: <MessageCircle size={14} />,
};
export function NotificationsPage() {
  const client = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<any>("/notifications"),
    refetchInterval: 30_000,
  });

  const read = useMutation({
    mutationFn: () => api("/notifications/read-all", { method: "POST" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["notifications"] }),
  });
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-9">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-sage">
            Cập nhật
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">
            Thông báo
          </h1>
        </div>
        {query.data?.unreadCount > 0 && (
          <Button
            variant="ghost"
            onClick={() => read.mutate()}
          >
            <CheckCheck size={17} />
            Đọc tất cả
          </Button>
        )}
      </header>
      <Card className="mt-6 overflow-hidden">
        {query.isPending ? (
          <div className="space-y-4 p-5">
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                className="h-14"
              />
            ))}
          </div>
        ) : query.data?.items.length ? (
          query.data.items.map((item: any) => (
            <div
              key={item.id}
              className={cn(
                "flex gap-3 border-b border-line/60 p-4 last:border-0",
                !item.readAt && "bg-sage/5",
              )}
            >
              <div className="relative">
                <Avatar
                  src={assetUrl(item.avatarUrl)}
                  name={item.displayName}
                  className="h-12 w-12"
                />
                <span
                  className={cn(
                    "absolute -bottom-1 -right-1 grid h-6 w-6",
                    "place-items-center rounded-full bg-sage text-white",
                    "ring-2 ring-card",
                  )}
                >
                  {icons[item.type]}
                </span>
              </div>
              <div className="min-w-0 flex-1 text-sm leading-6">
                <p>
                  <b>{item.displayName}</b> {copy[item.type]}
                </p>
                <span className="text-xs text-muted-foreground">
                  {formatTime(item.createdAt)}
                </span>
              </div>
              {!item.readAt && (
                <span className="mt-2 h-2.5 w-2.5 rounded-full bg-coral" />
              )}
            </div>
          ))
        ) : (
          <Empty
            icon={<Bell />}
            title="Chưa có thông báo"
            copy="Những tương tác mới sẽ xuất hiện ở đây."
          />
        )}
      </Card>
    </div>
  );
}
