import { notFound } from "../../errors";
import { getVisiblePost } from "../posts/posts.service";
import { mediaRepository } from "./media.repository";
import type { MediaResponse, MediaViewer } from "./media.types";
export const mediaService = {
  async get(id: string, viewer: MediaViewer): Promise<MediaResponse> {
    const asset = await mediaRepository.byId(id);
    if (!asset) throw notFound("Không tìm thấy ảnh");
    if (asset.purpose === "post") {
      const postId = await mediaRepository.postId(id);
      if (
        !postId ||
        !(await getVisiblePost(postId, viewer.id, viewer.role === "admin"))
      )
        throw notFound("Không tìm thấy ảnh");
    }
    return asset;
  },
};
