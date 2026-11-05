import { isPlaceholderPartyName } from "@/modules/templates/definitions";

/** 수집주체가 비었거나 placeholder면 공개 접수를 막는다. */
export function leadControllerBlockMessage(
  collectingControllerName: string,
  settings: Record<string, unknown> | undefined,
): string | null {
  const controller = collectingControllerName.trim();
  if (controller && !isPlaceholderPartyName(controller)) return null;
  const custom = String(settings?.formControllerUnset ?? "").trim();
  return custom || "개인정보 수집 주체가 정해지지 않아 접수할 수 없습니다.";
}
