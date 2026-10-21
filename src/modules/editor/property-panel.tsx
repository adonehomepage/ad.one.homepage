"use client";

import { createContext, useContext, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { UploadError, uploadProjectFile } from "@/modules/editor/prepare-upload";
import { orgText } from "@/modules/admin/org-copy";
import { floorplanImages, floorplanSpecs, FLOORPLAN_SPEC_MAX, GALLERY_IMAGE_MAX, hasSectionEyebrow, LOCATION_MATRIX_DEFAULTS, LOCATION_MATRIX_ICONS, locationMatrix, PREMIUM_ICONS, PREMIUM_ITEM_MAX, premiumItems, sectionEyebrowText, SECTION_EYEBROW_KEY, unitTypeNames, withFloorplanImages, withFloorplanSpecs, withUnitTypeOptions, type FloorplanImage, type LocationMatrixItem, type PremiumItem } from "@/modules/templates/definitions";
import type { PageSection, PageSnapshot, ProjectPrivacyConfig } from "@/types";

type DraftPatch = {
  globalSettings?: Record<string, unknown>;
  formSettings?: PageSnapshot["formSettings"];
  seoSettings?: PageSnapshot["seoSettings"];
  privacySettings?: ProjectPrivacyConfig;
};

const PanelCopyContext = createContext<Record<string, unknown>>({});

function panelText(source: Record<string, unknown>, key: string, fallback: string) {
  return String(source[key] ?? "").trim() || fallback;
}

function usePanelText(key: string, fallback: string) {
  return panelText(useContext(PanelCopyContext), key, fallback);
}

export function PropertyPanel({
  selected,
  snapshot,
  projectId,
  onSectionChange,
  onPhoneChange,
  onDraftChange,
}: {
  selected: PageSection;
  snapshot: PageSnapshot;
  projectId: string;
  onSectionChange: (next: PageSection, draftPatch?: DraftPatch) => void;
  onPhoneChange: (phone: string) => void;
  onDraftChange: (patch: DraftPatch) => void;
}) {
  const [uploadError, setUploadError] = useState("");
  const [uploadNeedsUrl, setUploadNeedsUrl] = useState(false);
  const copy = (key: string, fallback: string) => panelText(snapshot.globalSettings, key, fallback);

  async function upload(file: File) {
    setUploadError("");
    setUploadNeedsUrl(false);
    try {
      return await uploadProjectFile(projectId, file);
    } catch (error) {
      const message = error instanceof Error && error.message.trim() ? error.message : panelText(snapshot.globalSettings, "shellUploadFail", "업로드에 실패했습니다.");
      const blocked =
        error instanceof UploadError &&
        (error.status === 503 || error.message.includes("로컬 파일 저장") || error.code === "VALIDATION_ERROR");
      setUploadNeedsUrl(blocked);
      setUploadError(blocked ? `${message} ${orgText("storageUrlHint")}` : message);
      return null;
    }
  }

  function patchContent(patch: Record<string, unknown>) {
    onSectionChange({ ...selected, content: { ...selected.content, ...patch } });
  }

  return (
    <PanelCopyContext.Provider value={snapshot.globalSettings}>
    <div className="space-y-4">
      {uploadError ? (
        <p className="text-sm text-danger" role="alert" aria-live="assertive">
          {uploadError}
        </p>
      ) : null}
      {uploadNeedsUrl ? (
        <p className="rounded-[14px] border border-border bg-primary-soft px-4 py-3 text-sm text-text-body">
          {copy("panelImageUrlHint", "파일 업로드가 안 되는 환경에서는 https 주소를 넣으세요.")}
        </p>
      ) : null}
      <PageSettings snapshot={snapshot} onDraftChange={onDraftChange} upload={upload} />
      <div className="border-t border-border pt-4">
        <p className="mb-3 text-xs font-medium text-text-muted">{panelText(snapshot.globalSettings, "shellSelected", "선택 섹션")}</p>
        <Field label={panelText(snapshot.globalSettings, "shellSectionTitle", "섹션 제목")}>
          <Input
            value={selected.title}
            onChange={(event) => onSectionChange({ ...selected, title: event.target.value })}
          />
        </Field>
        <Field label={panelText(snapshot.globalSettings, "shellMenuName", "메뉴 이름")} hint={panelText(snapshot.globalSettings, "shellMenuHint", "상단 메뉴에 보이는 짧은 이름입니다. 비우면 섹션 제목을 씁니다.")}>
          <Input
            value={selected.gnbLabel}
            onChange={(event) => onSectionChange({ ...selected, gnbLabel: event.target.value })}
          />
        </Field>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selected.showInGnb}
            onChange={(event) => onSectionChange({ ...selected, showInGnb: event.target.checked })}
          />
          {panelText(snapshot.globalSettings, "shellMenu", "상단 메뉴")}
        </label>
      </div>

      {selected.sectionType === "hero" ? (
        <HeroFields
          selected={selected}
          snapshot={snapshot}
          onPhoneChange={onPhoneChange}
          patchContent={patchContent}
          upload={upload}
        />
      ) : null}
      {selected.sectionType === "overview" ? (
        <>
          <HeadingBody selected={selected} patchContent={patchContent} />
          <PairList
            label={copy("panelFacts", "개요 항목")}
            items={(selected.content.facts as Array<{ label: string; value: string }>) ?? []}
            fields={[
              { key: "label", label: copy("panelItem", "항목") },
              { key: "value", label: copy("panelValue", "내용") },
            ]}
            onChange={(facts) => patchContent({ facts })}
            minItems={1}
            maxItems={20}
          />
          <PairList
            label={copy("panelStats", "핵심 수치")}
            items={(selected.content.stats as Array<{ value: string; label: string }>) ?? []}
            fields={[
              { key: "value", label: copy("panelNumber", "숫자") },
              { key: "label", label: copy("panelStatName", "이름") },
            ]}
            onChange={(stats) => patchContent({ stats: stats.slice(0, 4) })}
            maxItems={4}
          />
          <Field label={copy("panelScheduleTitle", "일정 제목")} hint={copy("panelScheduleTitleHint", "비우면 공개 페이지에 분양 일정으로 보입니다.")}>
            <Input value={String(selected.content.scheduleTitle ?? "")} placeholder={copy("phScheduleTitle", "분양 일정")} onChange={(event) => patchContent({ scheduleTitle: event.target.value })} />
          </Field>
          <Field label={copy("panelFactsMore", "개요 더보기")} hint={copy("panelFactsMoreHint", "히어로에 다 안 들어온 개요 아래에 보입니다. 비우면 사업개요 전체로 보입니다.")}>
            <Input value={String(selected.content.factsMoreLabel ?? "")} placeholder={copy("phFactsMore", "사업개요 전체")} onChange={(event) => patchContent({ factsMoreLabel: event.target.value })} />
          </Field>
          <Field label={copy("panelScheduleMore", "일정 더보기")} hint={copy("panelScheduleMoreHint", "히어로에 다 안 들어온 일정 아래에 보입니다. 비우면 일정 전체로 보입니다.")}>
            <Input value={String(selected.content.scheduleMoreLabel ?? "")} placeholder={copy("phScheduleMore", "일정 전체")} onChange={(event) => patchContent({ scheduleMoreLabel: event.target.value })} />
          </Field>
          <Field label={copy("panelDisclaimer", "하단 안내")}>
            <Textarea value={String(selected.content.disclaimer ?? "")} onChange={(event) => patchContent({ disclaimer: event.target.value })} />
          </Field>
          <Field label={copy("panelHomepageBtn", "홈페이지 버튼")} hint={copy("panelHomepageBtnHint", "비우면 분양 홈페이지로 보입니다.")}>
            <Input value={String(selected.content.homepageLabel ?? "")} placeholder={copy("phOfficialHome", "분양 홈페이지")} onChange={(event) => patchContent({ homepageLabel: event.target.value })} />
          </Field>
          <Field label={copy("panelHomepage", "분양 홈페이지")}>
            <Input value={String(selected.content.homepageUrl ?? "")} placeholder={copy("phHttps", "https://")} onChange={(event) => patchContent({ homepageUrl: event.target.value })} />
          </Field>
          <Field label={copy("panelNoticeBtn", "공고 버튼")} hint={copy("panelNoticeBtnHint", "비우면 입주자 모집공고로 보입니다.")}>
            <Input value={String(selected.content.noticeLabel ?? "")} placeholder={copy("phOfficialNotice", "입주자 모집공고")} onChange={(event) => patchContent({ noticeLabel: event.target.value })} />
          </Field>
          <Field label={copy("panelNotice", "입주자 모집공고")}>
            <Input value={String(selected.content.noticeUrl ?? "")} placeholder={copy("phHttps", "https://")} onChange={(event) => patchContent({ noticeUrl: event.target.value })} />
          </Field>
          <PairList
            label={copy("panelSchedule", "분양 일정")}
            items={((selected.content.schedule as Array<{ title?: string; date?: string; note?: string }>) ?? []).map((item) => ({
              title: String(item.title ?? ""),
              date: String(item.date ?? ""),
              note: String(item.note ?? ""),
            }))}
            fields={[
              { key: "title", label: copy("panelScheduleName", "일정") },
              { key: "date", label: copy("panelScheduleDate", "날짜") },
              { key: "note", label: copy("panelScheduleNote", "보충"), multiline: true },
            ]}
            onChange={(schedule) => patchContent({ schedule: schedule.slice(0, 8) })}
            maxItems={8}
          />
        </>
      ) : null}
      {selected.sectionType === "location" ? (
        <LocationFields selected={selected} patchContent={patchContent} upload={upload} />
      ) : null}
      {selected.sectionType === "premium" ? (
        <PremiumFields selected={selected} patchContent={patchContent} upload={upload} />
      ) : null}
      {selected.sectionType === "gallery" ? (
        <GalleryFields selected={selected} patchContent={patchContent} upload={upload} />
      ) : null}
      {selected.sectionType === "floorplan" ? (
        <FloorplanFields
          selected={selected}
          snapshot={snapshot}
          upload={upload}
          onSectionChange={onSectionChange}
        />
      ) : null}
      {selected.sectionType === "directions" ? (
        <>
          <HeadingBody selected={selected} patchContent={patchContent} />
          <Field label={copy("panelPlace", "장소명")}>
            <Input value={String(selected.content.placeName ?? "")} placeholder={copy("phPlaceSample", "모델하우스")} onChange={(event) => patchContent({ placeName: event.target.value })} />
          </Field>
          <Field label={copy("panelPhoneRow", "전화 항목")} hint={copy("panelPhoneRowHint", "비우면 전화로 보입니다.")}>
            <Input value={String(selected.content.phoneRowLabel ?? "")} placeholder={copy("phRowPhone", "전화")} onChange={(event) => patchContent({ phoneRowLabel: event.target.value })} />
          </Field>
          <Field label={copy("panelSitePhone", "현장 전화")} hint={copy("panelSitePhoneHint", "비우면 대표 전화를 보여 줍니다.")}>
            <Input value={String(selected.content.phone ?? "")} placeholder={copy("formPhoneEmptyPh", "비우면 대표 전화")} onChange={(event) => patchContent({ phone: event.target.value })} />
          </Field>
          <Field label={copy("panelHeadingSuffix", "제목 뒤 문구")} hint={copy("panelHeadingSuffixHint", "장소명 뒤에 붙습니다. 비우면 오시는 길로 보입니다.")}>
            <Input value={String(selected.content.headingSuffix ?? "")} placeholder={copy("phDirections", "오시는 길")} onChange={(event) => patchContent({ headingSuffix: event.target.value })} />
          </Field>
          <Field label={copy("panelAddressRow", "주소 항목")} hint={copy("panelAddressRowHint", "비우면 주소로 보입니다.")}>
            <Input value={String(selected.content.addressLabel ?? "")} placeholder={copy("phRowAddress", "주소")} onChange={(event) => patchContent({ addressLabel: event.target.value })} />
          </Field>
          <Field label={copy("panelAddress", "주소")}>
            <Input
              value={String(selected.content.address ?? "")}
              onChange={(event) => patchContent({ address: event.target.value })}
            />
          </Field>
          <Field label={copy("panelCopyAddress", "주소 복사 버튼")} hint={copy("panelCopyAddressHint", "비우면 주소 복사로 보입니다.")}>
            <Input value={String(selected.content.copyAddressLabel ?? "")} placeholder={copy("phCopyAddress", "주소 복사")} onChange={(event) => patchContent({ copyAddressLabel: event.target.value })} />
          </Field>
          <Field label={copy("panelGuide", "찾아오시는 길")}>
            <Textarea
              value={String(selected.content.guide ?? "")}
              onChange={(event) => patchContent({ guide: event.target.value })}
            />
          </Field>
          <Field label={copy("panelHoursRow", "운영 항목")} hint={copy("panelHoursRowHint", "비우면 운영으로 보입니다.")}>
            <Input value={String(selected.content.hoursLabel ?? "")} placeholder={copy("phRowHours", "운영")} onChange={(event) => patchContent({ hoursLabel: event.target.value })} />
          </Field>
          <Field label={copy("panelHours", "운영 시간")}>
            <Input value={String(selected.content.hours ?? "")} onChange={(event) => patchContent({ hours: event.target.value })} />
          </Field>
          <Field label={copy("panelParkingRow", "주차 항목")} hint={copy("panelParkingRowHint", "비우면 주차로 보입니다.")}>
            <Input value={String(selected.content.parkingLabel ?? "")} placeholder={copy("phRowParking", "주차")} onChange={(event) => patchContent({ parkingLabel: event.target.value })} />
          </Field>
          <Field label={copy("panelParking", "주차")}>
            <Textarea value={String(selected.content.parking ?? "")} onChange={(event) => patchContent({ parking: event.target.value })} />
          </Field>
          <PairList
            label={copy("panelRoutes", "교통")}
            items={(selected.content.routes as Array<{ label: string; detail: string }>) ?? []}
            fields={[
              { key: "label", label: copy("panelRouteMode", "수단") },
              { key: "detail", label: copy("panelRouteDetail", "안내"), multiline: true },
            ]}
            onChange={(routes) => patchContent({ routes })}
          />
          <Field label={copy("panelMapUrl", "지도 링크")} hint={copy("panelMapUrlHint", "https로 시작하는 주소입니다. 방문자가 약도를 누르면 이 주소로 이동합니다.")}>
            <Input
              value={String(selected.content.mapUrl ?? "")}
              placeholder={copy("phHttps", "https://")}
              onChange={(event) => patchContent({ mapUrl: event.target.value })}
            />
          </Field>
          <Field label={copy("panelMapEmpty", "약도가 없을 때")} hint={copy("panelMapEmptyHint", "약도를 올리기 전에 빈 칸에 보이는 문구입니다. 비우면 약도 이미지로 보입니다.")}>
            <Input value={String(selected.content.mapEmptyLabel ?? "")} placeholder={copy("phMapEmpty", "약도 이미지")} onChange={(event) => patchContent({ mapEmptyLabel: event.target.value })} />
          </Field>
          <Field label={copy("panelMapAlt", "약도 이름")} hint={copy("panelMapAltHint", "약도를 읽어 주는 이름입니다. 비우면 약도로 둡니다.")}>
            <Input value={String(selected.content.mapAlt ?? "")} placeholder={copy("phMapAlt", "약도")} onChange={(event) => patchContent({ mapAlt: event.target.value })} />
          </Field>
          <Field label={copy("panelMapLink", "지도에서 보기")} hint={copy("panelMapLinkHint", "약도 위에 겹쳐 보이는 버튼입니다. 비우면 지도에서 보기로 보입니다.")}>
            <Input value={String(selected.content.mapLinkLabel ?? "")} placeholder={copy("phMapLink", "지도에서 보기")} onChange={(event) => patchContent({ mapLinkLabel: event.target.value })} />
          </Field>
          <Field label={copy("panelMapFile", "약도 이미지")}>
            <input
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const mapImageUrl = await upload(file);
                if (!mapImageUrl) return;
                patchContent({ mapImageUrl });
              }}
            />
            {String(selected.content.mapImageUrl ?? "") ? (
              <button type="button" className="mt-2 text-xs text-text-muted" onClick={() => patchContent({ mapImageUrl: "" })}>
                {panelText(snapshot.globalSettings, "mediaMapDelete", "약도 삭제")}
              </button>
            ) : null}
          </Field>
          <Field label={copy("panelImageUrl", "이미지 주소")} hint={copy("panelImageUrlHint", "파일 업로드가 안 되는 환경에서는 https 주소를 넣으세요.")}>
            <Input
              value={String(selected.content.mapImageUrl ?? "")}
              placeholder={copy("phHttps", "https://")}
              onChange={(event) => patchContent({ mapImageUrl: event.target.value })}
            />
          </Field>
        </>
      ) : null}
      {selected.sectionType === "lead_form" ? (
        <>
          <HeadingBody selected={selected} patchContent={patchContent} />
          <Field label={copy("panelEmptyUnit", "타입이 없을 때")} hint={copy("panelEmptyUnitHint", "관심 타입 이름이 없을 때 폼에 보입니다. 비우면 평면안내에서 타입 이름을 입력하면 여기에 나타납니다.로 보입니다.")}>
            <Textarea value={String(selected.content.emptyUnitTypeLabel ?? "")} placeholder={copy("formUnitEmptyPh", "평면안내에서 타입 이름을 입력하면 여기에 나타납니다.")} onChange={(event) => patchContent({ emptyUnitTypeLabel: event.target.value })} />
          </Field>
          <Field label={copy("panelFormPhoneCaption", "등록 화면 전화 이름")} hint={copy("panelFormPhoneCaptionHint", "전화번호 앞에 붙습니다. 비우면 문의번호로 보입니다.")}>
            <Input value={String(selected.content.phoneCaption ?? "")} placeholder={copy("formPhoneCaptionPh", "문의번호")} onChange={(event) => patchContent({ phoneCaption: event.target.value })} />
          </Field>
          <Field label={copy("panelFormPhone", "등록 화면 전화")} hint={copy("panelFormPhoneHint", "비우면 대표 전화를 보여 줍니다.")}>
            <Input value={String(selected.content.phone ?? "")} placeholder={copy("formPhoneEmptyPh", "비우면 대표 전화")} onChange={(event) => patchContent({ phone: event.target.value })} />
          </Field>
          <Field label={copy("panelExternal", "외부 관심고객 주소")} hint={copy("panelExternalHint", "http로 시작하는 주소가 있으면 공개 페이지의 등록 버튼이 이 주소로 이동합니다. 비어 있으면 이 페이지의 등록 폼으로 이동합니다.")}>
            <Input
              value={String(selected.content.externalRegisterUrl ?? "")}
              placeholder={copy("phHttps", "https://")}
              onChange={(event) => patchContent({ externalRegisterUrl: event.target.value })}
            />
          </Field>
          <Field label={copy("panelFormIntro", "폼 안내 문구")}>
            <Textarea
              value={snapshot.formSettings.intro}
              onChange={(event) =>
                onDraftChange({ formSettings: { ...snapshot.formSettings, intro: event.target.value } })
              }
            />
          </Field>
          <Field label={copy("panelSuccessTitle", "등록 완료 제목")} hint={copy("panelSuccessTitleHint", "비우면 등록이 완료되었습니다로 보입니다.")}>
            <Input
              value={snapshot.formSettings.successTitle ?? ""}
              placeholder={copy("formSuccessTitlePh", "등록이 완료되었습니다")}
              onChange={(event) => onDraftChange({ formSettings: { ...snapshot.formSettings, successTitle: event.target.value } })}
            />
          </Field>
          <Field label={copy("panelSuccessMessage", "등록 완료 메시지")}>
            <Input
              value={snapshot.formSettings.successMessage}
              onChange={(event) =>
                onDraftChange({ formSettings: { ...snapshot.formSettings, successMessage: event.target.value } })
              }
            />
          </Field>
          <Field label={copy("panelSubmitting", "등록 중 버튼")} hint={copy("panelSubmittingHint", "접수를 보내는 동안 버튼에 보입니다. 비우면 등록 중으로 보입니다.")}>
            <Input
              value={snapshot.formSettings.submittingLabel ?? ""}
              placeholder={copy("formSubmittingPh", "등록 중")}
              onChange={(event) => onDraftChange({ formSettings: { ...snapshot.formSettings, submittingLabel: event.target.value } })}
            />
          </Field>
          <Field label={copy("panelPreviewNote", "미리보기 안내")} hint={copy("panelPreviewNoteHint", "편집 화면의 완료 안내 아래입니다. 공개 페이지에는 나오지 않습니다.")}>
            <Input
              value={snapshot.formSettings.previewNote ?? ""}
              placeholder={copy("formPreviewNotePh", "미리보기에서는 실제 등록이 저장되지 않습니다.")}
              onChange={(event) => onDraftChange({ formSettings: { ...snapshot.formSettings, previewNote: event.target.value } })}
            />
          </Field>
          <Field label={copy("panelAgain", "추가 등록 버튼")} hint={copy("panelAgainHint", "완료 화면에서 다시 등록할 때 보입니다. 비우면 추가 등록으로 보입니다.")}>
            <Input
              value={snapshot.formSettings.againLabel ?? ""}
              placeholder={copy("formAgainPh", "추가 등록")}
              onChange={(event) => onDraftChange({ formSettings: { ...snapshot.formSettings, againLabel: event.target.value } })}
            />
          </Field>
          <Field label={copy("panelCollection", "수집 동의 문구")} hint={copy("panelCollectionHint", "비우면 [필수] 개인정보 수집 및 이용에 동의합니다.로 보입니다.")}>
            <Textarea value={String(selected.content.collectionConsent ?? "")} placeholder={copy("formConsentPh", "[필수] 개인정보 수집 및 이용에 동의합니다.")} onChange={(event) => patchContent({ collectionConsent: event.target.value })} />
          </Field>
          <Field label={copy("panelThirdParty", "제3자 동의 문구")} hint={copy("panelThirdPartyHint", "뒤에 제공받는 자와 목적은 페이지 설정 값이 붙습니다. 비우면 기본 문장으로 보입니다.")}>
            <Textarea value={String(selected.content.thirdPartyConsent ?? "")} placeholder={copy("formThirdPh", "[필수] 개인정보 제3자 제공에 동의합니다.")} onChange={(event) => patchContent({ thirdPartyConsent: event.target.value })} />
          </Field>
          <Field label={copy("panelNameError", "이름 누락 안내")} hint={copy("panelNameErrorHint", "이름을 비우고 등록할 때 보입니다. 비우면 이름을 입력해 주세요.로 보입니다.")}>
            <Input value={String(selected.content.nameError ?? "")} placeholder={copy("formNameErrorPh", "이름을 입력해 주세요.")} onChange={(event) => patchContent({ nameError: event.target.value })} />
          </Field>
          <Field label={copy("panelPhoneError", "전화 형식 안내")} hint={copy("panelPhoneErrorHint", "휴대전화 형식이 아닐 때 보입니다.")}>
            <Input value={String(selected.content.phoneError ?? "")} placeholder={copy("formPhoneErrorPh", "올바른 휴대전화 번호를 입력해 주세요.")} onChange={(event) => patchContent({ phoneError: event.target.value })} />
          </Field>
          <Field label={copy("panelCollectionError", "수집 동의 누락")} hint={copy("panelCollectionErrorHint", "수집 동의를 켜지 않고 등록할 때 보입니다.")}>
            <Input value={String(selected.content.collectionError ?? "")} placeholder={copy("formCollectionErrorPh", "개인정보 수집 및 이용에 동의해 주세요.")} onChange={(event) => patchContent({ collectionError: event.target.value })} />
          </Field>
          <Field label={copy("panelThirdPartyError", "제3자 동의 누락")} hint={copy("panelThirdPartyErrorHint", "제3자 제공을 켠 프로젝트에서만 보입니다.")}>
            <Input value={String(selected.content.thirdPartyError ?? "")} placeholder={copy("formThirdErrorPh", "개인정보 제3자 제공에 동의해 주세요.")} onChange={(event) => patchContent({ thirdPartyError: event.target.value })} />
          </Field>
          <Field label={copy("panelSubmitError", "등록 실패 안내")} hint={copy("panelSubmitErrorHint", "서버가 별도 문구를 주지 않을 때 보입니다.")}>
            <Input value={String(selected.content.submitError ?? "")} placeholder={copy("formSubmitErrorPh", "등록에 실패했습니다.")} onChange={(event) => patchContent({ submitError: event.target.value })} />
          </Field>
          <Field label={copy("panelControllerWarning", "처리 주체 안내")} hint={copy("panelControllerWarningHint", "수집 주체가 처리주체미정일 때 폼 아래에 보입니다.")}>
            <Textarea value={String(selected.content.controllerWarning ?? "")} placeholder={copy("formControllerWarnPh", "개인정보 처리 주체가 확정되기 전에는 실제 접수가 저장되지 않을 수 있습니다.")} onChange={(event) => patchContent({ controllerWarning: event.target.value })} />
          </Field>
          <Field label={copy("panelPrivacyLink", "동의 내용 버튼")} hint={copy("panelPrivacyLinkHint", "비우면 내용 보기로 보입니다.")}>
            <Input value={String(selected.content.privacyLinkLabel ?? "")} placeholder={copy("formPrivacyLinkPh", "내용 보기")} onChange={(event) => patchContent({ privacyLinkLabel: event.target.value })} />
          </Field>
          <Field label={copy("panelPerkHeadline", "혜택 제목")}>
            <Input value={String(selected.content.perkHeadline ?? "")} onChange={(event) => patchContent({ perkHeadline: event.target.value })} />
          </Field>
          <Field label={copy("panelPerkBody", "혜택 설명")}>
            <Textarea value={String(selected.content.perkBody ?? "")} onChange={(event) => patchContent({ perkBody: event.target.value })} />
          </Field>
          <PairList
            label={copy("panelPerks", "등록 혜택")}
            items={((selected.content.perks as Array<{ text?: string } | string>) ?? []).map((item) =>
              typeof item === "string" ? { text: item } : { text: String(item.text ?? "") },
            )}
            fields={[{ key: "text", label: copy("panelValue", "내용") }]}
            onChange={(perks) => patchContent({ perks })}
          />
          <FormFields snapshot={snapshot} onDraftChange={onDraftChange} />
        </>
      ) : null}
      {selected.sectionType === "legal" ? (
        <>
          <HeadingBody selected={selected} patchContent={patchContent} />
          <Field label={copy("panelAdvertiserLabel", "광고주 표시")} hint={copy("panelAdvertiserLabelHint", "비우면 광고주로 보입니다.")}>
            <Input value={String(selected.content.advertiserLabel ?? "")} placeholder={copy("phPrefixAdvertiser", "광고주")} onChange={(event) => patchContent({ advertiserLabel: event.target.value })} />
          </Field>
          <Field label={copy("panelAdvertiser", "광고주")}>
            <Input
              value={String(selected.content.advertiserName ?? "")}
              onChange={(event) => patchContent({ advertiserName: event.target.value })}
            />
          </Field>
          <Field label={copy("panelAgencyLabel", "광고사 표시")} hint={copy("panelAgencyLabelHint", "비우면 광고사로 보입니다.")}>
            <Input value={String(selected.content.agencyLabel ?? "")} placeholder={copy("phPrefixAgency", "광고사")} onChange={(event) => patchContent({ agencyLabel: event.target.value })} />
          </Field>
          <Field label={copy("panelAgency", "광고사")}>
            <Input
              value={String(selected.content.agencyName ?? "")}
              onChange={(event) => patchContent({ agencyName: event.target.value })}
            />
          </Field>
          <Field label={copy("panelContactLabel", "문의 표시")} hint={copy("panelContactLabelHint", "비우면 문의로 보입니다.")}>
            <Input value={String(selected.content.contactLabel ?? "")} placeholder={copy("phPrefixContact", "문의")} onChange={(event) => patchContent({ contactLabel: event.target.value })} />
          </Field>
          <Field label={copy("panelContact", "문의")} hint={copy("panelContactHint", "비우면 대표 전화를 보여 줍니다. 하단 문의만 바꿉니다.")}>
            <Input
              value={String(selected.content.contact ?? "")}
              onChange={(event) => patchContent({ contact: event.target.value })}
            />
          </Field>
          <Field label={copy("panelDeveloperLabel", "시행 표시")} hint={copy("panelDeveloperLabelHint", "비우면 시행으로 보입니다.")}>
            <Input value={String(selected.content.developerLabel ?? "")} placeholder={copy("phPrefixDeveloper", "시행")} onChange={(event) => patchContent({ developerLabel: event.target.value })} />
          </Field>
          <Field label={copy("panelDeveloper", "시행")}>
            <Input value={String(selected.content.developerName ?? "")} onChange={(event) => patchContent({ developerName: event.target.value })} />
          </Field>
          <Field label={copy("panelBuilderLabel", "시공 표시")} hint={copy("panelBuilderLabelHint", "비우면 시공으로 보입니다.")}>
            <Input value={String(selected.content.builderLabel ?? "")} placeholder={copy("phPrefixBuilder", "시공")} onChange={(event) => patchContent({ builderLabel: event.target.value })} />
          </Field>
          <Field label={copy("panelBuilder", "시공")}>
            <Input value={String(selected.content.builderName ?? "")} onChange={(event) => patchContent({ builderName: event.target.value })} />
          </Field>
          <Field label={copy("panelSitePhoneLabel", "하단 전화 이름")} hint={copy("panelSitePhoneLabelHint", "페이지 맨 아래 대표 전화 위입니다. 비우면 문의번호로 보입니다.")}>
            <Input value={String(selected.content.sitePhoneLabel ?? "")} placeholder={copy("phPhoneCaption", "문의번호")} onChange={(event) => patchContent({ sitePhoneLabel: event.target.value })} />
          </Field>
          <Field label={copy("panelCopyPage", "페이지 주소 버튼")} hint={copy("panelCopyPageHint", "비우면 페이지 주소 복사로 보입니다.")}>
            <Input value={String(selected.content.copyPageLabel ?? "")} placeholder={copy("phCopyPage", "페이지 주소 복사")} onChange={(event) => patchContent({ copyPageLabel: event.target.value })} />
          </Field>
          <Field label={copy("panelFooterNote", "하단 한 줄")} hint={copy("panelFooterNoteHint", "페이지 맨 아래에 작게 보이는 안내입니다. 비우면 공개 페이지에서 숨깁니다.")}>
            <Textarea value={String(selected.content.footerNote ?? "")} onChange={(event) => patchContent({ footerNote: event.target.value })} />
          </Field>
          <PairList
            label={copy("panelNotices", "하단 고지")}
            items={(selected.content.notices as Array<{ text: string }>) ?? []}
            fields={[{ key: "text", label: copy("panelNoticeSentence", "문장"), multiline: true }]}
            onChange={(notices) => patchContent({ notices })}
          />
        </>
      ) : null}
    </div>
    </PanelCopyContext.Provider>
  );
}

const SHELL_LABELS: Array<{ key: string; label: string; placeholder: string; hint?: string }> = [
  { key: "shellTemplates", label: "템플릿 선택", placeholder: "템플릿 선택" },
  { key: "shellProject", label: "현장", placeholder: "현장" },
  { key: "shellVersions", label: "버전 기록", placeholder: "버전 기록" },
  { key: "shellAnalytics", label: "통계", placeholder: "통계" },
  { key: "shellAnalyticsDays", label: "통계 기간", placeholder: "최근 {count}일", hint: "{count} 자리에 일수가 들어갑니다." },
  { key: "shellEditing", label: "제작 제목", placeholder: "랜딩페이지 제작" },
  { key: "shellPreviewTitle", label: "미리보기 제목", placeholder: "미리보기" },
  { key: "shellUndo", label: "실행 취소", placeholder: "실행 취소" },
  { key: "shellRedo", label: "다시 실행", placeholder: "다시 실행" },
  { key: "shellShortcuts", label: "단축키", placeholder: "단축키" },
  { key: "shellKeepEditing", label: "편집 계속", placeholder: "편집 계속" },
  { key: "shellPreview", label: "미리보기", placeholder: "미리보기" },
  { key: "shellPopup", label: "이벤트 팝업", placeholder: "이벤트 팝업" },
  { key: "shellDesktop", label: "PC", placeholder: "PC" },
  { key: "shellTablet", label: "태블릿", placeholder: "태블릿" },
  { key: "shellMobile", label: "모바일", placeholder: "모바일" },
  { key: "shellSplit", label: "나눠 보기", placeholder: "나눠 보기" },
  { key: "shellCollapse", label: "섹션 접기", placeholder: "섹션 접기" },
  { key: "shellSections", label: "섹션", placeholder: "섹션" },
  { key: "pickerHome", label: "템플릿 홈", placeholder: "홈페이지" },
  { key: "pickerTitle", label: "템플릿 선택 제목", placeholder: "템플릿 선택" },
  { key: "pickerMake", label: "제작하기", placeholder: "제작하기" },
  { key: "pickerCount", label: "템플릿 개수", placeholder: "템플릿 {count}", hint: "{count} 자리에 개수가 들어갑니다." },
  { key: "pickerSoon", label: "오픈 대기 배지", placeholder: "오픈 대기" },
  { key: "pickerComingSoon", label: "오픈 대기 안내", placeholder: "오픈 대기 중이에요. 준비되는 대로 바로 안내드릴게요." },
  { key: "pickerDetails", label: "현장 정보 제목", placeholder: "현장 정보" },
  { key: "pickerDetailsBody", label: "현장 정보 설명", placeholder: "{name}으로 제작을 시작합니다. 현장명과 공개 URL은 나중에 페이지에서도 고칠 수 있습니다.", hint: "{name}은 템플릿 이름입니다." },
  { key: "pickerSiteName", label: "현장명 칸", placeholder: "현장명" },
  { key: "pickerSlug", label: "공개 URL 칸", placeholder: "공개 URL 텍스트" },
  { key: "pickerSlugHint", label: "공개 URL 안내", placeholder: "한글, 영문, 숫자, 하이픈. 예: lumiere-central" },
  { key: "pickerPhone", label: "대표 전화 칸", placeholder: "대표 전화" },
  { key: "pickerSlugChecking", label: "주소 확인 중", placeholder: "주소 확인 중…" },
  { key: "pickerNameRequired", label: "현장명 필수", placeholder: "현장명을 입력해 주세요." },
  { key: "pickerDuration", label: "운영기간 칸", placeholder: "운영기간" },
  { key: "pickerMonths", label: "개월 수", placeholder: "{count}개월", hint: "{count} 자리에 개월이 들어갑니다." },
  { key: "pickerCustom", label: "직접 입력", placeholder: "직접 입력" },
  { key: "pickerClose", label: "제작 창 닫기", placeholder: "닫기" },
  { key: "pickerStart", label: "제작 시작", placeholder: "제작 시작" },
  { key: "pickerFail", label: "제작 실패", placeholder: "만들지 못했습니다." },
  { key: "pickerPreviewName", label: "미리보기 현장명", placeholder: "현장명" },
  { key: "catalogImageFocusName", label: "시안 E-commerce 이름", placeholder: "E-commerce형" },
  { key: "catalogImageFocusDesc", label: "시안 E-commerce 설명", placeholder: "사업개요, 입지, 프리미엄, 평면 등 분양 핵심 섹션을 담은 기본 상품형 시안" },
  { key: "catalogVideoReadyName", label: "시안 화보 이름", placeholder: "프리미엄 화보형" },
  { key: "catalogVideoReadyDesc", label: "시안 화보 설명", placeholder: "히어로에서 이미지 또는 영상을 고를 수 있는 화보형 시안" },
  { key: "catalogForestName", label: "시안 포레스트 이름", placeholder: "브라이트 포레스트형" },
  { key: "catalogForestDesc", label: "시안 포레스트 설명", placeholder: "첫 화면을 크게 보여주고 아래로 이어지는 시안" },
  { key: "catalogInfoName", label: "시안 정보형 이름", placeholder: "단지 정보형" },
  { key: "catalogInfoDesc", label: "시안 정보형 설명", placeholder: "사진보다 위치, 규모, 세대 정보를 먼저 보여주는 시안" },
  { key: "editAddShort", label: "짧게 추가", placeholder: "추가" },
  { key: "seedPlaceholderMark", label: "미입력 표시 글자", placeholder: "입력하세요", hint: "안내 문장에 이 글자가 있으면 미입력으로 셉니다." },
  { key: "privacyPurpose", label: "수집 목적 기본", placeholder: "해당 분양 현장의 상담 및 문의 응대" },
  { key: "privacyOptionalField", label: "선택 항목 이름", placeholder: "선택 질문" },
  { key: "privacyRetentionBody", label: "보유 기간 기본", placeholder: "목적 달성 후 또는 동의 철회 시까지. 운영 검토용 기본안은 별도 법무 확인이 필요합니다." },
  { key: "privacyRefusalBody", label: "동의 거부 안내 기본", placeholder: "동의를 거부하면 관심고객 등록 및 상담 안내가 제한될 수 있습니다." },
  { key: "shellPageSettings", label: "페이지 설정", placeholder: "페이지 설정" },
  { key: "shellRetrySave", label: "다시 저장", placeholder: "다시 저장" },
  { key: "shellCheckpoint", label: "임시 저장", placeholder: "임시 저장" },
  { key: "shellPublish", label: "발행하기", placeholder: "발행하기" },
  { key: "shellRepublish", label: "재발행", placeholder: "재발행" },
  { key: "shellLive", label: "발행 페이지", placeholder: "발행 페이지" },
  { key: "shellCopy", label: "주소 복사", placeholder: "주소 복사", hint: "상단의 주소 복사입니다. 복사 완료 문구는 위의 복사 완료를 씁니다." },
  { key: "shellDuplicate", label: "복제", placeholder: "복제" },
  { key: "shellCopySuffix", label: "복제 이름", placeholder: "복제", hint: "복제한 섹션 이름 뒤에 붙습니다." },
  { key: "shellPinned", label: "고정", placeholder: "고정" },
  { key: "shellMenu", label: "상단 메뉴", placeholder: "상단 메뉴" },
  { key: "shellMenuName", label: "메뉴 이름", placeholder: "메뉴 이름" },
  { key: "shellSample", label: "샘플 센터", placeholder: "샘플 센터" },
  { key: "shellSampleBody", label: "샘플 센터 설명", placeholder: "비어 있는 안내 글을 샘플 문장으로 채웁니다." },
  { key: "shellSampleConfirm", label: "샘플 확인", placeholder: "샘플 문장으로 섹션 글을 채울까요? 지금 적은 글은 샘플 문장으로 바뀝니다." },
  { key: "shellSectionHelp", label: "섹션 안내", placeholder: "드래그로 순서를 바꿉니다." },
  { key: "shellPublishTitle", label: "발행 창 제목", placeholder: "발행" },
  { key: "shellRepublishTitle", label: "재발행 창 제목", placeholder: "다시 발행" },
  { key: "shellPublishBody", label: "발행 창 설명", placeholder: "없는 항목이 있어도 발행할 수 있습니다." },
  { key: "shellPublishNote", label: "발행 메모", placeholder: "이번 발행 메모" },
  { key: "shellPublishConfirm", label: "발행 확인", placeholder: "이 내용으로 발행", hint: "비우면 이 내용으로 발행으로 보입니다." },
  { key: "shellPublishing", label: "발행 중", placeholder: "발행 중" },
  { key: "shellPublishedTitle", label: "발행 완료 제목", placeholder: "발행했습니다" },
  { key: "shellPublishedBody", label: "발행 완료 설명", placeholder: "공개 주소에서 발행된 페이지를 볼 수 있습니다." },
  { key: "shellClose", label: "닫기", placeholder: "닫기" },
  { key: "shellCancel", label: "취소", placeholder: "취소" },
  { key: "shellPreviewBanner", label: "미리보기 안내", placeholder: "고객에게 보이는 화면입니다. 문구와 이미지는 편집에서 고칩니다." },
  { key: "shellHiddenCount", label: "숨긴 섹션 수", placeholder: "숨긴 섹션 {count}개", hint: "{count} 자리에 개수가 들어갑니다." },
  { key: "shellEditHint", label: "편집 안내", placeholder: "문구와 이미지를 클릭하면 바로 고칠 수 있습니다. 섹션 순서와 노출은 왼쪽에서 조절합니다." },
  { key: "shellEditHintOk", label: "편집 안내 확인", placeholder: "확인" },
  { key: "shellChecklistTitle", label: "발행 전 확인 제목", placeholder: "발행 전에 확인할 것" },
  { key: "shellChecklistBody", label: "발행 전 확인 설명", placeholder: "항목을 누르면 그 칸으로 이동합니다. 없어도 발행은 됩니다." },
  { key: "shellHas", label: "있음", placeholder: "있음" },
  { key: "shellMissing", label: "없음", placeholder: "없음" },
  { key: "checkName", label: "확인 현장명", placeholder: "현장명" },
  { key: "checkPhone", label: "확인 대표 전화", placeholder: "대표 전화" },
  { key: "checkLogo", label: "확인 로고", placeholder: "로고" },
  { key: "checkHeroImage", label: "확인 대표 이미지", placeholder: "대표 이미지" },
  { key: "checkMobileImage", label: "확인 모바일 이미지", placeholder: "모바일 이미지" },
  { key: "checkAddress", label: "확인 주소", placeholder: "주소" },
  { key: "checkParties", label: "확인 시행 시공", placeholder: "시행 또는 시공" },
  { key: "checkNotices", label: "확인 고지", placeholder: "고지 문장" },
  { key: "checkFloorplan", label: "확인 평면", placeholder: "평면 타입명" },
  { key: "checkPrivacy", label: "확인 처리 주체", placeholder: "개인정보 처리 주체" },
  { key: "shellKeyUndo", label: "단축키 실행 취소", placeholder: "Ctrl+Z 실행 취소" },
  { key: "shellKeyRedo", label: "단축키 다시 실행", placeholder: "Ctrl+Shift+Z 또는 Ctrl+Y 다시 실행" },
  { key: "shellKeySave", label: "단축키 임시 저장", placeholder: "Ctrl+S 임시 저장" },
  { key: "shellKeyToggle", label: "단축키 미리보기", placeholder: "P 편집과 미리보기 전환" },
  { key: "shellKeyHelp", label: "단축키 안내", placeholder: "? 이 안내" },
  { key: "shellKeyEsc", label: "단축키 닫기", placeholder: "Esc 열린 창과 좁은 화면의 섹션 목록을 닫기" },
  { key: "shellKeyNote", label: "단축키 보충", placeholder: "글을 입력하는 중에는 P와 ?가 동작하지 않습니다. Ctrl+S는 입력 중에도 임시 저장을 엽니다." },
  { key: "shellCheckpointBody", label: "임시 저장 설명", placeholder: "지금 작업본을 이 브라우저에 최대 10개까지 남겨 둡니다." },
  { key: "shellCheckpointName", label: "임시 저장 이름", placeholder: "저장 이름" },
  { key: "shellCheckpointSave", label: "임시 저장 버튼", placeholder: "저장" },
  { key: "shellCheckpointEmpty", label: "임시 저장 없음", placeholder: "아직 임시 저장이 없습니다." },
  { key: "shellCheckpointNeedName", label: "임시 저장 이름 안내", placeholder: "이름을 입력하세요." },
  { key: "shellCheckpointSaved", label: "임시 저장 완료", placeholder: "이 브라우저에 임시 저장했습니다. 공개 페이지는 바뀌지 않습니다." },
  { key: "shellCheckpointRestore", label: "되돌리기 확인", placeholder: "이 임시 저장으로 작업본을 바꿉니다. 공개 페이지는 다시 발행해야 바뀝니다." },
  { key: "shellCheckpointRestoreButton", label: "되돌리기", placeholder: "이 내용으로 되돌리기" },
  { key: "shellCheckpointDelete", label: "임시 저장 삭제 확인", placeholder: "이 임시 저장을 삭제할까요?" },
  { key: "shellPopupIntro", label: "팝업 설명", placeholder: "방문 시 한 번 보이는 안내" },
  { key: "shellPopupBanner", label: "팝업 배너 버튼", placeholder: "배너 이미지" },
  { key: "shellPopupBannerText", label: "팝업 배너 문구", placeholder: "배너 문구" },
  { key: "shellPopupTitleField", label: "팝업 제목 칸", placeholder: "제목" },
  { key: "shellPopupBodyField", label: "팝업 본문 칸", placeholder: "본문" },
  { key: "shellPopupPerks", label: "팝업 혜택 칸", placeholder: "혜택" },
  { key: "shellPopupDisclaimer", label: "팝업 안내 칸", placeholder: "안내 문장" },
  { key: "shellPopupCta", label: "팝업 버튼 칸", placeholder: "버튼 문구" },
  { key: "shellPopupPhone", label: "팝업 전화 칸", placeholder: "팝업 전화" },
  { key: "shellPopupPhonePrefix", label: "팝업 전화 앞 칸", placeholder: "전화 앞 문구" },
  { key: "shellPopupCloseField", label: "팝업 닫기 칸", placeholder: "닫기" },
  { key: "shellPopupEmpty", label: "팝업 빈 배너 칸", placeholder: "배너가 없을 때" },
  { key: "shellPopupHideToday", label: "팝업 오늘 숨김 칸", placeholder: "오늘 하루 보지 않기" },
  { key: "shellPopupPreview", label: "팝업 미리보기", placeholder: "팝업 미리보기" },
  { key: "shellReorder", label: "순서 이동", placeholder: "순서 이동" },
  { key: "shellListClose", label: "섹션 목록 닫기", placeholder: "섹션 목록 닫기" },
  { key: "shellListOpen", label: "섹션 목록 펼치기", placeholder: "섹션 목록 펼치기" },
  { key: "shellStatusLoading", label: "상태 불러오는 중", placeholder: "불러오는 중" },
  { key: "shellStatusDirty", label: "상태 미발행", placeholder: "미발행 변경사항 있음" },
  { key: "shellStatusSaved", label: "상태 저장됨", placeholder: "저장됨" },
  { key: "shellStatusSaving", label: "상태 저장 중", placeholder: "저장 중" },
  { key: "shellStatusSaveFailed", label: "상태 저장 실패", placeholder: "저장 실패" },
  { key: "shellStatusPublishing", label: "상태 발행 중", placeholder: "발행 중" },
  { key: "shellStatusPublished", label: "상태 발행됨", placeholder: "발행됨", hint: "상단에 보이는 글자입니다. 발행 확인 버튼은 위의 발행 확인을 씁니다." },
  { key: "shellDraftLoading", label: "작업본 불러오는 중", placeholder: "작업본을 불러오는 중입니다." },
  { key: "shellDraftLoadFail", label: "작업본 불러오기 실패", placeholder: "작업본을 불러오지 못했습니다." },
  { key: "shellDraftReloaded", label: "작업본 다시 불러옴", placeholder: "다른 화면에서 작업본이 바뀌어 최신 내용을 불러왔습니다." },
  { key: "shellDraftConflict", label: "작업본 충돌", placeholder: "다른 화면에서 작업본이 바뀌어, 이 화면에 남아 있던 저장 전 수정은 두고 최신 작업본을 불러왔습니다." },
  { key: "shellDraftConflictMark", label: "작업본 충돌 표시", placeholder: "최신 작업본", hint: "서버 충돌 안내 문장에 이 글자가 있으면 최신 작업본을 불러옵니다." },
  { key: "shellSaveFail", label: "저장 실패 안내", placeholder: "저장에 실패했습니다." },
  { key: "shellSavedToast", label: "저장 완료 알림", placeholder: "작업본을 저장했습니다" },
  { key: "shellUploadFail", label: "업로드 실패", placeholder: "업로드에 실패했습니다." },
  { key: "shellPublishFail", label: "발행 실패", placeholder: "발행에 실패했습니다." },
  { key: "notePlaceholders", label: "발행 메모 안내 문장", placeholder: "{name}에 안내 문장이 {count}곳 남아 있습니다.", hint: "{name}은 섹션 이름, {count}는 개수입니다." },
  { key: "noteHeroMedia", label: "발행 메모 대표 이미지", placeholder: "{name}에 대표 이미지나 영상이 없습니다." },
  { key: "notePhotos", label: "발행 메모 사진", placeholder: "{name}에 사진이 없습니다." },
  { key: "noteFloorplan", label: "발행 메모 도면", placeholder: "{name}에 도면이 없는 타입이 {count}개 있습니다." },
  { key: "noteMap", label: "발행 메모 약도", placeholder: "{name}에 약도 이미지가 없습니다." },
  { key: "notePopupImage", label: "발행 메모 팝업", placeholder: "팝업이 켜져 있지만 이미지가 없습니다." },
  { key: "noteExternalForm", label: "발행 메모 외부 등록", placeholder: "외부 관심고객 주소가 없습니다. 등록 버튼은 이 페이지의 등록 화면으로 이동합니다. 실제 수집은 아직 시작하지 않습니다." },
  { key: "shellSelected", label: "선택 섹션", placeholder: "선택 섹션" },
  { key: "shellFieldRemove", label: "항목 삭제", placeholder: "항목 삭제" },
  { key: "shellNotifyInclude", label: "알림에 포함", placeholder: "알림에 포함" },
  { key: "shellFormFields", label: "입력 항목", placeholder: "입력 항목" },
  { key: "mediaShareDelete", label: "공유 이미지 삭제", placeholder: "공유 이미지 삭제" },
  { key: "shellEditorCopy", label: "편집기 문구", placeholder: "편집기 문구" },
  { key: "shellDuplicateFail", label: "복제 실패", placeholder: "복제하지 못했습니다." },
  { key: "shellPublishMemoPlaceholder", label: "발행 메모 안내", placeholder: "비우면 최초 발행 또는 재발행으로 기록됩니다." },
  { key: "fieldText", label: "짧은 글", placeholder: "짧은 글" },
  { key: "fieldTextarea", label: "긴 글", placeholder: "긴 글" },
  { key: "fieldSelect", label: "목록 선택", placeholder: "목록 선택" },
  { key: "fieldRadio", label: "하나만 선택", placeholder: "하나만 선택" },
  { key: "fieldCheckbox", label: "여러 개 선택", placeholder: "여러 개 선택" },
  { key: "fieldDate", label: "날짜", placeholder: "날짜" },
  { key: "shellUnitTypeHint", label: "관심 타입 안내", placeholder: "이 항목은 등록 폼에서 칩으로 여러 개 고릅니다. 선택지는 평면안내 타입 이름과 맞춰집니다." },
  { key: "shellPremiumList", label: "특장점 목록", placeholder: "특장점" },
  { key: "shellBoldPanel", label: "굵게 안내", placeholder: "**이렇게** 감싸면 공개 페이지와 미리보기에서 굵게 보입니다. 편집 중에는 별표가 그대로 보입니다." },
  { key: "shellMatrixTitle", label: "입지 네 칸", placeholder: "입지 네 칸" },
  { key: "shellMatrixHint", label: "입지 네 칸 안내", placeholder: "교통, 생활, 교육, 녹지처럼 네 가지로 고정됩니다. 아이콘을 누르면 다음 모양으로 바뀝니다." },
  { key: "shellLocationCards", label: "입지 카드", placeholder: "입지 카드" },
  { key: "shellFirstPhoto", label: "대표 사진 안내", placeholder: "첫 사진이 대표 이미지입니다." },
  { key: "shellFloorplanTypes", label: "평면 타입 안내", placeholder: "타입명이 있으면 관심 타입 선택지에 같은 이름이 들어갑니다." },
  { key: "shellFloorplanSpecs", label: "면적·구성", placeholder: "면적·구성" },
  { key: "iconCommunity", label: "아이콘 커뮤니티", placeholder: "커뮤니티" },
  { key: "iconPark", label: "아이콘 조경", placeholder: "조경" },
  { key: "iconParking", label: "아이콘 주차", placeholder: "주차" },
  { key: "iconView", label: "아이콘 전망", placeholder: "전망" },
  { key: "iconTransit", label: "아이콘 교통", placeholder: "교통" },
  { key: "iconSchool", label: "아이콘 교육", placeholder: "교육" },
  { key: "iconSecurity", label: "아이콘 보안", placeholder: "보안" },
  { key: "iconComplex", label: "아이콘 단지", placeholder: "단지" },
  { key: "iconLife", label: "아이콘 생활", placeholder: "생활" },
  { key: "iconGreen", label: "아이콘 녹지", placeholder: "녹지" },
  { key: "shellSamplePopupBanner", label: "샘플 팝업 배너", placeholder: "방문 고객 안내", hint: "샘플 센터를 누르면 팝업 배너에 들어갑니다." },
  { key: "shellSamplePopupTitle", label: "샘플 팝업 제목", placeholder: "관심고객으로 등록해 주세요" },
  { key: "shellSamplePopupBody", label: "샘플 팝업 본문", placeholder: "상담 안내를 받으려면 이름과 연락처를 남겨 주세요." },
  { key: "shellSectionTitle", label: "섹션 제목 칸", placeholder: "섹션 제목" },
  { key: "shellMenuHint", label: "메뉴 이름 안내", placeholder: "상단 메뉴에 보이는 짧은 이름입니다. 비우면 섹션 제목을 씁니다." },
  { key: "shellVersionsBody", label: "버전 기록 설명", placeholder: "최근 발행 버전 {count}개까지 남습니다. 이 버전 보기는 그때 발행된 화면만 보여 주고, 작업본으로 복구해도 공개 페이지는 바뀌지 않습니다. 복구 후 재발행을 누르면 공개 페이지가 그 버전으로 바뀝니다.", hint: "{count}는 남기는 개수입니다." },
  { key: "shellVersionsBack", label: "편집으로", placeholder: "편집으로" },
  { key: "shellVersionsEmptyTitle", label: "버전 없음 제목", placeholder: "아직 발행 기록이 없습니다" },
  { key: "shellVersionsEmptyBody", label: "버전 없음 설명", placeholder: "편집 화면에서 발행하면 여기에 버전과 메모가 쌓입니다." },
  { key: "shellVersionName", label: "버전 이름", placeholder: "버전 {count}", hint: "{count}는 버전 번호입니다." },
  { key: "shellVersionEmptyNote", label: "버전 메모 없음", placeholder: "메모 없음" },
  { key: "shellVersionOpen", label: "이 버전 보기", placeholder: "이 버전 보기" },
  { key: "shellVersionClose", label: "미리보기 닫기", placeholder: "미리보기 닫기" },
  { key: "shellVersionRestore", label: "작업본으로 복구", placeholder: "작업본으로 복구" },
  { key: "shellVersionRepublish", label: "복구 후 재발행", placeholder: "복구 후 재발행" },
  { key: "shellVersionOpenEditor", label: "편집 열기", placeholder: "편집 열기" },
  { key: "shellVersionRestoreConfirm", label: "복구 확인", placeholder: "이 버전으로 작업본을 바꿉니다. 공개 페이지는 그대로입니다. 편집 화면에 저장하지 않은 내용은 사라질 수 있습니다." },
  { key: "shellVersionRepublishConfirm", label: "재발행 확인", placeholder: "이 버전으로 작업본을 바꾸고 공개 페이지도 다시 발행합니다. 편집 화면에 저장하지 않은 내용은 사라질 수 있습니다." },
  { key: "shellVersionRestored", label: "복구 완료", placeholder: "작업본으로 가져왔습니다. 편집 화면을 다시 열면 이 버전이 보입니다." },
  { key: "shellVersionRepublished", label: "재발행 완료", placeholder: "복구 후 재발행했습니다." },
  { key: "shellOpenEditor", label: "현장 편집", placeholder: "편집" },
  { key: "shellRecipients", label: "광고주 수신자", placeholder: "광고주 수신자" },
  { key: "shellLeads", label: "관심고객 목록", placeholder: "관심고객" },
  { key: "shellTemplate", label: "템플릿", placeholder: "템플릿" },
  { key: "shellDuration", label: "운영기간", placeholder: "운영기간" },
  { key: "shellMonths", label: "개월", placeholder: "{count}개월", hint: "{count}는 개월 수입니다." },
  { key: "shellFirstPublish", label: "최초 발행", placeholder: "최초 발행" },
  { key: "shellUnpublished", label: "미발행", placeholder: "미발행" },
  { key: "shellExpires", label: "만료일", placeholder: "만료일" },
  { key: "shellUpdated", label: "최근 수정", placeholder: "최근 수정" },
  { key: "shellUnpublishedChanges", label: "미발행 변경", placeholder: "미발행 변경" },
  { key: "shellUnpublishedHint", label: "미발행 변경 안내", placeholder: "편집본에 아직 발행하지 않은 변경이 있습니다." },
  { key: "shellProjectCopyUrl", label: "URL 복사", placeholder: "URL 복사" },
  { key: "shellPublicPage", label: "공개 페이지", placeholder: "공개 페이지" },
  { key: "shellPause", label: "즉시 비공개", placeholder: "즉시 비공개" },
  { key: "shellPauseConfirm", label: "즉시 비공개 확인", placeholder: "지금 바로 공개를 멈출까요? 방문자가 페이지를 볼 수 없게 됩니다." },
  { key: "shellResume", label: "재공개", placeholder: "재공개" },
  { key: "shellExtendLabel", label: "연장 칸", placeholder: "연장(개월)" },
  { key: "shellExtend", label: "기간 연장", placeholder: "기간 연장" },
  { key: "shellExtendConfirm", label: "기간 연장 확인", placeholder: "운영기간을 {count}개월 연장할까요?" },
  { key: "shellExtendOk", label: "기간 연장 완료", placeholder: "기간을 연장했습니다." },
  { key: "shellDeleteAsk", label: "삭제 확인 창", placeholder: "이 홈페이지를 삭제할까요? 복구할 수 없습니다." },
  { key: "shellDeleteConfirm", label: "삭제 확인", placeholder: "삭제 확인(프로젝트명)" },
  { key: "shellActionFail", label: "처리 실패", placeholder: "처리에 실패했습니다." },
  { key: "shellActionOk", label: "처리 완료", placeholder: "반영했습니다." },
  { key: "shellDeleteFail", label: "삭제 실패", placeholder: "삭제에 실패했습니다." },
  { key: "shellAnalyticsBody", label: "통계 설명", placeholder: "전환율 = 관심고객 등록 / 순 방문자. 개인정보는 이벤트에 저장되지 않습니다." },
  { key: "shellPdf", label: "PDF 보고서", placeholder: "PDF 보고서" },
  { key: "shellViews", label: "조회수", placeholder: "조회수" },
  { key: "shellVisitors", label: "순 방문자", placeholder: "순 방문자" },
  { key: "shellPhoneClicks", label: "전화 클릭", placeholder: "전화 클릭" },
  { key: "shellConversion", label: "전환율", placeholder: "전환율 {rate}%", hint: "{rate}는 퍼센트 숫자입니다." },
  { key: "shellDaily", label: "일별 추이", placeholder: "일별 추이" },
  { key: "shellChannels", label: "유입 채널", placeholder: "유입 채널" },
  { key: "shellChannelsEmpty", label: "유입 없음", placeholder: "아직 유입 데이터가 없습니다." },
  { key: "shellDevices", label: "기기", placeholder: "기기" },
  { key: "shellDevicesEmpty", label: "기기 없음", placeholder: "아직 기기 데이터가 없습니다." },
  { key: "shellProjectLeads", label: "프로젝트 관심고객", placeholder: "프로젝트 관심고객" },
  { key: "shellProjectLeadsEmptyTitle", label: "관심고객 없음 제목", placeholder: "관심고객이 없습니다" },
  { key: "shellProjectLeadsEmptyBody", label: "관심고객 없음 설명", placeholder: "등록폼이 공개되면 이 프로젝트의 관심고객이 여기에 쌓입니다." },
  { key: "shellLeadSearch", label: "관심고객 검색", placeholder: "이름 또는 전화번호" },
  { key: "shellSearch", label: "검색", placeholder: "검색" },
  { key: "shellExportCsv", label: "CSV 내보내기", placeholder: "CSV 내보내기" },
  { key: "shellLeadTime", label: "등록 일시", placeholder: "등록 일시" },
  { key: "shellLeadProject", label: "리드 프로젝트", placeholder: "프로젝트" },
  { key: "shellLeadName", label: "리드 이름", placeholder: "이름" },
  { key: "shellLeadPhone", label: "리드 연락처", placeholder: "연락처" },
  { key: "shellLeadSource", label: "유입", placeholder: "유입" },
  { key: "shellRecipientsBody", label: "수신자 설명", placeholder: "활성 수신자는 최대 5명입니다. 인증되지 않은 연락처에는 관심고객 개인정보를 보내지 않습니다." },
  { key: "shellRecipientName", label: "수신자 이름", placeholder: "이름" },
  { key: "shellRecipientCompany", label: "수신자 회사", placeholder: "회사명" },
  { key: "shellRecipientPhone", label: "수신자 전화", placeholder: "휴대전화" },
  { key: "shellRecipientEmail", label: "수신자 이메일", placeholder: "이메일" },
  { key: "shellRecipientChannel", label: "알림 채널", placeholder: "알림 채널" },
  { key: "shellChannelKakao", label: "카카오 알림톡", placeholder: "카카오 알림톡" },
  { key: "shellChannelEmail", label: "이메일", placeholder: "이메일" },
  { key: "shellRecipientAdd", label: "수신자 등록", placeholder: "수신자 등록" },
  { key: "shellRecipientFail", label: "수신자 등록 실패", placeholder: "수신자를 등록하지 못했습니다." },
  { key: "shellRecipientAdded", label: "수신자 등록 완료", placeholder: "수신자를 등록했습니다. 인증 후 개인정보가 발송됩니다." },
  { key: "shellRecipientVerify", label: "수신자 인증 링크", placeholder: "인증 링크(샌드박스): {url}", hint: "{url}은 샌드박스·로컬에서만 보이는 인증 주소입니다." },
  { key: "shellRecipientDisable", label: "수신자 비활성화", placeholder: "비활성화" },
  { key: "shellLeadAnswers", label: "등록 내용", placeholder: "등록 내용" },
  { key: "shellLeadBack", label: "관심고객 목록으로", placeholder: "목록으로" },
  { key: "shellLeadInquiry", label: "문의 한 줄", placeholder: "문의: {text}", hint: "{text}는 문의 글입니다. 없으면 없음 칸을 씁니다." },
  { key: "shellLeadUtm", label: "유입 한 줄", placeholder: "유입: {source} / {medium} / {campaign}" },
  { key: "shellLeadConsent", label: "동의 증빙", placeholder: "동의 증빙" },
  { key: "shellLeadAlerts", label: "알림", placeholder: "알림" },
  { key: "shellLeadNotes", label: "누적 메모", placeholder: "누적 메모" },
  { key: "shellLeadNotePlaceholder", label: "메모 안내", placeholder: "상담 메모. 상태 단계는 관리하지 않습니다." },
  { key: "shellLeadNoteAdd", label: "메모 추가", placeholder: "메모 추가" },
  { key: "shellLeadNoteFail", label: "메모 실패", placeholder: "메모를 저장하지 못했습니다." },
  { key: "panelHeading", label: "칸 제목", placeholder: "제목" },
  { key: "panelEyebrow", label: "칸 작은 제목", placeholder: "작은 제목" },
  { key: "panelEyebrowHint", label: "작은 제목 안내", placeholder: "큰 제목 위에 보이는 짧은 분류입니다. 비우면 기본 문구를 씁니다." },
  { key: "panelBody", label: "칸 본문", placeholder: "본문" },
  { key: "panelFacts", label: "개요 목록", placeholder: "개요 항목" },
  { key: "panelItem", label: "개요 항목 이름", placeholder: "항목" },
  { key: "panelValue", label: "개요 항목 내용", placeholder: "내용" },
  { key: "panelStats", label: "핵심 수치 목록", placeholder: "핵심 수치" },
  { key: "panelNumber", label: "수치", placeholder: "숫자" },
  { key: "panelStatName", label: "수치 이름", placeholder: "이름" },
  { key: "panelScheduleTitle", label: "일정 제목 칸", placeholder: "일정 제목" },
  { key: "panelScheduleTitleHint", label: "일정 제목 안내", placeholder: "비우면 공개 페이지에 분양 일정으로 보입니다." },
  { key: "panelFactsMore", label: "개요 더보기 칸", placeholder: "개요 더보기" },
  { key: "panelFactsMoreHint", label: "개요 더보기 안내", placeholder: "히어로에 다 안 들어온 개요 아래에 보입니다. 비우면 사업개요 전체로 보입니다." },
  { key: "panelScheduleMore", label: "일정 더보기 칸", placeholder: "일정 더보기" },
  { key: "panelScheduleMoreHint", label: "일정 더보기 안내", placeholder: "히어로에 다 안 들어온 일정 아래에 보입니다. 비우면 일정 전체로 보입니다." },
  { key: "panelDisclaimer", label: "하단 안내 칸", placeholder: "하단 안내" },
  { key: "panelHomepageBtn", label: "홈페이지 버튼 칸", placeholder: "홈페이지 버튼" },
  { key: "panelHomepageBtnHint", label: "홈페이지 버튼 안내", placeholder: "비우면 분양 홈페이지로 보입니다." },
  { key: "panelHomepage", label: "홈페이지 주소 칸", placeholder: "분양 홈페이지" },
  { key: "panelNoticeBtn", label: "공고 버튼 칸", placeholder: "공고 버튼" },
  { key: "panelNoticeBtnHint", label: "공고 버튼 안내", placeholder: "비우면 입주자 모집공고로 보입니다." },
  { key: "panelNotice", label: "공고 주소 칸", placeholder: "입주자 모집공고" },
  { key: "panelSchedule", label: "분양 일정 목록", placeholder: "분양 일정" },
  { key: "panelScheduleName", label: "일정 이름", placeholder: "일정" },
  { key: "panelScheduleDate", label: "일정 날짜", placeholder: "날짜" },
  { key: "panelScheduleNote", label: "일정 보충", placeholder: "보충" },
  { key: "panelAnswer", label: "답변 칸", placeholder: "답변" },
  { key: "panelPlace", label: "장소명 칸", placeholder: "장소명" },
  { key: "panelPhoneRow", label: "전화 항목 칸", placeholder: "전화 항목" },
  { key: "panelPhoneRowHint", label: "전화 항목 안내", placeholder: "비우면 전화로 보입니다." },
  { key: "panelSitePhone", label: "현장 전화 칸", placeholder: "현장 전화" },
  { key: "panelSitePhoneHint", label: "현장 전화 안내", placeholder: "비우면 대표 전화를 보여 줍니다." },
  { key: "panelHeadingSuffix", label: "제목 뒤 문구 칸", placeholder: "제목 뒤 문구" },
  { key: "panelHeadingSuffixHint", label: "제목 뒤 문구 안내", placeholder: "장소명 뒤에 붙습니다. 비우면 오시는 길로 보입니다." },
  { key: "panelAddressRow", label: "주소 항목 칸", placeholder: "주소 항목" },
  { key: "panelAddressRowHint", label: "주소 항목 안내", placeholder: "비우면 주소로 보입니다." },
  { key: "panelAddress", label: "주소 칸", placeholder: "주소" },
  { key: "panelCopyAddress", label: "주소 복사 칸", placeholder: "주소 복사 버튼" },
  { key: "panelCopyAddressHint", label: "주소 복사 안내", placeholder: "비우면 주소 복사로 보입니다." },
  { key: "panelGuide", label: "찾아오시는 길 칸", placeholder: "찾아오시는 길" },
  { key: "panelHoursRow", label: "운영 항목 칸", placeholder: "운영 항목" },
  { key: "panelHoursRowHint", label: "운영 항목 안내", placeholder: "비우면 운영으로 보입니다." },
  { key: "panelHours", label: "운영 시간 칸", placeholder: "운영 시간" },
  { key: "panelParkingRow", label: "주차 항목 칸", placeholder: "주차 항목" },
  { key: "panelParkingRowHint", label: "주차 항목 안내", placeholder: "비우면 주차로 보입니다." },
  { key: "panelParking", label: "주차 칸", placeholder: "주차" },
  { key: "panelRoutes", label: "교통 목록", placeholder: "교통" },
  { key: "panelRouteMode", label: "교통 수단", placeholder: "수단" },
  { key: "panelRouteDetail", label: "교통 안내", placeholder: "안내" },
  { key: "panelMapUrl", label: "지도 링크 칸", placeholder: "지도 링크" },
  { key: "panelMapUrlHint", label: "지도 링크 안내", placeholder: "https로 시작하는 주소입니다. 방문자가 약도를 누르면 이 주소로 이동합니다." },
  { key: "panelMapEmpty", label: "약도 빈칸", placeholder: "약도가 없을 때" },
  { key: "panelMapEmptyHint", label: "약도 빈칸 안내", placeholder: "약도를 올리기 전에 빈 칸에 보이는 문구입니다. 비우면 약도 이미지로 보입니다." },
  { key: "panelMapAlt", label: "약도 이름 칸", placeholder: "약도 이름" },
  { key: "panelMapAltHint", label: "약도 이름 안내", placeholder: "약도를 읽어 주는 이름입니다. 비우면 약도로 둡니다." },
  { key: "panelMapLink", label: "지도에서 보기 칸", placeholder: "지도에서 보기" },
  { key: "panelMapLinkHint", label: "지도에서 보기 안내", placeholder: "약도 위에 겹쳐 보이는 버튼입니다. 비우면 지도에서 보기로 보입니다." },
  { key: "panelMapFile", label: "약도 파일 칸", placeholder: "약도 이미지" },
  { key: "panelEmptyUnit", label: "타입 없음 칸", placeholder: "타입이 없을 때" },
  { key: "panelEmptyUnitHint", label: "타입 없음 안내", placeholder: "관심 타입 이름이 없을 때 폼에 보입니다. 비우면 평면안내에서 타입 이름을 입력하면 여기에 나타납니다.로 보입니다." },
  { key: "panelFormPhoneCaption", label: "등록 전화 이름 칸", placeholder: "등록 화면 전화 이름" },
  { key: "panelFormPhoneCaptionHint", label: "등록 전화 이름 안내", placeholder: "전화번호 앞에 붙습니다. 비우면 문의번호로 보입니다." },
  { key: "panelFormPhone", label: "등록 전화 칸", placeholder: "등록 화면 전화" },
  { key: "panelFormPhoneHint", label: "등록 전화 안내", placeholder: "비우면 대표 전화를 보여 줍니다." },
  { key: "panelExternal", label: "외부 주소 칸", placeholder: "외부 관심고객 주소" },
  { key: "panelExternalHint", label: "외부 주소 안내", placeholder: "http로 시작하는 주소가 있으면 공개 페이지의 등록 버튼이 이 주소로 이동합니다. 비어 있으면 이 페이지의 등록 폼으로 이동합니다." },
  { key: "panelFormIntro", label: "폼 안내 칸", placeholder: "폼 안내 문구" },
  { key: "panelSuccessTitle", label: "완료 제목 칸", placeholder: "등록 완료 제목" },
  { key: "panelSuccessTitleHint", label: "완료 제목 안내", placeholder: "비우면 등록이 완료되었습니다로 보입니다." },
  { key: "panelSuccessMessage", label: "완료 메시지 칸", placeholder: "등록 완료 메시지" },
  { key: "panelSubmitting", label: "등록 중 칸", placeholder: "등록 중 버튼" },
  { key: "panelSubmittingHint", label: "등록 중 안내", placeholder: "접수를 보내는 동안 버튼에 보입니다. 비우면 등록 중으로 보입니다." },
  { key: "panelPreviewNote", label: "미리보기 안내 칸", placeholder: "미리보기 안내" },
  { key: "panelPreviewNoteHint", label: "미리보기 안내 설명", placeholder: "편집 화면의 완료 안내 아래입니다. 공개 페이지에는 나오지 않습니다." },
  { key: "panelAgain", label: "추가 등록 칸", placeholder: "추가 등록 버튼" },
  { key: "panelAgainHint", label: "추가 등록 안내", placeholder: "완료 화면에서 다시 등록할 때 보입니다. 비우면 추가 등록으로 보입니다." },
  { key: "panelCollection", label: "수집 동의 칸", placeholder: "수집 동의 문구" },
  { key: "panelCollectionHint", label: "수집 동의 안내", placeholder: "비우면 [필수] 개인정보 수집 및 이용에 동의합니다.로 보입니다." },
  { key: "panelThirdParty", label: "제3자 동의 칸", placeholder: "제3자 동의 문구" },
  { key: "panelThirdPartyHint", label: "제3자 동의 안내", placeholder: "뒤에 제공받는 자와 목적은 페이지 설정 값이 붙습니다. 비우면 기본 문장으로 보입니다." },
  { key: "panelNameError", label: "이름 누락 칸", placeholder: "이름 누락 안내" },
  { key: "panelNameErrorHint", label: "이름 누락 설명", placeholder: "이름을 비우고 등록할 때 보입니다. 비우면 이름을 입력해 주세요.로 보입니다." },
  { key: "panelPhoneError", label: "전화 형식 칸", placeholder: "전화 형식 안내" },
  { key: "panelPhoneErrorHint", label: "전화 형식 설명", placeholder: "휴대전화 형식이 아닐 때 보입니다." },
  { key: "panelCollectionError", label: "수집 동의 누락 칸", placeholder: "수집 동의 누락" },
  { key: "panelCollectionErrorHint", label: "수집 동의 누락 설명", placeholder: "수집 동의를 켜지 않고 등록할 때 보입니다." },
  { key: "panelThirdPartyError", label: "제3자 누락 칸", placeholder: "제3자 동의 누락" },
  { key: "panelThirdPartyErrorHint", label: "제3자 누락 설명", placeholder: "제3자 제공을 켠 프로젝트에서만 보입니다." },
  { key: "panelSubmitError", label: "등록 실패 칸", placeholder: "등록 실패 안내" },
  { key: "panelSubmitErrorHint", label: "등록 실패 설명", placeholder: "서버가 별도 문구를 주지 않을 때 보입니다." },
  { key: "panelControllerWarning", label: "처리 주체 칸", placeholder: "처리 주체 안내" },
  { key: "panelControllerWarningHint", label: "처리 주체 설명", placeholder: "수집 주체가 처리주체미정일 때 폼 아래에 보입니다." },
  { key: "panelPrivacyLink", label: "동의 내용 칸", placeholder: "동의 내용 버튼" },
  { key: "panelPrivacyLinkHint", label: "동의 내용 안내", placeholder: "비우면 내용 보기로 보입니다." },
  { key: "panelPerkHeadline", label: "혜택 제목 칸", placeholder: "혜택 제목" },
  { key: "panelPerkBody", label: "혜택 설명 칸", placeholder: "혜택 설명" },
  { key: "panelPerks", label: "등록 혜택 목록", placeholder: "등록 혜택" },
  { key: "panelAdvertiserLabel", label: "광고주 표시 칸", placeholder: "광고주 표시" },
  { key: "panelAdvertiserLabelHint", label: "광고주 표시 안내", placeholder: "비우면 광고주로 보입니다." },
  { key: "panelAdvertiser", label: "광고주 칸", placeholder: "광고주" },
  { key: "panelAgencyLabel", label: "광고사 표시 칸", placeholder: "광고사 표시" },
  { key: "panelAgencyLabelHint", label: "광고사 표시 안내", placeholder: "비우면 광고사로 보입니다." },
  { key: "panelAgency", label: "광고사 칸", placeholder: "광고사" },
  { key: "panelContactLabel", label: "문의 표시 칸", placeholder: "문의 표시" },
  { key: "panelContactLabelHint", label: "문의 표시 안내", placeholder: "비우면 문의로 보입니다." },
  { key: "panelContact", label: "문의 칸", placeholder: "문의" },
  { key: "panelContactHint", label: "문의 안내", placeholder: "비우면 대표 전화를 보여 줍니다. 하단 문의만 바꿉니다." },
  { key: "panelDeveloperLabel", label: "시행 표시 칸", placeholder: "시행 표시" },
  { key: "panelDeveloperLabelHint", label: "시행 표시 안내", placeholder: "비우면 시행으로 보입니다." },
  { key: "panelDeveloper", label: "시행 칸", placeholder: "시행" },
  { key: "panelBuilderLabel", label: "시공 표시 칸", placeholder: "시공 표시" },
  { key: "panelBuilderLabelHint", label: "시공 표시 안내", placeholder: "비우면 시공으로 보입니다." },
  { key: "panelBuilder", label: "시공 칸", placeholder: "시공" },
  { key: "panelSitePhoneLabel", label: "하단 전화 이름 칸", placeholder: "하단 전화 이름" },
  { key: "panelSitePhoneLabelHint", label: "하단 전화 이름 안내", placeholder: "페이지 맨 아래 대표 전화 위입니다. 비우면 문의번호로 보입니다." },
  { key: "panelCopyPage", label: "페이지 주소 칸", placeholder: "페이지 주소 버튼" },
  { key: "panelCopyPageHint", label: "페이지 주소 안내", placeholder: "비우면 페이지 주소 복사로 보입니다." },
  { key: "panelFooterNote", label: "하단 한 줄 칸", placeholder: "하단 한 줄" },
  { key: "panelFooterNoteHint", label: "하단 한 줄 안내", placeholder: "페이지 맨 아래에 작게 보이는 안내입니다. 비우면 공개 페이지에서 숨깁니다." },
  { key: "panelNotices", label: "하단 고지 목록", placeholder: "하단 고지" },
  { key: "panelNoticeSentence", label: "고지 문장", placeholder: "문장" },
  { key: "panelAccentTitle", label: "강조 제목 칸", placeholder: "강조 제목" },
  { key: "panelAccentBody", label: "강조 설명 칸", placeholder: "강조 설명" },
  { key: "panelPhotoCaption", label: "사진 설명 칸", placeholder: "사진 설명" },
  { key: "panelPhotoCaptionHint", label: "사진 설명 안내", placeholder: "특장점 사진 아래에 보이는 한 줄입니다. 비우면 공개 페이지에서 숨깁니다." },
  { key: "panelIcon", label: "아이콘 칸", placeholder: "아이콘" },
  { key: "panelItemBody", label: "설명 칸", placeholder: "설명" },
  { key: "panelPhoto", label: "사진 칸", placeholder: "사진" },
  { key: "panelAddPremium", label: "특장점 추가 버튼", placeholder: "특장점 추가" },
  { key: "panelCategory", label: "분류 칸", placeholder: "분류" },
  { key: "panelAddCard", label: "카드 추가 버튼", placeholder: "카드 추가" },
  { key: "panelKicker", label: "상단 라벨 칸", placeholder: "상단 라벨" },
  { key: "panelRegion1", label: "시·도 칸", placeholder: "시·도" },
  { key: "panelRegion1Hint", label: "시·도 안내", placeholder: "현장명 위에 짧게 적습니다. 둘 다 비우면 공개 페이지에서 숨깁니다." },
  { key: "panelRegion2", label: "시·군·구 칸", placeholder: "시·군·구" },
  { key: "panelSiteHeadline", label: "현장명 칸", placeholder: "현장명 / 헤드라인" },
  { key: "panelSubheadline", label: "핵심 카피 칸", placeholder: "핵심 카피" },
  { key: "panelPriceLabel", label: "가격 이름 칸", placeholder: "가격 이름" },
  { key: "panelPriceType", label: "가격 유형 칸", placeholder: "가격 유형" },
  { key: "panelPrice", label: "가격 칸", placeholder: "가격" },
  { key: "panelPriceSub", label: "비교 금액 칸", placeholder: "비교 금액" },
  { key: "panelPriceNote", label: "가격 안내 칸", placeholder: "가격 안내" },
  { key: "panelBenefit", label: "혜택 문구 칸", placeholder: "혜택 문구" },
  { key: "panelBenefitBadge", label: "혜택 배지 칸", placeholder: "혜택 배지" },
  { key: "panelBenefitBadgeHint", label: "혜택 배지 안내", placeholder: "비우면 혜택으로 보입니다." },
  { key: "panelHeroBold", label: "히어로 굵게 안내", placeholder: "**이렇게** 감싸면 공개 페이지에서 굵게 보입니다." },
  { key: "panelTrust", label: "신뢰 문구 목록", placeholder: "신뢰 문구" },
  { key: "panelTrustText", label: "신뢰 문구 칸", placeholder: "문구" },
  { key: "panelPriceLine", label: "분양가 한 줄 칸", placeholder: "분양가 한 줄" },
  { key: "panelCta", label: "등록 버튼 칸", placeholder: "등록 버튼 문구" },
  { key: "panelDock", label: "좁은 화면 문의 칸", placeholder: "좁은 화면 문의 버튼" },
  { key: "panelDockHint", label: "좁은 화면 문의 안내", placeholder: "휴대폰에서 문의 창을 열기 전에 보이는 버튼입니다. 비우면 분양문의로 보입니다." },
  { key: "panelDockClose", label: "좁은 화면 닫기 칸", placeholder: "좁은 화면 닫기" },
  { key: "panelDockCloseHint", label: "좁은 화면 닫기 안내", placeholder: "문의 창을 연 뒤 닫는 글자입니다. 비우면 닫기로 보입니다." },
  { key: "panelPhoneBtn", label: "전화 버튼 칸", placeholder: "전화 버튼 문구" },
  { key: "panelHeaderPhone", label: "상단 전화 이름 칸", placeholder: "상단 전화 이름" },
  { key: "panelHeaderPhoneHint", label: "상단 전화 이름 안내", placeholder: "넓은 화면 상단의 대표 전화 위입니다. 비우면 문의번호로 보입니다." },
  { key: "panelConsultPhone", label: "상담 전화 칸", placeholder: "상담 전화" },
  { key: "panelEmptyMedia", label: "대표 이미지 빈칸", placeholder: "대표 이미지가 없을 때" },
  { key: "panelEmptyMediaHint", label: "대표 이미지 빈칸 안내", placeholder: "상품형에서는 공개 페이지에도 보입니다. 다른 형은 편집 중에만 보입니다. 비우면 대표 이미지를 올려 주세요로 보입니다." },
  { key: "panelImageAlt", label: "대표 이미지 이름 칸", placeholder: "대표 이미지 이름" },
  { key: "panelImageAltHint", label: "대표 이미지 이름 안내", placeholder: "사진을 읽어 주는 이름입니다. 비우면 이름을 붙이지 않습니다." },
  { key: "panelHeroImage", label: "히어로 이미지 칸", placeholder: "히어로 이미지" },
  { key: "panelImageUrl", label: "이미지 주소 칸", placeholder: "이미지 주소" },
  { key: "panelImageUrlHint", label: "이미지 주소 안내", placeholder: "파일 업로드가 안 되는 환경에서는 https 주소를 넣으세요." },
  { key: "panelMobileImage", label: "모바일 이미지 칸", placeholder: "모바일 이미지" },
  { key: "panelMobileImageHint", label: "모바일 이미지 안내", placeholder: "휴대폰과 모바일 미리보기에서 대표 이미지 대신 보입니다." },
  { key: "panelMobileImageUrl", label: "모바일 이미지 주소 칸", placeholder: "모바일 이미지 주소" },
  { key: "panelHeroVideo", label: "히어로 영상 칸", placeholder: "히어로 영상" },
  { key: "panelHeroVideoHint", label: "히어로 영상 안내", placeholder: "3.5MB를 넘는 영상은 주소로 넣으세요." },
  { key: "panelVideoUrl", label: "영상 주소 칸", placeholder: "영상 주소" },
  { key: "panelPoster", label: "포스터 칸", placeholder: "포스터 이미지" },
  { key: "panelPosterUrl", label: "포스터 주소 칸", placeholder: "포스터 주소" },
  { key: "panelAddImageUrl", label: "주소로 사진 추가", placeholder: "주소로 사진 추가" },
  { key: "panelEmptyPhoto", label: "갤러리 빈칸", placeholder: "사진이 없을 때" },
  { key: "panelEmptyPhotoHint", label: "갤러리 빈칸 안내", placeholder: "편집 중 빈 칸에 보입니다. 비우면 이미지로 보입니다." },
  { key: "panelRepresentative", label: "대표 표시 칸", placeholder: "대표 표시" },
  { key: "panelRepresentativeHint", label: "대표 표시 안내", placeholder: "첫 사진 위에 겹칩니다. 비우면 대표로 보입니다." },
  { key: "panelEmptyPlan", label: "평면 빈칸", placeholder: "평면이 없을 때" },
  { key: "panelEmptyPlanHint", label: "평면 빈칸 안내", placeholder: "편집 중 빈 칸에 보입니다. 비우면 평면 이미지로 보입니다." },
  { key: "panelPlanAlt", label: "평면 대체 문구 칸", placeholder: "사진 대체 문구" },
  { key: "panelPlanAltHint", label: "평면 대체 문구 안내", placeholder: "사진 설명이 없을 때 읽어 주는 이름입니다. 비우면 평면으로 둡니다." },
  { key: "panelTypeName", label: "타입명 칸", placeholder: "타입명" },
  { key: "panelPlanImage", label: "평면 이미지 칸", placeholder: "평면 이미지" },
  { key: "panelAddType", label: "타입 추가 버튼", placeholder: "타입 추가" },
  { key: "panelSeoTitle", label: "검색 제목 칸", placeholder: "검색 제목" },
  { key: "panelSeoDescription", label: "검색 설명 칸", placeholder: "검색 설명" },
  { key: "panelOgImage", label: "공유 이미지 칸", placeholder: "공유 이미지" },
  { key: "panelOgImageHint", label: "공유 이미지 안내", placeholder: "링크를 보낼 때 미리보기에 쓰는 이미지입니다." },
  { key: "panelOperator", label: "시스템 운영 칸", placeholder: "시스템 운영" },
  { key: "panelOperatorHint", label: "시스템 운영 안내", placeholder: "비우거나 운영법인미정이면 동의 창에 나오지 않습니다." },
  { key: "panelPolicyButton", label: "처리방침 버튼 칸", placeholder: "처리방침 버튼" },
  { key: "panelPolicyButtonHint", label: "처리방침 버튼 안내", placeholder: "비우면 개인정보 처리방침으로 보입니다." },
  { key: "panelPolicyUrl", label: "처리방침 주소 칸", placeholder: "처리방침 주소" },
  { key: "panelPolicyUrlHint", label: "처리방침 주소 안내", placeholder: "http로 시작하거나 /로 시작하는 경로입니다. 비우면 페이지 하단 링크를 숨깁니다." },
  { key: "panelController", label: "수집 주체 칸", placeholder: "수집 주체" },
  { key: "panelControllerHint", label: "수집 주체 안내", placeholder: "출시 전 확정값으로 바꾸세요" },
  { key: "panelAdvertiserCompany", label: "광고주 회사 칸", placeholder: "광고주 회사명" },
  { key: "panelAgencyCompany", label: "광고사명 칸", placeholder: "광고사명" },
  { key: "panelPurpose", label: "수집 목적 칸", placeholder: "수집 목적" },
  { key: "panelCollected", label: "수집 항목 칸", placeholder: "수집 항목" },
  { key: "panelCommaHint", label: "쉼표 안내", placeholder: "쉼표로 구분합니다." },
  { key: "panelRetention", label: "보유 기간 칸", placeholder: "보유 기간" },
  { key: "panelRefusal", label: "동의 거부 칸", placeholder: "동의하지 않을 때" },
  { key: "panelNoticeTitle", label: "동의 창 제목 칸", placeholder: "동의 창 제목" },
  { key: "panelNoticeTitleHint", label: "동의 창 제목 안내", placeholder: "내용 보기를 열면 맨 위에 보입니다. 비우면 개인정보 수집 및 이용으로 보입니다." },
  { key: "panelNoticeController", label: "수집 주체 제목 칸", placeholder: "수집 주체 제목" },
  { key: "panelNoticeControllerHint", label: "수집 주체 제목 안내", placeholder: "동의 창의 소제목입니다. 비우면 수집 주체로 보입니다." },
  { key: "panelNoticePurpose", label: "목적 제목 칸", placeholder: "목적 제목" },
  { key: "panelNoticePurposeHint", label: "목적 제목 안내", placeholder: "비우면 목적으로 보입니다." },
  { key: "panelNoticeFields", label: "항목 제목 칸", placeholder: "항목 제목" },
  { key: "panelNoticeFieldsHint", label: "항목 제목 안내", placeholder: "비우면 항목으로 보입니다." },
  { key: "panelNoticeRetention", label: "보유 기간 제목 칸", placeholder: "보유 기간 제목" },
  { key: "panelNoticeRetentionHint", label: "보유 기간 제목 안내", placeholder: "비우면 보유 기간으로 보입니다." },
  { key: "panelNoticeOperator", label: "시스템 운영 제목 칸", placeholder: "시스템 운영 제목" },
  { key: "panelNoticeOperatorHint", label: "시스템 운영 제목 안내", placeholder: "운영 법인을 적을 때만 보입니다. 비우면 시스템 운영으로 보입니다." },
  { key: "panelNoticeOperatorNote", label: "운영 안내 칸", placeholder: "운영 안내 문장" },
  { key: "panelNoticeOperatorNoteHint", label: "운영 안내 설명", placeholder: "운영 법인 이름 뒤에 붙습니다." },
  { key: "panelNoticeThird", label: "제3자 제목 칸", placeholder: "제3자 제목" },
  { key: "panelNoticeThirdHint", label: "제3자 제목 안내", placeholder: "제3자 제공을 켠 뒤 동의 창에 보입니다. 비우면 제3자 제공으로 보입니다." },
  { key: "panelNoticeRefusal", label: "동의 거부 제목 칸", placeholder: "동의 거부 제목" },
  { key: "panelNoticeRefusalHint", label: "동의 거부 제목 안내", placeholder: "비우면 동의 거부로 보입니다." },
  { key: "panelNoticeClose", label: "동의 창 닫기 칸", placeholder: "동의 창 닫기" },
  { key: "panelNoticeCloseHint", label: "동의 창 닫기 안내", placeholder: "비우면 닫기로 보입니다." },
  { key: "panelThirdPartyToggle", label: "제3자 동의 스위치", placeholder: "제3자 제공 동의 받기" },
  { key: "panelThirdRecipient", label: "제공받는 자 칸", placeholder: "제공받는 자" },
  { key: "panelThirdPurpose", label: "제공 목적 칸", placeholder: "제공 목적" },
  { key: "panelThirdFields", label: "제공 항목 칸", placeholder: "제공 항목" },
  { key: "panelThirdRetention", label: "제공 보유 기간 칸", placeholder: "제공 보유 기간" },
  { key: "panelFieldName", label: "항목 이름 칸", placeholder: "항목 이름" },
  { key: "panelHelper", label: "도움말 칸", placeholder: "도움말" },
  { key: "panelFirstOption", label: "첫 칸 문구 칸", placeholder: "첫 칸 문구" },
  { key: "panelFirstOptionHint", label: "첫 칸 문구 안내", placeholder: "목록을 열기 전 첫 칸입니다. 비우면 선택으로 보입니다." },
  { key: "panelPlaceholder", label: "빈칸 안내 칸", placeholder: "빈칸 안내" },
  { key: "panelPlaceholderHint", label: "빈칸 안내 설명", placeholder: "입력 전에 칸 안에 보이는 예시입니다." },
  { key: "panelFieldType", label: "입력 형식 칸", placeholder: "입력 형식" },
  { key: "panelOptions", label: "선택지 칸", placeholder: "선택지" },
  { key: "panelRequired", label: "필수 표시", placeholder: "필수" },
  { key: "panelVisible", label: "폼 표시", placeholder: "폼에 표시" },
  { key: "capCopyOkLabel", label: "복사 완료 칸", placeholder: "복사 완료" },
  { key: "capCopyOkLabelHint", label: "복사 완료 안내", placeholder: "주소나 페이지 주소를 복사한 뒤 버튼에 잠깐 보입니다. 비우면 주소를 복사했습니다로 보입니다." },
  { key: "capViewerPrev", label: "사진 이전 칸", placeholder: "사진 이전" },
  { key: "capViewerPrevHint", label: "사진 이전 안내", placeholder: "사진을 크게 본 뒤 이전 사진으로 가는 버튼입니다. 비우면 이전으로 보입니다." },
  { key: "capViewerNext", label: "사진 다음 칸", placeholder: "사진 다음" },
  { key: "capViewerNextHint", label: "사진 다음 안내", placeholder: "다음 사진으로 가는 버튼입니다. 비우면 다음으로 보입니다." },
  { key: "capEditUp", label: "위로 칸", placeholder: "위로" },
  { key: "capEditUpHint", label: "위로 안내", placeholder: "목록에서 항목을 위로 옮기는 글자입니다. 비우면 위로로 보입니다." },
  { key: "capEditDown", label: "아래로 칸", placeholder: "아래로" },
  { key: "capEditDownHint", label: "아래로 안내", placeholder: "비우면 아래로로 보입니다." },
  { key: "capEditRemove", label: "삭제 칸", placeholder: "삭제" },
  { key: "capEditRemoveHint", label: "삭제 안내", placeholder: "항목을 지우는 글자입니다. 비우면 삭제로 보입니다." },
  { key: "capEditBefore", label: "앞 칸", placeholder: "앞" },
  { key: "capEditBeforeHint", label: "앞 안내", placeholder: "같은 줄에서 앞으로 옮기는 글자입니다. 비우면 앞으로 보입니다." },
  { key: "capEditAfter", label: "뒤 칸", placeholder: "뒤" },
  { key: "capEditAfterHint", label: "뒤 안내", placeholder: "비우면 뒤로 보입니다." },
  { key: "capEditForward", label: "앞으로 칸", placeholder: "앞으로" },
  { key: "capEditForwardHint", label: "앞으로 안내", placeholder: "사진과 카드 순서를 앞으로 당기는 글자입니다. 비우면 앞으로로 보입니다." },
  { key: "capEditBack", label: "뒤로 칸", placeholder: "뒤로" },
  { key: "capEditBackHint", label: "뒤로 안내", placeholder: "비우면 뒤로로 보입니다." },
  { key: "capEditAddItem", label: "항목 추가 칸", placeholder: "항목 추가" },
  { key: "capEditAddItemHint", label: "항목 추가 안내", placeholder: "비우면 항목 추가로 보입니다." },
  { key: "capEditAddStat", label: "수치 추가 칸", placeholder: "수치 추가" },
  { key: "capEditAddStatHint", label: "수치 추가 안내", placeholder: "사업개요 숫자 칸입니다. 비우면 수치 추가로 보입니다." },
  { key: "capEditAddSchedule", label: "일정 추가 칸", placeholder: "일정 추가" },
  { key: "capEditAddScheduleHint", label: "일정 추가 안내", placeholder: "비우면 일정 추가로 보입니다." },
  { key: "capEditAddQuestion", label: "질문 추가 칸", placeholder: "질문 추가" },
  { key: "capEditAddQuestionHint", label: "질문 추가 안내", placeholder: "비우면 질문 추가로 보입니다." },
  { key: "capEditAddType", label: "타입 추가 칸", placeholder: "타입 추가" },
  { key: "capEditAddTypeHint", label: "타입 추가 안내", placeholder: "비우면 타입 추가로 보입니다." },
  { key: "capEditAddRoute", label: "교통 추가 칸", placeholder: "교통 추가" },
  { key: "capEditAddRouteHint", label: "교통 추가 안내", placeholder: "비우면 교통 추가로 보입니다." },
  { key: "capEditAddNotice", label: "고지 추가 칸", placeholder: "고지 추가" },
  { key: "capEditAddNoticeHint", label: "고지 추가 안내", placeholder: "비우면 고지 추가로 보입니다." },
  { key: "capEditAddPerk", label: "혜택 추가 칸", placeholder: "혜택 추가" },
  { key: "capEditAddPerkHint", label: "혜택 추가 안내", placeholder: "비우면 혜택 추가로 보입니다." },
  { key: "capMediaVideo", label: "영상 버튼 칸", placeholder: "영상 버튼" },
  { key: "capMediaVideoHint", label: "영상 버튼 안내", placeholder: "히어로에서 영상을 올리는 버튼입니다. 비우면 영상으로 보입니다." },
  { key: "capMediaImageView", label: "이미지로 보기 칸", placeholder: "이미지로 보기" },
  { key: "capMediaImageViewHint", label: "이미지로 보기 안내", placeholder: "영상을 끄고 사진으로 돌릴 때 보입니다. 비우면 이미지로 보기로 보입니다." },
  { key: "capMediaVideoView", label: "영상으로 보기 칸", placeholder: "영상으로 보기" },
  { key: "capMediaVideoViewHint", label: "영상으로 보기 안내", placeholder: "비우면 영상으로 보기로 보입니다." },
  { key: "capMediaVideoDelete", label: "영상 삭제 칸", placeholder: "영상 삭제" },
  { key: "capMediaVideoDeleteHint", label: "영상 삭제 안내", placeholder: "비우면 영상 삭제로 보입니다." },
  { key: "capMediaPoster", label: "포스터 칸", placeholder: "포스터" },
  { key: "capMediaPosterHint", label: "포스터 안내", placeholder: "영상 시작 전 이미지입니다. 비우면 포스터로 보입니다." },
  { key: "capMediaPosterDelete", label: "포스터 삭제 칸", placeholder: "포스터 삭제" },
  { key: "capMediaPosterDeleteHint", label: "포스터 삭제 안내", placeholder: "비우면 포스터 삭제로 보입니다." },
  { key: "capMediaVideoSize", label: "영상 용량 안내 칸", placeholder: "영상 용량 안내" },
  { key: "capMediaVideoSizeHint", label: "영상 용량 안내 설명", placeholder: "영상 버튼 아래에 보입니다." },
  { key: "capMediaImageDelete", label: "이미지 삭제 칸", placeholder: "이미지 삭제" },
  { key: "capMediaImageDeleteHint", label: "이미지 삭제 안내", placeholder: "대표 이미지를 지우는 버튼입니다. 비우면 이미지 삭제로 보입니다." },
  { key: "capMediaImageChange", label: "이미지 변경 칸", placeholder: "이미지 변경" },
  { key: "capMediaImageChangeHint", label: "이미지 변경 안내", placeholder: "비우면 이미지 변경으로 보입니다." },
  { key: "capMediaMobile", label: "모바일 이미지 칸", placeholder: "모바일 이미지" },
  { key: "capMediaMobileHint", label: "모바일 이미지 안내", placeholder: "비우면 모바일 이미지로 보입니다." },
  { key: "capMediaMobileDelete", label: "모바일 이미지 삭제 칸", placeholder: "모바일 이미지 삭제" },
  { key: "capMediaMobileDeleteHint", label: "모바일 이미지 삭제 안내", placeholder: "비우면 모바일 이미지 삭제로 보입니다." },
  { key: "capMediaPhotoDelete", label: "사진 삭제 칸", placeholder: "사진 삭제" },
  { key: "capMediaPhotoDeleteHint", label: "사진 삭제 안내", placeholder: "카드와 특장점 사진을 지울 때 보입니다. 비우면 사진 삭제로 보입니다." },
  { key: "capMediaReplace", label: "이 사진 바꾸기 칸", placeholder: "이 사진 바꾸기" },
  { key: "capMediaReplaceHint", label: "이 사진 바꾸기 안내", placeholder: "비우면 이 사진 바꾸기로 보입니다." },
  { key: "capMediaAddMany", label: "이미지 여러 장 추가 칸", placeholder: "이미지 여러 장 추가" },
  { key: "capMediaAddManyHint", label: "이미지 여러 장 추가 안내", placeholder: "비우면 이미지 여러 장 추가로 보입니다." },
  { key: "capMediaCurrentDelete", label: "보고 있는 사진 삭제 칸", placeholder: "보고 있는 사진 삭제" },
  { key: "capMediaCurrentDeleteHint", label: "보고 있는 사진 삭제 안내", placeholder: "평면 사진입니다. 비우면 보고 있는 사진 삭제로 보입니다." },
  { key: "capMediaMapDelete", label: "약도 삭제 칸", placeholder: "약도 삭제" },
  { key: "capMediaMapDeleteHint", label: "약도 삭제 안내", placeholder: "비우면 약도 삭제로 보입니다." },
  { key: "capMediaBannerDelete", label: "배너 삭제 칸", placeholder: "배너 삭제" },
  { key: "capMediaBannerDeleteHint", label: "배너 삭제 안내", placeholder: "비우면 배너 삭제로 보입니다." },
  { key: "capMediaLogoDelete", label: "로고 삭제 칸", placeholder: "로고 삭제" },
  { key: "capMediaLogoDeleteHint", label: "로고 삭제 안내", placeholder: "비우면 로고 삭제로 보입니다." },
  { key: "capMediaPlanAdd", label: "평면 이미지 추가 칸", placeholder: "평면 이미지 추가" },
  { key: "capMediaPlanAddHint", label: "평면 이미지 추가 안내", placeholder: "비우면 평면 이미지 추가로 보입니다." },
  { key: "capMediaPlanReplace", label: "이 평면 바꾸기 칸", placeholder: "이 평면 바꾸기" },
  { key: "capMediaPlanReplaceHint", label: "이 평면 바꾸기 안내", placeholder: "비우면 이 평면 바꾸기로 보입니다." },
  { key: "capMediaMapFile", label: "약도 올리기 칸", placeholder: "약도 올리기" },
  { key: "capMediaMapFileHint", label: "약도 올리기 안내", placeholder: "편집 중 약도를 고르는 글자입니다. 비우면 약도 이미지로 보입니다." },
  { key: "capMediaMapField", label: "지도 링크 이름 칸", placeholder: "지도 링크 이름" },
  { key: "capMediaMapFieldHint", label: "지도 링크 이름 안내", placeholder: "약도 옆 입력 칸 이름입니다. 비우면 지도 링크로 보입니다." },
  { key: "capHintHidden", label: "숨긴 섹션 안내 칸", placeholder: "숨긴 섹션 안내" },
  { key: "capHintHiddenHint", label: "숨긴 섹션 안내 안내", placeholder: "편집 화면에서 숨긴 섹션 위에 보입니다." },
  { key: "capHintMapEmbed", label: "약도 안내 칸", placeholder: "약도 안내" },
  { key: "capHintMapEmbedHint", label: "약도 안내 안내", placeholder: "편집 중 약도 위에 보이는 설명입니다." },
  { key: "capHintMapLinked", label: "지도 연결 안내 칸", placeholder: "지도 연결 안내" },
  { key: "capHintMapLinkedHint", label: "지도 연결 안내 안내", placeholder: "지도 링크가 있을 때 편집 중에 보입니다." },
  { key: "capHintHttp", label: "주소 형식 안내 칸", placeholder: "주소 형식 안내" },
  { key: "capHintHttpHint", label: "주소 형식 안내 안내", placeholder: "http가 아닌 링크를 넣으면 보입니다." },
  { key: "capHintExternalOn", label: "외부 등록 안내 칸", placeholder: "외부 등록 안내" },
  { key: "capHintExternalOnHint", label: "외부 등록 안내 안내", placeholder: "외부 관심고객 주소가 있을 때 편집 중에 보입니다." },
  { key: "capHintExternalOff", label: "페이지 등록 안내 칸", placeholder: "페이지 등록 안내" },
  { key: "capHintExternalOffHint", label: "페이지 등록 안내 안내", placeholder: "외부 주소가 없을 때 편집 중에 보입니다." },
  { key: "capHintBold", label: "굵게 안내 칸", placeholder: "굵게 안내" },
  { key: "capHintBoldHint", label: "굵게 안내 안내", placeholder: "본문을 고칠 때 아래에 보입니다." },
  { key: "capHintPremium", label: "특장점 안내 칸", placeholder: "특장점 안내" },
  { key: "capHintPremiumHint", label: "특장점 안내 안내", placeholder: "특장점 섹션을 편집할 때 보입니다." },
  { key: "capHintPreviewDone", label: "완료 화면 보기 칸", placeholder: "완료 화면 보기" },
  { key: "capHintPreviewDoneHint", label: "완료 화면 보기 안내", placeholder: "편집 중 등록 폼 아래 버튼입니다. 비우면 완료 화면 보기로 보입니다." },
  { key: "capMediaLogoHint", label: "로고 안내 칸", placeholder: "로고 안내" },
  { key: "capMediaLogoHintHint", label: "로고 안내 안내", placeholder: "로고가 없을 때 보입니다. 비우면 50×50 안내로 보입니다." },
  { key: "capMediaLogoSize", label: "로고 크기 안내 칸", placeholder: "로고 크기 안내" },
  { key: "capMediaLogoSizeHint", label: "로고 크기 안내 안내", placeholder: "50×50이 아닌 이미지를 올리면 보입니다." },
  { key: "capMediaLogoFail", label: "로고 올리기 실패 칸", placeholder: "로고 올리기 실패" },
  { key: "capMediaLogoFailHint", label: "로고 올리기 실패 안내", placeholder: "로고 업로드가 실패하면 보입니다." },
  { key: "capMediaImageReadFail", label: "이미지 읽기 실패 칸", placeholder: "이미지 읽기 실패" },
  { key: "capMediaImageReadFailHint", label: "이미지 읽기 실패 안내", placeholder: "이미지 파일을 열지 못하면 보입니다." },
  { key: "capMediaVideoFail", label: "영상 올리기 실패 칸", placeholder: "영상 올리기 실패" },
  { key: "capMediaVideoFailHint", label: "영상 올리기 실패 안내", placeholder: "영상 업로드가 실패하면 보입니다." },
  { key: "capMediaPosterFail", label: "포스터 올리기 실패 칸", placeholder: "포스터 올리기 실패" },
  { key: "capMediaPosterFailHint", label: "포스터 올리기 실패 안내", placeholder: "포스터 업로드가 실패하면 보입니다." },
  { key: "capAriaLogoChange", label: "로고 바꾸기 이름 칸", placeholder: "로고 바꾸기 이름" },
  { key: "capAriaLogoChangeHint", label: "로고 바꾸기 이름 안내", placeholder: "로고 이미지에 마우스를 올리면 읽히는 이름입니다." },
  { key: "capAriaSectionNav", label: "섹션 바로가기 이름 칸", placeholder: "섹션 바로가기 이름" },
  { key: "capAriaSectionNavHint", label: "섹션 바로가기 이름 안내", placeholder: "옆의 점 목록을 읽는 이름입니다." },
  { key: "capAriaIconChange", label: "아이콘 바꾸기 이름 칸", placeholder: "아이콘 바꾸기 이름" },
  { key: "capAriaIconChangeHint", label: "아이콘 바꾸기 이름 안내", placeholder: "입지와 특장점 아이콘 버튼을 읽는 이름입니다." },
  { key: "capAriaDockClose", label: "문의 닫기 이름 칸", placeholder: "문의 닫기 이름" },
  { key: "capAriaDockCloseHint", label: "문의 닫기 이름 안내", placeholder: "하단 문의를 닫는 배경을 읽는 이름입니다." },
  { key: "capPublicUnpublishedTitle", label: "비공개 제목 칸", placeholder: "비공개 제목" },
  { key: "capPublicUnpublishedTitleHint", label: "비공개 제목 안내", placeholder: "아직 발행되지 않은 주소에서 보입니다. 비우면 현재 공개되지 않은 홈페이지입니다로 보입니다." },
  { key: "capPublicUnpublishedBody", label: "비공개 설명 칸", placeholder: "비공개 설명" },
  { key: "capPublicUnpublishedBodyHint", label: "비공개 설명 안내", placeholder: "비우면 운영이 종료되었거나 아직 발행되지 않았습니다로 보입니다." },
  { key: "capEditAddTag", label: "문구 추가 칸", placeholder: "문구 추가" },
  { key: "capEditAddTagHint", label: "문구 추가 안내", placeholder: "비우면 문구 추가로 보입니다." },
  { key: "capViewerClose", label: "사진 닫기 칸", placeholder: "사진 닫기" },
  { key: "capViewerCloseHint", label: "사진 닫기 안내", placeholder: "크게 본 사진을 닫는 버튼입니다. 비우면 닫기로 보입니다." },
  { key: "capCopyFailLabel", label: "복사 실패 칸", placeholder: "복사 실패" },
  { key: "capCopyFailLabelHint", label: "복사 실패 안내", placeholder: "복사에 실패하면 버튼에 잠깐 보입니다. 비우면 복사하지 못했습니다로 보입니다." },
  { key: "capShareLabel", label: "공유 버튼 칸", placeholder: "공유 버튼" },
  { key: "capShareLabelHint", label: "공유 버튼 안내", placeholder: "상단의 공유 버튼입니다. 비우면 공유로 보입니다." },
  { key: "capNavSubtitle", label: "상단 보조 문구 칸", placeholder: "상단 보조 문구" },
  { key: "capNavSubtitleHint", label: "상단 보조 문구 안내", placeholder: "현장명 아래와 페이지 하단에 같이 보입니다." },
  { key: "capCtaLabel", label: "공통 등록 버튼 칸", placeholder: "공통 등록 버튼" },
  { key: "capCtaLabelHint", label: "공통 등록 버튼 안내", placeholder: "히어로에 버튼 문구가 없을 때 쓰는 공통 문구입니다. 비우면 관심고객 등록으로 보입니다." },
  { key: "shellSectionHero", label: "섹션 히어로", placeholder: "히어로" },
  { key: "shellSectionOverview", label: "섹션 사업개요", placeholder: "사업개요" },
  { key: "shellSectionLocation", label: "섹션 입지", placeholder: "입지" },
  { key: "shellSectionPremium", label: "섹션 특장점", placeholder: "특장점" },
  { key: "shellSectionGallery", label: "섹션 갤러리", placeholder: "갤러리" },
  { key: "shellSectionFloorplan", label: "섹션 평면", placeholder: "평면" },
  { key: "shellSectionDirections", label: "섹션 찾아오는 길", placeholder: "찾아오는 길" },
  { key: "shellSectionLead", label: "섹션 관심고객", placeholder: "관심고객 등록" },
  { key: "shellSectionLegal", label: "섹션 법적 고지", placeholder: "법적 고지" },
  { key: "shellSectionVisible", label: "섹션 노출 이름", placeholder: "{name} 노출", hint: "{name}은 섹션 제목입니다." },
  { key: "shellRecipientsEmptyTitle", label: "수신자 없음 제목", placeholder: "수신자가 없습니다" },
  { key: "shellRecipientsEmpty", label: "수신자 없음", placeholder: "등록된 수신자가 없습니다." },
  { key: "badgeDraft", label: "상태 미발행", placeholder: "미발행" },
  { key: "badgePublished", label: "상태 공개 중", placeholder: "공개 중" },
  { key: "badgePaused", label: "상태 비공개", placeholder: "비공개" },
  { key: "badgeExpired", label: "상태 만료", placeholder: "만료됨" },
  { key: "badgePending", label: "상태 삭제 대기", placeholder: "삭제 대기" },
  { key: "badgeActive", label: "상태 활성", placeholder: "활성" },
  { key: "badgeSuspended", label: "상태 정지", placeholder: "정지" },
  { key: "badgeInvited", label: "상태 초대됨", placeholder: "초대됨" },
  { key: "badgeSent", label: "상태 발송 성공", placeholder: "발송 성공" },
  { key: "badgeFailed", label: "상태 실패", placeholder: "실패" },
  { key: "badgeQueued", label: "상태 대기", placeholder: "대기" },
  { key: "shellBusy", label: "처리 중", placeholder: "처리 중..." },
  { key: "shellCopied", label: "복사됨", placeholder: "복사됨" },
  { key: "shellAnalyticsEmpty", label: "통계 빈 기간", placeholder: "선택한 기간의 방문 데이터가 아직 없습니다." },
  { key: "shellTrendViews", label: "차트 조회", placeholder: "조회" },
  { key: "shellTrendLeads", label: "차트 관심고객", placeholder: "관심고객" },
  { key: "shellChannelDirect", label: "직접 유입", placeholder: "direct" },
  { key: "shellDeviceDesktop", label: "기기 데스크톱", placeholder: "desktop" },
  { key: "shellDeviceMobile", label: "기기 휴대폰", placeholder: "mobile" },
  { key: "shellDeviceTablet", label: "기기 태블릿", placeholder: "tablet" },
  { key: "shellDeviceUnknown", label: "기기 미상", placeholder: "unknown" },
  { key: "shellConsentCollection", label: "동의 수집", placeholder: "수집·이용" },
  { key: "shellConsentThird", label: "동의 제3자", placeholder: "제3자 제공" },
  { key: "shellEventLead", label: "알림 관심고객", placeholder: "관심고객 등록" },
  { key: "shellEventExpiry", label: "알림 만료", placeholder: "만료 안내" },
  { key: "shellLeadConsentEmpty", label: "동의 없음", placeholder: "동의 기록이 없습니다." },
  { key: "shellLeadAlertsEmpty", label: "알림 없음", placeholder: "알림 기록이 없습니다." },
  { key: "shellLeadNotesEmpty", label: "메모 없음", placeholder: "아직 메모가 없습니다." },
  { key: "shellPopupBannerPh", label: "팝업 배너 예시", placeholder: "방문 고객 안내" },
  { key: "shellPopupTitlePh", label: "팝업 제목 예시", placeholder: "관심고객으로 등록해 주세요" },
  { key: "shellPopupBodyPh", label: "팝업 본문 예시", placeholder: "상담 안내를 받으려면 이름과 연락처를 남겨 주세요." },
  { key: "shellPopupPerksPh", label: "팝업 혜택 예시", placeholder: "한 줄에 하나씩\n청약 일정 안내" },
  { key: "shellPopupDisclaimerPh", label: "팝업 안내 예시", placeholder: "관심고객 등록은 청약 접수가 아닙니다." },
  { key: "shellPopupCtaPh", label: "팝업 버튼 예시", placeholder: "관심고객 등록" },
  { key: "shellPopupPhonePh", label: "팝업 전화 예시", placeholder: "비우면 대표 전화" },
  { key: "shellPopupPhonePrefixPh", label: "팝업 전화 앞 예시", placeholder: "바로 상담" },
  { key: "shellPopupClosePh", label: "팝업 닫기 예시", placeholder: "닫기" },
  { key: "shellPopupEmptyPh", label: "팝업 배너 빈칸 예시", placeholder: "배너 이미지" },
  { key: "shellPopupHideTodayPh", label: "팝업 오늘 보지 않기 예시", placeholder: "오늘 하루 보지 않기" },
  { key: "formNamePh", label: "이름 빈칸 예시", placeholder: "홍길동" },
  { key: "formPhonePh", label: "전화 빈칸 예시", placeholder: "010-0000-0000" },
  { key: "formTextareaPh", label: "문의 빈칸 예시", placeholder: "궁금하신 점을 남겨 주세요" },
  { key: "formSelectPh", label: "선택 빈칸 예시", placeholder: "선택" },
  { key: "formPerkPh", label: "혜택 추가 예시", placeholder: "혜택을 입력하세요" },
  { key: "formFieldNamePh", label: "항목 이름 예시", placeholder: "항목 이름" },
  { key: "formHelperPh", label: "도움말 예시", placeholder: "도움말" },
  { key: "formEyebrowPh", label: "등록 작은 제목 예시", placeholder: "작은 제목" },
  { key: "formHeadingPh", label: "등록 제목 예시", placeholder: "제목" },
  { key: "formBodyPh", label: "등록 본문 예시", placeholder: "본문" },
  { key: "formPerkTitlePh", label: "혜택 제목 예시", placeholder: "혜택 제목" },
  { key: "formPerkBodyPh", label: "혜택 설명 예시", placeholder: "혜택 설명" },
  { key: "formPerkItemPh", label: "혜택 한 줄 예시", placeholder: "혜택" },
  { key: "formSuccessTitlePh", label: "완료 제목 예시", placeholder: "등록이 완료되었습니다" },
  { key: "formSuccessBodyPh", label: "완료 안내 예시", placeholder: "완료 안내" },
  { key: "formPreviewNotePh", label: "미리보기 안내 예시", placeholder: "미리보기에서는 실제 등록이 저장되지 않습니다." },
  { key: "formAgainPh", label: "추가 등록 예시", placeholder: "추가 등록" },
  { key: "formIntroPh", label: "등록 안내 예시", placeholder: "안내 문구" },
  { key: "formIntroSeed", label: "등록 안내 시드", placeholder: "상담을 원하시면 정보를 남겨 주세요." },
  { key: "formConsentPh", label: "수집 동의 예시", placeholder: "[필수] 개인정보 수집 및 이용에 동의합니다." },
  { key: "formThirdPh", label: "제3자 동의 예시", placeholder: "[필수] 개인정보 제3자 제공에 동의합니다." },
  { key: "formPrivacyLinkPh", label: "내용 보기 예시", placeholder: "내용 보기" },
  { key: "formControllerWarnPh", label: "처리주체 경고 예시", placeholder: "개인정보 처리 주체가 확정되기 전에는 실제 접수가 저장되지 않을 수 있습니다." },
  { key: "formSubmittingPh", label: "등록 중 예시", placeholder: "등록 중" },
  { key: "formPhoneCaptionPh", label: "문의번호 예시", placeholder: "문의번호" },
  { key: "formPhoneEmptyPh", label: "전화 비움 예시", placeholder: "비우면 대표 전화" },
  { key: "formUnitEmptyPh", label: "타입 없음 예시", placeholder: "평면안내에서 타입 이름을 입력하면 여기에 나타납니다." },
  { key: "formUnitHelperPh", label: "타입 도움말 예시", placeholder: "여러 타입을 고를 수 있습니다. 이름은 평면안내와 맞춰집니다." },
  { key: "seedFactLabel", label: "항목 추가 이름", placeholder: "항목" },
  { key: "seedFactValue", label: "항목 추가 내용", placeholder: "내용" },
  { key: "seedScheduleTitle", label: "일정 추가 제목", placeholder: "일정" },
  { key: "seedScheduleDate", label: "일정 추가 날짜", placeholder: "날짜를 입력하세요" },
  { key: "seedCardTitle", label: "카드 추가 제목", placeholder: "항목" },
  { key: "seedCardBody", label: "카드 추가 본문", placeholder: "내용을 입력하세요." },
  { key: "seedPremiumTitle", label: "특장점 추가 제목", placeholder: "특장점" },
  { key: "seedPremiumBody", label: "특장점 추가 본문", placeholder: "내용을 입력하세요." },
  { key: "seedStatValue", label: "수치 추가 값", placeholder: "입력" },
  { key: "seedStatLabel", label: "수치 추가 이름", placeholder: "항목" },
  { key: "seedTag", label: "태그 추가", placeholder: "문구" },
  { key: "phTitle", label: "제목 빈칸", placeholder: "제목" },
  { key: "phBody", label: "설명 빈칸", placeholder: "설명" },
  { key: "phContent", label: "내용 빈칸", placeholder: "내용" },
  { key: "phItem", label: "항목 빈칸", placeholder: "항목" },
  { key: "phSchedule", label: "일정 빈칸", placeholder: "일정" },
  { key: "phDate", label: "날짜 빈칸", placeholder: "날짜" },
  { key: "phSite", label: "현장명 빈칸", placeholder: "현장명" },
  { key: "phNavSubtitle", label: "상단 보조 빈칸", placeholder: "상단 보조 문구" },
  { key: "phPhoto", label: "사진 라벨", placeholder: "사진" },
  { key: "phDisclaimer", label: "하단 안내 빈칸", placeholder: "하단 안내" },
  { key: "phScheduleTitle", label: "분양 일정 제목", placeholder: "분양 일정" },
  { key: "phScheduleNote", label: "일정 보충 안내", placeholder: "보충 안내" },
  { key: "phPhotoCaption", label: "사진 설명 빈칸", placeholder: "사진 설명" },
  { key: "phEmphasisTitle", label: "강조 제목 빈칸", placeholder: "강조 제목" },
  { key: "phEmphasisBody", label: "강조 설명 빈칸", placeholder: "강조 설명" },
  { key: "phEyebrow", label: "작은 제목 빈칸", placeholder: "작은 제목" },
  { key: "phPriceLabel", label: "가격 이름 빈칸", placeholder: "가격 이름" },
  { key: "phPriceType", label: "가격 유형 빈칸", placeholder: "유형" },
  { key: "phPriceMain", label: "금액 빈칸", placeholder: "금액" },
  { key: "phPriceSub", label: "비교 금액 빈칸", placeholder: "비교 금액" },
  { key: "phPriceNote", label: "가격 안내 빈칸", placeholder: "가격 안내" },
  { key: "phPriceLine", label: "분양가 한 줄 빈칸", placeholder: "분양가 한 줄" },
  { key: "phBenefit", label: "혜택 문구 빈칸", placeholder: "혜택 문구" },
  { key: "phShare", label: "공유 빈칸", placeholder: "공유" },
  { key: "phPhoneCaption", label: "문의번호 빈칸", placeholder: "문의번호" },
  { key: "phPhoneAsk", label: "전화 문의 빈칸", placeholder: "전화 문의" },
  { key: "phPhoneMain", label: "대표 전화 빈칸", placeholder: "대표 전화" },
  { key: "phRegion1", label: "시·도 빈칸", placeholder: "시·도" },
  { key: "phRegion2", label: "시·군·구 빈칸", placeholder: "시·군·구" },
  { key: "phFactsMore", label: "사업개요 전체", placeholder: "사업개요 전체" },
  { key: "phScheduleMore", label: "일정 전체", placeholder: "일정 전체" },
  { key: "phEmptyMedia", label: "대표 이미지 안내", placeholder: "대표 이미지를 올려 주세요" },
  { key: "phKicker", label: "한 줄 소개 빈칸", placeholder: "한 줄 소개" },
  { key: "phSubheadline", label: "히어로 안내 빈칸", placeholder: "안내 문구" },
  { key: "phCta", label: "등록 버튼 빈칸", placeholder: "관심고객 등록" },
  { key: "phDock", label: "하단 문의 버튼", placeholder: "분양문의" },
  { key: "phStatCat", label: "수치 분류 빈칸", placeholder: "분류" },
  { key: "phStatValue", label: "수치 숫자 빈칸", placeholder: "숫자" },
  { key: "phStatName", label: "수치 이름 빈칸", placeholder: "이름" },
  { key: "phExpandAll", label: "모두 펼치기", placeholder: "모두 펼치기" },
  { key: "phCollapseAll", label: "모두 접기", placeholder: "모두 접기" },
  { key: "phBadgeMain", label: "대표 배지", placeholder: "대표" },
  { key: "phImageEmpty", label: "이미지 빈칸", placeholder: "이미지" },
  { key: "phImageAlt", label: "이미지 설명 빈칸", placeholder: "이미지 설명" },
  { key: "phPlanEmpty", label: "평면 빈칸", placeholder: "평면 이미지" },
  { key: "phUnitType", label: "타입 빈칸", placeholder: "타입" },
  { key: "phMapEmpty", label: "약도 빈칸", placeholder: "약도 이미지" },
  { key: "phPlace", label: "장소 빈칸", placeholder: "장소" },
  { key: "phDirections", label: "오시는 길 빈칸", placeholder: "오시는 길" },
  { key: "phAddress", label: "주소 빈칸", placeholder: "주소" },
  { key: "phHours", label: "운영 시간 빈칸", placeholder: "운영 시간" },
  { key: "phParking", label: "주차 안내 빈칸", placeholder: "주차 안내" },
  { key: "phCopyAddress", label: "주소 복사", placeholder: "주소 복사" },
  { key: "phGuide", label: "찾아오는 방법", placeholder: "찾아오는 방법" },
  { key: "phTransit", label: "교통 수단 빈칸", placeholder: "지하철" },
  { key: "phTransitDetail", label: "교통 안내 빈칸", placeholder: "역, 출구, 노선" },
  { key: "phMapLink", label: "지도 링크", placeholder: "지도에서 보기" },
  { key: "phLegalTitle", label: "고지 제목 빈칸", placeholder: "고지 제목" },
  { key: "phLegalBody", label: "고지 문구 빈칸", placeholder: "고지 문구" },
  { key: "phDeveloper", label: "시행사 빈칸", placeholder: "시행사" },
  { key: "phBuilder", label: "시공사 빈칸", placeholder: "시공사" },
  { key: "phAdvertiser", label: "광고주 빈칸", placeholder: "광고주" },
  { key: "phAgency", label: "광고사 빈칸", placeholder: "광고사" },
  { key: "phLegalNotice", label: "고지 문장 빈칸", placeholder: "고지 문장" },
  { key: "phFooterNote", label: "하단 안내 빈칸", placeholder: "페이지 하단 안내" },
  { key: "phCopyPage", label: "페이지 주소 복사", placeholder: "페이지 주소 복사" },
  { key: "seedRouteLabel", label: "교통 추가 수단", placeholder: "교통" },
  { key: "seedRouteDetail", label: "교통 추가 안내", placeholder: "안내를 입력하세요." },
  { key: "phMenu", label: "메뉴 버튼", placeholder: "메뉴" },
  { key: "phOfficialHome", label: "분양 홈페이지", placeholder: "분양 홈페이지" },
  { key: "phOfficialNotice", label: "모집공고", placeholder: "입주자 모집공고" },
  { key: "phHttps", label: "주소 빈칸", placeholder: "https://" },
  { key: "seedTypeName", label: "타입 추가 이름", placeholder: "타입" },
  { key: "seedTypeSummary", label: "타입 추가 설명", placeholder: "설명을 입력하세요." },
  { key: "phTypeFallback", label: "타입 번호 빈칸", placeholder: "타입 {n}", hint: "{n} 자리에 번호가 들어갑니다." },
  { key: "phPlanAlt", label: "평면 대체 문구", placeholder: "평면" },
  { key: "phMapAlt", label: "약도 대체 문구", placeholder: "약도" },
  { key: "phRowAddress", label: "행 주소", placeholder: "주소" },
  { key: "phRowPhone", label: "행 전화", placeholder: "전화" },
  { key: "phRowHours", label: "행 운영", placeholder: "운영" },
  { key: "phRowParking", label: "행 주차", placeholder: "주차" },
  { key: "phPrefixDeveloper", label: "접두 시행", placeholder: "시행" },
  { key: "phPrefixBuilder", label: "접두 시공", placeholder: "시공" },
  { key: "phPrefixAdvertiser", label: "접두 광고주", placeholder: "광고주" },
  { key: "phPrefixAgency", label: "접두 광고사", placeholder: "광고사" },
  { key: "phPrefixContact", label: "접두 문의", placeholder: "문의" },
  { key: "seedLegalNotice", label: "고지 추가 예시", placeholder: "고지 문장을 입력하세요." },
  { key: "seedLegalHeading", label: "법적 고지 기본 제목", placeholder: "사업 주체 및 법적 고지" },
  { key: "phPrivacyPolicy", label: "개인정보 처리방침", placeholder: "개인정보 처리방침" },
  { key: "phPrivacyUrl", label: "처리방침 주소 빈칸", placeholder: "https:// 또는 /privacy" },
  { key: "formTextPh", label: "일반 빈칸 예시", placeholder: "예시" },
  { key: "formExtraLabel", label: "추가 항목 이름", placeholder: "추가 항목" },
  { key: "publishErrName", label: "발행 오류 프로젝트명", placeholder: "프로젝트명이 필요합니다." },
  { key: "publishErrSlug", label: "발행 오류 공개 URL", placeholder: "공개 URL이 필요합니다." },
  { key: "publishErrHero", label: "발행 오류 히어로", placeholder: "히어로 섹션이 필요합니다." },
  { key: "publishErrForm", label: "발행 오류 등록 섹션", placeholder: "관심고객 등록 섹션이 필요합니다." },
  { key: "publishErrLegal", label: "발행 오류 법적 고지", placeholder: "법적 고지 섹션을 숨길 수 없습니다." },
  { key: "publishErrController", label: "발행 오류 수집 주체", placeholder: "개인정보 수집 주체를 입력해 주세요." },
  { key: "publishErrNameField", label: "발행 오류 이름 필드", placeholder: "이름 필수 필드가 필요합니다." },
  { key: "publishErrPhoneField", label: "발행 오류 연락처 필드", placeholder: "연락처 필수 필드가 필요합니다." },
  { key: "publishErrControllerProd", label: "발행 오류 처리 주체", placeholder: "실제 개인정보 처리 주체를 설정한 뒤에 발행할 수 있습니다." },
  { key: "publishChangeFirst", label: "최초 발행 메모", placeholder: "최초 발행" },
  { key: "publishChangeAgain", label: "재발행 메모", placeholder: "재발행" },
  { key: "noticeTitle", label: "안내 제목", placeholder: "개인정보 수집 및 이용" },
  { key: "noticeController", label: "안내 수집 주체", placeholder: "수집 주체" },
  { key: "noticePurpose", label: "안내 목적", placeholder: "목적" },
  { key: "noticeFields", label: "안내 항목", placeholder: "항목" },
  { key: "noticeRetention", label: "안내 보유 기간", placeholder: "보유 기간" },
  { key: "noticeOperator", label: "안내 시스템 운영", placeholder: "시스템 운영" },
  { key: "noticeOperatorNote", label: "안내 운영 보충", placeholder: "상담과 개인정보 이용의 주체는 위에 적은 수집 주체입니다." },
  { key: "noticeThird", label: "안내 제3자", placeholder: "제3자 제공" },
  { key: "noticeThirdRecipient", label: "안내 제공받는 자", placeholder: "제공받는 자" },
  { key: "noticePeriod", label: "안내 기간", placeholder: "기간" },
  { key: "noticeRefusal", label: "안내 동의 거부", placeholder: "동의 거부" },
  { key: "noticePurposeCollect", label: "동의서 수집 목적", placeholder: "수집 목적" },
  { key: "noticeFieldsCollect", label: "동의서 수집 항목", placeholder: "수집 항목" },
  { key: "noticeRefusalImpact", label: "동의서 거부 영향", placeholder: "거부 시 영향" },
  { key: "noticePurposeUse", label: "동의서 이용 목적", placeholder: "이용 목적" },
  { key: "noticeFieldsProvide", label: "동의서 제공 항목", placeholder: "제공 항목" },
  { key: "formHeadingDefault", label: "등록 기본 제목", placeholder: "관심고객등록" },
  { key: "phPlaceSample", label: "장소명 예시", placeholder: "모델하우스" },
  { key: "formNameErrorPh", label: "이름 누락 안내", placeholder: "이름을 입력해 주세요." },
  { key: "formPhoneErrorPh", label: "전화 형식 안내", placeholder: "올바른 휴대전화 번호를 입력해 주세요." },
  { key: "formCollectionErrorPh", label: "수집 동의 누락", placeholder: "개인정보 수집 및 이용에 동의해 주세요." },
  { key: "formThirdErrorPh", label: "제3자 동의 누락", placeholder: "개인정보 제3자 제공에 동의해 주세요." },
  { key: "formSubmitErrorPh", label: "등록 실패 안내", placeholder: "등록에 실패했습니다." },
  { key: "formSuccessDonePh", label: "등록 완료 메시지", placeholder: "관심고객 등록이 완료되었습니다." },
  { key: "phRegion1Sample", label: "시·도 예시", placeholder: "서울" },
  { key: "phRegion2Sample", label: "시·군·구 예시", placeholder: "강남구" },
  { key: "phPriceLabelSample", label: "분양가 예시", placeholder: "분양가" },
  { key: "eyebrowOverview", label: "눈썹 사업 정보", placeholder: "사업 정보" },
  { key: "eyebrowLocation", label: "눈썹 입지", placeholder: "입지" },
  { key: "eyebrowPremium", label: "눈썹 특장점", placeholder: "특장점" },
  { key: "eyebrowGallery", label: "눈썹 갤러리", placeholder: "갤러리" },
  { key: "eyebrowFloorplan", label: "눈썹 평면", placeholder: "평면" },
  { key: "eyebrowLeadForm", label: "눈썹 등록", placeholder: "등록" },
  { key: "eyebrowDirections", label: "눈썹 오시는 길", placeholder: "찾아오는 길" },
  { key: "seedMatrixTransit", label: "입지 교통 안내", placeholder: "주요 교통을 입력하세요." },
  { key: "seedMatrixLife", label: "입지 생활 안내", placeholder: "생활 인프라를 입력하세요." },
  { key: "seedMatrixSchool", label: "입지 교육 안내", placeholder: "교육 환경을 입력하세요." },
  { key: "seedMatrixNature", label: "입지 녹지 안내", placeholder: "공원과 녹지를 입력하세요." },
  { key: "floorSpecExclusive", label: "평면 전용", placeholder: "전용" },
  { key: "floorSpecSupply", label: "평면 공급", placeholder: "공급" },
  { key: "floorSpecRooms", label: "평면 구성", placeholder: "구성" },
  { key: "formFieldName", label: "폼 이름 항목", placeholder: "이름" },
  { key: "formFieldPhone", label: "폼 연락처 항목", placeholder: "연락처" },
  { key: "formFieldUnitType", label: "폼 관심 타입 항목", placeholder: "관심 타입" },
  { key: "formFieldInquiry", label: "폼 문의 항목", placeholder: "문의 내용" },
  { key: "seedGnbHome", label: "메뉴 홈", placeholder: "홈" },
  { key: "seedGnbLead", label: "메뉴 관심고객", placeholder: "관심고객" },
  { key: "seedGnbLegal", label: "메뉴 고지", placeholder: "고지" },
  { key: "seedHeroKicker", label: "히어로 킥커 시드", placeholder: "신규 분양" },
  { key: "seedHeroHeadline", label: "히어로 제목 시드", placeholder: "현장명을 입력하세요" },
  { key: "seedHeroSubheadline", label: "히어로 안내 시드", placeholder: "핵심 카피와 분양 안내를 여기에 작성합니다." },
  { key: "seedHeroPriceLine", label: "히어로 분양가 시드", placeholder: "분양가 정보를 입력하세요" },
  { key: "seedHeroBenefit", label: "히어로 혜택 시드", placeholder: "등록 혜택을 입력하세요" },
  { key: "seedTagConsult", label: "태그 당일 상담", placeholder: "당일 상담" },
  { key: "seedTagGuide", label: "태그 1:1 안내", placeholder: "1:1 안내" },
  { key: "seedOverviewBody", label: "사업개요 본문 시드", placeholder: "규모, 위치, 세대수, 공급 일정 등 확정된 정보만 입력하세요. 추정 수치는 자동으로 만들지 않습니다." },
  { key: "seedOverviewDisclaimer", label: "사업개요 면책 시드", placeholder: "상기 내용은 사업 진행에 따라 변경될 수 있습니다." },
  { key: "seedStatHouseholds", label: "수치 세대수", placeholder: "세대수" },
  { key: "seedStatFloors", label: "수치 최고 층수", placeholder: "최고 층수" },
  { key: "seedStatBuildings", label: "수치 주거동", placeholder: "주거동" },
  { key: "seedStatMoveIn", label: "수치 입주 예정", placeholder: "입주 예정" },
  { key: "seedFactLocation", label: "항목 위치", placeholder: "위치" },
  { key: "seedFactScale", label: "항목 공급규모", placeholder: "공급규모" },
  { key: "seedFactType", label: "항목 공급유형", placeholder: "공급유형" },
  { key: "seedFactArea", label: "항목 전용면적", placeholder: "전용면적" },
  { key: "seedFactMoveIn", label: "항목 입주예정", placeholder: "입주예정" },
  { key: "seedFactParties", label: "항목 시행 시공", placeholder: "시행 · 시공" },
  { key: "seedFactNeed", label: "항목 입력 필요", placeholder: "입력 필요" },
  { key: "seedScheduleApply", label: "일정 청약", placeholder: "청약" },
  { key: "seedScheduleWinner", label: "일정 당첨", placeholder: "당첨자 발표" },
  { key: "seedScheduleContract", label: "일정 계약", placeholder: "계약" },
  { key: "seedScheduleMoveIn", label: "일정 입주", placeholder: "입주" },
  { key: "seedSchedulePending", label: "일정 미확정", placeholder: "일정 확정 후 입력" },
  { key: "seedLocationTitle", label: "입지 제목 시드", placeholder: "입지조건" },
  { key: "seedLocationBody", label: "입지 본문 시드", placeholder: "교통, 생활권, 교육, 녹지 등 현장 주변 정보를 입력합니다." },
  { key: "seedCardTransit", label: "입지 카드 교통", placeholder: "주요 교통 정보를 입력하세요." },
  { key: "seedCardLife", label: "입지 카드 생활", placeholder: "생활 인프라 정보를 입력하세요." },
  { key: "seedCardSchool", label: "입지 카드 교육", placeholder: "교육 환경 정보를 입력하세요." },
  { key: "seedPremiumTitleSection", label: "프리미엄 섹션명", placeholder: "프리미엄" },
  { key: "seedPremiumHeading", label: "프리미엄 제목 시드", placeholder: "프리미엄 / 특장점" },
  { key: "seedPremiumHeadline", label: "프리미엄 강조 제목", placeholder: "이 단지의 특장점" },
  { key: "seedPremiumBodySeed", label: "프리미엄 강조 본문", placeholder: "확인된 내용만 적습니다." },
  { key: "seedPremiumItem1", label: "특장점 1 제목", placeholder: "특장점 1" },
  { key: "seedPremiumItem1Body", label: "특장점 1 본문", placeholder: "실제 확인된 특장점만 작성하세요." },
  { key: "seedPremiumItem2", label: "특장점 2 제목", placeholder: "특장점 2" },
  { key: "seedPremiumItem2Body", label: "특장점 2 본문", placeholder: "광고 문구의 적법성은 담당자가 확인합니다." },
  { key: "seedPremiumItem3", label: "특장점 3 제목", placeholder: "특장점 3" },
  { key: "seedPremiumItem3Body", label: "특장점 3 본문", placeholder: "시스템이 분양 조건을 대신 검증하지 않습니다." },
  { key: "seedGalleryHeading", label: "갤러리 제목 시드", placeholder: "시설 / 갤러리" },
  { key: "seedGalleryBody", label: "갤러리 본문 시드", placeholder: "단지와 시설 사진을 올리고, 각 사진 설명을 입력하세요." },
  { key: "seedFloorplanTitle", label: "평면 제목 시드", placeholder: "평면안내" },
  { key: "seedFloorplanBody", label: "평면 본문 시드", placeholder: "타입을 고르면 해당 평면이 보입니다." },
  { key: "seedDirectionsAddress", label: "오시는 길 주소 시드", placeholder: "현장 주소를 입력하세요." },
  { key: "seedDirectionsGuide", label: "오시는 길 안내 시드", placeholder: "찾아오시는 방법과 주차 안내를 입력하세요." },
  { key: "seedDirectionsHours", label: "오시는 길 운영 시드", placeholder: "운영 시간을 입력하세요." },
  { key: "seedDirectionsParking", label: "오시는 길 주차 시드", placeholder: "주차 안내를 입력하세요." },
  { key: "seedRouteSubway", label: "지하철 안내 시드", placeholder: "역과 출구를 입력하세요." },
  { key: "seedRouteBus", label: "버스 수단", placeholder: "버스" },
  { key: "seedRouteBusDetail", label: "버스 안내 시드", placeholder: "노선을 입력하세요." },
  { key: "seedLeadIntro", label: "등록 안내 시드", placeholder: "상담을 원하시면 아래 정보를 남겨 주세요. 담당자가 확인 후 연락드립니다." },
  { key: "seedLeadPerkTitle", label: "등록 혜택 제목 시드", placeholder: "등록하면 먼저 안내받는 내용" },
  { key: "seedLeadPerkBody", label: "등록 혜택 본문 시드", placeholder: "확정된 안내만 적습니다." },
  { key: "seedLeadPerk1", label: "등록 혜택 1", placeholder: "청약 일정 안내" },
  { key: "seedLeadPerk2", label: "등록 혜택 2", placeholder: "모델하우스 오픈 안내" },
  { key: "seedLegalBody", label: "법적 고지 본문 시드", placeholder: "시행, 시공, 광고 문의처, 분양 광고 관련 고지는 담당자가 직접 입력합니다. 미확정 정보는 사실처럼 표시하지 마세요." },
  { key: "seedLegalNotice1", label: "법적 고지 1", placeholder: "조감도, 평면도, 이미지는 이해를 돕기 위한 것이며 실제와 다를 수 있습니다." },
  { key: "seedLegalNotice2", label: "법적 고지 2", placeholder: "확정되지 않은 일정과 금액은 사실처럼 적지 않습니다." },
  { key: "seedLegalFooter", label: "법적 고지 하단", placeholder: "분양 조건과 일정은 입주자 모집공고와 현장 안내를 기준으로 확인해 주세요." },
  { key: "seedSampleComplex", label: "샘플 단지명", placeholder: "샘플 단지" },
  { key: "seedSampleSubheadline", label: "샘플 히어로 안내", placeholder: "분양 안내 문구를 여기에 넣습니다." },
  { key: "seedSamplePriceLine", label: "샘플 분양가 한 줄", placeholder: "전용 59㎡ · 분양가 입력" },
  { key: "seedSamplePriceMain", label: "샘플 분양가", placeholder: "분양가 입력" },
  { key: "seedSampleBenefit", label: "샘플 혜택", placeholder: "모델하우스 방문 예약" },
  { key: "seedSampleOverviewBody", label: "샘플 사업개요 본문", placeholder: "위치, 규모, 세대수처럼 확정된 정보만 보여 주는 샘플입니다." },
  { key: "seedSampleFactLocation", label: "샘플 위치 값", placeholder: "주소를 입력하세요" },
  { key: "seedSampleFactScale", label: "샘플 규모 값", placeholder: "지하·지상 규모를 입력하세요" },
  { key: "seedSampleFactType", label: "샘플 유형 값", placeholder: "아파트·오피스텔 등 공급 유형을 입력하세요" },
  { key: "seedSampleFactArea", label: "샘플 면적 값", placeholder: "전용면적 범위를 입력하세요" },
  { key: "seedSampleFactMoveIn", label: "샘플 입주 값", placeholder: "입주 시기를 입력하세요" },
  { key: "seedSampleFactParties", label: "샘플 시행 시공 값", placeholder: "시행사와 시공사를 입력하세요" },
  { key: "seedSampleLocationBody", label: "샘플 입지 본문", placeholder: "교통, 생활, 교육 정보를 샘플 칸에 맞춰 바꿉니다." },
  { key: "seedSampleMatrixTransit", label: "샘플 교통 칸", placeholder: "가까운 역과 도로를 입력하세요." },
  { key: "seedSampleMatrixSchool", label: "샘플 교육 칸", placeholder: "학교와 학원가를 입력하세요." },
  { key: "seedSampleMatrixNature", label: "샘플 녹지 칸", placeholder: "공원과 산책길을 입력하세요." },
  { key: "seedSamplePremiumBody", label: "샘플 프리미엄 본문", placeholder: "샘플로 넣은 문장입니다. 확정된 내용으로 바꿔 주세요." },
  { key: "seedSamplePremiumCommunity", label: "샘플 커뮤니티", placeholder: "단지 안 시설을 입력하세요." },
  { key: "seedSamplePremiumPark", label: "샘플 조경", placeholder: "조경 계획을 입력하세요." },
  { key: "seedSamplePremiumParking", label: "샘플 주차", placeholder: "주차 대수를 입력하세요." },
  { key: "seedSampleTypeSummary", label: "샘플 타입 설명", placeholder: "방 구성과 전용면적을 입력하세요." },
  { key: "seedSampleRooms59", label: "샘플 59 구성", placeholder: "방 2, 욕실 1" },
  { key: "seedSampleRooms84", label: "샘플 84 구성", placeholder: "방 3, 욕실 2" },
  { key: "seedSampleLeadPerkBody", label: "샘플 등록 혜택 본문", placeholder: "청약 일정과 방문 안내처럼 확정된 내용만 적습니다." },
  { key: "seedSampleLeadPerk2", label: "샘플 등록 혜택 2", placeholder: "모델하우스 방문 안내" },
  { key: "seedSampleDirectionsGuide", label: "샘플 오시는 길 안내", placeholder: "대중교통과 주차 안내를 입력하세요." },
  { key: "seedSampleDirectionsHours", label: "샘플 운영 시간", placeholder: "매일 10:00–18:00" },
  { key: "seedSampleDirectionsParking", label: "샘플 주차 안내", placeholder: "지상 주차장 이용. 만차 시 인근 주차를 안내하세요." },
  { key: "seedSampleRouteSubway", label: "샘플 지하철 안내", placeholder: "가까운 역과 도보 시간을 입력하세요." },
  { key: "seedSampleRouteBus", label: "샘플 버스 안내", placeholder: "정류장과 노선을 입력하세요." },
];

function PageSettings({
  snapshot,
  onDraftChange,
  upload,
}: {
  snapshot: PageSnapshot;
  onDraftChange: (patch: DraftPatch) => void;
  upload: (file: File) => Promise<string | null>;
}) {
  const privacy = snapshot.privacy;
  const copy = (key: string, fallback: string) => panelText(snapshot.globalSettings, key, fallback);
  return (
    <details className="rounded-[16px] border border-border bg-surface p-6">
      <summary className="cursor-pointer text-sm font-semibold">{panelText(snapshot.globalSettings, "shellPageSettings", "페이지 설정")}</summary>
      <div className="mt-3 space-y-3">
        <details className="rounded-[14px] border border-border bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold">{panelText(snapshot.globalSettings, "shellEditorCopy", "편집기 문구")}</summary>
          <div className="mt-3 space-y-3">
            {SHELL_LABELS.map((item) => (
              <Field key={item.key} label={item.label} hint={item.hint}>
                <Input
                  value={String(snapshot.globalSettings[item.key] ?? "")}
                  placeholder={item.placeholder}
                  onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, [item.key]: event.target.value } })}
                />
              </Field>
            ))}
          </div>
        </details>
        <Field label={copy("capCopyOkLabel", "복사 완료")} hint={copy("capCopyOkLabelHint", "주소나 페이지 주소를 복사한 뒤 버튼에 잠깐 보입니다. 비우면 주소를 복사했습니다로 보입니다.")}>
          <Input
            value={String(snapshot.globalSettings.copyOkLabel ?? "")}
            placeholder={copy("copyOkLabel", "주소를 복사했습니다")}
            onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, copyOkLabel: event.target.value } })}
          />
        </Field>
        <Field label={copy("capViewerPrev", "사진 이전")} hint={copy("capViewerPrevHint", "사진을 크게 본 뒤 이전 사진으로 가는 버튼입니다. 비우면 이전으로 보입니다.")}>
          <Input
            value={String(snapshot.globalSettings.viewerPrev ?? "")}
            placeholder={copy("viewerPrev", "이전")}
            onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, viewerPrev: event.target.value } })}
          />
        </Field>
        <Field label={copy("capViewerNext", "사진 다음")} hint={copy("capViewerNextHint", "다음 사진으로 가는 버튼입니다. 비우면 다음으로 보입니다.")}>
          <Input
            value={String(snapshot.globalSettings.viewerNext ?? "")}
            placeholder={copy("viewerNext", "다음")}
            onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, viewerNext: event.target.value } })}
          />
        </Field>
        <Field label={copy("capEditUp", "위로")} hint={copy("capEditUpHint", "목록에서 항목을 위로 옮기는 글자입니다. 비우면 위로로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.editUp ?? "")} placeholder={copy("editUp", "위로")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, editUp: event.target.value } })} />
        </Field>
        <Field label={copy("capEditDown", "아래로")} hint={copy("capEditDownHint", "비우면 아래로로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.editDown ?? "")} placeholder={copy("editDown", "아래로")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, editDown: event.target.value } })} />
        </Field>
        <Field label={copy("capEditRemove", "삭제")} hint={copy("capEditRemoveHint", "항목을 지우는 글자입니다. 비우면 삭제로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.editRemove ?? "")} placeholder={copy("editRemove", "삭제")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, editRemove: event.target.value } })} />
        </Field>
        <Field label={copy("capEditBefore", "앞")} hint={copy("capEditBeforeHint", "같은 줄에서 앞으로 옮기는 글자입니다. 비우면 앞으로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.editBefore ?? "")} placeholder={copy("editBefore", "앞")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, editBefore: event.target.value } })} />
        </Field>
        <Field label={copy("capEditAfter", "뒤")} hint={copy("capEditAfterHint", "비우면 뒤로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.editAfter ?? "")} placeholder={copy("editAfter", "뒤")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, editAfter: event.target.value } })} />
        </Field>
        <Field label={copy("capEditForward", "앞으로")} hint={copy("capEditForwardHint", "사진과 카드 순서를 앞으로 당기는 글자입니다. 비우면 앞으로로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.editForward ?? "")} placeholder={copy("editForward", "앞으로")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, editForward: event.target.value } })} />
        </Field>
        <Field label={copy("capEditBack", "뒤로")} hint={copy("capEditBackHint", "비우면 뒤로로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.editBack ?? "")} placeholder={copy("editBack", "뒤로")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, editBack: event.target.value } })} />
        </Field>
        <Field label={copy("capEditAddItem", "항목 추가")} hint={copy("capEditAddItemHint", "비우면 항목 추가로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.editAddItem ?? "")} placeholder={copy("editAddItem", "항목 추가")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, editAddItem: event.target.value } })} />
        </Field>
        <Field label={copy("capEditAddStat", "수치 추가")} hint={copy("capEditAddStatHint", "사업개요 숫자 칸입니다. 비우면 수치 추가로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.editAddStat ?? "")} placeholder={copy("editAddStat", "수치 추가")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, editAddStat: event.target.value } })} />
        </Field>
        <Field label={copy("capEditAddSchedule", "일정 추가")} hint={copy("capEditAddScheduleHint", "비우면 일정 추가로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.editAddSchedule ?? "")} placeholder={copy("editAddSchedule", "일정 추가")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, editAddSchedule: event.target.value } })} />
        </Field>
        <Field label={copy("capEditAddQuestion", "질문 추가")} hint={copy("capEditAddQuestionHint", "비우면 질문 추가로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.editAddQuestion ?? "")} placeholder={copy("editAddQuestion", "질문 추가")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, editAddQuestion: event.target.value } })} />
        </Field>
        <Field label={copy("capEditAddType", "타입 추가")} hint={copy("capEditAddTypeHint", "비우면 타입 추가로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.editAddType ?? "")} placeholder={copy("editAddType", "타입 추가")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, editAddType: event.target.value } })} />
        </Field>
        <Field label={copy("capEditAddRoute", "교통 추가")} hint={copy("capEditAddRouteHint", "비우면 교통 추가로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.editAddRoute ?? "")} placeholder={copy("editAddRoute", "교통 추가")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, editAddRoute: event.target.value } })} />
        </Field>
        <Field label={copy("capEditAddNotice", "고지 추가")} hint={copy("capEditAddNoticeHint", "비우면 고지 추가로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.editAddNotice ?? "")} placeholder={copy("editAddNotice", "고지 추가")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, editAddNotice: event.target.value } })} />
        </Field>
        <Field label={copy("capEditAddPerk", "혜택 추가")} hint={copy("capEditAddPerkHint", "비우면 혜택 추가로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.editAddPerk ?? "")} placeholder={copy("editAddPerk", "혜택 추가")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, editAddPerk: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaVideo", "영상 버튼")} hint={copy("capMediaVideoHint", "히어로에서 영상을 올리는 버튼입니다. 비우면 영상으로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaVideo ?? "")} placeholder={copy("mediaVideo", "영상")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaVideo: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaImageView", "이미지로 보기")} hint={copy("capMediaImageViewHint", "영상을 끄고 사진으로 돌릴 때 보입니다. 비우면 이미지로 보기로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaImageView ?? "")} placeholder={copy("mediaImageView", "이미지로 보기")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaImageView: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaVideoView", "영상으로 보기")} hint={copy("capMediaVideoViewHint", "비우면 영상으로 보기로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaVideoView ?? "")} placeholder={copy("mediaVideoView", "영상으로 보기")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaVideoView: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaVideoDelete", "영상 삭제")} hint={copy("capMediaVideoDeleteHint", "비우면 영상 삭제로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaVideoDelete ?? "")} placeholder={copy("mediaVideoDelete", "영상 삭제")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaVideoDelete: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaPoster", "포스터")} hint={copy("capMediaPosterHint", "영상 시작 전 이미지입니다. 비우면 포스터로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaPoster ?? "")} placeholder={copy("mediaPoster", "포스터")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaPoster: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaPosterDelete", "포스터 삭제")} hint={copy("capMediaPosterDeleteHint", "비우면 포스터 삭제로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaPosterDelete ?? "")} placeholder={copy("mediaPosterDelete", "포스터 삭제")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaPosterDelete: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaVideoSize", "영상 용량 안내")} hint={copy("capMediaVideoSizeHint", "영상 버튼 아래에 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaVideoHint ?? "")} placeholder={copy("mediaVideoHint", "3.5MB를 넘는 영상은 오른쪽 패널의 영상 주소에 넣습니다.")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaVideoHint: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaImageDelete", "이미지 삭제")} hint={copy("capMediaImageDeleteHint", "대표 이미지를 지우는 버튼입니다. 비우면 이미지 삭제로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaImageDelete ?? "")} placeholder={copy("mediaImageDelete", "이미지 삭제")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaImageDelete: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaImageChange", "이미지 변경")} hint={copy("capMediaImageChangeHint", "비우면 이미지 변경으로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaImageChange ?? "")} placeholder={copy("mediaImageChange", "이미지 변경")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaImageChange: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaMobile", "모바일 이미지")} hint={copy("capMediaMobileHint", "비우면 모바일 이미지로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaMobile ?? "")} placeholder={copy("mediaMobile", "모바일 이미지")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaMobile: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaMobileDelete", "모바일 이미지 삭제")} hint={copy("capMediaMobileDeleteHint", "비우면 모바일 이미지 삭제로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaMobileDelete ?? "")} placeholder={copy("mediaMobileDelete", "모바일 이미지 삭제")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaMobileDelete: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaPhotoDelete", "사진 삭제")} hint={copy("capMediaPhotoDeleteHint", "카드와 특장점 사진을 지울 때 보입니다. 비우면 사진 삭제로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaPhotoDelete ?? "")} placeholder={copy("mediaPhotoDelete", "사진 삭제")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaPhotoDelete: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaReplace", "이 사진 바꾸기")} hint={copy("capMediaReplaceHint", "비우면 이 사진 바꾸기로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaReplace ?? "")} placeholder={copy("mediaReplace", "이 사진 바꾸기")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaReplace: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaAddMany", "이미지 여러 장 추가")} hint={copy("capMediaAddManyHint", "비우면 이미지 여러 장 추가로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaAddMany ?? "")} placeholder={copy("mediaAddMany", "이미지 여러 장 추가")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaAddMany: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaCurrentDelete", "보고 있는 사진 삭제")} hint={copy("capMediaCurrentDeleteHint", "평면 사진입니다. 비우면 보고 있는 사진 삭제로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaCurrentDelete ?? "")} placeholder={copy("mediaCurrentDelete", "보고 있는 사진 삭제")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaCurrentDelete: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaMapDelete", "약도 삭제")} hint={copy("capMediaMapDeleteHint", "비우면 약도 삭제로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaMapDelete ?? "")} placeholder={copy("mediaMapDelete", "약도 삭제")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaMapDelete: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaBannerDelete", "배너 삭제")} hint={copy("capMediaBannerDeleteHint", "비우면 배너 삭제로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaBannerDelete ?? "")} placeholder={copy("mediaBannerDelete", "배너 삭제")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaBannerDelete: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaLogoDelete", "로고 삭제")} hint={copy("capMediaLogoDeleteHint", "비우면 로고 삭제로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaLogoDelete ?? "")} placeholder={copy("mediaLogoDelete", "로고 삭제")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaLogoDelete: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaPlanAdd", "평면 이미지 추가")} hint={copy("capMediaPlanAddHint", "비우면 평면 이미지 추가로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaPlanAdd ?? "")} placeholder={copy("mediaPlanAdd", "평면 이미지 추가")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaPlanAdd: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaPlanReplace", "이 평면 바꾸기")} hint={copy("capMediaPlanReplaceHint", "비우면 이 평면 바꾸기로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaPlanReplace ?? "")} placeholder={copy("mediaPlanReplace", "이 평면 바꾸기")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaPlanReplace: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaMapFile", "약도 올리기")} hint={copy("capMediaMapFileHint", "편집 중 약도를 고르는 글자입니다. 비우면 약도 이미지로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaMapFile ?? "")} placeholder={copy("mediaMapFile", "약도 이미지")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaMapFile: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaMapField", "지도 링크 이름")} hint={copy("capMediaMapFieldHint", "약도 옆 입력 칸 이름입니다. 비우면 지도 링크로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaMapField ?? "")} placeholder={copy("mediaMapField", "지도 링크")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaMapField: event.target.value } })} />
        </Field>
        <Field label={copy("capHintHidden", "숨긴 섹션 안내")} hint={copy("capHintHiddenHint", "편집 화면에서 숨긴 섹션 위에 보입니다.")}>
          <Input value={String(snapshot.globalSettings.hintHidden ?? "")} placeholder={copy("hintHidden", "숨긴 섹션입니다. 공개 페이지와 미리보기에는 나오지 않습니다.")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, hintHidden: event.target.value } })} />
        </Field>
        <Field label={copy("capHintMapEmbed", "약도 안내")} hint={copy("capHintMapEmbedHint", "편집 중 약도 위에 보이는 설명입니다.")}>
          <Textarea value={String(snapshot.globalSettings.hintMapEmbed ?? "")} placeholder={copy("hintMapEmbed", "지도는 페이지 안에 삽입되지 않습니다.")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, hintMapEmbed: event.target.value } })} />
        </Field>
        <Field label={copy("capHintMapLinked", "지도 연결 안내")} hint={copy("capHintMapLinkedHint", "지도 링크가 있을 때 편집 중에 보입니다.")}>
          <Input value={String(snapshot.globalSettings.hintMapLinked ?? "")} placeholder={copy("hintMapLinked", "지도 링크가 연결되어 있습니다. 편집 중에는 이동하지 않습니다.")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, hintMapLinked: event.target.value } })} />
        </Field>
        <Field label={copy("capHintHttp", "주소 형식 안내")} hint={copy("capHintHttpHint", "http가 아닌 링크를 넣으면 보입니다.")}>
          <Input value={String(snapshot.globalSettings.hintHttp ?? "")} placeholder={copy("hintHttp", "http 또는 https 주소만 연결됩니다.")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, hintHttp: event.target.value } })} />
        </Field>
        <Field label={copy("capHintExternalOn", "외부 등록 안내")} hint={copy("capHintExternalOnHint", "외부 관심고객 주소가 있을 때 편집 중에 보입니다.")}>
          <Input value={String(snapshot.globalSettings.hintExternalOn ?? "")} placeholder={copy("hintExternalOn", "등록 버튼은 저장된 외부 관심고객 주소로 이동합니다.")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, hintExternalOn: event.target.value } })} />
        </Field>
        <Field label={copy("capHintExternalOff", "페이지 등록 안내")} hint={copy("capHintExternalOffHint", "외부 주소가 없을 때 편집 중에 보입니다.")}>
          <Input value={String(snapshot.globalSettings.hintExternalOff ?? "")} placeholder={copy("hintExternalOff", "외부 관심고객 주소가 없으면 이 페이지의 등록 폼으로 이동합니다.")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, hintExternalOff: event.target.value } })} />
        </Field>
        <Field label={copy("capHintBold", "굵게 안내")} hint={copy("capHintBoldHint", "본문을 고칠 때 아래에 보입니다.")}>
          <Input value={String(snapshot.globalSettings.hintBold ?? "")} placeholder={copy("hintBold", "**이렇게** 감싸면 공개 페이지에서 굵게 보입니다.")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, hintBold: event.target.value } })} />
        </Field>
        <Field label={copy("capHintPremium", "특장점 안내")} hint={copy("capHintPremiumHint", "특장점 섹션을 편집할 때 보입니다.")}>
          <Input value={String(snapshot.globalSettings.hintPremium ?? "")} placeholder={copy("hintPremium", "**이렇게** 감싸면 공개 페이지에서 굵게 보입니다. 특장점은 최대 6개입니다.")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, hintPremium: event.target.value } })} />
        </Field>
        <Field label={copy("capHintPreviewDone", "완료 화면 보기")} hint={copy("capHintPreviewDoneHint", "편집 중 등록 폼 아래 버튼입니다. 비우면 완료 화면 보기로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.hintPreviewDone ?? "")} placeholder={copy("hintPreviewDone", "완료 화면 보기")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, hintPreviewDone: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaLogoHint", "로고 안내")} hint={copy("capMediaLogoHintHint", "로고가 없을 때 보입니다. 비우면 50×50 안내로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaLogoHint ?? "")} placeholder={copy("mediaLogoHint", "로고를 50×50 사이즈 이미지로 교체해 주세요.")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaLogoHint: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaLogoSize", "로고 크기 안내")} hint={copy("capMediaLogoSizeHint", "50×50이 아닌 이미지를 올리면 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaLogoSize ?? "")} placeholder={copy("mediaLogoSize", "50×50 사이즈 이미지를 사용해 주세요.")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaLogoSize: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaLogoFail", "로고 올리기 실패")} hint={copy("capMediaLogoFailHint", "로고 업로드가 실패하면 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaLogoFail ?? "")} placeholder={copy("mediaLogoFail", "로고를 올리지 못했습니다.")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaLogoFail: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaImageReadFail", "이미지 읽기 실패")} hint={copy("capMediaImageReadFailHint", "이미지 파일을 열지 못하면 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaImageReadFail ?? "")} placeholder={copy("mediaImageReadFail", "이미지를 읽지 못했습니다.")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaImageReadFail: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaVideoFail", "영상 올리기 실패")} hint={copy("capMediaVideoFailHint", "영상 업로드가 실패하면 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaVideoFail ?? "")} placeholder={copy("mediaVideoFail", "영상을 올리지 못했습니다.")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaVideoFail: event.target.value } })} />
        </Field>
        <Field label={copy("capMediaPosterFail", "포스터 올리기 실패")} hint={copy("capMediaPosterFailHint", "포스터 업로드가 실패하면 보입니다.")}>
          <Input value={String(snapshot.globalSettings.mediaPosterFail ?? "")} placeholder={copy("mediaPosterFail", "포스터를 올리지 못했습니다.")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, mediaPosterFail: event.target.value } })} />
        </Field>
        <Field label={copy("capAriaLogoChange", "로고 바꾸기 이름")} hint={copy("capAriaLogoChangeHint", "로고 이미지에 마우스를 올리면 읽히는 이름입니다.")}>
          <Input value={String(snapshot.globalSettings.ariaLogoChange ?? "")} placeholder={copy("ariaLogoChange", "로고 바꾸기")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, ariaLogoChange: event.target.value } })} />
        </Field>
        <Field label={copy("capAriaSectionNav", "섹션 바로가기 이름")} hint={copy("capAriaSectionNavHint", "옆의 점 목록을 읽는 이름입니다.")}>
          <Input value={String(snapshot.globalSettings.ariaSectionNav ?? "")} placeholder={copy("ariaSectionNav", "섹션 바로가기")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, ariaSectionNav: event.target.value } })} />
        </Field>
        <Field label={copy("capAriaIconChange", "아이콘 바꾸기 이름")} hint={copy("capAriaIconChangeHint", "입지와 특장점 아이콘 버튼을 읽는 이름입니다.")}>
          <Input value={String(snapshot.globalSettings.ariaIconChange ?? "")} placeholder={copy("ariaIconChange", "아이콘 바꾸기")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, ariaIconChange: event.target.value } })} />
        </Field>
        <Field label={copy("capAriaDockClose", "문의 닫기 이름")} hint={copy("capAriaDockCloseHint", "하단 문의를 닫는 배경을 읽는 이름입니다.")}>
          <Input value={String(snapshot.globalSettings.ariaDockClose ?? "")} placeholder={copy("ariaDockClose", "문의 닫기")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, ariaDockClose: event.target.value } })} />
        </Field>
        <Field label={copy("capPublicUnpublishedTitle", "비공개 제목")} hint={copy("capPublicUnpublishedTitleHint", "아직 발행되지 않은 주소에서 보입니다. 비우면 현재 공개되지 않은 홈페이지입니다로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.publicUnpublishedTitle ?? "")} placeholder={copy("publicUnpublishedTitle", "현재 공개되지 않은 홈페이지입니다")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, publicUnpublishedTitle: event.target.value } })} />
        </Field>
        <Field label={copy("capPublicUnpublishedBody", "비공개 설명")} hint={copy("capPublicUnpublishedBodyHint", "비우면 운영이 종료되었거나 아직 발행되지 않았습니다로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.publicUnpublishedBody ?? "")} placeholder={copy("publicUnpublishedBody", "운영이 종료되었거나 아직 발행되지 않았습니다.")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, publicUnpublishedBody: event.target.value } })} />
        </Field>
        <Field label={copy("capPublicPausedTitle", "일시 비공개 제목")}>
          <Input value={String(snapshot.globalSettings.publicPausedTitle ?? "")} placeholder={copy("publicPausedTitle", "잠시 비공개된 홈페이지입니다")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, publicPausedTitle: event.target.value } })} />
        </Field>
        <Field label={copy("capPublicPausedBody", "일시 비공개 설명")}>
          <Input value={String(snapshot.globalSettings.publicPausedBody ?? "")} placeholder={copy("publicPausedBody", "운영자가 공개를 일시 중지했습니다. 다시 공개되면 이 주소에서 볼 수 있습니다.")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, publicPausedBody: event.target.value } })} />
        </Field>
        <Field label={copy("capPublicExpiredTitle", "만료 제목")}>
          <Input value={String(snapshot.globalSettings.publicExpiredTitle ?? "")} placeholder={copy("publicExpiredTitle", "운영이 종료된 홈페이지입니다")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, publicExpiredTitle: event.target.value } })} />
        </Field>
        <Field label={copy("capPublicExpiredBody", "만료 설명")}>
          <Input value={String(snapshot.globalSettings.publicExpiredBody ?? "")} placeholder={copy("publicExpiredBody", "운영기간이 끝나 더 이상 공개되지 않습니다.")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, publicExpiredBody: event.target.value } })} />
        </Field>
        <Field label={copy("capPublicDraftTitle", "미발행 제목")}>
          <Input value={String(snapshot.globalSettings.publicDraftTitle ?? "")} placeholder={copy("publicDraftTitle", "아직 발행되지 않은 홈페이지입니다")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, publicDraftTitle: event.target.value } })} />
        </Field>
        <Field label={copy("capPublicDraftBody", "미발행 설명")}>
          <Input value={String(snapshot.globalSettings.publicDraftBody ?? "")} placeholder={copy("publicDraftBody", "발행이 완료되면 이 주소에서 볼 수 있습니다.")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, publicDraftBody: event.target.value } })} />
        </Field>
        <Field label={copy("capEditAddTag", "문구 추가")} hint={copy("capEditAddTagHint", "비우면 문구 추가로 보입니다.")}>
          <Input value={String(snapshot.globalSettings.editAddTag ?? "")} placeholder={copy("editAddTag", "문구 추가")} onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, editAddTag: event.target.value } })} />
        </Field>
        <Field label={copy("capViewerClose", "사진 닫기")} hint={copy("capViewerCloseHint", "크게 본 사진을 닫는 버튼입니다. 비우면 닫기로 보입니다.")}>
          <Input
            value={String(snapshot.globalSettings.viewerClose ?? "")}
            placeholder={copy("viewerClose", "닫기")}
            onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, viewerClose: event.target.value } })}
          />
        </Field>
        <Field label={copy("capCopyFailLabel", "복사 실패")} hint={copy("capCopyFailLabelHint", "복사에 실패하면 버튼에 잠깐 보입니다. 비우면 복사하지 못했습니다로 보입니다.")}>
          <Input
            value={String(snapshot.globalSettings.copyFailLabel ?? "")}
            placeholder={copy("copyFailLabel", "복사하지 못했습니다")}
            onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, copyFailLabel: event.target.value } })}
          />
        </Field>
        <Field label={copy("capShareLabel", "공유 버튼")} hint={copy("capShareLabelHint", "상단의 공유 버튼입니다. 비우면 공유로 보입니다.")}>
          <Input
            value={String(snapshot.globalSettings.shareLabel ?? "")}
            placeholder={copy("shareLabel", "공유")}
            onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, shareLabel: event.target.value } })}
          />
        </Field>
        <Field label={copy("capNavSubtitle", "상단 보조 문구")} hint={copy("capNavSubtitleHint", "현장명 아래와 페이지 하단에 같이 보입니다.")}>
          <Input
            value={String(snapshot.globalSettings.navSubtitle ?? "")}
            onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, navSubtitle: event.target.value } })}
          />
        </Field>
        <Field label={copy("capCtaLabel", "공통 등록 버튼")} hint={copy("capCtaLabelHint", "히어로에 버튼 문구가 없을 때 쓰는 공통 문구입니다. 비우면 관심고객 등록으로 보입니다.")}>
          <Input
            value={String(snapshot.globalSettings.ctaLabel ?? "")}
            placeholder={copy("phCta", "관심고객 등록")}
            onChange={(event) => onDraftChange({ globalSettings: { ...snapshot.globalSettings, ctaLabel: event.target.value } })}
          />
        </Field>
        <Field label={copy("panelSeoTitle", "검색 제목")}>
          <Input
            value={snapshot.seoSettings.title}
            onChange={(event) => onDraftChange({ seoSettings: { ...snapshot.seoSettings, title: event.target.value } })}
          />
        </Field>
        <Field label={copy("panelSeoDescription", "검색 설명")}>
          <Textarea
            value={snapshot.seoSettings.description}
            onChange={(event) =>
              onDraftChange({ seoSettings: { ...snapshot.seoSettings, description: event.target.value } })
            }
          />
        </Field>
        <Field label={copy("panelOgImage", "공유 이미지")} hint={copy("panelOgImageHint", "링크를 보낼 때 미리보기에 쓰는 이미지입니다.")}>
          <input
            type="file"
            accept="image/*"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const ogImageUrl = await upload(file);
              if (!ogImageUrl) return;
              onDraftChange({ seoSettings: { ...snapshot.seoSettings, ogImageUrl } });
            }}
          />
          {snapshot.seoSettings.ogImageUrl ? (
            <button
              type="button"
              className="mt-2 text-xs text-text-muted"
              onClick={() => onDraftChange({ seoSettings: { ...snapshot.seoSettings, ogImageUrl: "" } })}
            >
              {panelText(snapshot.globalSettings, "mediaShareDelete", "공유 이미지 삭제")}
            </button>
          ) : null}
        </Field>
        <Field label={copy("panelImageUrl", "이미지 주소")} hint={copy("panelImageUrlHint", "파일 업로드가 안 되는 환경에서는 https 주소를 넣으세요.")}>
          <Input
            value={String(snapshot.seoSettings.ogImageUrl ?? "")}
            placeholder={copy("phHttps", "https://")}
            onChange={(event) => onDraftChange({ seoSettings: { ...snapshot.seoSettings, ogImageUrl: event.target.value } })}
          />
        </Field>
        <Field label={copy("panelOperator", "시스템 운영")} hint={copy("panelOperatorHint", "비우거나 운영법인미정이면 동의 창에 나오지 않습니다.")}>
          <Input
            value={privacy.operatingCompanyName}
            onChange={(event) =>
              onDraftChange({ privacySettings: { ...privacy, operatingCompanyName: event.target.value } })
            }
          />
        </Field>
        <Field label={copy("panelPolicyButton", "처리방침 버튼")} hint={copy("panelPolicyButtonHint", "비우면 개인정보 처리방침으로 보입니다.")}>
          <Input
            value={privacy.privacyPolicyLabel ?? ""}
            placeholder={copy("phPrivacyPolicy", "개인정보 처리방침")}
            onChange={(event) =>
              onDraftChange({ privacySettings: { ...privacy, privacyPolicyLabel: event.target.value } })
            }
          />
        </Field>
        <Field label={copy("panelPolicyUrl", "처리방침 주소")} hint={copy("panelPolicyUrlHint", "http로 시작하거나 /로 시작하는 경로입니다. 비우면 페이지 하단 링크를 숨깁니다.")}>
          <Input
            value={privacy.privacyPolicyUrl}
            placeholder={copy("phPrivacyUrl", "https:// 또는 /privacy")}
            onChange={(event) =>
              onDraftChange({ privacySettings: { ...privacy, privacyPolicyUrl: event.target.value } })
            }
          />
        </Field>
        <Field label={copy("panelController", "수집 주체")} hint={copy("panelControllerHint", "출시 전 확정값으로 바꾸세요")}>
          <Input
            value={privacy.collectingControllerName}
            onChange={(event) =>
              onDraftChange({ privacySettings: { ...privacy, collectingControllerName: event.target.value } })
            }
          />
        </Field>
        <Field label={copy("panelAdvertiserCompany", "광고주 회사명")}>
          <Input
            value={privacy.advertiserCompanyName}
            onChange={(event) =>
              onDraftChange({ privacySettings: { ...privacy, advertiserCompanyName: event.target.value } })
            }
          />
        </Field>
        <Field label={copy("panelAgencyCompany", "광고사명")}>
          <Input
            value={privacy.advertisingAgencyName}
            onChange={(event) =>
              onDraftChange({ privacySettings: { ...privacy, advertisingAgencyName: event.target.value } })
            }
          />
        </Field>
        <Field label={copy("panelPurpose", "수집 목적")}>
          <Textarea
            value={privacy.collectionPurpose}
            onChange={(event) => onDraftChange({ privacySettings: { ...privacy, collectionPurpose: event.target.value } })}
          />
        </Field>
        <Field label={copy("panelCollected", "수집 항목")} hint={copy("panelCommaHint", "쉼표로 구분합니다.")}>
          <Input
            value={privacy.collectedFields.join(", ")}
            onChange={(event) =>
              onDraftChange({
                privacySettings: {
                  ...privacy,
                  collectedFields: event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                },
              })
            }
          />
        </Field>
        <Field label={copy("panelRetention", "보유 기간")}>
          <Textarea
            value={privacy.retentionDescription}
            onChange={(event) => onDraftChange({ privacySettings: { ...privacy, retentionDescription: event.target.value } })}
          />
        </Field>
        <Field label={copy("panelRefusal", "동의하지 않을 때")}>
          <Textarea
            value={privacy.refusalConsequence}
            onChange={(event) => onDraftChange({ privacySettings: { ...privacy, refusalConsequence: event.target.value } })}
          />
        </Field>
        <Field label={copy("panelNoticeTitle", "동의 창 제목")} hint={copy("panelNoticeTitleHint", "내용 보기를 열면 맨 위에 보입니다. 비우면 개인정보 수집 및 이용으로 보입니다.")}>
          <Input value={privacy.noticeLabels?.title ?? ""} placeholder={copy("noticeTitle", "개인정보 수집 및 이용")} onChange={(event) => onDraftChange({ privacySettings: { ...privacy, noticeLabels: { ...privacy.noticeLabels, title: event.target.value } } })} />
        </Field>
        <Field label={copy("panelNoticeController", "수집 주체 제목")} hint={copy("panelNoticeControllerHint", "동의 창의 소제목입니다. 비우면 수집 주체로 보입니다.")}>
          <Input value={privacy.noticeLabels?.controller ?? ""} placeholder={copy("noticeController", "수집 주체")} onChange={(event) => onDraftChange({ privacySettings: { ...privacy, noticeLabels: { ...privacy.noticeLabels, controller: event.target.value } } })} />
        </Field>
        <Field label={copy("panelNoticePurpose", "목적 제목")} hint={copy("panelNoticePurposeHint", "비우면 목적으로 보입니다.")}>
          <Input value={privacy.noticeLabels?.purpose ?? ""} placeholder={copy("noticePurpose", "목적")} onChange={(event) => onDraftChange({ privacySettings: { ...privacy, noticeLabels: { ...privacy.noticeLabels, purpose: event.target.value } } })} />
        </Field>
        <Field label={copy("panelNoticeFields", "항목 제목")} hint={copy("panelNoticeFieldsHint", "비우면 항목으로 보입니다.")}>
          <Input value={privacy.noticeLabels?.fields ?? ""} placeholder={copy("noticeFields", "항목")} onChange={(event) => onDraftChange({ privacySettings: { ...privacy, noticeLabels: { ...privacy.noticeLabels, fields: event.target.value } } })} />
        </Field>
        <Field label={copy("panelNoticeRetention", "보유 기간 제목")} hint={copy("panelNoticeRetentionHint", "비우면 보유 기간으로 보입니다.")}>
          <Input value={privacy.noticeLabels?.retention ?? ""} placeholder={copy("noticeRetention", "보유 기간")} onChange={(event) => onDraftChange({ privacySettings: { ...privacy, noticeLabels: { ...privacy.noticeLabels, retention: event.target.value } } })} />
        </Field>
        <Field label={copy("panelNoticeOperator", "시스템 운영 제목")} hint={copy("panelNoticeOperatorHint", "운영 법인을 적을 때만 보입니다. 비우면 시스템 운영으로 보입니다.")}>
          <Input value={privacy.noticeLabels?.operator ?? ""} placeholder={copy("noticeOperator", "시스템 운영")} onChange={(event) => onDraftChange({ privacySettings: { ...privacy, noticeLabels: { ...privacy.noticeLabels, operator: event.target.value } } })} />
        </Field>
        <Field label={copy("panelNoticeOperatorNote", "운영 안내 문장")} hint={copy("panelNoticeOperatorNoteHint", "운영 법인 이름 뒤에 붙습니다.")}>
          <Textarea value={privacy.noticeLabels?.operatorNote ?? ""} placeholder={copy("noticeOperatorNote", "상담과 개인정보 이용의 주체는 위에 적은 수집 주체입니다.")} onChange={(event) => onDraftChange({ privacySettings: { ...privacy, noticeLabels: { ...privacy.noticeLabels, operatorNote: event.target.value } } })} />
        </Field>
        <Field label={copy("panelNoticeThird", "제3자 제목")} hint={copy("panelNoticeThirdHint", "제3자 제공을 켠 뒤 동의 창에 보입니다. 비우면 제3자 제공으로 보입니다.")}>
          <Input value={privacy.noticeLabels?.thirdParty ?? ""} placeholder={copy("noticeThird", "제3자 제공")} onChange={(event) => onDraftChange({ privacySettings: { ...privacy, noticeLabels: { ...privacy.noticeLabels, thirdParty: event.target.value } } })} />
        </Field>
        <Field label={copy("panelNoticeRefusal", "동의 거부 제목")} hint={copy("panelNoticeRefusalHint", "비우면 동의 거부로 보입니다.")}>
          <Input value={privacy.noticeLabels?.refusal ?? ""} placeholder={copy("noticeRefusal", "동의 거부")} onChange={(event) => onDraftChange({ privacySettings: { ...privacy, noticeLabels: { ...privacy.noticeLabels, refusal: event.target.value } } })} />
        </Field>
        <Field label={copy("panelNoticeClose", "동의 창 닫기")} hint={copy("panelNoticeCloseHint", "비우면 닫기로 보입니다.")}>
          <Input value={privacy.noticeLabels?.close ?? ""} placeholder={copy("shellPopupClosePh", "닫기")} onChange={(event) => onDraftChange({ privacySettings: { ...privacy, noticeLabels: { ...privacy.noticeLabels, close: event.target.value } } })} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={privacy.thirdPartyProvisionEnabled}
            onChange={(event) =>
              onDraftChange({ privacySettings: { ...privacy, thirdPartyProvisionEnabled: event.target.checked } })
            }
          />
          {copy("panelThirdPartyToggle", "제3자 제공 동의 받기")}
        </label>
        {privacy.thirdPartyProvisionEnabled ? (
          <>
            <Field label={copy("panelThirdRecipient", "제공받는 자")}>
              <Input
                value={privacy.thirdPartyRecipientName ?? ""}
                onChange={(event) =>
                  onDraftChange({ privacySettings: { ...privacy, thirdPartyRecipientName: event.target.value } })
                }
              />
            </Field>
            <Field label={copy("panelThirdPurpose", "제공 목적")}>
              <Input
                value={privacy.thirdPartyPurpose ?? ""}
                onChange={(event) => onDraftChange({ privacySettings: { ...privacy, thirdPartyPurpose: event.target.value } })}
              />
            </Field>
            <Field label={copy("panelThirdFields", "제공 항목")} hint={copy("panelCommaHint", "쉼표로 구분합니다.")}>
              <Input
                value={(privacy.thirdPartyFields ?? []).join(", ")}
                onChange={(event) =>
                  onDraftChange({
                    privacySettings: {
                      ...privacy,
                      thirdPartyFields: event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                    },
                  })
                }
              />
            </Field>
            <Field label={copy("panelThirdRetention", "제공 보유 기간")}>
              <Textarea
                value={privacy.thirdPartyRetentionDescription ?? ""}
                onChange={(event) =>
                  onDraftChange({ privacySettings: { ...privacy, thirdPartyRetentionDescription: event.target.value } })
                }
              />
            </Field>
          </>
        ) : null}
      </div>
    </details>
  );
}

function FormFields({
  snapshot,
  onDraftChange,
}: {
  snapshot: PageSnapshot;
  onDraftChange: (patch: DraftPatch) => void;
}) {
  const fields = snapshot.formSettings.fields;
  const up = usePanelText("editUp", "위로");
  const down = usePanelText("editDown", "아래로");
  const removeField = usePanelText("shellFieldRemove", "항목 삭제");
  const addItem = usePanelText("editAddItem", "항목 추가");
  const includeLabel = usePanelText("shellNotifyInclude", "알림에 포함");
  const fieldsHeading = usePanelText("shellFormFields", "입력 항목");
  const fieldText = usePanelText("fieldText", "짧은 글");
  const fieldTextarea = usePanelText("fieldTextarea", "긴 글");
  const fieldSelect = usePanelText("fieldSelect", "목록 선택");
  const fieldRadio = usePanelText("fieldRadio", "하나만 선택");
  const fieldCheckbox = usePanelText("fieldCheckbox", "여러 개 선택");
  const fieldDate = usePanelText("fieldDate", "날짜");
  const unitTypeHint = usePanelText("shellUnitTypeHint", "이 항목은 등록 폼에서 칩으로 여러 개 고릅니다. 선택지는 평면안내 타입 이름과 맞춰집니다.");
  const fieldName = usePanelText("panelFieldName", "항목 이름");
  const helper = usePanelText("panelHelper", "도움말");
  const firstOption = usePanelText("panelFirstOption", "첫 칸 문구");
  const firstOptionHint = usePanelText("panelFirstOptionHint", "목록을 열기 전 첫 칸입니다. 비우면 선택으로 보입니다.");
  const placeholderLabel = usePanelText("panelPlaceholder", "빈칸 안내");
  const placeholderHint = usePanelText("panelPlaceholderHint", "입력 전에 칸 안에 보이는 예시입니다.");
  const fieldType = usePanelText("panelFieldType", "입력 형식");
  const optionsLabel = usePanelText("panelOptions", "선택지");
  const commaHint = usePanelText("panelCommaHint", "쉼표로 구분합니다.");
  const requiredLabel = usePanelText("panelRequired", "필수");
  const visibleLabel = usePanelText("panelVisible", "폼에 표시");
  const selectPh = usePanelText("formSelectPh", "선택");
  const namePh = usePanelText("formNamePh", "홍길동");
  const phonePh = usePanelText("formPhonePh", "010-0000-0000");
  const textareaPh = usePanelText("formTextareaPh", "궁금하신 점을 남겨 주세요");
  const textPh = usePanelText("formTextPh", "예시");
  const extraLabel = usePanelText("formExtraLabel", "추가 항목");
  function save(next: PageSnapshot["formSettings"]["fields"]) {
    onDraftChange({ formSettings: { ...snapshot.formSettings, fields: next } });
  }
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{fieldsHeading}</p>
      {fields.map((field, index) => {
        const locked = field.type === "name" || field.type === "phone";
        return (
          <div key={field.key} className="space-y-2 rounded-[14px] border border-border p-3">
            <Field label={fieldName}>
              <Input value={field.label} onChange={(event) => save(fields.map((item, itemIndex) => (itemIndex === index ? { ...item, label: event.target.value } : item)))} />
            </Field>
            <Field label={helper}>
              <Input
                value={field.helperText ?? ""}
                onChange={(event) => save(fields.map((item, itemIndex) => (itemIndex === index ? { ...item, helperText: event.target.value } : item)))}
              />
            </Field>
            {field.type === "select" ? (
              <Field label={firstOption} hint={firstOptionHint}>
                <Input
                  value={field.placeholder ?? ""}
                  placeholder={selectPh}
                  onChange={(event) => save(fields.map((item, itemIndex) => (itemIndex === index ? { ...item, placeholder: event.target.value } : item)))}
                />
              </Field>
            ) : field.type === "radio" || field.type === "checkbox" ? null : (
              <Field label={placeholderLabel} hint={placeholderHint}>
                <Input
                  value={field.placeholder ?? ""}
                  placeholder={field.type === "name" ? namePh : field.type === "phone" ? phonePh : field.type === "textarea" ? textareaPh : textPh}
                  onChange={(event) => save(fields.map((item, itemIndex) => (itemIndex === index ? { ...item, placeholder: event.target.value } : item)))}
                />
              </Field>
            )}
            {locked ? null : (
              <Field label={fieldType}>
                <select
                  className="ui-field"
                  value={["textarea", "select", "radio", "checkbox", "date"].includes(field.type) ? field.type : "text"}
                  onChange={(event) => {
                    const type = event.target.value as "text" | "textarea" | "select" | "radio" | "checkbox" | "date";
                    const needsOptions = type === "select" || type === "radio" || type === "checkbox";
                    save(
                      fields.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, type, options: needsOptions ? item.options ?? [] : undefined } : item,
                      ),
                    );
                  }}
                >
                  <option value="text">{fieldText}</option>
                  <option value="textarea">{fieldTextarea}</option>
                  <option value="select">{fieldSelect}</option>
                  <option value="radio">{fieldRadio}</option>
                  <option value="checkbox">{fieldCheckbox}</option>
                  <option value="date">{fieldDate}</option>
                </select>
              </Field>
            )}
            {field.key === "unitType" ? (
              <p className="text-xs text-text-muted">{unitTypeHint}</p>
            ) : null}
            {field.type === "select" || field.type === "radio" || field.type === "checkbox" ? (
              <Field label={optionsLabel} hint={commaHint}>
                <Input
                  value={(field.options ?? []).join(", ")}
                  onChange={(event) =>
                    save(
                      fields.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, options: event.target.value.split(",").map((option) => option.trim()).filter(Boolean) } : item,
                      ),
                    )
                  }
                />
              </Field>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={field.required}
                disabled={locked}
                onChange={(event) => save(fields.map((item, itemIndex) => (itemIndex === index ? { ...item, required: event.target.checked } : item)))}
              />
              {requiredLabel}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={field.visible}
                disabled={locked && field.visible}
                onChange={(event) => save(fields.map((item, itemIndex) => (itemIndex === index ? { ...item, visible: event.target.checked } : item)))}
              />
              {visibleLabel}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={field.type === "name" || field.type === "phone" ? true : field.includeInNotification !== false}
                disabled={field.type === "name" || field.type === "phone"}
                onChange={(event) => save(fields.map((item, itemIndex) => (itemIndex === index ? { ...item, includeInNotification: event.target.checked } : item)))}
              />
              {includeLabel}
            </label>
            <div className="flex gap-3 text-xs">
              <button
                type="button"
                className="text-text-body disabled:text-text-muted"
                disabled={index === 0}
                onClick={() => {
                  const next = [...fields];
                  const [item] = next.splice(index, 1);
                  if (!item) return;
                  next.splice(index - 1, 0, item);
                  save(next);
                }}
              >
                {up}
              </button>
              <button
                type="button"
                className="text-text-body disabled:text-text-muted"
                disabled={index === fields.length - 1}
                onClick={() => {
                  const next = [...fields];
                  const [item] = next.splice(index, 1);
                  if (!item) return;
                  next.splice(index + 1, 0, item);
                  save(next);
                }}
              >
                {down}
              </button>
              {locked ? null : (
                <button type="button" className="text-text-muted" onClick={() => save(fields.filter((_, itemIndex) => itemIndex !== index))}>
                  {removeField}
                </button>
              )}
            </div>
          </div>
        );
      })}
      <Button
        type="button"
        variant="ghost"
        onClick={() =>
          save([
            ...fields,
            {
              key: `extra-${crypto.randomUUID()}`,
              type: "text",
              label: extraLabel,
              required: false,
              visible: true,
              includeInNotification: true,
            },
          ])
        }
      >
        {addItem}
      </Button>
    </div>
  );
}

function PremiumFields({
  selected,
  patchContent,
  upload,
}: {
  selected: PageSection;
  patchContent: (patch: Record<string, unknown>) => void;
  upload: (file: File) => Promise<string | null>;
}) {
  const items = premiumItems(selected.content.items);
  const up = usePanelText("editUp", "위로");
  const down = usePanelText("editDown", "아래로");
  const remove = usePanelText("editRemove", "삭제");
  const photoDelete = usePanelText("mediaPhotoDelete", "사진 삭제");
  const premiumTitle = usePanelText("shellPremiumList", "특장점");
  const boldHint = usePanelText("shellBoldPanel", "**이렇게** 감싸면 공개 페이지와 미리보기에서 굵게 보입니다. 편집 중에는 별표가 그대로 보입니다.");
  const iconCommunity = usePanelText("iconCommunity", "커뮤니티");
  const iconPark = usePanelText("iconPark", "조경");
  const iconParking = usePanelText("iconParking", "주차");
  const iconView = usePanelText("iconView", "전망");
  const iconTransit = usePanelText("iconTransit", "교통");
  const iconSchool = usePanelText("iconSchool", "교육");
  const iconSecurity = usePanelText("iconSecurity", "보안");
  const iconComplex = usePanelText("iconComplex", "단지");
  const accentTitle = usePanelText("panelAccentTitle", "강조 제목");
  const accentBody = usePanelText("panelAccentBody", "강조 설명");
  const photoCaption = usePanelText("panelPhotoCaption", "사진 설명");
  const photoCaptionHint = usePanelText("panelPhotoCaptionHint", "특장점 사진 아래에 보이는 한 줄입니다. 비우면 공개 페이지에서 숨깁니다.");
  const photoCaptionPh = usePanelText("phPhotoCaption", "사진 설명");
  const iconLabel = usePanelText("panelIcon", "아이콘");
  const itemTitle = usePanelText("panelHeading", "제목");
  const itemBody = usePanelText("panelItemBody", "설명");
  const photoLabel = usePanelText("panelPhoto", "사진");
  const imageUrlField = usePanelText("panelImageUrl", "이미지 주소");
  const httpsPh = usePanelText("phHttps", "https://");
  const addPremium = usePanelText("panelAddPremium", "특장점 추가");
  function save(next: PremiumItem[]) {
    patchContent({ items: next.slice(0, PREMIUM_ITEM_MAX) });
  }
  return (
    <>
      <HeadingBody selected={selected} patchContent={patchContent} />
      <Field label={accentTitle}>
        <Input value={String(selected.content.copyHeadline ?? "")} onChange={(event) => patchContent({ copyHeadline: event.target.value })} />
      </Field>
      <Field label={accentBody}>
        <Textarea value={String(selected.content.copyBody ?? "")} onChange={(event) => patchContent({ copyBody: event.target.value })} />
      </Field>
      <Field label={photoCaption} hint={photoCaptionHint}>
        <Input value={String(selected.content.galleryCaption ?? "")} placeholder={photoCaptionPh} onChange={(event) => patchContent({ galleryCaption: event.target.value })} />
      </Field>
      <p className="text-xs text-text-muted">{boldHint}</p>
      <div className="space-y-3">
        <p className="text-sm font-medium">{premiumTitle}</p>
        {items.map((item, index) => (
          <div key={`${item.title}-${index}`} className="space-y-2 rounded-[14px] border border-border p-3">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt="" className="h-28 w-full rounded-[8px] object-cover" />
            ) : null}
            <Field label={iconLabel}>
              <select
                className="ui-field w-full"
                value={item.icon}
                onChange={(event) => save(items.map((row, rowIndex) => (rowIndex === index ? { ...row, icon: event.target.value as PremiumItem["icon"] } : row)))}
              >
                {PREMIUM_ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon === "community" ? iconCommunity : icon === "park" ? iconPark : icon === "parking" ? iconParking : icon === "view" ? iconView : icon === "transit" ? iconTransit : icon === "school" ? iconSchool : icon === "security" ? iconSecurity : iconComplex}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={itemTitle}>
              <Input value={item.title} onChange={(event) => save(items.map((row, rowIndex) => (rowIndex === index ? { ...row, title: event.target.value } : row)))} />
            </Field>
            <Field label={itemBody}>
              <Textarea value={item.body} onChange={(event) => save(items.map((row, rowIndex) => (rowIndex === index ? { ...row, body: event.target.value } : row)))} />
            </Field>
            <Field label={photoLabel}>
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const imageUrl = await upload(file);
                  if (!imageUrl) return;
                  save(items.map((row, rowIndex) => (rowIndex === index ? { ...row, imageUrl } : row)));
                }}
              />
            </Field>
            <Field label={imageUrlField}>
              <Input
                value={String(item.imageUrl ?? "")}
                placeholder={httpsPh}
                onChange={(event) => save(items.map((row, rowIndex) => (rowIndex === index ? { ...row, imageUrl: event.target.value } : row)))}
              />
            </Field>
            {item.imageUrl ? (
              <button type="button" className="text-xs text-text-muted" onClick={() => save(items.map((row, rowIndex) => (rowIndex === index ? { ...row, imageUrl: "" } : row)))}>
                {photoDelete}
              </button>
            ) : null}
            <div className="flex gap-3 text-xs">
              <button type="button" className="text-text-body disabled:text-text-muted" disabled={index === 0} onClick={() => {
                const next = [...items];
                const [row] = next.splice(index, 1);
                if (!row) return;
                next.splice(index - 1, 0, row);
                save(next);
              }}>{up}</button>
              <button type="button" className="text-text-body disabled:text-text-muted" disabled={index === items.length - 1} onClick={() => {
                const next = [...items];
                const [row] = next.splice(index, 1);
                if (!row) return;
                next.splice(index + 1, 0, row);
                save(next);
              }}>{down}</button>
              <button type="button" className="text-danger disabled:text-text-muted" disabled={items.length <= 1} onClick={() => save(items.filter((_, rowIndex) => rowIndex !== index))}>{remove}</button>
            </div>
          </div>
        ))}
        <Button type="button" variant="ghost" disabled={items.length >= PREMIUM_ITEM_MAX} onClick={() => save([...items, { icon: PREMIUM_ICONS[items.length % PREMIUM_ICONS.length] ?? "community", title: "", body: "", imageUrl: "" }])}>
          {addPremium}
        </Button>
      </div>
    </>
  );
}

function LocationFields({
  selected,
  patchContent,
  upload,
}: {
  selected: PageSection;
  patchContent: (patch: Record<string, unknown>) => void;
  upload: (file: File) => Promise<string | null>;
}) {
  const cards = (selected.content.cards as Array<{ title: string; body: string; imageUrl?: string }>) ?? [];
  const matrix = locationMatrix(selected.content as { matrix?: LocationMatrixItem[] }) ?? LOCATION_MATRIX_DEFAULTS;
  const up = usePanelText("editUp", "위로");
  const down = usePanelText("editDown", "아래로");
  const remove = usePanelText("editRemove", "삭제");
  const photoDelete = usePanelText("mediaPhotoDelete", "사진 삭제");
  const matrixTitle = usePanelText("shellMatrixTitle", "입지 네 칸");
  const matrixHint = usePanelText("shellMatrixHint", "교통, 생활, 교육, 녹지처럼 네 가지로 고정됩니다. 아이콘을 누르면 다음 모양으로 바뀝니다.");
  const cardsTitle = usePanelText("shellLocationCards", "입지 카드");
  const iconTransit = usePanelText("iconTransit", "교통");
  const iconLife = usePanelText("iconLife", "생활");
  const iconSchool = usePanelText("iconSchool", "교육");
  const iconGreen = usePanelText("iconGreen", "녹지");
  const iconLabel = usePanelText("panelIcon", "아이콘");
  const category = usePanelText("panelCategory", "분류");
  const itemBody = usePanelText("panelItemBody", "설명");
  const itemTitle = usePanelText("panelHeading", "제목");
  const photoLabel = usePanelText("panelPhoto", "사진");
  const addCard = usePanelText("panelAddCard", "카드 추가");
  function save(next: Array<{ title: string; body: string; imageUrl?: string }>) {
    patchContent({ cards: next });
  }
  function saveMatrix(next: LocationMatrixItem[]) {
    patchContent({ matrix: next });
  }
  return (
    <>
      <HeadingBody selected={selected} patchContent={patchContent} />
      <div className="space-y-3">
        <p className="text-sm font-medium">{matrixTitle}</p>
        <p className="text-xs text-text-muted">{matrixHint}</p>
        {matrix.map((row, index) => (
          <div key={`matrix-${index}`} className="space-y-2 rounded-[14px] border border-border p-3">
            <Field label={iconLabel}>
              <select
                className="ui-field w-full"
                value={row.icon}
                onChange={(event) => saveMatrix(matrix.map((item, itemIndex) => (itemIndex === index ? { ...item, icon: event.target.value as LocationMatrixItem["icon"] } : item)))}
              >
                {LOCATION_MATRIX_ICONS.map((icon) => (
                  <option key={icon} value={icon}>{icon === "transit" ? iconTransit : icon === "life" ? iconLife : icon === "school" ? iconSchool : iconGreen}</option>
                ))}
              </select>
            </Field>
            <Field label={category}>
              <Input value={row.label} onChange={(event) => saveMatrix(matrix.map((item, itemIndex) => (itemIndex === index ? { ...item, label: event.target.value } : item)))} />
            </Field>
            <Field label={itemBody}>
              <Textarea value={row.body} onChange={(event) => saveMatrix(matrix.map((item, itemIndex) => (itemIndex === index ? { ...item, body: event.target.value } : item)))} />
            </Field>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <p className="text-sm font-medium">{cardsTitle}</p>
        {cards.map((card, index) => (
          <div key={`${card.title}-${index}`} className="space-y-2 rounded-[14px] border border-border p-3">
            {card.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.imageUrl} alt="" className="h-28 w-full rounded-[8px] object-cover" />
            ) : null}
            <Field label={itemTitle}>
              <Input value={card.title} onChange={(event) => save(cards.map((row, rowIndex) => (rowIndex === index ? { ...row, title: event.target.value } : row)))} />
            </Field>
            <Field label={itemBody}>
              <Textarea value={card.body} onChange={(event) => save(cards.map((row, rowIndex) => (rowIndex === index ? { ...row, body: event.target.value } : row)))} />
            </Field>
            <Field label={photoLabel}>
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const imageUrl = await upload(file);
                  if (!imageUrl) return;
                  save(cards.map((row, rowIndex) => (rowIndex === index ? { ...row, imageUrl } : row)));
                }}
              />
            </Field>
            {card.imageUrl ? (
              <button type="button" className="text-xs text-text-muted" onClick={() => save(cards.map((row, rowIndex) => (rowIndex === index ? { ...row, imageUrl: "" } : row)))}>
                {photoDelete}
              </button>
            ) : null}
            <div className="flex gap-3 text-xs">
              <button
                type="button"
                className="text-text-body disabled:text-text-muted"
                disabled={index === 0}
                onClick={() => {
                  const next = [...cards];
                  const [row] = next.splice(index, 1);
                  if (!row) return;
                  next.splice(index - 1, 0, row);
                  save(next);
                }}
              >
                {up}
              </button>
              <button
                type="button"
                className="text-text-body disabled:text-text-muted"
                disabled={index === cards.length - 1}
                onClick={() => {
                  const next = [...cards];
                  const [row] = next.splice(index, 1);
                  if (!row) return;
                  next.splice(index + 1, 0, row);
                  save(next);
                }}
              >
                {down}
              </button>
              <button type="button" className="text-danger" onClick={() => save(cards.filter((_, rowIndex) => rowIndex !== index))}>
                {remove}
              </button>
            </div>
          </div>
        ))}
        <Button type="button" variant="ghost" onClick={() => save([...cards, { title: "", body: "" }])}>
          {addCard}
        </Button>
      </div>
    </>
  );
}

function HeadingBody({
  selected,
  patchContent,
}: {
  selected: PageSection;
  patchContent: (patch: Record<string, unknown>) => void;
}) {
  const heading = usePanelText("panelHeading", "제목");
  const eyebrow = usePanelText("panelEyebrow", "작은 제목");
  const eyebrowHint = usePanelText("panelEyebrowHint", "큰 제목 위에 보이는 짧은 분류입니다. 비우면 기본 문구를 씁니다.");
  const body = usePanelText("panelBody", "본문");
  const eyebrowKey = SECTION_EYEBROW_KEY[selected.sectionType];
  const eyebrowFallback = sectionEyebrowText(undefined, selected.sectionType) || "작은 제목";
  const eyebrowPh = usePanelText(eyebrowKey ?? "phEyebrow", eyebrowFallback);
  return (
    <>
      <Field label={heading}>
        <Input
          value={String(selected.content.heading ?? "")}
          onChange={(event) => patchContent({ heading: event.target.value })}
        />
      </Field>
      {hasSectionEyebrow(selected.sectionType) ? (
        <Field label={eyebrow} hint={eyebrowHint}>
          <Input
            value={String(selected.content.eyebrow ?? "")}
            placeholder={eyebrowPh}
            onChange={(event) => patchContent({ eyebrow: event.target.value })}
          />
        </Field>
      ) : null}
      <Field label={body}>
        <Textarea
          value={String(selected.content.body ?? "")}
          onChange={(event) => patchContent({ body: event.target.value })}
        />
      </Field>
    </>
  );
}

function HeroFields({
  selected,
  snapshot,
  onPhoneChange,
  patchContent,
  upload,
}: {
  selected: PageSection;
  snapshot: PageSnapshot;
  onPhoneChange: (phone: string) => void;
  patchContent: (patch: Record<string, unknown>) => void;
  upload: (file: File) => Promise<string>;
}) {
  const mobileDelete = usePanelText("mediaMobileDelete", "모바일 이미지 삭제");
  const kicker = usePanelText("panelKicker", "상단 라벨");
  const region1 = usePanelText("panelRegion1", "시·도");
  const region1Hint = usePanelText("panelRegion1Hint", "현장명 위에 짧게 적습니다. 둘 다 비우면 공개 페이지에서 숨깁니다.");
  const region1Sample = usePanelText("phRegion1Sample", "서울");
  const region2 = usePanelText("panelRegion2", "시·군·구");
  const region2Sample = usePanelText("phRegion2Sample", "강남구");
  const headline = usePanelText("panelSiteHeadline", "현장명 / 헤드라인");
  const subheadline = usePanelText("panelSubheadline", "핵심 카피");
  const priceLabel = usePanelText("panelPriceLabel", "가격 이름");
  const priceType = usePanelText("panelPriceType", "가격 유형");
  const price = usePanelText("panelPrice", "가격");
  const priceSub = usePanelText("panelPriceSub", "비교 금액");
  const priceNote = usePanelText("panelPriceNote", "가격 안내");
  const benefit = usePanelText("panelBenefit", "혜택 문구");
  const benefitBadge = usePanelText("panelBenefitBadge", "혜택 배지");
  const benefitBadgeHint = usePanelText("panelBenefitBadgeHint", "비우면 혜택으로 보입니다.");
  const boldHint = usePanelText("panelHeroBold", "**이렇게** 감싸면 공개 페이지에서 굵게 보입니다.");
  const trust = usePanelText("panelTrust", "신뢰 문구");
  const trustText = usePanelText("panelTrustText", "문구");
  const priceLine = usePanelText("panelPriceLine", "분양가 한 줄");
  const cta = usePanelText("panelCta", "등록 버튼 문구");
  const dock = usePanelText("panelDock", "좁은 화면 문의 버튼");
  const dockHint = usePanelText("panelDockHint", "휴대폰에서 문의 창을 열기 전에 보이는 버튼입니다. 비우면 분양문의로 보입니다.");
  const dockClose = usePanelText("panelDockClose", "좁은 화면 닫기");
  const dockCloseHint = usePanelText("panelDockCloseHint", "문의 창을 연 뒤 닫는 글자입니다. 비우면 닫기로 보입니다.");
  const phoneBtn = usePanelText("panelPhoneBtn", "전화 버튼 문구");
  const headerPhone = usePanelText("panelHeaderPhone", "상단 전화 이름");
  const headerPhoneHint = usePanelText("panelHeaderPhoneHint", "넓은 화면 상단의 대표 전화 위입니다. 비우면 문의번호로 보입니다.");
  const consultPhone = usePanelText("panelConsultPhone", "상담 전화");
  const emptyMedia = usePanelText("panelEmptyMedia", "대표 이미지가 없을 때");
  const emptyMediaHint = usePanelText("panelEmptyMediaHint", "상품형에서는 공개 페이지에도 보입니다. 다른 형은 편집 중에만 보입니다. 비우면 대표 이미지를 올려 주세요로 보입니다.");
  const emptyMediaPh = usePanelText("phEmptyMedia", "대표 이미지를 올려 주세요");
  const imageAlt = usePanelText("panelImageAlt", "대표 이미지 이름");
  const imageAltHint = usePanelText("panelImageAltHint", "사진을 읽어 주는 이름입니다. 비우면 이름을 붙이지 않습니다.");
  const imagePosition = usePanelText("panelImagePosition", "이미지 위치");
  const imagePositionHint = usePanelText("panelImagePositionHint", "잘리는 방향입니다. 가운데·위·아래·왼쪽·오른쪽.");
  const posCenter = usePanelText("panelPosCenter", "가운데");
  const posTop = usePanelText("panelPosTop", "위");
  const posBottom = usePanelText("panelPosBottom", "아래");
  const posLeft = usePanelText("panelPosLeft", "왼쪽");
  const posRight = usePanelText("panelPosRight", "오른쪽");
  const heroImage = usePanelText("panelHeroImage", "히어로 이미지");
  const imageUrlField = usePanelText("panelImageUrl", "이미지 주소");
  const imageUrlHint = usePanelText("panelImageUrlHint", "파일 업로드가 안 되는 환경에서는 https 주소를 넣으세요.");
  const mobileImage = usePanelText("panelMobileImage", "모바일 이미지");
  const mobileImageHint = usePanelText("panelMobileImageHint", "휴대폰과 모바일 미리보기에서 대표 이미지 대신 보입니다.");
  const mobileImageUrlField = usePanelText("panelMobileImageUrl", "모바일 이미지 주소");
  const heroVideo = usePanelText("panelHeroVideo", "히어로 영상");
  const heroVideoHint = usePanelText("panelHeroVideoHint", "3.5MB를 넘는 영상은 주소로 넣으세요.");
  const videoUrl = usePanelText("panelVideoUrl", "영상 주소");
  const httpsPh = usePanelText("phHttps", "https://");
  const poster = usePanelText("panelPoster", "포스터 이미지");
  const posterUrlField = usePanelText("panelPosterUrl", "포스터 주소");
  const priceLabelPh = usePanelText("phPriceLabelSample", "분양가");
  const benefitBadgePh = usePanelText("formPerkItemPh", "혜택");
  const dockPh = usePanelText("phDock", "분양문의");
  const dockClosePh = usePanelText("shellPopupClosePh", "닫기");
  const headerPhonePh = usePanelText("phPhoneCaption", "문의번호");
  return (
    <>
      <Field label={kicker}>
        <Input value={String(selected.content.kicker ?? "")} onChange={(event) => patchContent({ kicker: event.target.value })} />
      </Field>
      <Field label={region1} hint={region1Hint}>
        <Input
          value={String(selected.content.region1 || (!String(selected.content.region2 ?? "").trim() ? selected.content.region ?? "" : ""))}
          placeholder={region1Sample}
          onChange={(event) =>
            patchContent({
              region1: event.target.value,
              region2: String(selected.content.region2 ?? ""),
              region: "",
            })
          }
        />
      </Field>
      <Field label={region2}>
        <Input
          value={String(selected.content.region2 ?? "")}
          placeholder={region2Sample}
          onChange={(event) =>
            patchContent({
              region2: event.target.value,
              region1: String(selected.content.region1 || selected.content.region || ""),
              region: "",
            })
          }
        />
      </Field>
      <Field label={headline}>
        <Input value={String(selected.content.headline ?? "")} onChange={(event) => patchContent({ headline: event.target.value })} />
      </Field>
      <Field label={subheadline}>
        <Textarea
          value={String(selected.content.subheadline ?? "")}
          onChange={(event) => patchContent({ subheadline: event.target.value })}
        />
      </Field>
      {snapshot.templateCode === "image-focus" || snapshot.templateCode === "info" ? (
        <>
          <Field label={priceLabel}>
            <Input value={String(selected.content.priceLabel ?? "")} placeholder={priceLabelPh} onChange={(event) => patchContent({ priceLabel: event.target.value })} />
          </Field>
          <Field label={priceType}>
            <Input value={String(selected.content.priceType ?? "")} placeholder={priceLabelPh} onChange={(event) => patchContent({ priceType: event.target.value })} />
          </Field>
          <Field label={price}>
            <Input value={String(selected.content.priceMain ?? selected.content.priceLine ?? "")} onChange={(event) => patchContent({ priceMain: event.target.value })} />
          </Field>
          <Field label={priceSub}>
            <Input value={String(selected.content.priceSub ?? "")} onChange={(event) => patchContent({ priceSub: event.target.value })} />
          </Field>
          <Field label={priceNote}>
            <Textarea value={String(selected.content.priceNote ?? "")} onChange={(event) => patchContent({ priceNote: event.target.value })} />
          </Field>
          {snapshot.templateCode === "image-focus" ? (
            <>
              <Field label={benefit}>
                <Input value={String(selected.content.benefit ?? "")} onChange={(event) => patchContent({ benefit: event.target.value })} />
              </Field>
              <Field label={benefitBadge} hint={benefitBadgeHint}>
                <Input value={String(selected.content.benefitBadge ?? "")} placeholder={benefitBadgePh} onChange={(event) => patchContent({ benefitBadge: event.target.value })} />
              </Field>
              <p className="text-xs text-text-muted">{boldHint}</p>
              <PairList
                label={trust}
                items={((selected.content.trustTags as Array<{ text?: string } | string>) ?? []).map((item) =>
                  typeof item === "string" ? { text: item } : { text: String(item.text ?? "") },
                )}
                fields={[{ key: "text", label: trustText }]}
                onChange={(trustTags) => patchContent({ trustTags })}
                minItems={1}
                maxItems={8}
              />
            </>
          ) : (
            <Field label={priceLine}>
              <Input value={String(selected.content.priceLine ?? "")} onChange={(event) => patchContent({ priceLine: event.target.value })} />
            </Field>
          )}
        </>
      ) : null}
      <Field label={cta}>
        <Input value={String(selected.content.ctaLabel ?? "")} onChange={(event) => patchContent({ ctaLabel: event.target.value })} />
      </Field>
      <Field label={dock} hint={dockHint}>
        <Input value={String(selected.content.dockLabel ?? "")} placeholder={dockPh} onChange={(event) => patchContent({ dockLabel: event.target.value })} />
      </Field>
      <Field label={dockClose} hint={dockCloseHint}>
        <Input value={String(selected.content.dockCloseLabel ?? "")} placeholder={dockClosePh} onChange={(event) => patchContent({ dockCloseLabel: event.target.value })} />
      </Field>
      <Field label={phoneBtn}>
        <Input value={String(selected.content.phoneLabel ?? "")} onChange={(event) => patchContent({ phoneLabel: event.target.value })} />
      </Field>
      <Field label={headerPhone} hint={headerPhoneHint}>
        <Input value={String(selected.content.headerPhoneLabel ?? "")} placeholder={headerPhonePh} onChange={(event) => patchContent({ headerPhoneLabel: event.target.value })} />
      </Field>
      <Field label={consultPhone}>
        <Input value={snapshot.phone} onChange={(event) => onPhoneChange(event.target.value)} />
      </Field>
      <Field label={emptyMedia} hint={emptyMediaHint}>
        <Input value={String(selected.content.emptyMediaLabel ?? "")} placeholder={emptyMediaPh} onChange={(event) => patchContent({ emptyMediaLabel: event.target.value })} />
      </Field>
      <Field label={imageAlt} hint={imageAltHint}>
        <Input value={String(selected.content.imageAlt ?? "")} onChange={(event) => patchContent({ imageAlt: event.target.value })} />
      </Field>
      <Field label={imagePosition} hint={imagePositionHint}>
        <select
          className="ui-field"
          value={String(selected.content.imageObjectPosition ?? "center")}
          onChange={(event) => patchContent({ imageObjectPosition: event.target.value })}
        >
          <option value="center">{posCenter}</option>
          <option value="top">{posTop}</option>
          <option value="bottom">{posBottom}</option>
          <option value="left">{posLeft}</option>
          <option value="right">{posRight}</option>
        </select>
      </Field>
      <Field label={heroImage}>
        <input
          type="file"
          accept="image/*"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const imageUrl = await upload(file);
            if (!imageUrl) return;
            patchContent({ imageUrl, mediaMode: "image" });
          }}
        />
      </Field>
      <Field label={imageUrlField} hint={imageUrlHint}>
        <Input
          value={String(selected.content.imageUrl ?? "")}
          placeholder={httpsPh}
          onChange={(event) => patchContent({ imageUrl: event.target.value, mediaMode: event.target.value ? "image" : selected.content.mediaMode })}
        />
      </Field>
      <Field label={mobileImage} hint={mobileImageHint}>
        <input
          type="file"
          accept="image/*"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const mobileImageUrl = await upload(file);
            if (!mobileImageUrl) return;
            patchContent({ mobileImageUrl });
          }}
        />
        {String(selected.content.mobileImageUrl ?? "") ? (
          <button type="button" className="mt-2 text-xs text-text-muted" onClick={() => patchContent({ mobileImageUrl: "" })}>
            {mobileDelete}
          </button>
        ) : null}
      </Field>
      <Field label={mobileImageUrlField}>
        <Input
          value={String(selected.content.mobileImageUrl ?? "")}
          placeholder={httpsPh}
          onChange={(event) => patchContent({ mobileImageUrl: event.target.value })}
        />
      </Field>
      {snapshot.templateCode === "video-ready" || snapshot.templateCode === "forest" ? (
        <>
          <Field label={heroVideo} hint={heroVideoHint}>
            <input
              type="file"
              accept="video/mp4,video/webm"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const videoUrl = await upload(file);
                if (!videoUrl) return;
                patchContent({ videoUrl, mediaMode: "video" });
              }}
            />
          </Field>
          <Field label={videoUrl}>
            <Input
              value={String(selected.content.videoUrl ?? "")}
              placeholder={httpsPh}
              onChange={(event) => patchContent({ videoUrl: event.target.value, mediaMode: event.target.value ? "video" : "image" })}
            />
          </Field>
          <Field label={poster}>
            <input
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const posterUrl = await upload(file);
                if (!posterUrl) return;
                patchContent({ posterUrl });
              }}
            />
          </Field>
          <Field label={posterUrlField}>
            <Input value={String(selected.content.posterUrl ?? "")} placeholder={httpsPh} onChange={(event) => patchContent({ posterUrl: event.target.value })} />
          </Field>
        </>
      ) : null}
    </>
  );
}

function PairList<T extends Record<string, string>>({
  label,
  items,
  fields,
  onChange,
  minItems = 0,
  maxItems,
}: {
  label: string;
  items: T[];
  fields: Array<{ key: keyof T & string; label: string; multiline?: boolean }>;
  onChange: (next: T[]) => void;
  minItems?: number;
  maxItems?: number;
}) {
  const up = usePanelText("editUp", "위로");
  const down = usePanelText("editDown", "아래로");
  const remove = usePanelText("editRemove", "삭제");
  const add = usePanelText("editAddItem", "항목 추가");
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {items.map((item, index) => (
        <div key={index} className="space-y-2 border border-border p-3">
          {fields.map((field) => (
            <Field key={field.key} label={field.label}>
              {field.multiline ? (
                <Textarea
                  value={item[field.key] ?? ""}
                  onChange={(event) =>
                    onChange(items.map((row, i) => (i === index ? { ...row, [field.key]: event.target.value } : row)))
                  }
                />
              ) : (
                <Input
                  value={item[field.key] ?? ""}
                  onChange={(event) =>
                    onChange(items.map((row, i) => (i === index ? { ...row, [field.key]: event.target.value } : row)))
                  }
                />
              )}
            </Field>
          ))}
          <div className="flex gap-3 text-xs">
            <button
              type="button"
              className="text-text-body disabled:text-text-muted"
              disabled={index === 0}
              onClick={() => {
                const next = [...items];
                const [row] = next.splice(index, 1);
                if (!row) return;
                next.splice(index - 1, 0, row);
                onChange(next);
              }}
            >
              {up}
            </button>
            <button
              type="button"
              className="text-text-body disabled:text-text-muted"
              disabled={index === items.length - 1}
              onClick={() => {
                const next = [...items];
                const [row] = next.splice(index, 1);
                if (!row) return;
                next.splice(index + 1, 0, row);
                onChange(next);
              }}
            >
              {down}
            </button>
            <button type="button" className="text-danger" disabled={items.length <= minItems} onClick={() => onChange(items.filter((_, i) => i !== index))}>
              {remove}
            </button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        disabled={maxItems !== undefined && items.length >= maxItems}
        onClick={() => onChange([...items, Object.fromEntries(fields.map((field) => [field.key, ""])) as T])}
      >
        {add}
      </Button>
    </div>
  );
}

function GalleryFields({
  selected,
  patchContent,
  upload,
}: {
  selected: PageSection;
  patchContent: (patch: Record<string, unknown>) => void;
  upload: (file: File) => Promise<string>;
}) {
  const images = (selected.content.images as Array<{ url?: string; alt: string }>) ?? [];
  const forward = usePanelText("editForward", "앞으로");
  const back = usePanelText("editBack", "뒤로");
  const remove = usePanelText("editRemove", "삭제");
  const addMany = usePanelText("mediaAddMany", "이미지 여러 장 추가");
  const firstPhoto = usePanelText("shellFirstPhoto", "첫 사진이 대표 이미지입니다.");
  const emptyPhoto = usePanelText("panelEmptyPhoto", "사진이 없을 때");
  const emptyPhotoHint = usePanelText("panelEmptyPhotoHint", "편집 중 빈 칸에 보입니다. 비우면 이미지로 보입니다.");
  const emptyPhotoPh = usePanelText("phImageEmpty", "이미지");
  const representative = usePanelText("panelRepresentative", "대표 표시");
  const representativeHint = usePanelText("panelRepresentativeHint", "첫 사진 위에 겹칩니다. 비우면 대표로 보입니다.");
  const representativePh = usePanelText("phBadgeMain", "대표");
  const itemBody = usePanelText("panelItemBody", "설명");
  const imageUrlField = usePanelText("panelImageUrl", "이미지 주소");
  const imageUrlHint = usePanelText("panelImageUrlHint", "파일 업로드가 안 되는 환경에서는 https 주소를 넣으세요.");
  const httpsPh = usePanelText("phHttps", "https://");
  const addByUrl = usePanelText("panelAddImageUrl", "주소로 사진 추가");
  return (
    <>
      <HeadingBody selected={selected} patchContent={patchContent} />
      <Field label={emptyPhoto} hint={emptyPhotoHint}>
        <Input value={String(selected.content.emptyImageLabel ?? "")} placeholder={emptyPhotoPh} onChange={(event) => patchContent({ emptyImageLabel: event.target.value })} />
      </Field>
      <Field label={representative} hint={representativeHint}>
        <Input value={String(selected.content.representativeLabel ?? "")} placeholder={representativePh} onChange={(event) => patchContent({ representativeLabel: event.target.value })} />
      </Field>
      <div className="space-y-3">
        {images.map((image, index) => (
          <div key={`${image.url}-${index}`} className="space-y-2 rounded-[14px] border border-border p-3">
            {image.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.url} alt="" className="h-24 w-full rounded-[8px] object-cover" />
            ) : null}
            <Field label={imageUrlField} hint={imageUrlHint}>
              <Input
                value={String(image.url ?? "")}
                placeholder={httpsPh}
                onChange={(event) =>
                  patchContent({ images: images.map((row, rowIndex) => (rowIndex === index ? { ...row, url: event.target.value } : row)) })
                }
              />
            </Field>
            <Field label={itemBody}>
              <Input
                value={image.alt}
                onChange={(event) =>
                  patchContent({ images: images.map((row, rowIndex) => (rowIndex === index ? { ...row, alt: event.target.value } : row)) })
                }
              />
            </Field>
            {index === 0 ? <p className="text-xs text-text-muted">{firstPhoto}</p> : null}
            <div className="flex gap-3 text-xs">
              <button
                type="button"
                className="text-text-body disabled:text-text-muted"
                disabled={index === 0}
                onClick={() => {
                  const next = [...images];
                  const [item] = next.splice(index, 1);
                  next.splice(index - 1, 0, item);
                  patchContent({ images: next });
                }}
              >
                {forward}
              </button>
              <button
                type="button"
                className="text-text-body disabled:text-text-muted"
                disabled={index === images.length - 1}
                onClick={() => {
                  const next = [...images];
                  const [item] = next.splice(index, 1);
                  next.splice(index + 1, 0, item);
                  patchContent({ images: next });
                }}
              >
                {back}
              </button>
              <button type="button" className="text-danger" onClick={() => patchContent({ images: images.filter((_, rowIndex) => rowIndex !== index) })}>
                {remove}
              </button>
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="soft"
        disabled={images.length >= GALLERY_IMAGE_MAX}
        onClick={async () => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.multiple = true;
          input.onchange = async () => {
            const files = Array.from(input.files ?? []);
            const added: Array<{ url: string; alt: string }> = [];
            for (const file of files) {
              const url = await upload(file);
              if (url) added.push({ url, alt: "" });
            }
            if (added.length) patchContent({ images: [...images, ...added].slice(0, GALLERY_IMAGE_MAX) });
          };
          input.click();
        }}
      >
        {addMany}
      </Button>
      <Button
        type="button"
        variant="soft"
        disabled={images.length >= GALLERY_IMAGE_MAX}
        onClick={() => patchContent({ images: [...images, { url: "", alt: "" }].slice(0, GALLERY_IMAGE_MAX) })}
      >
        {addByUrl}
      </Button>
    </>
  );
}

function FloorplanFields({
  selected,
  snapshot,
  upload,
  onSectionChange,
}: {
  selected: PageSection;
  snapshot: PageSnapshot;
  upload: (file: File) => Promise<string | null>;
  onSectionChange: (next: PageSection, draftPatch?: DraftPatch) => void;
}) {
  const types = (selected.content.types as Array<{ name: string; summary: string; imageUrl?: string; images?: FloorplanImage[]; activeImageIndex?: number; exclusiveArea?: string; supplyArea?: string; rooms?: string }>) ?? [];
  const floorSettings = snapshot.globalSettings as Record<string, unknown>;
  const up = usePanelText("editUp", "위로");
  const down = usePanelText("editDown", "아래로");
  const remove = usePanelText("editRemove", "삭제");
  const addItem = usePanelText("editAddItem", "항목 추가");
  const typeHint = usePanelText("shellFloorplanTypes", "타입명이 있으면 관심 타입 선택지에 같은 이름이 들어갑니다.");
  const specTitle = usePanelText("shellFloorplanSpecs", "면적·구성");
  const emptyPlan = usePanelText("panelEmptyPlan", "평면이 없을 때");
  const emptyPlanHint = usePanelText("panelEmptyPlanHint", "편집 중 빈 칸에 보입니다. 비우면 평면 이미지로 보입니다.");
  const emptyPlanPh = usePanelText("phPlanEmpty", "평면 이미지");
  const planAlt = usePanelText("panelPlanAlt", "사진 대체 문구");
  const planAltHint = usePanelText("panelPlanAltHint", "사진 설명이 없을 때 읽어 주는 이름입니다. 비우면 평면으로 둡니다.");
  const planAltPh = usePanelText("phPlanAlt", "평면");
  const typeName = usePanelText("panelTypeName", "타입명");
  const itemBody = usePanelText("panelItemBody", "설명");
  const planImage = usePanelText("panelPlanImage", "평면 이미지");
  const imageUrlField = usePanelText("panelImageUrl", "이미지 주소");
  const httpsPh = usePanelText("phHttps", "https://");
  const addByUrl = usePanelText("panelAddImageUrl", "주소로 사진 추가");
  const specItem = usePanelText("panelItem", "항목");
  const specValue = usePanelText("panelValue", "내용");
  const forward = usePanelText("editForward", "앞으로");
  const back = usePanelText("editBack", "뒤로");
  const addType = usePanelText("panelAddType", "타입 추가");
  function saveTypes(nextTypes: typeof types, activeTypeIndex?: number) {
    const names = unitTypeNames(nextTypes);
    const fields = withUnitTypeOptions(snapshot.formSettings.fields, names);
    const current = Number(selected.content.activeTypeIndex ?? 0) || 0;
    const nextActive = Math.min(Math.max(activeTypeIndex ?? current, 0), Math.max(0, nextTypes.length - 1));
    onSectionChange(
      { ...selected, content: { ...selected.content, types: nextTypes, activeTypeIndex: nextActive } },
      names.length > 0 ? { formSettings: { ...snapshot.formSettings, fields } } : undefined,
    );
  }
  function patchContent(patch: Record<string, unknown>) {
    onSectionChange({ ...selected, content: { ...selected.content, ...patch } });
  }
  return (
    <>
      <HeadingBody selected={selected} patchContent={patchContent} />
      <p className="text-xs text-text-muted">{typeHint}</p>
      <Field label={emptyPlan} hint={emptyPlanHint}>
        <Input value={String(selected.content.emptyImageLabel ?? "")} placeholder={emptyPlanPh} onChange={(event) => patchContent({ emptyImageLabel: event.target.value })} />
      </Field>
      <Field label={planAlt} hint={planAltHint}>
        <Input value={String(selected.content.planAlt ?? "")} placeholder={planAltPh} onChange={(event) => patchContent({ planAlt: event.target.value })} />
      </Field>
      <div className="space-y-3">
        {types.map((type, index) => (
          <div key={index} className="space-y-2 border border-border p-3">
            <Field label={typeName}>
              <Input
                value={type.name}
                onChange={(event) => saveTypes(types.map((row, i) => (i === index ? { ...row, name: event.target.value } : row)))}
              />
            </Field>
            <div className="space-y-2">
              <p className="text-sm font-medium">{specTitle}</p>
              {floorplanSpecs(type, floorSettings).map((spec, specIndex) => (
                <div key={`${spec.label}-${specIndex}`} className="grid grid-cols-2 gap-2">
                  <Input
                    value={spec.label}
                    placeholder={specItem}
                    onChange={(event) =>
                      saveTypes(
                        types.map((row, i) =>
                          i === index
                            ? withFloorplanSpecs(
                                row,
                                floorplanSpecs(row, floorSettings).map((item, itemIndex) =>
                                  itemIndex === specIndex ? { ...item, label: event.target.value } : item,
                                ),
                                floorSettings,
                              )
                            : row,
                        ),
                      )
                    }
                  />
                  <Input
                    value={spec.value}
                    placeholder={specValue}
                    onChange={(event) =>
                      saveTypes(
                        types.map((row, i) =>
                          i === index
                            ? withFloorplanSpecs(
                                row,
                                floorplanSpecs(row, floorSettings).map((item, itemIndex) =>
                                  itemIndex === specIndex ? { ...item, value: event.target.value } : item,
                                ),
                                floorSettings,
                              )
                            : row,
                        ),
                      )
                    }
                  />
                  {floorplanSpecs(type, floorSettings).length > 1 ? (
                    <button
                      type="button"
                      className="col-span-2 text-left text-xs text-danger"
                      onClick={() =>
                        saveTypes(
                          types.map((row, i) =>
                            i === index
                              ? withFloorplanSpecs(
                                  row,
                                  floorplanSpecs(row, floorSettings).filter((_, itemIndex) => itemIndex !== specIndex),
                                  floorSettings,
                                )
                              : row,
                          ),
                        )
                      }
                    >
                      {remove}
                    </button>
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                className="text-xs font-semibold text-primary disabled:text-text-muted"
                disabled={floorplanSpecs(type, floorSettings).length >= FLOORPLAN_SPEC_MAX}
                onClick={() =>
                  saveTypes(
                    types.map((row, i) =>
                      i === index
                        ? withFloorplanSpecs(row, [...floorplanSpecs(row, floorSettings), { label: specItem, value: "" }], floorSettings)
                        : row,
                    ),
                  )
                }
              >
                {addItem}
              </button>
            </div>
            <Field label={itemBody}>
              <Textarea
                value={type.summary}
                onChange={(event) => saveTypes(types.map((row, i) => (i === index ? { ...row, summary: event.target.value } : row)))}
              />
            </Field>
            <Field label={planImage}>
              {floorplanImages(type, floorSettings).map((image, imageIndex) => (
                <div key={`${image.url}-${imageIndex}`} className="mb-2 space-y-2">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt="" className="h-12 w-16 rounded-[8px] object-cover" />
                    <button
                      type="button"
                      className="text-xs text-text-body disabled:text-text-muted"
                      disabled={imageIndex === 0}
                      onClick={() => {
                        const next = [...floorplanImages(type, floorSettings)];
                        const [item] = next.splice(imageIndex, 1);
                        if (!item) return;
                        next.splice(imageIndex - 1, 0, item);
                        saveTypes(types.map((row, i) => (i === index ? withFloorplanImages(row, next, imageIndex - 1) : row)));
                      }}
                    >
                      {forward}
                    </button>
                    <button
                      type="button"
                      className="text-xs text-text-body disabled:text-text-muted"
                      disabled={imageIndex === floorplanImages(type, floorSettings).length - 1}
                      onClick={() => {
                        const next = [...floorplanImages(type, floorSettings)];
                        const [item] = next.splice(imageIndex, 1);
                        if (!item) return;
                        next.splice(imageIndex + 1, 0, item);
                        saveTypes(types.map((row, i) => (i === index ? withFloorplanImages(row, next, imageIndex + 1) : row)));
                      }}
                    >
                      {back}
                    </button>
                    <button
                      type="button"
                      className="text-xs text-danger"
                      onClick={() => {
                        const next = floorplanImages(type, floorSettings).filter((_, rowIndex) => rowIndex !== imageIndex);
                        saveTypes(types.map((row, i) => (i === index ? withFloorplanImages(row, next, 0) : row)));
                      }}
                    >
                      {remove}
                    </button>
                  </div>
                  <Field label={imageUrlField}>
                    <Input
                      value={image.url}
                      placeholder={httpsPh}
                      onChange={(event) => {
                        const next = floorplanImages(type, floorSettings).map((row, rowIndex) =>
                          rowIndex === imageIndex ? { ...row, url: event.target.value } : row,
                        );
                        saveTypes(types.map((row, i) => (i === index ? withFloorplanImages(row, next, imageIndex) : row)));
                      }}
                    />
                  </Field>
                  <Field label={itemBody}>
                    <Input
                      value={image.alt}
                      onChange={(event) => {
                        const next = floorplanImages(type, floorSettings).map((row, rowIndex) =>
                          rowIndex === imageIndex ? { ...row, alt: event.target.value } : row,
                        );
                        saveTypes(types.map((row, i) => (i === index ? withFloorplanImages(row, next, imageIndex) : row)));
                      }}
                    />
                  </Field>
                </div>
              ))}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={async (event) => {
                  const files = Array.from(event.target.files ?? []);
                  event.target.value = "";
                  const added: FloorplanImage[] = [];
                  for (const file of files) {
                    const url = await upload(file);
                    if (url) added.push({ url, alt: "" });
                  }
                  if (!added.length) return;
                  const next = [...floorplanImages(type, floorSettings), ...added].slice(0, GALLERY_IMAGE_MAX);
                  saveTypes(types.map((row, i) => (i === index ? withFloorplanImages(row, next, next.length - 1) : row)));
                }}
              />
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-primary disabled:text-text-muted"
                disabled={floorplanImages(type, floorSettings).length >= GALLERY_IMAGE_MAX}
                onClick={() => {
                  const next = [...floorplanImages(type, floorSettings), { url: "", alt: "" }].slice(0, GALLERY_IMAGE_MAX);
                  saveTypes(types.map((row, i) => (i === index ? withFloorplanImages(row, next, next.length - 1) : row)));
                }}
              >
                {addByUrl}
              </button>
            </Field>
            <div className="flex gap-3 text-xs">
              <button
                type="button"
                className="text-text-body disabled:text-text-muted"
                disabled={index === 0}
                onClick={() => {
                  const next = [...types];
                  const [item] = next.splice(index, 1);
                  if (!item) return;
                  next.splice(index - 1, 0, item);
                  saveTypes(next);
                }}
              >
                {up}
              </button>
              <button
                type="button"
                className="text-text-body disabled:text-text-muted"
                disabled={index === types.length - 1}
                onClick={() => {
                  const next = [...types];
                  const [item] = next.splice(index, 1);
                  if (!item) return;
                  next.splice(index + 1, 0, item);
                  saveTypes(next);
                }}
              >
                {down}
              </button>
              <button type="button" className="text-danger" disabled={types.length <= 1} onClick={() => saveTypes(types.filter((_, i) => i !== index))}>
                {remove}
              </button>
            </div>
          </div>
        ))}
        <Button type="button" variant="ghost" disabled={types.length >= 12} onClick={() => saveTypes([...types, { name: "", summary: "" }], types.length)}>
          {addType}
        </Button>
      </div>
    </>
  );
}
