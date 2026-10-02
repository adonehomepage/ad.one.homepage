"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LandingPage } from "@/modules/templates/render/landing-page";
import { Button } from "@/components/ui/button";
import { PropertyPanel } from "@/modules/editor/property-panel";
import { uploadProjectFile } from "@/modules/editor/prepare-upload";
import type { CanvasEdit } from "@/modules/editor/edit-context";
import type { PageSection, PageSnapshot } from "@/types";

type HistoryEntry = {
  sections: PageSection[];
  globalSettings: Record<string, unknown>;
  formSettings: PageSnapshot["formSettings"];
  seoSettings: PageSnapshot["seoSettings"];
  privacySettings: PageSnapshot["privacy"];
};

type DraftResponse = {
  project: {
    id: string;
    name: string;
    publicSlug: string;
    status: string;
    draftRevision: number;
    hasUnpublishedChanges: boolean;
  };
  template: { code: PageSnapshot["templateCode"]; name: string };
  draft: {
    revision: number;
    globalSettings: Record<string, unknown>;
    formSettings: PageSnapshot["formSettings"];
    seoSettings: PageSnapshot["seoSettings"];
    privacySettings: PageSnapshot["privacy"];
  };
  sections: PageSection[];
};

function SortableRow({
  section,
  onToggle,
}: {
  section: PageSection;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 border border-border bg-white px-3 py-2"
    >
      <button type="button" className="cursor-grab text-text-muted" aria-label="순서 이동" {...attributes} {...listeners}>
        ≡
      </button>
      <button
        type="button"
        className="min-w-0 flex-1 truncate text-left text-sm font-medium"
        onClick={() => document.getElementById(section.anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" })}
      >
        {section.title}
      </button>
      {section.isRequired ? (
        <span className="text-xs text-text-muted">고정</span>
      ) : (
        <button type="button" className="text-xs font-semibold text-primary" onClick={onToggle}>
          {section.isVisible ? "켜짐" : "꺼짐"}
        </button>
      )}
    </div>
  );
}

export function EditorShell({ projectId }: { projectId: string }) {
  const [data, setData] = useState<DraftResponse | null>(null);
  const [status, setStatus] = useState("불러오는 중");
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [editing, setEditing] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [error, setError] = useState("");
  const dataRef = useRef<DraftResponse | null>(null);
  const pendingRef = useRef<{ sections: PageSection[]; extra?: Partial<DraftResponse["draft"]> } | null>(null);
  const timerRef = useRef<number | null>(null);
  const pastRef = useRef<HistoryEntry[]>([]);
  const futureRef = useRef<HistoryEntry[]>([]);
  const saveTailRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  async function load() {
    const res = await fetch(`/api/projects/${projectId}/draft`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.message ?? "작업본을 불러오지 못했습니다.");
      return;
    }
    setData(json);
    dataRef.current = json;
    setStatus(json.project.hasUnpublishedChanges ? "미발행 변경사항 있음" : "저장됨");
  }

  useEffect(() => {
    load();
  }, [projectId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(target?.isContentEditable || target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT");
      const meta = event.ctrlKey || event.metaKey;
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (meta && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (!typing && !meta && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setEditing((value) => !value);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [projectId]);

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (status === "저장 중" || status === "저장 실패") {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  const snapshot: PageSnapshot | null = useMemo(() => {
    if (!data) return null;
    const siteName = String(data.draft.globalSettings.siteName ?? data.project.name);
    return {
      templateCode: data.template.code,
      projectName: siteName,
      publicSlug: data.project.publicSlug,
      phone: String(data.draft.globalSettings.phone ?? ""),
      globalSettings: data.draft.globalSettings,
      formSettings: data.draft.formSettings,
      seoSettings: data.draft.seoSettings,
      privacy: data.draft.privacySettings,
      sections: data.sections,
    };
  }, [data]);

  function capture(current: DraftResponse): HistoryEntry {
    return structuredClone({
      sections: current.sections,
      globalSettings: current.draft.globalSettings,
      formSettings: current.draft.formSettings,
      seoSettings: current.draft.seoSettings,
      privacySettings: current.draft.privacySettings,
    });
  }

  function syncHistoryFlags() {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }

  function undo() {
    const current = dataRef.current;
    const previous = pastRef.current.pop();
    if (!current || !previous) return;
    futureRef.current.push(capture(current));
    syncHistoryFlags();
    persist(previous.sections, previous, false);
  }

  function redo() {
    const current = dataRef.current;
    const next = futureRef.current.pop();
    if (!current || !next) return;
    pastRef.current.push(capture(current));
    syncHistoryFlags();
    persist(next.sections, next, false);
  }

  async function persist(next: DraftResponse["sections"], extra?: Partial<DraftResponse["draft"]>, recordHistory = true) {
    const current = dataRef.current;
    if (!current) return;
    if (recordHistory) {
      pastRef.current = [...pastRef.current, capture(current)].slice(-40);
      futureRef.current = [];
      syncHistoryFlags();
    }
    const merged: DraftResponse = {
      ...current,
      sections: next,
      draft: extra ? { ...current.draft, ...extra } : current.draft,
      project: { ...current.project, hasUnpublishedChanges: true },
    };
    const siteName = String(merged.draft.globalSettings.siteName ?? "").trim();
    if (siteName) merged.project = { ...merged.project, name: siteName };
    dataRef.current = merged;
    setData(merged);
    pendingRef.current = { sections: next, extra };
    setStatus("저장 중");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      enqueueSave();
    }, 700);
  }

  function enqueueSave() {
    saveTailRef.current = saveTailRef.current.then(() => flushSave());
    return saveTailRef.current;
  }

  async function flushSave() {
    while (pendingRef.current && dataRef.current) {
      const current = dataRef.current;
      const pending = pendingRef.current;
      pendingRef.current = null;
      let json: { message?: string; revision?: number } = {};
      let res: Response;
      try {
        res = await fetch(`/api/projects/${projectId}/draft`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedRevision: current.project.draftRevision,
            sections: pending.sections,
            globalSettings: pending.extra?.globalSettings ?? current.draft.globalSettings,
            formSettings: pending.extra?.formSettings ?? current.draft.formSettings,
            seoSettings: pending.extra?.seoSettings ?? current.draft.seoSettings,
            privacySettings: pending.extra?.privacySettings ?? current.draft.privacySettings,
          }),
        });
        json = await res.json();
      } catch {
        if (!pendingRef.current) pendingRef.current = pending;
        setStatus("저장 실패");
        setError("저장에 실패했습니다.");
        return false;
      }
      if (!res.ok || typeof json.revision !== "number") {
        if (!pendingRef.current) pendingRef.current = pending;
        setStatus("저장 실패");
        setError(json.message ?? "저장에 실패했습니다.");
        return false;
      }
      const revision = json.revision;
      const latest = dataRef.current ?? current;
      const nextData: DraftResponse = {
        ...latest,
        project: { ...latest.project, draftRevision: revision, hasUnpublishedChanges: true },
        draft: { ...latest.draft, revision },
      };
      dataRef.current = nextData;
      setData(nextData);
      setStatus("미발행 변경사항 있음");
      setError("");
    }
    return true;
  }

  async function publish() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const saved = await enqueueSave();
    if (!saved) return;
    setStatus("발행 중");
    const res = await fetch(`/api/projects/${projectId}/publish`, { method: "POST", body: JSON.stringify({}) });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message ?? "발행에 실패했습니다.");
      setStatus("저장됨");
      return;
    }
    await load();
    setStatus("발행됨");
  }

  function onDragEnd(event: DragEndEvent) {
    if (!data || !event.over) return;
    const oldIndex = data.sections.findIndex((section) => section.id === event.active.id);
    const newIndex = data.sections.findIndex((section) => section.id === event.over?.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(data.sections, oldIndex, newIndex).map((section, index) => ({ ...section, sortOrder: index }));
    persist(next);
  }

  const edit = useMemo<CanvasEdit | null>(() => {
    if (!editing || !data) return null;
    return {
      patch: (sectionId, content) => {
        const current = dataRef.current;
        if (!current) return;
        persist(
          current.sections.map((section) => (section.id === sectionId ? { ...section, content } : section)),
        );
      },
      setPhone: (phone) => {
        const current = dataRef.current;
        if (!current) return;
        persist(current.sections, { globalSettings: { ...current.draft.globalSettings, phone } });
      },
      setSiteName: (name) => {
        const current = dataRef.current;
        if (!current) return;
        const sections = current.sections.map((section) =>
          section.sectionType === "hero" ? { ...section, content: { ...section.content, headline: name } } : section,
        );
        persist(sections, { globalSettings: { ...current.draft.globalSettings, siteName: name } });
      },
      setIntro: (intro) => {
        const current = dataRef.current;
        if (!current) return;
        persist(current.sections, { formSettings: { ...current.draft.formSettings, intro } });
      },
      upload: async (file) => {
        setError("");
        try {
          return await uploadProjectFile(projectId, file);
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : "업로드에 실패했습니다.";
          setError(message);
          throw caught;
        }
      },
    };
  }, [editing, data, projectId]);

  if (!data || !snapshot) {
    return <p className="p-8 text-sm text-text-muted">{error || "작업본을 불러오는 중입니다."}</p>;
  }

  const width = viewport === "mobile" ? "max-w-[390px]" : viewport === "tablet" ? "max-w-[768px]" : "max-w-none";
  const settingsSection = data.sections.find((section) => section.sectionType === "legal") ?? data.sections[0];

  return (
    <div className="flex h-screen flex-col bg-[#f4f1ea]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-4 py-3">
        <div className="min-w-0">
          <Link href="/admin/projects" className="text-xs text-text-body">
            홈페이지 목록
          </Link>
          <p className="truncate font-semibold">{snapshot.projectName}</p>
          <p className="text-xs text-text-muted">{editing ? "페이지 글을 클릭해서 수정합니다" : "미리보기"} · {status}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" disabled={!canUndo} onClick={undo}>
            실행 취소
          </Button>
          <Button variant="ghost" disabled={!canRedo} onClick={redo}>
            다시 실행
          </Button>
          <Button variant={editing ? "soft" : "ghost"} onClick={() => setEditing(true)}>
            편집
          </Button>
          <Button variant={!editing ? "soft" : "ghost"} onClick={() => setEditing(false)}>
            미리보기
          </Button>
          <Button variant={viewport === "desktop" ? "soft" : "ghost"} onClick={() => setViewport("desktop")}>
            PC
          </Button>
          <Button variant={viewport === "tablet" ? "soft" : "ghost"} onClick={() => setViewport("tablet")}>
            태블릿
          </Button>
          <Button variant={viewport === "mobile" ? "soft" : "ghost"} onClick={() => setViewport("mobile")}>
            모바일
          </Button>
          <Button variant="ghost" className="lg:hidden" onClick={() => setListOpen((open) => !open)}>
            섹션
          </Button>
          <Button variant="ghost" onClick={() => setSettingsOpen((open) => !open)}>
            페이지 설정
          </Button>
          {status === "저장 실패" ? (
            <Button variant="soft" type="button" onClick={() => void flushSave()}>
              다시 저장
            </Button>
          ) : null}
          <Button data-testid="publish-button" onClick={publish}>
            {data.project.status === "PUBLISHED" ? "재발행" : "발행하기"}
          </Button>
        </div>
      </div>
      {error ? <p className="bg-[#fdeeee] px-4 py-2 text-sm text-danger">{error}</p> : null}
      <div className="grid min-h-0 flex-1 lg:grid-cols-[240px_1fr]">
        <aside className={`${listOpen ? "block" : "hidden"} min-h-0 overflow-y-auto border-r border-border bg-white p-3 lg:block`}>
          <p className="mb-2 px-1 text-xs font-medium text-text-muted">섹션 순서 · 노출</p>
          <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={data.sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {data.sections.map((section) => (
                  <SortableRow
                    key={section.id}
                    section={section}
                    onToggle={() => {
                      persist(
                        data.sections.map((item) => (item.id === section.id ? { ...item, isVisible: !item.isVisible } : item)),
                      );
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </aside>
        <div className="min-h-0 overflow-auto p-4">
          <div className={`mx-auto overflow-hidden border border-border bg-white shadow-sm ${width}`}>
            <LandingPage snapshot={snapshot} mode="preview" variant={viewport === "mobile" ? "mobile" : "desktop"} edit={edit} />
          </div>
        </div>
      </div>
      {settingsOpen && settingsSection ? (
        <div className="fixed inset-y-0 right-0 z-30 w-full max-w-md overflow-y-auto border-l border-border bg-white p-4 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-semibold">페이지 설정</p>
            <Button variant="ghost" onClick={() => setSettingsOpen(false)}>
              닫기
            </Button>
          </div>
          <PropertyPanel
            selected={settingsSection}
            snapshot={snapshot}
            projectId={projectId}
            onSectionChange={(nextSection) => {
              persist(data.sections.map((item) => (item.id === nextSection.id ? nextSection : item)));
            }}
            onPhoneChange={(phone) => persist(data.sections, { globalSettings: { ...data.draft.globalSettings, phone } })}
            onDraftChange={(patch) => persist(data.sections, patch)}
          />
        </div>
      ) : null}
    </div>
  );
}
