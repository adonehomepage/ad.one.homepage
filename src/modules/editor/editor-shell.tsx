"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LandingPage } from "@/modules/templates/render/landing-page";
import { countCopiesForRoot } from "@/modules/sections/duplicate";
import { Button } from "@/components/ui/button";
import { PropertyPanel } from "@/modules/editor/property-panel";
import type { PageSection, PageSnapshot } from "@/types";

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
  selected,
  copyCount,
  onSelect,
  onToggle,
  onDuplicate,
  onDelete,
  onMove,
}: {
  section: PageSection;
  selected: boolean;
  copyCount: number;
  onSelect: () => void;
  onToggle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl border p-3 ${selected ? "border-primary bg-primary-soft" : "border-border bg-white"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <button type="button" className="text-left" onClick={onSelect}>
          <p className="text-sm font-semibold">{section.isOriginal ? section.title : `${section.title}`}</p>
          <p className="text-xs text-text-muted">
            {section.isOriginal ? `복제본 ${copyCount} / 3` : "복제본"}
          </p>
        </button>
        <button type="button" className="text-text-muted" aria-label="순서 이동" {...attributes} {...listeners}>
          ≡
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <button type="button" className="rounded bg-surface px-2 py-1 text-xs" onClick={onToggle}>
          {section.isVisible ? "ON" : "OFF"}
        </button>
        <button type="button" className="rounded bg-surface px-2 py-1 text-xs" onClick={() => onMove(-1)}>
          위
        </button>
        <button type="button" className="rounded bg-surface px-2 py-1 text-xs" onClick={() => onMove(1)}>
          아래
        </button>
        <button type="button" className="rounded bg-surface px-2 py-1 text-xs" onClick={onDuplicate}>
          복제
        </button>
        {!section.isOriginal && !section.isRequired ? (
          <button type="button" className="rounded bg-[#fdeeee] px-2 py-1 text-xs text-danger" onClick={onDelete}>
            삭제
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function EditorShell({ projectId }: { projectId: string }) {
  const [data, setData] = useState<DraftResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState("불러오는 중");
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [error, setError] = useState("");
  const dataRef = useRef<DraftResponse | null>(null);
  const pendingRef = useRef<{ sections: PageSection[]; extra?: Partial<DraftResponse["draft"]> } | null>(null);
  const timerRef = useRef<number | null>(null);

  async function load() {
    const res = await fetch(`/api/projects/${projectId}/draft`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.message ?? "작업본을 불러오지 못했습니다.");
      return;
    }
    setData(json);
    dataRef.current = json;
    setSelectedId((current) => current ?? json.sections[0]?.id ?? null);
    setStatus(json.project.hasUnpublishedChanges ? "미발행 변경사항 있음" : "저장됨");
  }

  useEffect(() => {
    load();
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

  const selected = data?.sections.find((section) => section.id === selectedId) ?? null;
  const snapshot: PageSnapshot | null = useMemo(() => {
    if (!data) return null;
    return {
      templateCode: data.template.code,
      projectName: data.project.name,
      publicSlug: data.project.publicSlug,
      phone: String(data.draft.globalSettings.phone ?? ""),
      globalSettings: data.draft.globalSettings,
      formSettings: data.draft.formSettings,
      seoSettings: data.draft.seoSettings,
      privacy: data.draft.privacySettings,
      sections: data.sections,
    };
  }, [data]);

  async function persist(next: DraftResponse["sections"], extra?: Partial<DraftResponse["draft"]>) {
    const current = dataRef.current;
    if (!current) return;
    const merged: DraftResponse = {
      ...current,
      sections: next,
      draft: extra ? { ...current.draft, ...extra } : current.draft,
      project: { ...current.project, hasUnpublishedChanges: true },
    };
    dataRef.current = merged;
    setData(merged);
    pendingRef.current = { sections: next, extra };
    setStatus("저장 중");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void flushSave();
    }, 700);
  }

  async function flushSave() {
    const current = dataRef.current;
    const pending = pendingRef.current;
    if (!current || !pending) return;
    pendingRef.current = null;
    const res = await fetch(`/api/projects/${projectId}/draft`, {
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
    const json = await res.json();
    if (!res.ok) {
      pendingRef.current = pending;
      setStatus("저장 실패");
      setError(json.message ?? "저장에 실패했습니다.");
      return;
    }
    const nextData: DraftResponse = {
      ...current,
      project: { ...current.project, draftRevision: json.revision, hasUnpublishedChanges: true },
      sections: pending.sections,
      draft: { ...current.draft, ...pending.extra, revision: json.revision },
    };
    dataRef.current = nextData;
    setData(nextData);
    setStatus("미발행 변경사항 있음");
    setError("");
    if (pendingRef.current) void flushSave();
  }

  async function duplicate(id: string) {
    const res = await fetch(`/api/projects/${projectId}/sections/${id}/duplicate`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message ?? "복제할 수 없습니다.");
      return;
    }
    await load();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/projects/${projectId}/sections/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message ?? "삭제할 수 없습니다.");
      return;
    }
    await load();
  }

  async function publish() {
    await flushSave();
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

  if (!data || !snapshot) {
    return <p className="p-8 text-sm text-text-muted">{error || "작업본을 불러오는 중입니다."}</p>;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3">
        <div>
          <p className="font-semibold">{data.project.name}</p>
          <p className="text-xs text-text-muted">{status}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={viewport === "desktop" ? "soft" : "ghost"} onClick={() => setViewport("desktop")}>
            PC
          </Button>
          <Button variant={viewport === "mobile" ? "soft" : "ghost"} onClick={() => setViewport("mobile")}>
            모바일
          </Button>
          <Link href={`/admin/projects/${projectId}/versions`} className="text-sm text-text-body">
            버전 기록
          </Link>
          {status === "저장 실패" ? (
            <Button variant="soft" type="button" onClick={() => void flushSave()}>
              다시 저장
            </Button>
          ) : null}
          <Button data-testid="publish-button" onClick={publish}>{data.project.status === "PUBLISHED" ? "재발행" : "발행하기"}</Button>
        </div>
      </div>
      {error ? <p className="bg-[#fdeeee] px-4 py-2 text-sm text-danger">{error}</p> : null}
      <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr_300px]">
        <aside className="min-h-0 overflow-y-auto border-r border-border bg-white p-3">
          <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={data.sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {data.sections.map((section, index) => (
                  <SortableRow
                    key={section.id}
                    section={section}
                    selected={section.id === selectedId}
                    copyCount={countCopiesForRoot(data.sections, section.rootSectionId)}
                    onSelect={() => setSelectedId(section.id)}
                    onToggle={() => {
                      const next = data.sections.map((item) =>
                        item.id === section.id ? { ...item, isVisible: !item.isVisible } : item,
                      );
                      persist(next);
                    }}
                    onDuplicate={() => duplicate(section.id)}
                    onDelete={() => remove(section.id)}
                    onMove={(dir) => {
                      const target = index + dir;
                      if (target < 0 || target >= data.sections.length) return;
                      const next = arrayMove(data.sections, index, target).map((item, order) => ({ ...item, sortOrder: order }));
                      persist(next);
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </aside>
        <div className="min-h-0 overflow-auto p-4">
          <div className={`mx-auto overflow-hidden rounded-2xl border border-border bg-white ${viewport === "mobile" ? "max-w-[390px]" : "max-w-5xl"}`}>
            <LandingPage snapshot={snapshot} mode="preview" highlightId={selectedId} variant={viewport} />
          </div>
        </div>
        <aside className="min-h-0 overflow-y-auto border-l border-border bg-white p-4">
          {selected ? (
            <PropertyPanel
              selected={selected}
              snapshot={snapshot}
              projectId={projectId}
              onSectionChange={(nextSection) => {
                persist(data.sections.map((item) => (item.id === nextSection.id ? nextSection : item)));
              }}
              onPhoneChange={(phone) => {
                persist(data.sections, { globalSettings: { ...data.draft.globalSettings, phone } });
              }}
              onDraftChange={(patch) => persist(data.sections, patch)}
            />
          ) : (
            <p className="text-sm text-text-muted">섹션을 선택하세요.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
