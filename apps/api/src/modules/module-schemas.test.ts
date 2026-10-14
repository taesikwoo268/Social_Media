import { describe, expect, test } from "bun:test";
import { registerSchema } from "./auth/auth.schema";
import { createPostSchema } from "./posts/posts.schema";
import { friendActionSchema } from "./friends/friends.schema";
import { createCommentSchema } from "./comments/comments.schema";

describe("module Zod schemas", () => {
  test("normalizes auth input", () => {
    const value = registerSchema.parse({
      email: " ADMIN@EXAMPLE.COM ",
      username: " Admin_user ",
      displayName: " Admin ",
      password: "ChangeMe123!",
    });
    expect(value.email).toBe("admin@example.com");
    expect(value.username).toBe("admin_user");
    expect(value.displayName).toBe("Admin");
  });

  test("rejects unsupported enum values", () => {
    expect(() =>
      createPostSchema.parse({ content: "hello", visibility: "private" }),
    ).toThrow();
    expect(() =>
      friendActionSchema.parse({ id: crypto.randomUUID(), action: "block" }),
    ).toThrow();
  });

  test("enforces comment limits", () => {
    expect(() => createCommentSchema.parse({ content: "" })).toThrow();
    expect(createCommentSchema.parse({ content: " Xin chào " }).content).toBe(
      "Xin chào",
    );
  });
});
