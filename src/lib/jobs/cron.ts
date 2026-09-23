import { NextRequest } from "next/server";
import { appConfig } from "@/lib/config";
import { getDeployEnv } from "@/lib/deploy-env";
import { featureFlags } from "@/lib/feature-flags";
import { ApiError } from "@/lib/errors";

export function assertCron(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!appConfig.cronSecret || secret !== appConfig.cronSecret) {
    throw new ApiError("UNAUTHORIZED", "작업 인증에 실패했습니다.", 401);
  }
}

/** Preview 등에서 실작업을 건너뛸지. 인증은 assertCron 이후 호출. */
export function shouldSkipCronWork() {
  return !featureFlags().cronWork;
}

export function cronSkipPayload() {
  return {
    skipped: true as const,
    reason: "non-production",
    deployEnv: getDeployEnv(),
  };
}
