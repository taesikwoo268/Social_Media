import { Elysia } from "elysia";
import { requireUser } from "../../auth";
import { accessToken } from "../../shared/http";
import { parseInput } from "../../shared/validation";
import { notificationParamSchema } from "./notifications.schema";
import { notificationsService } from "./notifications.service";
export const notificationsRoutes = new Elysia({ prefix: "/notifications" })
  .get("/", async ({ cookie }) => {
    const me = await requireUser(accessToken(cookie));
    return notificationsService.list(me.id);
  })
  .post("/read-all", async ({ cookie }) => {
    const me = await requireUser(accessToken(cookie));
    await notificationsService.readAll(me.id);
    return { ok: true };
  })
  .post("/:id/read", async ({ params, cookie }) => {
    const me = await requireUser(accessToken(cookie));
    await notificationsService.read(
      parseInput(notificationParamSchema, params).id,
      me.id,
    );
    return { ok: true };
  });
