import { redirect } from "next/navigation";
import { featureFlags } from "@/lib/feature-flags";
import { ApiError } from "@/lib/errors";
import { orgText } from "@/modules/admin/org-copy";

/** prod에서 미확정 관심고객 UI 차단 */
export function assertLeadAdminFeature() {
  if (!featureFlags().leadAdmin) {
    redirect("/admin/settings");
  }
}

/** 관심고객 API — UI 플래그와 동일하게 차단 */
export function requireLeadAdmin() {
  if (!featureFlags().leadAdmin) {
    throw new ApiError("FORBIDDEN", orgText("leadAdminDisabled"), 403);
  }
}
