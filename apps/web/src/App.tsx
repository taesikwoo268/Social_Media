import {
  Component,
  createContext,
  useContext,
  useState,
  type ErrorInfo,
  type PropsWithChildren,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Bell,
  Home,
  LogOut,
  Search,
  Shield,
  UserRound,
  Users,
  Settings,
  Globe,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { SessionUser } from "@circle/shared";
import { api } from "./api";
import { AppAvatar as Avatar } from "@/components/app-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AuthPage } from "./pages/AuthPage";
import { FeedPage } from "./pages/FeedPage";
import { SearchPage } from "./pages/SearchPage";
import { FriendsPage } from "./pages/FriendsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SettingsPage } from "./pages/SettingsPage";
import { AdminPage } from "./pages/AdminPage";
import { ChatPage } from "./pages/ChatPage";
import { ChatRealtimeProvider } from "./features/chat/chat-realtime-provider";

type AuthValue = { user: SessionUser; refresh: () => Promise<unknown> };
const AuthContext = createContext<AuthValue | null>(null);
export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthContext is missing");
  return value;
};

export class ErrorBoundary extends Component<
  PropsWithChildren,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }
  render() {
    return this.state.failed ? (
      <main className="grid min-h-screen place-items-center p-6">
        <Card className="max-w-md p-8 text-center">
          <h1 className="font-display text-2xl font-semibold">
            Có gì đó chưa ổn
          </h1>
          <p className="mt-2 text-muted-foreground">
            Hãy tải lại trang để tiếp tục.
          </p>
          <Button
            className="mt-6"
            onClick={() => location.reload()}
          >
            Tải lại trang
          </Button>
        </Card>
      </main>
    ) : (
      this.props.children
    );
  }
}

const nav = [
  { to: "/", label: "Bảng tin", icon: Home },
  { to: "/search", label: "Khám phá", icon: Search },
  { to: "/friends", label: "Bạn bè", icon: Users },
  { to: "/messages", label: "Tin nhắn", icon: MessageCircle },
  { to: "/notifications", label: "Thông báo", icon: Bell },
];

function Shell({ user, refresh }: AuthValue) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: note } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<any>("/notifications"),
    refetchInterval: 30_000,
  });
  const { data: chats } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api<any>("/conversations"),
    refetchInterval: 5_000,
  });

  const logout = useMutation({
    mutationFn: () => api("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.clear();
      navigate("/login");
    },
  });

  const links =
    user.role === "admin"
      ? [...nav, { to: "/admin", label: "Quản trị", icon: Shield }]
      : nav;
  return (
    <AuthContext.Provider value={{ user, refresh }}>
      <ChatRealtimeProvider>
        <div
          className={cn(
            "mx-auto min-h-screen max-w-[1440px] lg:grid",
            "lg:grid-cols-[250px_minmax(0,1fr)_280px]",
          )}
        >
          <aside
            className={cn(
              "sticky top-0 hidden h-screen border-r border-line/70",
              "px-5 py-7 lg:flex lg:flex-col",
            )}
          >
            <NavLink
              to="/"
              className="flex items-center gap-3 px-3"
            >
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sage text-white">
                <Globe size={21} />
              </span>
              <span className="font-display text-2xl font-semibold tracking-tight">
                Circle
              </span>
            </NavLink>
            <nav className="mt-10 space-y-1">
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex h-12 items-center gap-3 rounded-xl px-3.5",
                      "text-sm font-medium text-muted-foreground transition",
                      "hover:bg-card hover:text-ink",
                      isActive && "bg-card text-ink shadow-sm",
                    )
                  }
                >
                  <Icon size={20} />
                  <span>{label}</span>
                  {label === "Thông báo" && note?.unreadCount > 0 && (
                    <b className="ml-auto rounded-full bg-coral px-2 py-0.5 text-[10px] text-white">
                      {note.unreadCount}
                    </b>
                  )}
                  {label === "Tin nhắn" && chats?.unreadCount > 0 && (
                    <b className="ml-auto rounded-full bg-coral px-2 py-0.5 text-[10px] text-white">
                      {chats.unreadCount}
                    </b>
                  )}
                </NavLink>
              ))}
            </nav>
            <div className="mt-auto rounded-2xl border border-line bg-card p-3">
              <NavLink
                to={`/u/${user.username}`}
                className="flex items-center gap-3"
              >
                <Avatar
                  src={user.avatarUrl ? `/api${user.avatarUrl}` : null}
                  name={user.displayName}
                />
                <span className="min-w-0">
                  <b className="block truncate text-sm">{user.displayName}</b>
                  <small className="text-muted-foreground">
                    @{user.username}
                  </small>
                </span>
              </NavLink>
              <button
                onClick={() => logout.mutate()}
                className={cn(
                  "mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2",
                  "text-xs font-medium text-muted-foreground hover:bg-sand hover:text-ink",
                )}
              >
                <LogOut size={15} /> Đăng xuất
              </button>
            </div>
          </aside>
          <main className="min-w-0 pb-24 lg:pb-8">
            <Routes>
              <Route
                path="/"
                element={<FeedPage />}
              />
              <Route
                path="/search"
                element={<SearchPage />}
              />
              <Route
                path="/friends"
                element={<FriendsPage />}
              />
              <Route
                path="/notifications"
                element={<NotificationsPage />}
              />
              <Route
                path="/messages"
                element={<ChatPage />}
              />
              <Route
                path="/messages/:conversationId"
                element={<ChatPage />}
              />
              <Route
                path="/u/:username"
                element={<ProfilePage />}
              />
              <Route
                path="/settings"
                element={<SettingsPage />}
              />
              <Route
                path="/admin"
                element={
                  user.role === "admin" ? <AdminPage /> : <Navigate to="/" />
                }
              />
              <Route
                path="*"
                element={<Navigate to="/" />}
              />
            </Routes>
          </main>
          <aside className="hidden border-l border-line/70 px-5 py-7 lg:block">
            <div className="sticky top-7">
              <Card className="p-5">
                <h2 className="mt-2 font-display text-xl font-semibold">
                  Chào {user.displayName.split(" ").slice(-1)[0]}
                </h2>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <NavLink
                    to={`/u/${user.username}`}
                    className="rounded-xl bg-sand p-3 text-center text-xs font-semibold"
                  >
                    <UserRound
                      className="mx-auto mb-1"
                      size={18}
                    />
                    Hồ sơ
                  </NavLink>
                  <NavLink
                    to="/settings"
                    className="rounded-xl bg-sand p-3 text-center text-xs font-semibold"
                  >
                    <Settings
                      className="mx-auto mb-1"
                      size={18}
                    />
                    Cài đặt
                  </NavLink>
                </div>
              </Card>
            </div>
          </aside>
          <nav
            className={cn(
              "fixed inset-x-3 bottom-3 z-50 grid h-16 grid-cols-6 items-center",
              "rounded-2xl border border-line bg-card/95",
              "px-2 shadow-xl backdrop-blur lg:hidden",
            )}
          >
            {links.slice(0, 5).map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                aria-label={label}
                className={({ isActive }) =>
                  cn(
                    "relative grid h-11 w-full place-items-center rounded-xl text-muted-foreground",
                    isActive && "bg-sage/10 text-sage-dark",
                  )
                }
              >
                <Icon size={21} />
                {label === "Thông báo" && note?.unreadCount > 0 && (
                  <i
                    className={cn(
                      "absolute right-2 top-1 h-2.5 w-2.5 rounded-full",
                      "border-2 border-card bg-coral",
                    )}
                  />
                )}
                {label === "Tin nhắn" && chats?.unreadCount > 0 && (
                  <i
                    className={cn(
                      "absolute right-2 top-1 h-2.5 w-2.5 rounded-full",
                      "border-2 border-card bg-coral",
                    )}
                  />
                )}
              </NavLink>
            ))}
            <NavLink
              to={`/u/${user.username}`}
              className="grid place-items-center"
              aria-label="Hồ sơ"
            >
              <Avatar
                src={user.avatarUrl ? `/api${user.avatarUrl}` : null}
                name={user.displayName}
                className="h-9 w-9"
              />
            </NavLink>
          </nav>
        </div>
      </ChatRealtimeProvider>
    </AuthContext.Provider>
  );
}

export function App() {
  const location = useLocation();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<SessionUser>("/auth/me"),
    retry: false,
  });
  if (me.isPending)
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Skeleton className="h-14 w-44" />
        <div className="mx-auto mt-20 max-w-xl space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  if (me.isError)
    return location.pathname === "/register" ? (
      <AuthPage mode="register" />
    ) : (
      <AuthPage mode="login" />
    );
  if (location.pathname === "/login" || location.pathname === "/register")
    return <Navigate to="/" />;
  return (
    <Shell
      user={me.data}
      refresh={() => me.refetch()}
    />
  );
}
