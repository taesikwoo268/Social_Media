import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search, UserPlus, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { api, assetUrl } from "../api";
import { AppAvatar as Avatar } from "@/components/app-avatar";
import { EmptyState as Empty } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export function SearchPage() {
  const [value, setValue] = useState("");
  const [q, setQ] = useState("");
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["search", q],
    queryFn: () => api<any>(`/users/search?q=${encodeURIComponent(q)}`),
    enabled: q.length > 0,
  });
  const add = useMutation({
    mutationFn: (userId: string) =>
      api("/friends/requests", {
        method: "POST",
        body: JSON.stringify({ userId }),
      }),
    onSuccess: () => {
      toast.success("Đã gửi lời mời kết bạn");
      client.invalidateQueries({ queryKey: ["search"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-9">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-sage">
        Khám phá
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold">
        Tìm những người bạn biết
      </h1>
      <form
        className="relative mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(value.trim());
        }}
      >
        <Search
          className="absolute left-4 top-3.5 text-muted-foreground"
          size={20}
        />
        <Input
          className="h-12 pl-12 pr-28 text-base"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Tên hoặc username…"
        />
        <Button className="absolute right-1 top-1 h-10">Tìm kiếm</Button>
      </form>
      <div className="mt-6 space-y-3">
        {query.isPending && q ? (
          [1, 2, 3].map((i) => (
            <Card
              key={i}
              className="flex items-center gap-3 p-4"
            >
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-5 flex-1" />
            </Card>
          ))
        ) : query.data?.items.length ? (
          query.data.items.map((person: any) => (
            <Card
              key={person.id}
              className="flex items-center gap-3 p-4"
            >
              <Link to={`/u/${person.username}`}>
                <Avatar
                  src={assetUrl(person.avatarUrl)}
                  name={person.displayName}
                  className="h-12 w-12"
                />
              </Link>
              <Link
                to={`/u/${person.username}`}
                className="min-w-0 flex-1"
              >
                <b className="block truncate">{person.displayName}</b>
                <span className="text-sm text-muted-foreground">
                  @{person.username}
                </span>
              </Link>
              <Button
                variant="outline"
                onClick={() => add.mutate(person.id)}
                disabled={add.isPending}
              >
                <UserPlus size={17} />
                <span className="hidden sm:inline">Kết bạn</span>
              </Button>
            </Card>
          ))
        ) : q ? (
          <Card>
            <Empty
              icon={<UsersRound />}
              title="Chưa tìm thấy ai"
              copy="Thử tên khác hoặc kiểm tra lại username bạn đang tìm."
            />
          </Card>
        ) : (
          <Card>
            <Empty
              icon={<Search />}
              title="Bắt đầu một kết nối"
              copy="Tìm theo tên hiển thị hoặc username của người bạn muốn gặp."
            />
          </Card>
        )}
      </div>
    </div>
  );
}
