"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogBody, DialogFooter, DialogHeader, DialogShell } from "@/components/ui/dialog-shell";
import { Field, Input } from "@/components/ui/input";
import { useDialogFocusTrap } from "@/lib/a11y/dialog-focus";
import { isPlaceholderPartyName } from "@/modules/templates/definitions";
import type { PageSnapshot } from "@/types";

function label(settings: Record<string, unknown>, key: string, fallback: string) {
  return String(settings[key] ?? "").trim() || fallback;
}

/** 아직 정하지 않은 자리표시 문구는 입력값처럼 보이지 않게 비운다. */
function partyInputValue(value: string | null | undefined) {
  const text = String(value ?? "");
  return isPlaceholderPartyName(text) ? "" : text;
}

function SettingSwitch({ checked, label, onClick }: { checked: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`relative h-5 w-[34px] shrink-0 cursor-pointer rounded-full ${checked ? "bg-primary" : "bg-border"}`}
      onClick={onClick}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white ${checked ? "left-4" : "left-0.5"}`} />
    </button>
  );
}

type Props = {
  privacy: PageSnapshot["privacy"];
  settings: Record<string, unknown>;
  onChange: (privacy: PageSnapshot["privacy"]) => void;
  onClose: () => void;
};

/** 발행에 필요한 개인정보 주체·제3자 제공 최소 설정 */
export function PrivacySettingsDialog({ privacy, settings, onChange, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const thirdPartyRef = useRef<HTMLDivElement>(null);
  const wasThirdPartyOn = useRef(Boolean(privacy.thirdPartyProvisionEnabled));
  const [fieldsText, setFieldsText] = useState(() => (privacy.thirdPartyFields ?? []).join(", "));
  useDialogFocusTrap({ open: true, panelRef, onEscape: onClose });
  const controllerMissing =
    !privacy.collectingControllerName.trim() || isPlaceholderPartyName(privacy.collectingControllerName);
  const thirdPartyOn = Boolean(privacy.thirdPartyProvisionEnabled);
  const thirdPartyMissing =
    thirdPartyOn &&
    (!String(privacy.thirdPartyRecipientName ?? "").trim() ||
      !String(privacy.thirdPartyPurpose ?? "").trim() ||
      !(privacy.thirdPartyFields ?? []).some((field) => field.trim()) ||
      !String(privacy.thirdPartyRetentionDescription ?? "").trim());

  useEffect(() => {
    if (thirdPartyOn && !wasThirdPartyOn.current) {
      thirdPartyRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    wasThirdPartyOn.current = thirdPartyOn;
  }, [thirdPartyOn]);

  return (
    <DialogShell
      titleId="privacy-settings-title"
      panelRef={panelRef}
      onClose={onClose}
      closeLabel={label(settings, "shellClose", "닫기")}
      size="lg"
    >
      <DialogHeader
        titleId="privacy-settings-title"
        title={label(settings, "shellPrivacySettings", "개인정보·발행 설정")}
        onClose={onClose}
        closeLabel={label(settings, "shellClose", "닫기")}
      />
      <DialogBody className="space-y-2.5 py-3">
        <p className="text-sm leading-relaxed text-text-body">
          {label(
            settings,
            "shellPrivacySettingsBody",
            "관심고객이 동의할 때 보이는 회사 이름입니다. 첫 칸만 실제 상호를 적으면 발행할 수 있습니다.",
          )}
        </p>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text-primary">
            {label(settings, "privacyControllerLabel", "개인정보 수집 주체")}
          </span>
          <Input
            value={partyInputValue(privacy.collectingControllerName)}
            placeholder={label(settings, "privacyControllerPh", "예: ○○개발 주식회사")}
            onChange={(event) =>
              onChange({ ...privacy, collectingControllerName: event.target.value })
            }
          />
          <span className="block text-xs text-text-muted">동의문에 표시할 시행사 이름입니다.</span>
          {controllerMissing ? (
            <span className="block text-xs text-danger">
              {label(settings, "privacyControllerPlaceholderHint", "이 칸이 비어 있으면 발행할 수 없습니다.")}
            </span>
          ) : null}
        </label>
        <Field
          label={label(settings, "privacyOperatorLabel", "운영 법인(선택)")}
          hint="운영하는 회사가 다를 때만 적습니다."
        >
          <Input
            value={partyInputValue(privacy.operatingCompanyName)}
            placeholder={label(settings, "privacyOperatorPh", "예: ○○운영 주식회사")}
            onChange={(event) => onChange({ ...privacy, operatingCompanyName: event.target.value })}
          />
        </Field>
        <Field
          label={label(settings, "privacyAdvertiserLabel", "광고주(선택)")}
          hint="광고를 맡긴 회사가 다를 때만 적습니다."
        >
          <Input
            value={partyInputValue(privacy.advertiserCompanyName)}
            placeholder={label(settings, "privacyAdvertiserPh", "예: ○○건설")}
            onChange={(event) => onChange({ ...privacy, advertiserCompanyName: event.target.value })}
          />
        </Field>
        <div ref={thirdPartyRef} className="rounded-[16px] border border-border bg-surface p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">제3자 제공</p>
              <p className="mt-0.5 text-xs text-text-muted">다른 회사에 고객 정보를 넘길 때만 켜세요.</p>
            </div>
            <SettingSwitch
              checked={thirdPartyOn}
              label={label(settings, "privacyThirdToggle", "개인정보 제3자 제공 동의 받기")}
              onClick={() => onChange({ ...privacy, thirdPartyProvisionEnabled: !thirdPartyOn })}
            />
          </div>
          {thirdPartyOn ? (
            <div className="mt-2.5 space-y-2.5 border-t border-border pt-2.5">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                <Field label={label(settings, "privacyThirdRecipient", "제공받는 자")}>
                  <Input
                    value={privacy.thirdPartyRecipientName ?? ""}
                    placeholder="예: ○○중개"
                    onChange={(event) =>
                      onChange({ ...privacy, thirdPartyRecipientName: event.target.value })
                    }
                  />
                </Field>
                <Field label={label(settings, "privacyThirdPurpose", "제공 목적")}>
                  <Input
                    value={privacy.thirdPartyPurpose ?? ""}
                    placeholder="예: 분양 상담"
                    onChange={(event) => onChange({ ...privacy, thirdPartyPurpose: event.target.value })}
                  />
                </Field>
                <Field label={label(settings, "privacyThirdFields", "제공 항목")}>
                  <Input
                    value={fieldsText}
                    placeholder="예: 이름, 연락처"
                    onChange={(event) => {
                      const text = event.target.value;
                      setFieldsText(text);
                      onChange({
                        ...privacy,
                        thirdPartyFields: text
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean),
                      });
                    }}
                  />
                </Field>
                <Field label={label(settings, "privacyThirdRetention", "보유 기간")}>
                  <Input
                    value={privacy.thirdPartyRetentionDescription ?? ""}
                    placeholder="예: 1년"
                    onChange={(event) =>
                      onChange({ ...privacy, thirdPartyRetentionDescription: event.target.value })
                    }
                  />
                </Field>
              </div>
              {thirdPartyMissing ? (
                <p className="text-xs text-danger">하나라도 비어 있으면 발행할 수 없습니다.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </DialogBody>
      <DialogFooter className="bg-white py-3">
        <Button scale="sm" onClick={onClose}>
          {label(settings, "shellDone", "완료")}
        </Button>
      </DialogFooter>
    </DialogShell>
  );
}
