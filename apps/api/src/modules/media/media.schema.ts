import { z } from "zod";
export const mediaParamSchema = z.object({ id: z.uuid() });
