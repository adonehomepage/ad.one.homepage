import { withUnitTypeOptions } from "@/modules/templates/definitions";
import { readMiddayPresaleDataForSnapshot } from "@/modules/templates/midday-origin/midday-data";
import { resolveInterestTypeFormOptions } from "@/modules/templates/midday-origin/lib/presale-landing-normalize";
import { readOakEditorialDataForSnapshot } from "@/modules/templates/oak-editorial/oak-data";
import type { LeadFormField, PageSnapshot } from "@/types";

/**
 * 공개 리드 제출용 unitType 선택지.
 * 템플릿 UI(미드데이 평면·oak 플랜·「미정」)와 formSettings 를 합쳐
 * 저장본이 어긋나도 화면에서 고른 값이 거절되지 않게 한다.
 */
export function formFieldsForLeadSubmit(snapshot: PageSnapshot): LeadFormField[] {
  const fields = snapshot.formSettings.fields;
  const stored = (fields.find((field) => field.key === "unitType")?.options ?? [])
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);

  let fromTemplate: string[] = [];
  if (snapshot.templateCode === "midday" || snapshot.templateCode === "info") {
    fromTemplate = resolveInterestTypeFormOptions(readMiddayPresaleDataForSnapshot(snapshot)).map(
      (item) => item.label,
    );
  } else if (snapshot.templateCode === "oak-editorial") {
    const oak = readOakEditorialDataForSnapshot(snapshot);
    fromTemplate = oak.floorplan.plans
      .map((plan) => String(plan.name ?? "").trim() || plan.id)
      .filter(Boolean);
  }

  const merged = [...new Set([...stored, ...fromTemplate].map((item) => item.trim()).filter(Boolean))];
  if (merged.length === 0) return fields;
  return withUnitTypeOptions(fields, merged);
}
