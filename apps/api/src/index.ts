import { app } from "./app";

app.listen(Number(process.env.API_PORT ?? 3000));

console.log(`Circle API running at http://localhost:${app.server?.port}`);
