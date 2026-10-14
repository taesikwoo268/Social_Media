import { SignJWT, jwtVerify } from "jose";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "./db";
import { profiles, sessions, users } from "./schema";
import { ApiException } from "./errors";
import { mediaUrl, sha256 } from "./utils";

const accessSecret = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me-32-chars",
);
const refreshSecret = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me-32-chars",
);
const secure = process.env.NODE_ENV === "production";

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure,
  path: "/",
};

export async function createAccessToken(userId: string, role: string) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(accessSecret);
}

export async function createRefreshToken(userId: string, sessionId: string) {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(refreshSecret);
}

export async function verifyAccess(token?: string) {
  if (!token) return null;
  try {
    return (await jwtVerify(token, accessSecret)).payload;
  } catch {
    return null;
  }
}

export async function verifyRefresh(token?: string) {
  if (!token) return null;
  try {
    return (await jwtVerify(token, refreshSecret)).payload;
  } catch {
    return null;
  }
}

export async function currentUser(token?: string) {
  const payload = await verifyAccess(token);
  if (!payload?.sub) return null;
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      status: users.status,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarMediaId: profiles.avatarMediaId,
    })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, payload.sub))
    .limit(1);
  if (!row || row.status !== "active") return null;
  return { ...row, avatarUrl: mediaUrl(row.avatarMediaId) };
}

export async function requireUser(token?: string) {
  const user = await currentUser(token);
  if (!user) throw new ApiException(401, "UNAUTHORIZED", "Vui lòng đăng nhập");
  return user;
}

export async function requireAdmin(token?: string) {
  const user = await requireUser(token);
  if (user.role !== "admin")
    throw new ApiException(
      403,
      "FORBIDDEN",
      "Chỉ quản trị viên được thực hiện thao tác này",
    );
  return user;
}

export async function issueSession(userId: string, role: string) {
  const [session] = await db
    .insert(sessions)
    .values({
      userId,
      tokenHash: "pending",
      expiresAt: new Date(Date.now() + 30 * 86400_000),
    })
    .returning({ id: sessions.id });
  if (!session) throw new Error("Could not create session");
  const refresh = await createRefreshToken(userId, session.id);
  await db
    .update(sessions)
    .set({ tokenHash: sha256(refresh) })
    .where(eq(sessions.id, session.id));
  return { access: await createAccessToken(userId, role), refresh };
}

export async function rotateSession(token?: string) {
  const payload = await verifyRefresh(token);
  const sid = typeof payload?.sid === "string" ? payload.sid : null;
  if (!payload?.sub || !sid || !token)
    throw new ApiException(
      401,
      "INVALID_REFRESH",
      "Phiên đăng nhập không hợp lệ",
    );
  const [row] = await db
    .select({ session: sessions, role: users.role, status: users.status })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.id, sid),
        eq(sessions.tokenHash, sha256(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!row || row.status !== "active")
    throw new ApiException(
      401,
      "INVALID_REFRESH",
      "Phiên đăng nhập đã hết hạn hoặc bị thu hồi",
    );
  const refresh = await createRefreshToken(payload.sub, sid);
  await db
    .update(sessions)
    .set({
      tokenHash: sha256(refresh),
      expiresAt: new Date(Date.now() + 30 * 86400_000),
    })
    .where(eq(sessions.id, sid));
  return { access: await createAccessToken(payload.sub, row.role), refresh };
}

export async function revokeSession(token?: string) {
  const payload = await verifyRefresh(token);
  const sid = typeof payload?.sid === "string" ? payload.sid : null;
  if (sid)
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, sid));
}
