import { ApiException, badRequest, forbidden, notFound } from "../../errors";
import { mediaUrl, normalizePair } from "../../utils";
import { notificationsService } from "../notifications/notifications.service";
import { friendsRepository } from "./friends.repository";
import type {
  CreateFriendRequestInput,
  FriendActionInput,
} from "./friends.types";

export const friendsService = {
  async requests(userId: string) {
    const rows = await friendsRepository.incoming(userId);
    return {
      items: rows.map((row) => ({
        ...row,
        avatarUrl: mediaUrl(row.avatarMediaId),
      })),
      nextCursor: null,
    };
  },
  async list(userId: string) {
    const rows = await friendsRepository.list(userId);
    return {
      items: rows.map((row) => ({
        ...row,
        avatarUrl: mediaUrl(row.avatarMediaId),
      })),
      nextCursor: null,
    };
  },
  async create(input: CreateFriendRequestInput, senderId: string) {
    if (input.userId === senderId)
      throw badRequest("Không thể kết bạn với chính mình");
    if (!(await friendsRepository.activeUser(input.userId)))
      throw notFound("Không tìm thấy người dùng");
    if (await friendsRepository.areFriends(senderId, input.userId))
      throw new ApiException(409, "ALREADY_FRIENDS", "Hai người đã là bạn bè");
    if (await friendsRepository.pending(senderId, input.userId))
      throw new ApiException(
        409,
        "REQUEST_EXISTS",
        "Đã có lời mời kết bạn đang chờ",
      );
    const request = await friendsRepository.create(senderId, input.userId);
    await notificationsService.create(
      input.userId,
      senderId,
      "friend_request",
      request.id,
    );
    return request;
  },
  async act(input: FriendActionInput, userId: string) {
    const request = await friendsRepository.request(input.id);
    if (!request) throw notFound("Không tìm thấy lời mời");
    if (input.action === "cancel") {
      if (request.senderId !== userId) throw forbidden();
      await friendsRepository.setRequestStatus(input.id, "cancelled");
      return;
    }
    if (request.receiverId !== userId) throw forbidden();
    if (input.action === "reject") {
      await friendsRepository.setRequestStatus(input.id, "rejected");
      return;
    }
    const [low, high] = normalizePair(request.senderId, request.receiverId);
    await friendsRepository.accept(input.id, low, high);
    await notificationsService.create(
      request.senderId,
      userId,
      "friend_accepted",
      request.id,
    );
  },
  async remove(otherId: string, userId: string) {
    const [low, high] = normalizePair(userId, otherId);
    await friendsRepository.remove(low, high);
  },
};
