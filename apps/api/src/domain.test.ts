import { describe, expect, test } from "bun:test";
import { canCreateReply, canViewPost, isValidUsername } from "./domain";
import { normalizePair, parseImage, sha256 } from "./utils";

describe("post access", () => {
  const base = {
    viewerId: "viewer",
    authorId: "author",
    visibility: "friends" as const,
    friends: false,
    admin: false,
  };
  test("allows public, owner, friend and admin", () => {
    expect(canViewPost({ ...base, visibility: "public" })).toBe(true);
    expect(canViewPost({ ...base, viewerId: "author" })).toBe(true);
    expect(canViewPost({ ...base, friends: true })).toBe(true);
    expect(canViewPost({ ...base, admin: true })).toBe(true);
  });
  test("blocks strangers from friends-only posts", () =>
    expect(canViewPost(base)).toBe(false));
});

test("reply depth is limited to one level", () => {
  expect(canCreateReply({ parentId: null })).toBe(true);
  expect(canCreateReply({ parentId: "root" })).toBe(false);
  expect(canCreateReply(null)).toBe(false);
});

test("friend pairs are canonical and hashing is stable", () => {
  expect(normalizePair("z", "a")).toEqual(["a", "z"]);
  expect(sha256("circle")).toHaveLength(64);
});

test("username policy", () => {
  expect(isValidUsername("nguyen_an")).toBe(true);
  expect(isValidUsername("Nguyễn An")).toBe(false);
});

test("media validation checks file signatures", async () => {
  const validPng = new File(
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])],
    "image.png",
    {
      type: "image/png",
    },
  );
  expect((await parseImage(validPng, "post")).mimeType).toBe("image/png");
  const disguised = new File(["not an image"], "fake.png", {
    type: "image/png",
  });
  expect(parseImage(disguised, "post")).rejects.toThrow("không khớp");
});
