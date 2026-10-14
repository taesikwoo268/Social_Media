import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, UserRoundCog } from "lucide-react";
import { toast } from "sonner";
import { api } from "../api";
import { useAuth } from "../App";
import { EmptyState as Empty } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function AdminPage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [value, setValue] = useState("");
  const [q, setQ] = useState("");
  const query = useQuery({
    queryKey: ["admin-users", q],
    queryFn: () => api<any>(`/admin/users?q=${encodeURIComponent(q)}`),
  });
  const status = useMutation({
    mutationFn: ({
      id,
      value,
    }: {
      id: string;
      value: "active" | "suspended";
    }) =>
      api(`/admin/users/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status: value }),
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Đã cập nhật tài khoản");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-9">
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Shield />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-sage">
            Điều hành cộng đồng
          </p>
          <h1 className="font-display text-3xl font-semibold">Quản trị</h1>
        </div>
      </div>
      <form
        className="mt-7 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(value);
        }}
      >
        <Input
          className="min-w-0 flex-1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Tìm email, tên hoặc username…"
        />
        <Button className="shrink-0 whitespace-nowrap">Tìm kiếm</Button>
      </form>
      <Card className="mt-5 overflow-x-auto">
        <div
          className={cn(
            "grid min-w-[560px] grid-cols-[minmax(240px,1fr)_100px_140px]",
            "border-b border-line",
            "bg-sand/70 px-4 py-3 text-xs font-bold uppercase",
            "tracking-wider text-muted-foreground",
          )}
        >
          <span>Người dùng</span>
          <span>Vai trò</span>
          <span>Trạng thái</span>
        </div>
        {query.isPending ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : query.data?.items.length ? (
          query.data.items.map((item: any) => (
            <div
              key={item.id}
              className={cn(
                "grid min-w-[560px] grid-cols-[minmax(240px,1fr)_100px_140px]",
                "items-center",
                "border-b border-line/60 px-4 py-3 last:border-0",
              )}
            >
              <div className="min-w-0">
                <b className="block truncate text-sm">{item.displayName}</b>
                <span className="block truncate text-xs text-muted-foreground">
                  {item.email} · @{item.username}
                </span>
              </div>
              <span className="text-xs font-semibold">
                {item.role === "admin" ? "Admin" : "Thành viên"}
              </span>
              <Button
                variant={item.status === "active" ? "outline" : "destructive"}
                className="h-8 w-full whitespace-nowrap px-2 text-xs"
                disabled={item.id === user.id || status.isPending}
                onClick={() =>
                  status.mutate({
                    id: item.id,
                    value: item.status === "active" ? "suspended" : "active",
                  })
                }
              >
                {item.status === "active" ? "Đang hoạt động" : "Đang đình chỉ"}
              </Button>
            </div>
          ))
        ) : (
          <Empty
            icon={<UserRoundCog />}
            title="Không có kết quả"
            copy="Không tìm thấy tài khoản phù hợp."
          />
        )}
      </Card>
    </div>
  );
}
