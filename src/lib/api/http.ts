import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError, errorPayload } from "@/lib/errors";
import { getAuthContext, isActiveMember, isSystemAdmin, type AuthContext } from "@/lib/auth/session";
import { orgText } from "@/modules/admin/org-copy";

export async function requireStaff() {
  const ctx = await getAuthContext();
  if (!ctx) {
    throw new ApiError("UNAUTHORIZED", orgText("loginRequired"), 401);
  }
  if (ctx.user.status === "SUSPENDED" || ctx.member.status === "SUSPENDED") {
    throw new ApiError("ACCOUNT_SUSPENDED", orgText("suspended"), 403);
  }
  if (!isActiveMember(ctx.member) || ctx.user.status !== "ACTIVE") {
    throw new ApiError("FORBIDDEN", orgText("accountUnavailable"), 403);
  }
  return ctx;
}

export async function requireAdmin() {
  const ctx = await requireStaff();
  if (!isSystemAdmin(ctx.member)) {
    throw new ApiError("FORBIDDEN", orgText("adminOnly"), 403);
  }
  return ctx;
}

async function requestIdHeader() {
  try {
    const store = await headers();
    return store.get("x-request-id")?.trim() || crypto.randomUUID();
  } catch {
    return crypto.randomUUID();
  }
}

export function handleApiError(error: unknown, requestId?: string) {
  const headersOut: Record<string, string> = {};
  if (requestId) headersOut["X-Request-Id"] = requestId;
  if (error instanceof ApiError) {
    if (error.retryAt) {
      headersOut["Retry-After"] = String(Math.max(1, Math.ceil((error.retryAt - Date.now()) / 1000)));
    }
    return NextResponse.json(errorPayload(error), { status: error.status, headers: headersOut });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: error.issues[0]?.message ?? orgText("requestFailed") },
      { status: 400, headers: headersOut },
    );
  }
  console.error(error);
  return NextResponse.json(
    { code: "INTERNAL_ERROR", message: orgText("requestFailed") },
    { status: 500, headers: headersOut },
  );
}

/** withStaff 바깥의 parseJsonBody 등도 같은 에러 응답으로 맞춘다. */
export async function withApi<T>(handler: () => Promise<T>) {
  const requestId = await requestIdHeader();
  try {
    const data = await handler();
    return NextResponse.json(data, { headers: { "X-Request-Id": requestId } });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function withStaff<T>(handler: (ctx: AuthContext) => Promise<T>) {
  return withApi(async () => {
    const ctx = await requireStaff();
    return handler(ctx);
  });
}

export async function withAdmin<T>(handler: (ctx: AuthContext) => Promise<T>) {
  return withApi(async () => {
    const ctx = await requireAdmin();
    return handler(ctx);
  });
}

export async function jsonOk<T>(data: T, status = 200) {
  const requestId = await requestIdHeader();
  return NextResponse.json(data, { status, headers: { "X-Request-Id": requestId } });
}
