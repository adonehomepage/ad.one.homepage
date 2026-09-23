import { appConfig } from "@/lib/config";
import { isLocal, isNonProd, isProd } from "@/lib/deploy-env";

function readBool(name: string, fallback: boolean) {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return fallback;
}

/**
 * 미완성·민감 기능 노출.
 * - prod: 명시적 FEATURE_* 또는 관련 운영 플래그가 true일 때만
 * - non-prod: 기본 노출 (FEATURE_*=false 로 끌 수 있음)
 */
export function featureFlags() {
  const leadAdminExplicit = process.env.FEATURE_LEAD_ADMIN?.trim();
  const leadAdmin =
    leadAdminExplicit !== undefined && leadAdminExplicit !== ""
      ? readBool("FEATURE_LEAD_ADMIN", false)
      : appConfig.leadCollectionEnabled || isNonProd();

  // Production만 실작업. Preview는 no-op. local은 수동 테스트 허용.
  // CRON_ALLOW_NON_PROD=true 로 Preview에서도 강제 실행 가능.
  const cronWork =
    readBool("CRON_ALLOW_NON_PROD", false) || isProd() || (isLocal() && !process.env.VERCEL);

  return {
    /** 관심고객 메뉴·관리 화면 */
    leadAdmin,
    /** 실수집 API는 LEAD_COLLECTION_ENABLED만 따름 */
    leadCollection: appConfig.leadCollectionEnabled,
    /** cron 실작업 허용 여부 */
    cronWork,
  };
}

export type FeatureFlags = ReturnType<typeof featureFlags>;
