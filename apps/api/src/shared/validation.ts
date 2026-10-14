import { z } from "zod";
import { ApiException } from "../errors";

export function parseInput<T extends z.ZodType>(
  schema: T,
  input: unknown,
): z.infer<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "root";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  throw new ApiException(
    422,
    "VALIDATION_ERROR",
    "Dữ liệu không hợp lệ",
    fieldErrors,
  );
}
