import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "LUMIÈRE 원본 비교 (애드잇 격리)",
  description: "직방 midday 패키지와 동일 컴포넌트·더미 데이터 격리 미리보기. API·인증 미연결.",
  robots: { index: false, follow: false },
};

/**
 * 관리자 레이아웃·회사 API와 분리된 비교용 껍데기.
 * 글꼴은 루트 layout의 로컬 Pretendard를 쓴다.
 */
export default function LumiereOriginCompareLayout({ children }: { children: ReactNode }) {
  return children;
}
