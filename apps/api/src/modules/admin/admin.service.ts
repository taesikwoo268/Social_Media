import { badRequest } from "../../errors";
import { adminRepository } from "./admin.repository";
import type {
  AdminPostModerationInput,
  AdminUserStatusInput,
  AdminUsersQuery,
} from "./admin.types";
export const adminService = {
  async users(input: AdminUsersQuery) {
    return { items: await adminRepository.users(input.q), nextCursor: null };
  },
  async setUserStatus(
    id: string,
    input: AdminUserStatusInput,
    adminId: string,
  ) {
    if (id === adminId) throw badRequest("Không thể đình chỉ chính mình");
    await adminRepository.setUserStatus(id, input.status);
  },
  moderatePost: (id: string, input: AdminPostModerationInput) =>
    adminRepository.moderatePost(id, input.status),
};
