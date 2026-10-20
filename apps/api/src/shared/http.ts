import { t } from "elysia";
import { cookieOptions } from "../auth";

const configuredWebOrigins =
  process.env.WEB_ORIGINS ?? process.env.WEB_ORIGIN ?? "http://localhost:5173";

export const allowedOrigins = new Set(
  configuredWebOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => new URL(origin).origin),
);
export const webOrigin =
  allowedOrigins.values().next().value ?? "http://localhost:5173";
const isDevelopment = process.env.NODE_ENV !== "production";

if (isDevelopment) {
  const configured = new URL(webOrigin);
  if (configured.hostname === "localhost") {
    configured.hostname = "127.0.0.1";
    allowedOrigins.add(configured.origin);
  } else if (configured.hostname === "127.0.0.1") {
    configured.hostname = "localhost";
    allowedOrigins.add(configured.origin);
  }
}

export function isAllowedOrigin(origin: string | null) {
  if (!origin) return false;
  if (allowedOrigins.has(origin)) return true;
  if (!isDevelopment) return false;

  try {
    const candidate = new URL(origin);
    return (
      ["http:", "https:"].includes(candidate.protocol) &&
      ["localhost", "127.0.0.1", "::1"].includes(candidate.hostname)
    );
  } catch {
    return false;
  }
}

export const uuidSchema = t.String({ format: "uuid" });

export const accessToken = (cookie: any) =>
  cookie.access?.value as string | undefined;

export function setTokens(
  cookie: any,
  tokens: { access: string; refresh: string },
) {
  cookie.access.set({ ...cookieOptions, value: tokens.access, maxAge: 900 });
  cookie.refresh.set({
    ...cookieOptions,
    value: tokens.refresh,
    maxAge: 2_592_000,
  });
}

export function clearTokens(cookie: any) {
  cookie.access.remove();
  cookie.refresh.remove();
}
