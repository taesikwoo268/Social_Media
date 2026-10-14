import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import {
  UserPlus,
  UserCheck,
  Clock,
  Image as ImageIcon,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { api, assetUrl } from "../api";
import { useAuth } from "../App";
import { AppAvatar as Avatar } from "@/components/app-avatar";
import { EmptyState as Empty } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PostCard, type Post } from "./FeedPage";

export function ProfilePage() {
  const { username = "" } = useParams();
  const { user } = useAuth();
  const client = useQueryClient();
  const profile = useQuery({
    queryKey: ["profile", username],
    queryFn: () => api<any>(`/users/${username}`),
  });
  const posts = useQuery({
    queryKey: ["profile-posts", username],
    queryFn: () => api<any>(`/users/${username}/posts`),
  });
  const add = useMutation({
    mutationFn: () =>
      api("/friends/requests", {
        method: "POST",
        body: JSON.stringify({ userId: profile.data.id }),
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["profile", username] });
      toast.success("Đã gửi lời mời");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (profile.isPending)
    return (
      <div className="mx-auto max-w-3xl p-5">
        <Skeleton className="h-64" />
        <Skeleton className="mt-5 h-52" />
      </div>
    );
  if (profile.isError)
    return (
      <div className="p-10 text-center text-muted-foreground">
        Không tìm thấy hồ sơ.
      </div>
    );
  const p = profile.data;
  return (
    <div className="mx-auto max-w-3xl px-3 py-4 sm:px-6 sm:py-7">
      <Card className="overflow-hidden">
        <div className="h-44 bg-[linear-gradient(135deg,#9caf9e,#d7c9a9)] sm:h-56">
          {p.coverUrl && (
            <img
              src={assetUrl(p.coverUrl)!}
              className="h-full w-full object-cover"
              alt="Ảnh bìa"
            />
          )}
        </div>
        <div className="px-5 pb-6">
          <div className="flex items-end justify-between">
            <Avatar
              src={assetUrl(p.avatarUrl)}
              name={p.displayName}
              className="-mt-14 h-28 w-28 ring-4 ring-card sm:h-32 sm:w-32"
            />
            <div className="pb-2">
              {p.relationship === "self" ? (
                <Button
                  variant="outline"
                  onClick={() => location.assign("/settings")}
                >
                  <Settings size={17} />
                  Chỉnh sửa
                </Button>
              ) : p.relationship === "none" ? (
                <Button onClick={() => add.mutate()}>
                  <UserPlus size={17} />
                  Kết bạn
                </Button>
              ) : p.relationship === "friends" ? (
                <Button variant="outline">
                  <UserCheck size={17} />
                  Bạn bè
                </Button>
              ) : (
                <Button
                  variant="outline"
                  disabled
                >
                  <Clock size={17} />
                  Đang chờ
                </Button>
              )}
            </div>
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold">
            {p.displayName}
          </h1>
          <p className="text-sm text-muted-foreground">@{p.username}</p>
          {p.bio && <p className="mt-4 max-w-xl text-sm leading-6">{p.bio}</p>}
        </div>
      </Card>
      <div className="mt-5 space-y-4">
        {posts.isPending ? (
          <Skeleton className="h-64" />
        ) : posts.data?.items.length ? (
          posts.data.items.map((post: Post) => (
            <PostCard
              key={post.id}
              post={post}
            />
          ))
        ) : (
          <Card>
            <Empty
              icon={<ImageIcon />}
              title="Chưa có bài viết"
              copy={
                p.id === user.id
                  ? "Hãy chia sẻ khoảnh khắc đầu tiên của bạn."
                  : "Người dùng này chưa chia sẻ bài viết nào bạn có thể xem."
              }
            />
          </Card>
        )}
      </div>
    </div>
  );
}
