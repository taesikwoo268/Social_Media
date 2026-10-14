import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, Users, Sparkles, Globe } from "lucide-react";
import { toast } from "sonner";
import { api } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const register = mode === "register";
  const navigate = useNavigate();
  const client = useQueryClient();
  const [form, setForm] = useState({
    email: "",
    password: "",
    username: "",
    displayName: "",
  });
  const mutation = useMutation({
    mutationFn: () =>
      api(`/auth/${register ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(
          register ? form : { email: form.email, password: form.password },
        ),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["me"] });
      navigate("/");
      toast.success(
        register ? "Chào mừng bạn đến với Circle" : "Đăng nhập thành công",
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const update =
    (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((value) => ({ ...value, [key]: event.target.value }));
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      <section
        className={cn(
          "relative hidden overflow-hidden bg-[#202720] p-14 text-white",
          "lg:flex lg:flex-col",
        )}
      >
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-sage/30 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sage">
            <Globe />
          </span>
          <b className="font-display text-3xl">Circle</b>
        </div>
        <div className="relative my-auto max-w-xl">
          <h1 className="font-display text-6xl font-medium leading-[1.08]">
            Kết nối với bạn bè.
          </h1>
          <div className="mt-12 grid grid-cols-3 gap-4 text-sm">
            <span>
              <Users className="mb-3 text-[#a9c4ad]" />
              Bạn bè thật
            </span>
            <span>
              <Sparkles className="mb-3 text-[#a9c4ad]" />
              Khoảnh khắc thật
            </span>
            <span>
              <ShieldCheck className="mb-3 text-[#a9c4ad]" />
              Riêng tư rõ ràng
            </span>
          </div>
        </div>
        <p className="relative text-sm text-white/35">
          Circle Social · Made for meaningful communities
        </p>
      </section>
      <section className="grid place-items-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sage text-white">
              <Globe size={20} />
            </span>
            <b className="font-display text-2xl">Circle</b>
          </div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-sage">
            {register ? "Tạo không gian của bạn" : "Chào mừng trở lại"}
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold">
            {register ? "Tham gia Circle" : "Đăng nhập"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {register
              ? "Chỉ mất một phút để bắt đầu kết nối."
              : "Tiếp tục câu chuyện cùng bạn bè."}
          </p>
          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            {register && (
              <>
                <label className="block text-sm font-semibold">
                  Tên hiển thị
                  <Input
                    className="mt-2"
                    value={form.displayName}
                    onChange={update("displayName")}
                    placeholder="Nguyễn An"
                    required
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Username
                  <Input
                    className="mt-2"
                    value={form.username}
                    onChange={update("username")}
                    placeholder="nguyen_an"
                    pattern="[a-z0-9_]{3,32}"
                    required
                  />
                </label>
              </>
            )}
            <label className="block text-sm font-semibold">
              Email
              <Input
                className="mt-2"
                type="email"
                value={form.email}
                onChange={update("email")}
                placeholder="ban@example.com"
                required
              />
            </label>
            <label className="block text-sm font-semibold">
              Mật khẩu
              <Input
                className="mt-2"
                type="password"
                value={form.password}
                onChange={update("password")}
                placeholder="Tối thiểu 8 ký tự"
                minLength={8}
                required
              />
            </label>
            <Button
              className="mt-2 h-12 w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                "Đang xử lý…"
              ) : (
                <>
                  {register ? "Tạo tài khoản" : "Đăng nhập"}
                  <ArrowRight size={18} />
                </>
              )}
            </Button>
          </form>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            {register ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
            <Link
              className="font-bold text-sage-dark hover:underline"
              to={register ? "/login" : "/register"}
            >
              {register ? "Đăng nhập" : "Tham gia ngay"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
