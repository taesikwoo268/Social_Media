import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Save } from "lucide-react";
import { toast } from "sonner";
import { api, assetUrl } from "../api";
import { useAuth } from "../App";
import { AppAvatar as Avatar } from "@/components/app-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function SettingsPage() {
  const { user, refresh } = useAuth();
  const client = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    displayName: user.displayName,
    username: user.username,
    bio: "",
  });
  const save = useMutation({
    mutationFn: () =>
      api("/users/me", { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: async () => {
      await refresh();
      toast.success("Đã lưu hồ sơ");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const upload = useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.set("file", file);
      return api("/users/me/avatar", { method: "POST", body });
    },
    onSuccess: async () => {
      await refresh();
      client.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Đã đổi ảnh đại diện");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-9">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-sage">
        Tài khoản
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold">
        Chỉnh sửa hồ sơ
      </h1>
      <Card className="mt-6 p-5 sm:p-7">
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar
              src={assetUrl(user.avatarUrl)}
              name={user.displayName}
              className="h-24 w-24"
            />
            <button
              onClick={() => fileInput.current?.click()}
              className={cn(
                "absolute bottom-0 right-0 grid h-8 w-8 place-items-center",
                "rounded-full bg-primary text-primary-foreground ring-2 ring-background",
              )}
            >
              <Camera size={15} />
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) =>
                e.target.files?.[0] && upload.mutate(e.target.files[0])
              }
            />
          </div>
          <div>
            <b>Ảnh đại diện</b>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              JPEG, PNG hoặc WebP. Tối đa 5 MB.
            </p>
          </div>
        </div>
        <form
          className="mt-8 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <label className="block text-sm font-semibold">
            Tên hiển thị
            <Input
              className="mt-2"
              value={form.displayName}
              onChange={(e) =>
                setForm({ ...form, displayName: e.target.value })
              }
              required
            />
          </label>
          <label className="block text-sm font-semibold">
            Username
            <Input
              className="mt-2"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              pattern="[a-z0-9_]{3,32}"
              required
            />
          </label>
          <label className="block text-sm font-semibold">
            Giới thiệu
            <Textarea
              className="mt-2 min-h-28"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              maxLength={300}
              placeholder="Một vài điều về bạn…"
            />
          </label>
          <Button disabled={save.isPending}>
            <Save size={17} />
            {save.isPending ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
