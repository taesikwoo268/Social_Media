import { Elysia } from "elysia";
import { app } from "./application";

void Elysia;

if (!process.env.VERCEL) {
  app.listen(Number(process.env.API_PORT ?? 3000));

  console.log(`Circle API running at http://localhost:${app.server?.port}`);
}

export default app;
