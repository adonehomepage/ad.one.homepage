"use client";

import { createContext, useContext } from "react";

/** 원본 midday ↔ 애드잇 저장·업로드·리드 연결 */
export type MiddayAditBridgeValue = {
  /** 애드잇 프로젝트 id (업로드) */
  projectId: string | null;
  /** 공개 슬러그 (관심고객 등록 API) */
  publicSlug: string | null;
  /** true면 실제 리드 API 호출 없이 데모 성공 */
  leadDemoMode: boolean;
  /** 개인정보 제3자 제공 동의가 필수인지 */
  thirdPartyRequired?: boolean;
};

const MiddayAditBridgeContext = createContext<MiddayAditBridgeValue>({
  projectId: null,
  publicSlug: null,
  leadDemoMode: true,
  thirdPartyRequired: false,
});

export function MiddayAditBridgeProvider({
  value,
  children,
}: {
  value: MiddayAditBridgeValue;
  children: React.ReactNode;
}) {
  return <MiddayAditBridgeContext.Provider value={value}>{children}</MiddayAditBridgeContext.Provider>;
}

export function useMiddayAditBridge() {
  return useContext(MiddayAditBridgeContext);
}
