import { appConfig } from "@/lib/config";
import { ApiError } from "@/lib/errors";
import { orgText } from "@/modules/admin/org-copy";

/** Origin host가 허용 목록(요청 host·publicUrl·adminUrl)과 일치하는지. */
export function isAllowedOrigin(origin: string | null, requestUrl: string) {
  if (!origin) return true;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const requestHost = new URL(requestUrl).host;
  if (originHost === requestHost) return true;
  for (const candidate of [appConfig.publicUrl, appConfig.adminUrl]) {
    if (!candidate) continue;
    try {
      if (new URL(candidate).host === originHost) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

/**
 * 쿠키 기반 변이 API용.
 * - Origin이 있으면 host 허용 목록과 비교
 * - Origin이 없어도 Sec-Fetch-Site: cross-site 이면 거부 (CSRF 완화)
 */
export function assertRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin, request.url)) {
    throw new ApiError("FORBIDDEN", orgText("requestForbidden"), 403);
  }
  const site = request.headers.get("sec-fetch-site");
  if (!origin && site === "cross-site") {
    throw new ApiError("FORBIDDEN", orgText("requestForbidden"), 403);
  }
}

/**
 * 공개 변이 API용. Origin이 있으면 허용 host만, 없으면 same-origin/same-site/none 만 통과.
 * Origin·Sec-Fetch-Site 모두 없는 curl/봇 POST는 거부.
 */
export function assertPublicMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    if (!isAllowedOrigin(origin, request.url)) {
      throw new ApiError("FORBIDDEN", orgText("requestForbidden"), 403);
    }
    return;
  }
  const site = request.headers.get("sec-fetch-site");
  if (site === "same-origin" || site === "same-site" || site === "none") {
    return;
  }
  throw new ApiError("FORBIDDEN", orgText("requestForbidden"), 403);
}
