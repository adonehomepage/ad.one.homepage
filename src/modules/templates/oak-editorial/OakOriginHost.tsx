"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PageSection, PageSnapshot } from "@/types";
import { PresaleImageUploadContext } from "@midday/components/PresaleImageUploadContext";
import { OakLandingView } from "./components/OakLandingView";
import { OAK_DATA_KEY, readOakEditorialDataForSnapshot } from "./oak-data";
import type { OakEditorialData } from "./types";

type Props = {
  snapshot: PageSnapshot;
  editMode: boolean;
  projectId?: string | null;
  leadLive?: boolean;
  /** 편집기 미리보기 프레임. 공개 페이지는 desktop 이라 창 너비의 @media 를 쓴다. */
  previewDevice?: "desktop" | "tablet" | "mobile";
  onChange?: (data: OakEditorialData) => void;
  onSectionsChange?: (sections: PageSection[]) => void;
};

/**
 * 내추럴 에디토리얼(oak-editorial) 렌더러 호스트.
 * CSS는 OakLandingView 내부 import로만 로드되어 관리자·다른 템플릿과 격리된다.
 */
export function OakOriginHost({
  snapshot,
  editMode,
  projectId = null,
  leadLive = false,
  previewDevice = "desktop",
  onChange,
  onSectionsChange,
}: Props) {
  const seedKey = useMemo(
    () =>
      JSON.stringify({
        oak: snapshot.globalSettings?.[OAK_DATA_KEY] ?? null,
        name: snapshot.projectName,
        sections: snapshot.sections.map((s) => ({
          id: s.id,
          v: s.isVisible,
          o: s.sortOrder,
          a: s.anchorId,
        })),
      }),
    [snapshot.globalSettings, snapshot.projectName, snapshot.sections],
  );

  const stampOakFaq = (list: PageSection[]) =>
    list.map((section) =>
      section.sectionType === "faq" && !(section.content as { oak?: boolean } | undefined)?.oak
        ? { ...section, content: { ...section.content, oak: true } }
        : section,
    );

  const [data, setData] = useState<OakEditorialData>(() => readOakEditorialDataForSnapshot(snapshot));
  const [sections, setSections] = useState<PageSection[]>(() => stampOakFaq(snapshot.sections));
  const [uploadBusy, setUploadBusy] = useState(0);
  const seedKeyRef = useRef(seedKey);
  const seededRef = useRef(false);
  const legacyPersistedRef = useRef(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (seedKeyRef.current === seedKey) return;
    seedKeyRef.current = seedKey;
    const next = readOakEditorialDataForSnapshot(snapshot);
    dataRef.current = next;
    setData(next);
    setSections(stampOakFaq(snapshot.sections));
    seededRef.current = false;
    legacyPersistedRef.current = false;
  }, [seedKey, snapshot]);

  useEffect(() => {
    if (seededRef.current) return;
    if (snapshot.globalSettings?.[OAK_DATA_KEY]) return;
    if (!onChange) return;
    seededRef.current = true;
    const seeded = readOakEditorialDataForSnapshot(snapshot);
    dataRef.current = seeded;
    setData(seeded);
    onChange(seeded);
  }, [snapshot, onChange]);

  // 구 오크 시안 자산·카피가 남아 있으면 프리미엄 샘플로 치환한 값을 한 번 저장한다.
  useEffect(() => {
    if (!onChange || legacyPersistedRef.current) return;
    const raw = snapshot.globalSettings?.[OAK_DATA_KEY];
    if (!raw || typeof raw !== "object") return;
    const blob = JSON.stringify(raw);
    // 프리미엄 샘플 경로(/samples/presale-premium)는 정상. 구 오크 시안 자산·카피만 치환한다.
    const legacy =
      blob.includes("/samples/oak-editorial/") ||
      /(?:THE OAK|더 오크|the oak)/i.test(blob);
    if (!legacy) return;
    legacyPersistedRef.current = true;
    const sanitized = readOakEditorialDataForSnapshot(snapshot);
    dataRef.current = sanitized;
    setData(sanitized);
    void Promise.resolve().then(() => onChange(sanitized));
  }, [snapshot, onChange]);

  const handleChange = useCallback(
    (next: OakEditorialData | ((prev: OakEditorialData) => OakEditorialData)) => {
      const resolved = typeof next === "function" ? next(dataRef.current) : next;
      dataRef.current = resolved;
      setData(resolved);
      if (!onChange) return;
      void Promise.resolve().then(() => onChange(resolved));
    },
    [onChange],
  );

  const handleSectionContentChange = useCallback(
    (sectionId: string, content: Record<string, unknown>) => {
      setSections((prev) => {
        const next = prev.map((section) =>
          section.id === sectionId ? { ...section, content: { ...section.content, ...content } } : section,
        );
        if (onSectionsChange) {
          void Promise.resolve().then(() => onSectionsChange(next));
        }
        return next;
      });
    },
    [onSectionsChange],
  );

  const uploadCtx = useMemo(
    () => ({
      projectId: projectId ?? null,
      beginUpload: () => setUploadBusy((n) => n + 1),
      endUpload: () => setUploadBusy((n) => Math.max(0, n - 1)),
      waitForUploads: async () => {
        for (let i = 0; i < 200 && uploadBusy > 0; i += 1) {
          await new Promise((r) => setTimeout(r, 50));
        }
      },
    }),
    [projectId, uploadBusy],
  );

  return (
    <PresaleImageUploadContext.Provider value={uploadCtx}>
      <div className="oak-origin-host" data-template="oak-editorial">
        <OakLandingView
          data={data}
          sections={sections}
          editMode={editMode}
          leadLive={leadLive}
          previewDevice={previewDevice}
          publicSlug={snapshot.publicSlug || null}
          projectId={projectId}
          thirdPartyRequired={Boolean(snapshot.privacy?.thirdPartyProvisionEnabled)}
          onChange={editMode ? handleChange : undefined}
          onSectionContentChange={editMode ? handleSectionContentChange : undefined}
        />
      </div>
    </PresaleImageUploadContext.Provider>
  );
}
