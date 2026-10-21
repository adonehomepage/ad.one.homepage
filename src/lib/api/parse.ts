import type { ZodType } from "zod";
import { assertRequestOrigin } from "@/lib/api/origin";
import { ApiError } from "@/lib/errors";
import { orgText } from "@/modules/admin/org-copy";

function assertJsonContentType(request: Request, allowMissing: boolean) {
  const contentType = request.headers.get("content-type");
  if (!contentType) {
    if (allowMissing) return;
    throw new ApiError("VALIDATION_ERROR", orgText("contentTypeJson"), 415);
  }
  if (/^application\/json\b/i.test(contentType)) return;
  // fetch Request는 빈 body에 text/plain을 붙이는 경우가 있어 fallback 허용 시 통과
  if (allowMissing && /^text\/plain\b/i.test(contentType)) return;
  throw new ApiError("VALIDATION_ERROR", orgText("contentTypeJson"), 415);
}

/** JSON 본문을 Zod로 파싱. Origin·Content-Type 불허·파싱 실패 시 ApiError. */
export async function parseJsonBody<T>(request: Request, schema: ZodType<T>, fallback?: unknown): Promise<T> {
  assertRequestOrigin(request);
  assertJsonContentType(request, fallback !== undefined);
  let raw: unknown = fallback;
  try {
    raw = await request.json();
  } catch {
    if (fallback === undefined) {
      throw new ApiError("VALIDATION_ERROR", orgText("requestFailed"), 400);
    }
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? orgText("requestFailed"), 400);
  }
  return parsed.data;
}
