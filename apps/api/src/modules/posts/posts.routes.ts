import { Elysia } from "elysia";
import { requireUser } from "../../auth";
import { accessToken } from "../../shared/http";
import { parseInput } from "../../shared/validation";
import {
  createPostSchema,
  feedQuerySchema,
  updatePostSchema,
} from "./posts.schema";
import { postsService } from "./posts.service";

export const postsRoutes = new Elysia()
  .group("/posts", (app) =>
    app
      .post("/", async ({ body, cookie, set }) => {
        const me = await requireUser(accessToken(cookie));
        const result = await postsService.create(
          parseInput(createPostSchema, body),
          me,
        );
        set.status = 201;
        return result;
      })
      .get("/:id", async ({ params, cookie }) =>
        postsService.get(params.id, await requireUser(accessToken(cookie))),
      )
      .patch("/:id", async ({ params, body, cookie }) =>
        postsService.update(
          params.id,
          parseInput(updatePostSchema, body),
          await requireUser(accessToken(cookie)),
        ),
      )
      .delete("/:id", async ({ params, cookie }) => {
        await postsService.remove(
          params.id,
          await requireUser(accessToken(cookie)),
        );
        return { ok: true };
      })
      .post("/:id/like", async ({ params, cookie }) => {
        await postsService.like(
          params.id,
          await requireUser(accessToken(cookie)),
        );
        return { liked: true };
      })
      .delete("/:id/like", async ({ params, cookie }) => {
        const me = await requireUser(accessToken(cookie));
        await postsService.unlike(params.id, me.id);
        return { liked: false };
      }),
  )
  .get("/feed", async ({ query, cookie }) =>
    postsService.feed(
      parseInput(feedQuerySchema, query),
      await requireUser(accessToken(cookie)),
    ),
  );
