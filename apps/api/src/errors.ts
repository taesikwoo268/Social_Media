export class ApiException extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

export const notFound = (message = "Không tìm thấy dữ liệu") =>
  new ApiException(404, "NOT_FOUND", message);

export const forbidden = (
  message = "Bạn không có quyền thực hiện thao tác này",
) => new ApiException(403, "FORBIDDEN", message);

export const badRequest = (
  message: string,
  fieldErrors?: Record<string, string>,
) => new ApiException(400, "BAD_REQUEST", message, fieldErrors);
