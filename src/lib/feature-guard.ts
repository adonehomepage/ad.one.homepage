import { redirect } from "next/navigation";
import { featureFlags } from "@/lib/feature-flags";

/** prod에서 미확정 관심고객 UI 차단 */
export function assertLeadAdminFeature() {
  if (!featureFlags().leadAdmin) {
    redirect("/admin/settings");
  }
}
