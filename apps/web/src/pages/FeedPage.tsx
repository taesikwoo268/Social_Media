import { useRef, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ImagePlus,
  Send,
  Globe2,
  Users,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Trash2,
  CornerDownRight,
  X,
  Newspaper,
} from "lucide-react";
import { toast } from "sonner";
import { api, assetUrl, formatTime } from "../api";
import { useAuth } from "../App";
import { AppAvatar as Avatar } from "@/components/app-avatar";
import { EmptyState as Empty } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type Post = {
  id: string;
  content: string;
  visibility: "public" | "friends";
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  media: { id: string; url: string; mimeType: string }[];
  likeCount: number;
  commentCount: number;
  liked: boolean;
  canEdit: boolean;
};

function Composer() {
  const { user } = useAuth();
  const client = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"public" | "friends">("friends");
  const [files, setFiles] = useState<File[]>([]);
  const mutation = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.set("content", content);
      form.set("visibility", visibility);
      files.forEach((file) => form.append("images", file));
      return api("/posts", { method: "POST", body: form });
    },
    onSuccess: () => {
      setContent("");
      setFiles([]);
      client.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Đã đăng bài");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const select = (list: FileList | null) => {
    const next = [...(list ? Array.from(list) : [])].filter((f) =>
      ["image/jpeg", "image/png", "image/webp"].includes(f.type),
    );
    if (next.some((f) => f.size > 5_242_880))
      return toast.error("Mỗi ảnh tối đa 5 MB");
    setFiles(next.slice(0, 4));
  };
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex gap-3">
        <Avatar
          src={assetUrl(user.avatarUrl)}
          name={user.displayName}
        />
        <Textarea
          className="min-h-24 border-0 bg-sand/60 text-base focus:ring-sage/10"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Bạn đang nghĩ gì, ${user.displayName.split(" ").slice(-1)[0]}?`}
          maxLength={5000}
        />
      </div>
      {files.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="relative aspect-square overflow-hidden rounded-xl"
            >
              <img
                className="h-full w-full object-cover"
                src={URL.createObjectURL(file)}
                alt="Xem trước"
              />
              <button
                className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white"
                onClick={() => setFiles(files.filter((_, i) => i !== index))}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center justify-between border-t border-line/70 pt-3">
        <div className="flex items-center gap-1">
          <input
            ref={input}
            className="hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => select(e.target.files)}
          />
          <Button
            variant="ghost"
            className="px-2.5 text-sage-dark"
            onClick={() => input.current?.click()}
          >
            <ImagePlus size={19} />
            <span className="hidden sm:inline">Ảnh</span>
          </Button>
          <button
            className={cn(
              "flex items-center gap-1 rounded-lg px-2 py-2",
              "text-xs font-semibold text-muted-foreground hover:bg-sand",
            )}
            onClick={() =>
              setVisibility(visibility === "friends" ? "public" : "friends")
            }
          >
            {visibility === "friends" ? (
              <Users size={16} />
            ) : (
              <Globe2 size={16} />
            )}
            {visibility === "friends" ? "Bạn bè" : "Công khai"}
          </button>
        </div>
        <Button
          disabled={
            mutation.isPending || (!content.trim() && files.length === 0)
          }
          onClick={() => mutation.mutate()}
        >
          <Send size={16} />
          Đăng
        </Button>
      </div>
    </Card>
  );
}

function Comments({ post }: { post: Post }) {
  const client = useQueryClient();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["comments", post.id],
    queryFn: () => api<any>(`/comments/post/${post.id}`),
  });
  const create = useMutation({
    mutationFn: () =>
      api(`/comments/post/${post.id}`, {
        method: "POST",
        body: JSON.stringify({
          content: text,
          ...(replyTo ? { parentId: replyTo } : {}),
        }),
      }),
    onSuccess: () => {
      setText("");
      setReplyTo(null);
      client.invalidateQueries({ queryKey: ["comments", post.id] });
      client.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = query.data?.items ?? [];
  const roots = rows.filter((c: any) => !c.parentId);
  return (
    <div className="border-t border-line/70 px-4 pb-4 pt-3 sm:px-5">
      <div className="space-y-3">
        {roots.map((comment: any) => (
          <div key={comment.id}>
            <div className="flex gap-2.5">
              <Avatar
                src={assetUrl(comment.avatarUrl)}
                name={comment.displayName}
                className="h-8 w-8"
              />
              <div className="min-w-0 flex-1">
                <div className="rounded-xl bg-sand/70 px-3 py-2">
                  <b className="text-xs">{comment.displayName}</b>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm">
                    {comment.content}
                  </p>
                </div>
                <button
                  className="ml-2 mt-1 text-[11px] font-bold text-muted-foreground hover:text-ink"
                  onClick={() => setReplyTo(comment.id)}
                >
                  Trả lời
                </button>
              </div>
            </div>
            {rows
              .filter((r: any) => r.parentId === comment.id)
              .map((reply: any) => (
                <div
                  key={reply.id}
                  className="ml-10 mt-2 flex gap-2"
                >
                  <CornerDownRight
                    size={14}
                    className="mt-2 text-muted-foreground"
                  />
                  <Avatar
                    src={assetUrl(reply.avatarUrl)}
                    name={reply.displayName}
                    className="h-7 w-7"
                  />
                  <div className="rounded-xl bg-sand/70 px-3 py-2 text-sm">
                    <b className="block text-xs">{reply.displayName}</b>
                    {reply.content}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
      {replyTo && (
        <div
          className={cn(
            "mt-3 flex items-center justify-between rounded-lg",
            "bg-sage/10 px-3 py-1.5 text-xs text-sage-dark",
          )}
        >
          Đang trả lời bình luận
          <button onClick={() => setReplyTo(null)}>
            <X size={14} />
          </button>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <Avatar
          src={assetUrl(user.avatarUrl)}
          name={user.displayName}
          className="h-8 w-8"
        />
        <input
          className={cn(
            "h-9 flex-1 rounded-xl bg-sand/70 px-3 text-sm",
            "outline-none focus:ring-2 focus:ring-sage/20",
          )}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) create.mutate();
          }}
          placeholder={replyTo ? "Viết phản hồi…" : "Viết bình luận…"}
        />
        <button
          disabled={!text.trim()}
          onClick={() => create.mutate()}
          className="text-sage disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

export function PostCard({ post }: { post: Post }) {
  const client = useQueryClient();
  const [comments, setComments] = useState(false);
  const [menu, setMenu] = useState(false);
  const like = useMutation({
    mutationFn: () =>
      api(`/posts/${post.id}/like`, { method: post.liked ? "DELETE" : "POST" }),
    onMutate: async () => {
      await client.cancelQueries({ queryKey: ["feed"] });
      client.setQueriesData(
        { queryKey: ["feed"] },
        (old: any) =>
          old && {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              items: page.items.map((p: Post) =>
                p.id === post.id
                  ? {
                      ...p,
                      liked: !p.liked,
                      likeCount: p.likeCount + (p.liked ? -1 : 1),
                    }
                  : p,
              ),
            })),
          },
      );
    },
    onSettled: () => client.invalidateQueries({ queryKey: ["feed"] }),
  });
  const remove = useMutation({
    mutationFn: () => api(`/posts/${post.id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["feed"] }),
  });
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
        <Avatar
          src={assetUrl(post.author.avatarUrl)}
          name={post.author.displayName}
        />
        <div className="min-w-0">
          <b className="block truncate text-sm">{post.author.displayName}</b>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {formatTime(post.createdAt)} ·{" "}
            {post.visibility === "public" ? (
              <Globe2 size={12} />
            ) : (
              <Users size={12} />
            )}
          </span>
        </div>
        {post.canEdit && (
          <div className="relative ml-auto">
            <button
              className="rounded-full p-2 text-muted-foreground hover:bg-sand"
              onClick={() => setMenu(!menu)}
            >
              <MoreHorizontal size={19} />
            </button>
            {menu && (
              <button
                onClick={() => remove.mutate()}
                className={cn(
                  "absolute right-0 top-10 z-10 flex w-36 items-center gap-2",
                  "rounded-xl border border-line bg-card px-3 py-2",
                  "text-sm text-red-600 shadow-lg",
                )}
              >
                <Trash2 size={15} />
                Xóa bài
              </button>
            )}
          </div>
        )}
      </div>
      {post.content && (
        <p className="whitespace-pre-wrap px-4 pb-4 text-[15px] leading-6 sm:px-5">
          {post.content}
        </p>
      )}
      {post.media.length > 0 && (
        <div
          className={`grid gap-0.5 bg-line ${post.media.length > 1 ? "grid-cols-2" : ""}`}
        >
          {post.media.map((item) => (
            <img
              key={item.id}
              src={assetUrl(item.url)!}
              className={cn(
                "w-full object-cover",
                post.media.length === 1 ? "max-h-[620px]" : "aspect-square",
              )}
              alt="Ảnh bài viết"
              loading="lazy"
            />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between px-5 py-3 text-xs text-muted-foreground">
        <span>
          {post.likeCount > 0
            ? `${post.likeCount} lượt thích`
            : "Hãy là người đầu tiên thích"}
        </span>
        <button onClick={() => setComments(!comments)}>
          {post.commentCount} bình luận
        </button>
      </div>
      <div className="grid grid-cols-2 border-t border-line/70 px-3 py-1">
        <button
          onClick={() => like.mutate()}
          className={cn(
            "flex h-10 items-center justify-center gap-2 rounded-lg",
            "text-sm font-semibold hover:bg-sand",
            post.liked ? "text-coral" : "text-muted-foreground",
          )}
        >
          <Heart
            size={19}
            fill={post.liked ? "currentColor" : "none"}
          />
          Thích
        </button>
        <button
          onClick={() => setComments(!comments)}
          className={cn(
            "flex h-10 items-center justify-center gap-2 rounded-lg",
            "text-sm font-semibold text-muted-foreground hover:bg-sand",
          )}
        >
          <MessageCircle size={19} />
          Bình luận
        </button>
      </div>
      {comments && <Comments post={post} />}
    </Card>
  );
}

export function FeedPage() {
  const query = useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }) =>
      api<any>(
        `/feed${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const posts = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <div className="mx-auto max-w-2xl px-3 py-5 sm:px-6 sm:py-8">
      <header className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-sage">
          Hôm nay
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">
          Bảng tin của bạn
        </h1>
      </header>
      <Composer />
      <div className="mt-5 space-y-4">
        {query.isPending ? (
          [1, 2].map((i) => (
            <Card
              key={i}
              className="p-5"
            >
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-2 h-3 w-20" />
                </div>
              </div>
              <Skeleton className="mt-5 h-56" />
            </Card>
          ))
        ) : posts.length === 0 ? (
          <Card>
            <Empty
              icon={<Newspaper />}
              title="Bảng tin đang yên tĩnh"
              copy="Hãy đăng bài đầu tiên hoặc kết bạn để xem câu chuyện của họ ở đây."
            />
          </Card>
        ) : (
          posts.map((post: Post) => (
            <PostCard
              key={post.id}
              post={post}
            />
          ))
        )}
        {query.hasNextPage && (
          <Button
            variant="outline"
            className="w-full"
            disabled={query.isFetchingNextPage}
            onClick={() => query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? "Đang tải…" : "Xem thêm"}
          </Button>
        )}
      </div>
    </div>
  );
}
