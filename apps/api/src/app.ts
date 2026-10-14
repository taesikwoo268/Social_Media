import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { ApiException } from "./errors";
import { isAllowedOrigin } from "./shared/http";
import { authRoutes } from "./modules/auth/auth.routes";
import { usersRoutes } from "./modules/users/users.routes";
import { friendsRoutes } from "./modules/friends/friends.routes";
import { postsRoutes } from "./modules/posts/posts.routes";
import { commentsRoutes } from "./modules/comments/comments.routes";
import { notificationsRoutes } from "./modules/notifications/notifications.routes";
import { mediaRoutes } from "./modules/media/media.routes";
import { adminRoutes } from "./modules/admin/admin.routes";

export const app = new Elysia()
  .use(
    cors({
      origin: (request) => isAllowedOrigin(request.headers.get("origin")),
      credentials: true,
    }),
  )
  .onBeforeHandle(({ request }) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      const requestOrigin = request.headers.get("origin");
      if (requestOrigin && !isAllowedOrigin(requestOrigin))
        throw new ApiException(
          403,
          "INVALID_ORIGIN",
          "Nguồn yêu cầu không hợp lệ",
        );
    }
  })
  .onError(({ error, set, code }) => {
    if (error instanceof ApiException) {
      set.status = error.status;
      return {
        code: error.code,
        message: error.message,
        fieldErrors: error.fieldErrors,
      };
    }
    if (code === "VALIDATION") {
      set.status = 422;
      return { code: "VALIDATION_ERROR", message: "Dữ liệu không hợp lệ" };
    }
    console.error(error);
    set.status = 500;
    return { code: "INTERNAL_ERROR", message: "Đã có lỗi xảy ra" };
  })
  .get("/health", () => ({ ok: true }))
  .use(authRoutes)
  .use(usersRoutes)
  .use(friendsRoutes)
  .use(postsRoutes)
  .use(commentsRoutes)
  .use(notificationsRoutes)
  .use(mediaRoutes)
  .use(adminRoutes);

export type App = typeof app;
