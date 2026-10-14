import { Elysia } from "elysia";
import { requireAdmin } from "../../auth";
import { accessToken } from "../../shared/http";
import { parseInput } from "../../shared/validation";
import {
  adminIdParamSchema,
  adminPostModerationSchema,
  adminUsersQuerySchema,
  adminUserStatusSchema,
} from "./admin.schema";
import { adminService } from "./admin.service";
export const adminRoutes = new Elysia({ prefix: "/admin" })
  .get("/users", async ({ query, cookie }) => {
    await requireAdmin(accessToken(cookie));
    return adminService.users(parseInput(adminUsersQuerySchema, query));
  })
  .post("/users/:id/status", async ({ params, body, cookie }) => {
    const admin = await requireAdmin(accessToken(cookie));
    await adminService.setUserStatus(
      parseInput(adminIdParamSchema, params).id,
      parseInput(adminUserStatusSchema, body),
      admin.id,
    );
    return { ok: true };
  })
  .post("/posts/:id/moderation", async ({ params, body, cookie }) => {
    await requireAdmin(accessToken(cookie));
    await adminService.moderatePost(
      parseInput(adminIdParamSchema, params).id,
      parseInput(adminPostModerationSchema, body),
    );
    return { ok: true };
  });
