import { appConfig } from "@/lib/config";
import { ApiError } from "@/lib/errors";

export function assertRecipientLimit(activeCount: number) {
  if (activeCount >= appConfig.maxRecipients) {
    throw new ApiError("RECIPIENT_LIMIT_EXCEEDED", `활성 광고주 수신자는 최대 ${appConfig.maxRecipients}명입니다.`);
  }
}
