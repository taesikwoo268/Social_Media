import { ApiException, badRequest, forbidden } from "../../errors";
import { issueSession } from "../../auth";
import { isValidUsername } from "../../domain";
import { authRepository } from "./auth.repository";
import type { LoginInput, RegisterInput } from "./auth.types";

export const authService = {
  async register(input: RegisterInput) {
    if (!isValidUsername(input.username))
      throw badRequest("Username chỉ gồm chữ thường, số và dấu gạch dưới", {
        username: "Username không hợp lệ",
      });
    if (await authRepository.findDuplicate(input.email, input.username))
      throw new ApiException(
        409,
        "ACCOUNT_EXISTS",
        "Email hoặc username đã được sử dụng",
      );
    const user = await authRepository.create(input);
    return issueSession(user.id, user.role);
  },
  async login(input: LoginInput) {
    const user = await authRepository.findByEmail(input.email);
    if (
      !user ||
      !(await Bun.password.verify(input.password, user.passwordHash))
    )
      throw new ApiException(
        401,
        "INVALID_CREDENTIALS",
        "Email hoặc mật khẩu không đúng",
      );
    if (user.status !== "active") throw forbidden("Tài khoản đang bị đình chỉ");
    return issueSession(user.id, user.role);
  },
};
