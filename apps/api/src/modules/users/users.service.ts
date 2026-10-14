import { ApiException, badRequest, notFound } from "../../errors";
import { isValidUsername } from "../../domain";
import { mediaUrl, parseImage } from "../../utils";
import { friendsRepository } from "../friends/friends.repository";
import { serializePost } from "../posts/posts.service";
import { usersRepository } from "./users.repository";
import type {
  ProfileMediaInput,
  SearchUsersInput,
  UpdateProfileInput,
} from "./users.types";

export const usersService = {
  async search(input: SearchUsersInput, viewerId: string) {
    const rows = await usersRepository.search(input.q, viewerId);
    return {
      items: rows.map((row) => ({
        ...row,
        avatarUrl: mediaUrl(row.avatarMediaId),
      })),
      nextCursor: null,
    };
  },
  async profile(username: string, viewerId: string) {
    const row = await usersRepository.byUsername(username.toLowerCase());
    if (!row) throw notFound("Không tìm thấy người dùng");
    const [friends, request] = await Promise.all([
      friendsRepository.areFriends(viewerId, row.id),
      usersRepository.pendingRequest(viewerId, row.id),
    ]);
    return {
      ...row,
      avatarUrl: mediaUrl(row.avatarMediaId),
      coverUrl: mediaUrl(row.coverMediaId),
      relationship:
        row.id === viewerId
          ? "self"
          : friends
            ? "friends"
            : request
              ? request.senderId === viewerId
                ? "outgoing"
                : "incoming"
              : "none",
      requestId: request?.id ?? null,
    };
  },
  async posts(username: string, viewerId: string) {
    const owner = await usersRepository.byUsername(username.toLowerCase());
    if (!owner) throw notFound("Không tìm thấy người dùng");
    const friends = await friendsRepository.areFriends(viewerId, owner.id);
    const rows = await usersRepository.listPosts(
      owner.id,
      viewerId !== owner.id && !friends,
    );
    return {
      items: await Promise.all(
        rows.map((post) => serializePost(post, viewerId)),
      ),
      nextCursor: null,
    };
  },
  async update(input: UpdateProfileInput, viewerId: string) {
    const values: UpdateProfileInput = {};
    if (input.displayName !== undefined) values.displayName = input.displayName;
    if (input.bio !== undefined) values.bio = input.bio?.trim() || null;
    if (input.username !== undefined) {
      const username = input.username.toLowerCase();
      if (!isValidUsername(username)) throw badRequest("Username không hợp lệ");
      if (await usersRepository.usernameTaken(username, viewerId))
        throw new ApiException(
          409,
          "USERNAME_TAKEN",
          "Username đã được sử dụng",
        );
      values.username = username;
    }
    await usersRepository.updateProfile(viewerId, values);
  },
  async upload(input: ProfileMediaInput, viewerId: string) {
    const previous = await usersRepository.currentMedia(
      viewerId,
      input.purpose,
    );
    const id = await usersRepository.saveMedia(
      viewerId,
      input.purpose,
      await parseImage(input.file, input.purpose),
    );
    if (previous) await usersRepository.deleteMedia(previous, viewerId);
    return { id, url: mediaUrl(id) };
  },
};
