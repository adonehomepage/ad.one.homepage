import { NextResponse } from "next/server";
import { ApiError, errorPayload } from "@/lib/errors";
import { getAuthContext, isActiveMember, isSystemAdmin, type AuthContext } from "@/lib/auth/session";

export async function requireStaff() {
  const ctx = await getAuthContext();
  if (!ctx) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.", 401);
  }
  if (ctx.user.status === "SUSPENDED" || ctx.member.status === "SUSPENDED") {
    throw new ApiError("ACCOUNT_SUSPENDED", "정지된 계정입니다.", 403);
  }
  if (!isActiveMember(ctx.member) || ctx.user.status !== "ACTIVE") {
    throw new ApiError("FORBIDDEN", "사용할 수 없는 계정입니다.", 403);
  }
  return ctx;
}

export async function requireAdmin() {
  const ctx = await requireStaff();
  if (!isSystemAdmin(ctx.member)) {
    throw new ApiError("FORBIDDEN", "시스템 관리자만 사용할 수 있습니다.", 403);
  }
  return ctx;
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(errorPayload(error), { status: error.status });
  }
  console.error(error);
  return NextResponse.json(
    { code: "INTERNAL_ERROR", message: "요청을 처리하지 못했습니다." },
    { status: 500 },
  );
}

export async function withStaff<T>(handler: (ctx: AuthContext) => Promise<T>) {
  try {
    const ctx = await requireStaff();
    const data = await handler(ctx);
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function withAdmin<T>(handler: (ctx: AuthContext) => Promise<T>) {
  try {
    const ctx = await requireAdmin();
    const data = await handler(ctx);
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
