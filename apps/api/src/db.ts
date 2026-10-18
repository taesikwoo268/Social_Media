import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

export const sql = postgres(connectionString, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});
export const db = drizzle(sql, { schema });
