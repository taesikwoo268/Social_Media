import { Elysia } from "elysia";
import { requireUser } from "../../auth";
import { accessToken } from "../../shared/http";
import { parseInput } from "../../shared/validation";
import {
  conversationParamSchema,
  createDirectConversationSchema,
  markConversationReadSchema,
} from "./conversations.schema";
import { conversationsService } from "./conversations.service";

export const conversationsRoutes = new Elysia({ prefix: "/conversations" })
  .get("/", async ({ cookie }) => {
    const me = await requireUser(accessToken(cookie));
    return conversationsService.list(me.id);
  })
  .post("/direct", async ({ body, cookie, set }) => {
    const me = await requireUser(accessToken(cookie));
    const result = await conversationsService.createDirect(
      parseInput(createDirectConversationSchema, body),
      me,
    );
    set.status = 201;
    return result;
  })
  .get("/:id", async ({ params, cookie }) => {
    const me = await requireUser(accessToken(cookie));
    return conversationsService.get(
      parseInput(conversationParamSchema, params).id,
      me.id,
    );
  })
  .post("/:id/read", async ({ params, body, cookie }) => {
    const me = await requireUser(accessToken(cookie));
    await conversationsService.markRead(
      parseInput(conversationParamSchema, params).id,
      parseInput(markConversationReadSchema, body),
      me.id,
    );
    return { ok: true };
  });
