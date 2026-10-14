import { eq } from "drizzle-orm";
import { db } from "../../db";
import { media, postMedia } from "../../schema";
export const mediaRepository = {
  async byId(id: string) {
    const [row] = await db
      .select()
      .from(media)
      .where(eq(media.id, id))
      .limit(1);
    return row ?? null;
  },

  async postId(mediaId: string) {
    const [row] = await db
      .select({ postId: postMedia.postId })
      .from(postMedia)
      .where(eq(postMedia.mediaId, mediaId))
      .limit(1);
    return row?.postId ?? null;
  },
};
