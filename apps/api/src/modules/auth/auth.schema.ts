import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().max(320).pipe(z.email()),
  username: z
    .string()
    .min(3)
    .max(32)
    .transform((value) => value.trim().toLowerCase()),
  displayName: z.string().trim().min(1).max(80),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(128),
});
