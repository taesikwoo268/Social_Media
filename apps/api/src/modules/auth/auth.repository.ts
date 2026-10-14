import { eq, or } from "drizzle-orm";
import { db } from "../../db";
import { profiles, users } from "../../schema";
import type { RegisterInput } from "./auth.types";

export const authRepository = {
  async findDuplicate(email: string, username: string) {
    const [row] = await db
      .select({ email: users.email, username: profiles.username })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(or(eq(users.email, email), eq(profiles.username, username)))
      .limit(1);
    return row ?? null;
  },

  async findByEmail(email: string) {
    const [row] = await db
      .select({
        id: users.id,
        passwordHash: users.passwordHash,
        role: users.role,
        status: users.status,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return row ?? null;
  },

  async create(input: RegisterInput) {
    return db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          email: input.email,
          passwordHash: await Bun.password.hash(input.password),
        })
        .returning({ id: users.id, role: users.role });
      if (!created) throw new Error("Could not create user");
      await tx.insert(profiles).values({
        userId: created.id,
        username: input.username,
        displayName: input.displayName,
      });
      return created;
    });
  },
};
