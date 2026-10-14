import { eq } from "drizzle-orm";
import { db, sql } from "./db";
import { profiles, users } from "./schema";

const email = (
  process.env.SEED_ADMIN_EMAIL ?? "admin@example.com"
).toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
const [existing] = await db
  .select({ id: users.id })
  .from(users)
  .where(eq(users.email, email))
  .limit(1);
if (!existing) {
  const [admin] = await db
    .insert(users)
    .values({
      email,
      passwordHash: await Bun.password.hash(password),
      role: "admin",
    })
    .returning({ id: users.id });
  if (!admin) throw new Error("Could not create admin");
  await db.insert(profiles).values({
    userId: admin.id,
    username: "admin",
    displayName: "Quản trị viên",
  });
  console.log(`Created admin ${email}`);
} else console.log(`Admin ${email} already exists`);
await sql.end();
