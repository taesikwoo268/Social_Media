import { Elysia } from "elysia";
import { requireUser } from "../../auth";
import { accessToken } from "../../shared/http";
import { parseInput } from "../../shared/validation";
import { mediaParamSchema } from "./media.schema";
import { mediaService } from "./media.service";
export const mediaRoutes = new Elysia().get(
  "/media/:id",
  async ({ params, cookie, request, set }) => {
    const asset = await mediaService.get(
      parseInput(mediaParamSchema, params).id,
      await requireUser(accessToken(cookie)),
    );
    if (request.headers.get("if-none-match") === `\"${asset.checksum}\"`) {
      set.status = 304;
      return;
    }
    set.headers["content-type"] = asset.mimeType;
    set.headers["content-length"] = String(asset.byteSize);
    set.headers.etag = `\"${asset.checksum}\"`;
    set.headers["cache-control"] = "private, max-age=86400";
    return new Response(new Uint8Array(asset.data));
  },
);
