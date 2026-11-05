"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PageSnapshot } from "@/types";
import type { PresaleLandingData } from "@midday/types/presale-landing";
import { MiddayLandingView } from "@midday/components/midday/MiddayLandingView";
import { PresaleImageUploadContext } from "@midday/components/PresaleImageUploadContext";
import { MiddayAditBridgeProvider } from "@midday/adit-bridge";
import { readMiddayPresaleDataForSnapshot } from "@midday/midday-data";

type Props = {
  snapshot: PageSnapshot;
  editMode: boolean;
  projectId?: string | null;
  /** 공개 페이지에서만 실제 리드 API 호출 */
  leadLive?: boolean;
  onChange?: (data: PresaleLandingData) => void;
  previewDevice?: "desktop" | "tablet" | "mobile";
  /** 편집기 팝업 미리보기 — 원본 뷰 복원 후 step4에서 최소 연결 예정 */
  forcePopup?: boolean;
  onClosePopup?: () => void;
};

/**
 * 원본 midday 렌더러 호스트.
 * CSS는 MiddayLandingView 내부 import로만 로드되어 관리자 화면과 격리된다.
 */
export function MiddayOriginHost({
  snapshot,
  editMode,
  projectId = null,
  leadLive = false,
  onChange,
  previewDevice,
  forcePopup = false,
  onClosePopup,
}: Props) {
  const seedKey = useMemo(
    () =>
      JSON.stringify({
        midday: snapshot.globalSettings?.middayPresaleData ?? null,
        name: snapshot.projectName,
        phone: snapshot.phone,
      }),
    [snapshot.globalSettings?.middayPresaleData, snapshot.projectName, snapshot.phone],
  );
  const [data, setData] = useState<PresaleLandingData>(() =>
    readMiddayPresaleDataForSnapshot(snapshot),
  );
  const [uploadBusy, setUploadBusy] = useState(0);
  const seedKeyRef = useRef(seedKey);
  const seededRef = useRef(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (seedKeyRef.current === seedKey) return;
    seedKeyRef.current = seedKey;
    const next = readMiddayPresaleDataForSnapshot(snapshot);
    dataRef.current = next;
    setData(next);
    seededRef.current = false;
  }, [seedKey, snapshot]);

  // info/midday에 원본 데이터가 없으면 패키지와 동일 더미를 한 번 심어 레이아웃·카피가 어긋나지 않게 한다.
  useEffect(() => {
    if (seededRef.current) return;
    if (snapshot.globalSettings?.middayPresaleData) return;
    if (!onChange) return;
    seededRef.current = true;
    const seeded = readMiddayPresaleDataForSnapshot(snapshot);
    dataRef.current = seeded;
    setData(seeded);
    onChange(seeded);
  }, [snapshot, onChange]);

  // 부모(EditorShell) setState는 렌더/updater 밖에서만 — microtask로 한 틱 미룸.
  const handleChange = useCallback(
    (next: PresaleLandingData | ((prev: PresaleLandingData) => PresaleLandingData)) => {
      const resolved = typeof next === "function" ? next(dataRef.current) : next;
      dataRef.current = resolved;
      setData(resolved);
      if (!onChange) return;
      void Promise.resolve().then(() => {
        onChange(resolved);
      });
    },
    [onChange],
  );

  const uploadCtx = useMemo(
    () => ({
      projectId: projectId ?? null,
      beginUpload: () => setUploadBusy((n) => n + 1),
      endUpload: () => setUploadBusy((n) => Math.max(0, n - 1)),
      waitForUploads: async () => {
        /* EditableImage endUpload 호출 대기 — busy 카운터 기준 */
        for (let i = 0; i < 200 && uploadBusy > 0; i += 1) {
          await new Promise((r) => setTimeout(r, 50));
        }
      },
    }),
    [projectId, uploadBusy],
  );

  const bridge = useMemo(
    () => ({
      projectId: projectId ?? null,
      publicSlug: snapshot.publicSlug || null,
      leadDemoMode: !leadLive || editMode,
      thirdPartyRequired: Boolean(snapshot.privacy?.thirdPartyProvisionEnabled),
    }),
    [projectId, snapshot.publicSlug, leadLive, editMode, snapshot.privacy?.thirdPartyProvisionEnabled],
  );

  return (
    <MiddayAditBridgeProvider value={bridge}>
      <PresaleImageUploadContext.Provider value={uploadCtx}>
        <div className="midday-origin-host" data-template="midday">
          <MiddayLandingView
            data={data}
            editMode={editMode}
            onChange={handleChange}
            projectId={projectId ?? undefined}
            contactDemoMode={!leadLive || editMode}
            previewDevice={previewDevice}
            forcePopup={forcePopup}
            onClosePopup={onClosePopup}
          />
        </div>
      </PresaleImageUploadContext.Provider>
    </MiddayAditBridgeProvider>
  );
}
