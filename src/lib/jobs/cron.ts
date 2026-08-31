import { NextRequest } from "next/server";
import { appConfig } from "@/lib/config";
import { ApiError } from "@/lib/errors";

export function assertCron(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!appConfig.cronSecret || secret !== appConfig.cronSecret) {
    throw new ApiError("UNAUTHORIZED", "작업 인증에 실패했습니다.", 401);
  }
}
