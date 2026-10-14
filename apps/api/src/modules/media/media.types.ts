export type MediaViewer = { id: string; role: "user" | "admin" };
export type MediaResponse = {
  data: Buffer;
  mimeType: string;
  byteSize: number;
  checksum: string;
};
