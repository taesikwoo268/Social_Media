import type { PostVisibility } from "@circle/shared";

export function canViewPost(input: {
  viewerId: string;
  authorId: string;
  visibility: PostVisibility;
  friends: boolean;
  admin: boolean;
}) {
  return (
    input.admin ||
    input.viewerId === input.authorId ||
    input.visibility === "public" ||
    input.friends
  );
}

export function canCreateReply(parent: { parentId: string | null } | null) {
  return Boolean(parent && !parent.parentId);
}

export function isValidUsername(value: string) {
  return /^[a-z0-9_]{3,32}$/.test(value);
}
