"use client";

import { useState } from "react";
import type { PresaleProductInterestType } from "@midday/types/presale-landing";

type PresaleInterestTypePickerProps = {
  editMode: boolean;
  interestTypes: PresaleProductInterestType[];
  onChange: (next: PresaleProductInterestType[]) => void;
  /** select id — 페이지에 여러 개일 때 구분 */
  selectId?: string;
  className?: string;
  /** 어두운 등록 섹션(화보·포레스트 등)용 */
  onDark?: boolean;
};

/**
 * 관심 평형 옵션은 UNIT PLAN(평면) 타입과 자동 연동됩니다.
 * 편집 모드에서는 미리보기만 보여 주고, 추가·수정은 평면 섹션에서 합니다.
 */
export function PresaleInterestTypePicker({
  editMode,
  interestTypes,
  selectId = "presale-type-sel",
  className = "",
  onDark = false,
}: PresaleInterestTypePickerProps) {
  const [pickedTypes, setPickedTypes] = useState<{ id: string; name: string; sub: string }[]>([]);

  const addPickedType = (code: string) => {
    if (!code) return;
    const opt = interestTypes.find((item) => item.code === code);
    if (!opt || pickedTypes.some((p) => p.id === code)) return;
    setPickedTypes((prev) => [...prev, { id: code, name: opt.code, sub: opt.label }]);
  };

  const removePickedType = (id: string) => {
    setPickedTypes((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div
      className={`presale-option${onDark ? " presale-option--on-dark" : ""}${className ? ` ${className}` : ""}`}
    >
      <label htmlFor={editMode ? undefined : selectId}>관심 평형(타입) 선택</label>

      {editMode ? (
        <>
          <div className="presale-sel-wrap presale-sel-preview">
            <select disabled tabIndex={-1} aria-hidden>
              <option>평형을 선택하세요</option>
              {interestTypes.map((opt, i) => (
                <option key={i}>{opt.label}</option>
              ))}
            </select>
          </div>
          <p className="presale-interest-sync-hint">
            UNIT PLAN(평면) 타입과 자동으로 맞춰집니다. 타입 추가·이름 변경은 평면 섹션에서 하세요.
          </p>
          <ul className="presale-interest-sync-list">
            {interestTypes.map((opt) => (
              <li key={opt.code}>{opt.label}</li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <div className="presale-sel-wrap">
            <select
              id={selectId}
              defaultValue=""
              onChange={(e) => {
                addPickedType(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">평형을 선택하세요</option>
              {interestTypes.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {pickedTypes.length > 0 ? (
            <div className="presale-picked">
              {pickedTypes.map((p) => (
                <div key={p.id} className="presale-picked-card">
                  <div>
                    <div className="presale-picked-nm">{p.name}</div>
                    <div className="presale-picked-sub">{p.sub}</div>
                  </div>
                  <button
                    type="button"
                    className="presale-picked-rm"
                    onClick={() => removePickedType(p.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="presale-total">
            <span>선택한 관심 타입</span>
            <span>
              <b>{pickedTypes.length}</b> 개 타입
            </span>
          </div>
        </>
      )}
    </div>
  );
}
