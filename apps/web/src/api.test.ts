import { expect, test } from "bun:test";
import { assetUrl } from "./api";

test("media URLs are routed through the local API proxy", () => {
  expect(assetUrl("/media/abc")).toBe("/api/media/abc");
  expect(assetUrl(null)).toBeNull();
});
