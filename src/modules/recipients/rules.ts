import { appConfig } from "@/lib/config";
import { ApiError } from "@/lib/errors";
import { orgText } from "@/modules/admin/org-copy";

export function assertRecipientLimit(activeCount: number) {
  if (activeCount >= appConfig.maxRecipients) {
    throw new ApiError("RECIPIENT_LIMIT_EXCEEDED", orgText("recipientLimit").replace("{n}", String(appConfig.maxRecipients)));
  }
}
