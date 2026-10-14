import { Elysia } from "elysia";
import { requireUser } from "../../auth";
import { accessToken } from "../../shared/http";
import { parseInput } from "../../shared/validation";
import {
  commentParamSchema,
  createCommentSchema,
  postCommentsParamSchema,
  updateCommentSchema,
} from "./comments.schema";
import { commentsService } from "./comments.service";

export const commentsRoutes = new Elysia({ prefix: "/comments" })
  .get("/post/:postId", async ({ params, cookie }) =>
    commentsService.list(
      parseInput(postCommentsParamSchema, params).postId,
      await requireUser(accessToken(cookie)),
    ),
  )
  .post("/post/:postId", async ({ params, body, cookie, set }) => {
    const result = await commentsService.create(
      parseInput(postCommentsParamSchema, params).postId,
      parseInput(createCommentSchema, body),
      await requireUser(accessToken(cookie)),
    );
    set.status = 201;
    return result;
  })
  .patch("/:id", async ({ params, body, cookie }) => {
    const me = await requireUser(accessToken(cookie));
    return commentsService.update(
      parseInput(commentParamSchema, params).id,
      parseInput(updateCommentSchema, body),
      me.id,
    );
  })
  .delete("/:id", async ({ params, cookie }) => {
    await commentsService.remove(
      parseInput(commentParamSchema, params).id,
      await requireUser(accessToken(cookie)),
    );
    return { ok: true };
  });
