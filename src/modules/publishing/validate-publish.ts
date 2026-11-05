import { ApiError } from "@/lib/errors";
import { heroGalleryImages, isPlaceholderPartyName, legalNotices } from "@/modules/templates/definitions";
import { OAK_DATA_KEY } from "@/modules/templates/oak-editorial/types";
import type { OakEditorialData } from "@/modules/templates/oak-editorial/types";
import type { PageSnapshot } from "@/types";

function chrome(settings: Record<string, unknown> | undefined, key: string, fallback: string) {
  return String(settings?.[key] ?? "").trim() || fallback;
}

function heroHasImage(content: Record<string, unknown> | undefined) {
  if (!content) return false;
  if (String(content.imageUrl ?? "").trim()) return true;
  const photos = Array.isArray(content.photos) ? (content.photos as Array<{ src?: string }>) : [];
  if (photos.some((photo) => String(photo.src ?? "").trim())) return true;
  return heroGalleryImages(content as { images?: Array<{ url?: string }> }).length > 0;
}

function oakFooterHasCopy(legalContent: Record<string, unknown> | undefined, oak?: OakEditorialData) {
  const fromLegal = [
    legalContent?.copyright,
    legalContent?.tagline,
    legalContent?.credit,
    legalContent?.wordmark,
    legalContent?.eyebrow,
  ].some((value) => String(value ?? "").trim());
  if (fromLegal) return true;
  if (!oak) return false;
  return [oak.footer.copyright, oak.footer.tagline, oak.footer.credit, oak.footer.wordmark, oak.footer.eyebrow].some(
    (value) => String(value ?? "").trim(),
  );
}

/** 발행·재발행 공통 검증. placeholder 수집주체는 환경과 무관하게 거부한다. */
export function collectPublishErrors(snapshot: PageSnapshot): string[] {
  const g = snapshot.globalSettings;
  const errors: string[] = [];
  const isOak = snapshot.templateCode === "oak-editorial";
  const oakData = g[OAK_DATA_KEY] as OakEditorialData | undefined;
  if (!snapshot.projectName.trim()) errors.push(chrome(g, "publishErrName", "프로젝트명이 필요합니다."));
  if (!snapshot.publicSlug.trim()) errors.push(chrome(g, "publishErrSlug", "공개 URL이 필요합니다."));
  if (!snapshot.phone.trim()) errors.push(chrome(g, "publishErrPhone", "대표 전화가 필요합니다."));
  const hero = snapshot.sections.find((section) => section.sectionType === "hero" && section.isVisible);
  if (!hero) errors.push(chrome(g, "publishErrHero", "히어로 섹션이 필요합니다."));
  else if (!heroHasImage(hero.content)) {
    const midday = g.middayPresaleData as { product?: { mainImage?: { url?: string } } } | undefined;
    const middayHero = String(midday?.product?.mainImage?.url ?? "").trim();
    const oakHero = (oakData?.hero.photos ?? []).some((photo) => String(photo.src ?? "").trim());
    const isOriginSkin = snapshot.templateCode === "midday" || snapshot.templateCode === "info";
    if (!((isOriginSkin && middayHero) || (isOak && oakHero))) {
      errors.push(chrome(g, "publishErrHeroImage", "히어로 대표 이미지가 필요합니다."));
    }
  }
  const form = snapshot.sections.find((section) => section.sectionType === "lead_form" && section.isVisible);
  if (!form) errors.push(chrome(g, "publishErrForm", "관심고객 등록 섹션이 필요합니다."));
  const legal = snapshot.sections.find((section) => section.sectionType === "legal" && section.isVisible);
  if (!legal) errors.push(chrome(g, "publishErrLegal", "법적 고지 섹션을 숨길 수 없습니다."));
  else if (isOak) {
    if (!oakFooterHasCopy(legal.content as Record<string, unknown>, oakData)) {
      errors.push(chrome(g, "publishErrNotices", "푸터 안내 문구가 필요합니다."));
    }
  } else {
    const body = String(legal.content.body ?? "").trim();
    const notices = legalNotices(legal.content.notices).some((notice) => notice.text.trim());
    const note = String(legal.content.footerNote ?? "").trim();
    if (!body && !notices && !note) {
      errors.push(chrome(g, "publishErrNotices", "푸터 안내 문구가 필요합니다."));
    }
  }
  const controller = snapshot.privacy.collectingControllerName.trim();
  if (!controller) errors.push(chrome(g, "publishErrController", "개인정보 수집 주체를 입력해 주세요."));
  if (isPlaceholderPartyName(controller)) {
    errors.push(chrome(g, "publishErrControllerProd", "실제 개인정보 처리 주체를 설정한 뒤에 발행할 수 있습니다."));
  }
  if (snapshot.privacy.thirdPartyProvisionEnabled) {
    const thirdRecipient = String(snapshot.privacy.thirdPartyRecipientName ?? "").trim();
    if (!thirdRecipient || isPlaceholderPartyName(thirdRecipient)) {
      errors.push(chrome(g, "publishErrThirdRecipient", "제3자 제공 받는 자를 입력해 주세요."));
    }
    if (!String(snapshot.privacy.thirdPartyPurpose ?? "").trim()) {
      errors.push(chrome(g, "publishErrThirdPurpose", "제3자 제공 목적을 입력해 주세요."));
    }
    if (!(snapshot.privacy.thirdPartyFields ?? []).some((field) => String(field).trim())) {
      errors.push(chrome(g, "publishErrThirdFields", "제3자 제공 항목을 입력해 주세요."));
    }
    if (!String(snapshot.privacy.thirdPartyRetentionDescription ?? "").trim()) {
      errors.push(chrome(g, "publishErrThirdRetention", "제3자 제공 보유 기간을 입력해 주세요."));
    }
  }
  if (!snapshot.formSettings.fields.some((field) => field.type === "name" && field.required)) {
    errors.push(chrome(g, "publishErrNameField", "이름 필수 필드가 필요합니다."));
  }
  if (!snapshot.formSettings.fields.some((field) => field.type === "phone" && field.required)) {
    errors.push(chrome(g, "publishErrPhoneField", "연락처 필수 필드가 필요합니다."));
  }
  return errors;
}

export function assertPublishable(snapshot: PageSnapshot) {
  const errors = collectPublishErrors(snapshot);
  if (errors.length) {
    throw new ApiError("PUBLISH_VALIDATION_FAILED", errors.join(" "));
  }
}
