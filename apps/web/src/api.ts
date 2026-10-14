const API = "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...options,
    credentials: "include",
    headers:
      options.body instanceof FormData
        ? options.headers
        : { "content-type": "application/json", ...options.headers },
  });
  if (
    response.status === 401 &&
    retry &&
    path !== "/auth/refresh" &&
    path !== "/auth/login"
  ) {
    const refreshed = await fetch(`${API}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (refreshed.ok) return api<T>(path, options, false);
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      code: "HTTP_ERROR",
      message: "Không thể kết nối máy chủ",
    }));
    throw new ApiError(response.status, error.code, error.message);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const assetUrl = (url?: string | null) => (url ? `/api${url}` : null);
export const formatTime = (value: string) =>
  new Intl.RelativeTimeFormat("vi", { numeric: "auto" }).format(
    ...relative(new Date(value)),
  );
function relative(date: Date): [number, Intl.RelativeTimeFormatUnit] {
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  if (Math.abs(seconds) < 60) return [seconds, "second"];
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return [minutes, "minute"];
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return [hours, "hour"];
  return [Math.round(hours / 24), "day"];
}
