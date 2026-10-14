import { expect, test } from "bun:test";
import { decodeCursor, encodeCursor } from "./index";

test("feed cursor round-trips timestamp and id", () => {
  const cursor = encodeCursor("2026-10-12T08:00:00.000Z", "post-id");
  const decoded = decodeCursor(cursor);
  expect(decoded?.[0].toISOString()).toBe("2026-10-12T08:00:00.000Z");
  expect(decoded?.[1]).toBe("post-id");
});

test("invalid cursors are rejected", () =>
  expect(decodeCursor("not-base64")).toBeNull());
