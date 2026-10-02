import { withStaff } from "@/lib/api/http";
import { db } from "@/lib/db";
import { mediaAssets } from "@/lib/db/schema";
import { saveObject, storageProviderName } from "@/lib/storage";
import { appConfig } from "@/lib/config";
import { ApiError } from "@/lib/errors";
import { relayUploadLimitMessage } from "@/lib/uploads/limits";

export async function POST(request: Request) {
  return withStaff(async (ctx) => {
    const form = await request.formData();
    const file = form.get("file");
    const projectId = String(form.get("projectId") ?? "");
    const visibility = String(form.get("visibility") ?? "public") === "private" ? "private" : "public";
    if (!(file instanceof File)) {
      throw new ApiError("VALIDATION_ERROR", "파일이 필요합니다.");
    }
    if (process.env.VERCEL) {
      const limit = relayUploadLimitMessage(file.type, file.size);
      if (limit) throw new ApiError("VALIDATION_ERROR", limit);
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const saved = await saveObject({
      bucket: visibility === "public" ? appConfig.storagePublicBucket : appConfig.storagePrivateBucket,
      fileName: file.name,
      mime: file.type,
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
        mimeType: file.type,
        sizeBytes: bytes.length,
        visibility,
        createdBy: ctx.user.id,
      })
      .returning();
    return { asset, url: saved.publicUrl };
  });
}
