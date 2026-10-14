import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Check, UserRoundCheck, X } from "lucide-react";
import { toast } from "sonner";
import { api, assetUrl, formatTime } from "../api";
import { AppAvatar as Avatar } from "@/components/app-avatar";
import { EmptyState as Empty } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function FriendsPage() {
  const client = useQueryClient();
  const requests = useQuery({
    queryKey: ["friend-requests"],
    queryFn: () => api<any>("/friends/requests"),
  });
  const friends = useQuery({
    queryKey: ["friends"],
    queryFn: () => api<any>("/friends"),
  });
  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api(`/friends/requests/${id}/${action}`, { method: "POST" }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["friend-requests"] });
      client.invalidateQueries({ queryKey: ["friends"] });
      toast.success("Đã cập nhật lời mời");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-9">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-sage">
        Kết nối
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold">Bạn bè</h1>
      <section className="mt-7">
        <h2 className="mb-3 font-display text-xl font-semibold">
          Lời mời mới{" "}
          <span className="ml-1 text-sm font-sans text-muted-foreground">
            {requests.data?.items.length ?? 0}
          </span>
        </h2>
        {requests.isPending ? (
          <Skeleton className="h-24" />
        ) : requests.data?.items.length ? (
          <div className="space-y-3">
            {requests.data.items.map((item: any) => (
              <Card
                key={item.id}
                className="flex items-center gap-3 p-4"
              >
                <Link to={`/u/${item.username}`}>
                  <Avatar
                    src={assetUrl(item.avatarUrl)}
                    name={item.displayName}
                    className="h-12 w-12"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <b className="block truncate">{item.displayName}</b>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(item.createdAt)}
                  </span>
                </div>
                <Button
                  onClick={() => act.mutate({ id: item.id, action: "accept" })}
                >
                  <Check size={16} />
                  Chấp nhận
                </Button>
                <Button
                  variant="ghost"
                  className="px-3"
                  onClick={() => act.mutate({ id: item.id, action: "reject" })}
                >
                  <X size={17} />
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-5 text-sm text-muted-foreground">
            Bạn chưa có lời mời kết bạn mới.
          </Card>
        )}
      </section>
      <section className="mt-9">
        <h2 className="mb-3 font-display text-xl font-semibold">
          Tất cả bạn bè
        </h2>
        {friends.data?.items.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {friends.data.items.map((person: any) => (
              <Link
                key={person.id}
                to={`/u/${person.username}`}
              >
                <Card
                  className={cn(
                    "flex items-center gap-3 p-4 transition",
                    "hover:-translate-y-0.5 hover:shadow-md",
                  )}
                >
                  <Avatar
                    src={assetUrl(person.avatarUrl)}
                    name={person.displayName}
                    className="h-12 w-12"
                  />
                  <span>
                    <b className="block">{person.displayName}</b>
                    <small className="text-muted-foreground">
                      @{person.username}
                    </small>
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          !friends.isPending && (
            <Card>
              <Empty
                icon={<UserRoundCheck />}
                title="Chưa có bạn bè"
                copy="Hãy tìm kiếm và gửi lời mời để xây dựng vòng tròn của bạn."
              />
            </Card>
          )
        )}
      </section>
    </div>
  );
}
