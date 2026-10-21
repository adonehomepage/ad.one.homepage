import { and, eq } from "drizzle-orm";
import { withStaff } from "@/lib/api/http";
import { assertRequestOrigin } from "@/lib/api/origin";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { UPLOAD_RATE_LIMIT_MAX, UPLOAD_RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { db } from "@/lib/db";
import { mediaAssets, projects } from "@/lib/db/schema";
import { assertStorageWritable, saveObject, storageProviderName } from "@/lib/storage";
import { appConfig } from "@/lib/config";
import { ApiError } from "@/lib/errors";
import { RELAY_UPLOAD_MAX_BYTES, relayUploadLimitMessage } from "@/lib/uploads/limits";
import { mimeMatchesSniff, sniffMime } from "@/lib/uploads/sniff";
import { orgText } from "@/modules/admin/org-copy";

const ALLOWED_MIME = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm)|application\/pdf)$/;

export async function POST(request: Request) {
  return withStaff(async (ctx) => {
    assertRequestOrigin(request);
    const limited = consumeRateLimit(`upload:${ctx.user.id}`, UPLOAD_RATE_LIMIT_MAX, UPLOAD_RATE_LIMIT_WINDOW_MS);
    if (!limited.ok) {
      throw new ApiError("RATE_LIMITED", orgText("requestFailed"), 429, undefined, limited.retryAt);
    }
    assertStorageWritable();
    const form = await request.formData();
    const file = form.get("file");
    const projectId = String(form.get("projectId") ?? "").trim();
    const visibility = String(form.get("visibility") ?? "public") === "private" ? "private" : "public";
    if (!(file instanceof File)) {
      throw new ApiError("VALIDATION_ERROR", orgText("uploadFileRequired"), 400);
    }
    if (file.size <= 0) {
      throw new ApiError("VALIDATION_ERROR", orgText("uploadEmptyFile"), 400);
    }
    if (!ALLOWED_MIME.test(file.type)) {
      throw new ApiError("VALIDATION_ERROR", orgText("uploadMimeInvalid"), 400);
    }
    const limit = relayUploadLimitMessage(file.type, file.size);
    if (limit || file.size > RELAY_UPLOAD_MAX_BYTES) {
      throw new ApiError("VALIDATION_ERROR", limit ?? orgText("uploadFileLimit"), 400);
    }
    if (projectId) {
      const [owned] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.organizationId, ctx.organization.id)))
        .limit(1);
      if (!owned) {
        throw new ApiError("FORBIDDEN", orgText("uploadProjectInvalid"), 403);
      }
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffMime(bytes);
    if (!sniffed || !mimeMatchesSniff(file.type, sniffed)) {
      throw new ApiError("VALIDATION_ERROR", orgText("uploadContentMismatch"), 400);
    }
    const mime = sniffed;
    const saved = await saveObject({
      bucket: visibility === "public" ? appConfig.storagePublicBucket : appConfig.storagePrivateBucket,
      fileName: file.name,
      mime,
      bytes,
      visibility,
    });
    const [asset] = await db
      .insert(mediaAssets)
      .values({
        organizationId: ctx.organization.id,
        projectId: projectId || null,
        storageProvider: storageProviderName(),
        bucketName: saved.bucketName,
        objectKey: saved.objectKey,
        fileName: file.name,
        mimeType: mime,
        sizeBytes: bytes.length,
        visibility,
        createdBy: ctx.user.id,
      })
      .returning();
    return { asset, url: saved.publicUrl };
  });
}
