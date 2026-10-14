import { Elysia } from "elysia";
import { requireUser } from "../../auth";
import { accessToken } from "../../shared/http";
import { parseInput } from "../../shared/validation";
import {
  profileMediaSchema,
  searchUsersSchema,
  updateProfileSchema,
  usernameParamSchema,
} from "./users.schema";
import { usersService } from "./users.service";

export const usersRoutes = new Elysia({ prefix: "/users" })
  .get("/search", async ({ query, cookie }) => {
    const me = await requireUser(accessToken(cookie));
    return usersService.search(parseInput(searchUsersSchema, query), me.id);
  })
  .get("/:username/posts", async ({ params, cookie }) => {
    const me = await requireUser(accessToken(cookie));
    return usersService.posts(
      parseInput(usernameParamSchema, params).username,
      me.id,
    );
  })
  .get("/:username", async ({ params, cookie }) => {
    const me = await requireUser(accessToken(cookie));
    return usersService.profile(
      parseInput(usernameParamSchema, params).username,
      me.id,
    );
  })
  .patch("/me", async ({ body, cookie }) => {
    const me = await requireUser(accessToken(cookie));
    await usersService.update(parseInput(updateProfileSchema, body), me.id);
    return { ok: true };
  })
  .post("/me/:purpose", async ({ params, body, cookie, set }) => {
    const me = await requireUser(accessToken(cookie));
    const result = await usersService.upload(
      parseInput(profileMediaSchema, {
        purpose: params.purpose,
        file: (body as any)?.file,
      }),
      me.id,
    );
    set.status = 201;
    return result;
  });
