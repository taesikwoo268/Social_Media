import { Elysia } from "elysia";
import { app } from "./application";

void Elysia;

if (!process.env.VERCEL) {
  app.listen({
    hostname: process.env.HOST ?? "0.0.0.0",
    port: Number(process.env.PORT ?? process.env.API_PORT ?? 3000),
  });

  console.log(`Circle API running on port ${app.server?.port}`);
}

export default app;
