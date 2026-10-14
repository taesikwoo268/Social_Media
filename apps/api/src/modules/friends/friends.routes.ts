import { Elysia } from "elysia";
import { requireUser } from "../../auth";
import { accessToken } from "../../shared/http";
import { parseInput } from "../../shared/validation";
import {
  createFriendRequestSchema,
  friendActionSchema,
  friendUserParamSchema,
} from "./friends.schema";
import { friendsService } from "./friends.service";

export const friendsRoutes = new Elysia({ prefix: "/friends" })
  .get("/requests", async ({ cookie }) => {
    const me = await requireUser(accessToken(cookie));
    return friendsService.requests(me.id);
  })
  .get("/", async ({ cookie }) => {
    const me = await requireUser(accessToken(cookie));
    return friendsService.list(me.id);
  })
  .post("/requests", async ({ body, cookie, set }) => {
    const me = await requireUser(accessToken(cookie));
    const result = await friendsService.create(
      parseInput(createFriendRequestSchema, body),
      me.id,
    );
    set.status = 201;
    return result;
  })
  .post("/requests/:id/:action", async ({ params, cookie }) => {
    const me = await requireUser(accessToken(cookie));
    await friendsService.act(parseInput(friendActionSchema, params), me.id);
    return { ok: true };
  })
  .delete("/:userId", async ({ params, cookie }) => {
    const me = await requireUser(accessToken(cookie));
    await friendsService.remove(
      parseInput(friendUserParamSchema, params).userId,
      me.id,
    );
    return { ok: true };
  });
