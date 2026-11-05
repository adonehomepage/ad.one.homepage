"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MiddayLandingView } from "@midday/components/midday/MiddayLandingView";
import { presaleLandingDummyData } from "@midday/data/presale-landing-dummy";
import type { PresaleLandingData } from "@midday/types/presale-landing";

/**
 * 패키지 `http://localhost:3020/dev/lumiere-preview` 와 동일 조건 비교용.
 * - 원본 MiddayLandingView + CSS + 더미 데이터만 사용
 * - 애드잇 섹션 렌더러·편집기·회사 API/인증 미연결
 * - `?edit=1` 이면 패키지와 같이 편집 크롬만 표시
 */
export default function LumiereOriginComparePage() {
  return (
    <Suspense fallback={null}>
      <LumiereOriginCompareInner />
    </Suspense>
  );
}

function LumiereOriginCompareInner() {
  const searchParams = useSearchParams();
  const editMode = searchParams.get("edit") === "1";
  const [data, setData] = useState<PresaleLandingData>({
    ...presaleLandingDummyData,
    skin: "midday",
  });

  return (
    <main style={{ minHeight: "100vh", background: "#fff" }} data-compare="lumiere-origin">
      <MiddayLandingView data={data} editMode={editMode} onChange={setData} />
    </main>
  );
}
