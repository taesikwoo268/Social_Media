import { Elysia } from "elysia";
import { requireUser } from "../../auth";
import { accessToken } from "../../shared/http";
import { parseInput } from "../../shared/validation";
import {
  conversationMessagesParamSchema,
  createMessageSchema,
  messageListQuerySchema,
  messageParamSchema,
  updateMessageSchema,
} from "./messages.schema";
import { messagesService } from "./messages.service";

export const messagesRoutes = new Elysia()
  .group("/conversations", (app) =>
    app
      .get("/:id/messages", async ({ params, query, cookie }) => {
        const me = await requireUser(accessToken(cookie));
        const { id } = parseInput(conversationMessagesParamSchema, params);
        return messagesService.list(
          id,
          parseInput(messageListQuerySchema, query),
          me.id,
        );
      })
      .post("/:id/messages", async ({ params, body, cookie, set }) => {
        const me = await requireUser(accessToken(cookie));
        const { id } = parseInput(conversationMessagesParamSchema, params);
        const result = await messagesService.create(
          id,
          parseInput(createMessageSchema, body),
          me,
        );
        set.status = result.created ? 201 : 200;
        return result.message;
      }),
  )
  .group("/messages", (app) =>
    app
      .patch("/:id", async ({ params, body, cookie }) => {
        const me = await requireUser(accessToken(cookie));
        return messagesService.update(
          parseInput(messageParamSchema, params).id,
          parseInput(updateMessageSchema, body),
          me.id,
        );
      })
      .delete("/:id", async ({ params, cookie }) => {
        const me = await requireUser(accessToken(cookie));
        await messagesService.remove(
          parseInput(messageParamSchema, params).id,
          me.id,
        );
        return { ok: true };
      }),
  );
