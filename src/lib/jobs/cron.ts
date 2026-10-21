import { timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { appConfig } from "@/lib/config";
import { getDeployEnv } from "@/lib/deploy-env";
import { featureFlags } from "@/lib/feature-flags";
import { ApiError } from "@/lib/errors";
import { orgText } from "@/modules/admin/org-copy";

function secretsEqual(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function assertCron(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!appConfig.cronSecret || !secret || !secretsEqual(secret, appConfig.cronSecret)) {
    throw new ApiError("UNAUTHORIZED", orgText("cronUnauthorized"), 401);
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
