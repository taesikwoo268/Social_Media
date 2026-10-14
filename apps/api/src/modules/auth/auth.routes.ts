import { Elysia } from "elysia";
import { requireUser, revokeSession, rotateSession } from "../../auth";
import { accessToken, clearTokens, setTokens } from "../../shared/http";
import { parseInput } from "../../shared/validation";
import { loginSchema, registerSchema } from "./auth.schema";
import { authService } from "./auth.service";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .post("/register", async ({ body, cookie, set }) => {
    setTokens(
      cookie,
      await authService.register(parseInput(registerSchema, body)),
    );
    set.status = 201;
    return { ok: true };
  })
  .post("/login", async ({ body, cookie }) => {
    setTokens(cookie, await authService.login(parseInput(loginSchema, body)));
    return { ok: true };
  })
  .post("/refresh", async ({ cookie }) => {
    setTokens(
      cookie,
      await rotateSession(cookie.refresh?.value as string | undefined),
    );
    return { ok: true };
  })
  .post("/logout", async ({ cookie }) => {
    await revokeSession(cookie.refresh?.value as string | undefined);
    clearTokens(cookie);
    return { ok: true };
  })
  .get("/me", async ({ cookie }) => requireUser(accessToken(cookie)));
