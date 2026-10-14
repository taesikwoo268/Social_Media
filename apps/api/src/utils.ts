import { createHash } from "node:crypto";
import {
  ALLOWED_IMAGE_TYPES,
  MEDIA_LIMITS,
  type MediaPurpose,
} from "@circle/shared";
import { badRequest } from "./errors";

export const normalizePair = (a: string, b: string) =>
  a < b ? ([a, b] as const) : ([b, a] as const);

export const sha256 = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");

export async function parseImage(file: File, purpose: MediaPurpose) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as never))
    throw badRequest("Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP");
  if (file.size > MEDIA_LIMITS[purpose])
    throw badRequest(
      `Ảnh vượt quá giới hạn ${Math.round(MEDIA_LIMITS[purpose] / 1_048_576)} MB`,
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  const webp =
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (
    (file.type === "image/jpeg" && !jpeg) ||
    (file.type === "image/png" && !png) ||
    (file.type === "image/webp" && !webp)
  )
    throw badRequest("Nội dung tệp không khớp định dạng ảnh");
  return {
    data: Buffer.from(bytes),
    checksum: sha256(bytes),
    byteSize: file.size,
    fileName: file.name.slice(0, 255),
    mimeType: file.type,
  };
}

export const mediaUrl = (id: string | null) => (id ? `/media/${id}` : null);
