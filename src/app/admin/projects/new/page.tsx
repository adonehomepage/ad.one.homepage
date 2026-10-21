"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { createTemplateSections, templateCatalog } from "@/modules/templates/definitions";
import { newProjectDraftParts } from "@/modules/projects/draft-defaults";
import { LandingPage } from "@/modules/templates/render/landing-page";
import type { PageSnapshot, TemplateCode } from "@/types";
import { cn } from "@/lib/cn";
import { useDialogFocusTrap } from "@/lib/a11y/dialog-focus";
import { validateSlug } from "@/lib/validation/slug";
import { formatPhoneInput } from "@/lib/validation/phone";

const PICKER_SETTINGS = newProjectDraftParts({ name: "", phone: "" }).globalSettings as Record<string, unknown>;

function pickerText(key: string, fallback: string) {
  return String(PICKER_SETTINGS[key] ?? "").trim() || fallback;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [durationMode, setDurationMode] = useState<"default" | "custom">("default");
  const [name, setName] = useState("");
  const [publicSlug, setPublicSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [orgMonths, setOrgMonths] = useState(3);
  const [durationMonths, setDurationMonths] = useState(3);
  const [templateCode, setTemplateCode] = useState<TemplateCode>("image-focus");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [slugError, setSlugError] = useState("");
  const [slugChecking, setSlugChecking] = useState(false);
  const [loading, setLoading] = useState(false);
  const slugTimerRef = useRef<number | null>(null);
  const slugAbortRef = useRef<AbortController | null>(null);
  const detailsPanelRef = useRef<HTMLFormElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const catalog = useMemo(() => templateCatalog(PICKER_SETTINGS), []);
  useDialogFocusTrap({
    open: detailsOpen,
    panelRef: detailsPanelRef,
    initialFocusRef: nameInputRef,
    onEscape: () => {
      if (!loading) setDetailsOpen(false);
    },
    escapeEnabled: !loading,
  });

  useEffect(() => {
    void fetch("/api/settings")
      .then((response) => response.json())
      .then((json: { settings?: { defaultDurationMonths?: number | null } }) => {
        const months = Number(json.settings?.defaultDurationMonths);
        if (months >= 1) {
          setOrgMonths(months);
          setDurationMonths((current) => (current === 3 ? months : current));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    return () => {
      if (slugTimerRef.current) window.clearTimeout(slugTimerRef.current);
      slugAbortRef.current?.abort();
    };
  }, []);

  const selected = catalog.find((template) => template.code === templateCode) ?? catalog[0];

  const preview = useMemo<PageSnapshot>(() => {
    const projectName = name || pickerText("pickerPreviewName", "현장명");
    const draft = newProjectDraftParts({ name: projectName, phone });
    const popup = draft.globalSettings.popup;
    return {
      templateCode,
      projectName,
      publicSlug: publicSlug || "preview",
      phone,
      globalSettings: { ...draft.globalSettings, popup: { ...popup, enabled: false } },
      formSettings: draft.formSettings,
      seoSettings: draft.seoSettings,
      privacy: draft.privacySettings,
      sections: createTemplateSections(templateCode, "preview", draft.globalSettings).map((section) =>
        section.sectionType === "hero" ? { ...section, content: { ...section.content, headline: projectName } } : section,
      ),
    };
  }, [templateCode, name, publicSlug, phone]);

  function checkSlugLocal(value: string) {
    const result = validateSlug(value);
    setSlugError(result.ok ? "" : result.message);
    return result.ok;
  }

  async function checkSlugRemote(value: string) {
    if (!checkSlugLocal(value)) return false;
    slugAbortRef.current?.abort();
    const controller = new AbortController();
    slugAbortRef.current = controller;
    setSlugChecking(true);
    try {
      const res = await fetch(`/api/projects/check-slug?value=${encodeURIComponent(value)}`, { signal: controller.signal });
      const json = await res.json();
      if (!res.ok) {
        setSlugError(json.message ?? pickerText("pickerFail", "만들지 못했습니다."));
        return false;
      }
      setSlugError("");
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return false;
      return true;
    } finally {
      if (slugAbortRef.current === controller) setSlugChecking(false);
    }
  }

  function scheduleSlugCheck(value: string) {
    if (slugTimerRef.current) window.clearTimeout(slugTimerRef.current);
    slugTimerRef.current = window.setTimeout(() => {
      void checkSlugRemote(value);
    }, 400);
  }

  async function create() {
    setLoading(true);
    setError("");
    if (!name.trim()) {
      setLoading(false);
      setError(pickerText("pickerNameRequired", "현장명을 입력해 주세요."));
      return;
    }
    try {
      const slugOk = await checkSlugRemote(publicSlug);
      if (!slugOk) return;
      const months = durationMode === "default" ? orgMonths : durationMonths;
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, publicSlug, templateCode, durationMonths: months, phone }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.field === "publicSlug") setSlugError(json.message ?? pickerText("pickerFail", "만들지 못했습니다."));
        setError(json.message ?? pickerText("pickerFail", "만들지 못했습니다."));
        return;
      }
      router.push(`/admin/projects/${json.project.id}/editor`);
    } catch {
      setError(pickerText("pickerFail", "만들지 못했습니다."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-white/75 px-4 py-3 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/admin/projects" className="text-sm font-medium text-text-body">
            {pickerText("pickerHome", "홈페이지")}
          </Link>
          <span className="text-sm font-semibold tracking-wide text-primary">ADONEBRIDGE</span>
          <span className="text-sm font-semibold">{pickerText("pickerTitle", "템플릿 선택")}</span>
        </div>
        <Button
          type="button"
          onClick={() => {
            setNotice("");
            setDetailsOpen(true);
          }}
        >
          {pickerText("pickerMake", "제작하기")}
        </Button>
      </header>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[280px_1fr]">
        <aside className="overflow-y-auto border-r border-border bg-white p-4">
          <p className="text-sm font-semibold">{pickerText("pickerCount", "템플릿 {count}").replace("{count}", String(catalog.length))}</p>
          <div className="mt-3 space-y-2">
            {catalog.map((template) => {
              const active = template.code != null && template.code === templateCode;
              return (
                <button
                  key={template.name}
                  type="button"
                  onClick={() => {
                    if (!template.code) {
                      setNotice(pickerText("pickerComingSoon", "오픈 대기 중이에요. 준비되는 대로 바로 안내드릴게요."));
                      return;
                    }
                    setNotice("");
                    setTemplateCode(template.code);
                  }}
                  className={cn(
                    "block w-full rounded-[16px] border bg-white p-4 text-left",
                    active ? "border-primary bg-primary-soft" : "border-border",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{template.name}</span>
                    {template.comingSoon ? <span className="rounded-[8px] bg-surface px-2 py-1 text-xs text-text-muted">{pickerText("pickerSoon", "오픈 대기")}</span> : null}
                  </span>
                  <p className="mt-2 text-sm text-text-body">{template.description}</p>
                  {template.code ? (
                    <input type="radio" readOnly checked={active} className="sr-only" data-testid={`template-${template.code}`} />
                  ) : null}
                </button>
              );
            })}
          </div>
          {notice ? <p className="mt-3 text-sm text-text-body">{notice}</p> : null}
        </aside>
        <div className="min-h-0 overflow-hidden bg-surface p-4">
          <div className="h-full overflow-hidden rounded-[16px] border border-border bg-white">
            <div className="origin-top-left scale-[0.62]" style={{ width: "161%" }}>
              <LandingPage snapshot={preview} mode="preview" />
            </div>
          </div>
        </div>
      </div>
      {detailsOpen ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-text-primary/40 p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label={pickerText("pickerClose", "닫기")}
            onClick={() => setDetailsOpen(false)}
          />
          <form
            ref={detailsPanelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-details-title"
            className="relative z-10 ui-card w-full max-w-lg space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <div>
              <h1 id="project-details-title" className="text-2xl font-bold">
                {pickerText("pickerDetails", "현장 정보")}
              </h1>
              <p className="mt-2 text-sm text-text-body">{pickerText("pickerDetailsBody", "{name}으로 제작을 시작합니다. 현장명과 공개 URL은 나중에 페이지에서도 고칠 수 있습니다.").replace("{name}", selected.name)}</p>
            </div>
            <Field label={pickerText("pickerSiteName", "현장명")}>
              <Input
                ref={nameInputRef}
                name="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                data-testid="project-name"
              />
            </Field>
            <Field label={pickerText("pickerSlug", "공개 URL 텍스트")} hint={pickerText("pickerSlugHint", "한글, 영문, 숫자, 하이픈. 예: lumiere-central")}>
              <Input
                name="publicSlug"
                required
                value={publicSlug}
                onChange={(event) => {
                  const value = event.target.value;
                  setPublicSlug(value);
                  if (slugError) checkSlugLocal(value);
                  scheduleSlugCheck(value);
                }}
                onBlur={(event) => {
                  if (slugTimerRef.current) window.clearTimeout(slugTimerRef.current);
                  void checkSlugRemote(event.target.value);
                }}
                aria-invalid={Boolean(slugError) || undefined}
                aria-describedby={slugError ? "project-slug-error" : undefined}
                data-testid="project-slug"
              />
              {slugError ? (
                <p id="project-slug-error" className="mt-2 text-sm text-danger" role="alert" data-testid="project-slug-error">
                  {slugError}
                </p>
              ) : slugChecking ? (
                <p className="mt-2 text-sm text-text-muted" role="status">
                  {pickerText("pickerSlugChecking", "주소 확인 중…")}
                </p>
              ) : null}
            </Field>
            <Field label={pickerText("pickerPhone", "대표 전화")}>
              <Input
                name="phone"
                value={phone}
                inputMode="tel"
                onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
                placeholder="02-000-0000"
                data-testid="project-phone"
              />
            </Field>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{pickerText("pickerDuration", "운영기간")}</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={durationMode === "default"} onChange={() => { setDurationMode("default"); setDurationMonths(orgMonths); }} />
                {pickerText("pickerMonths", "{count}개월").replace("{count}", String(orgMonths))}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={durationMode === "custom"} onChange={() => setDurationMode("custom")} />
                {pickerText("pickerCustom", "직접 입력")}
                {durationMode === "custom" ? (
                  <Input type="number" min={1} value={durationMonths} onChange={(event) => setDurationMonths(Number(event.target.value || 3))} className="w-24" />
                ) : null}
                {durationMode === "custom" ? <span>{pickerText("pickerMonths", "{count}개월").replace("{count}", "")}</span> : null}
              </label>
            </fieldset>
            {error ? (
              <p className="text-sm text-danger" role="alert" aria-live="assertive">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setDetailsOpen(false)}>
                {pickerText("pickerClose", "닫기")}
              </Button>
              <Button type="submit" loading={loading} data-testid="create-project">
                {pickerText("pickerStart", "제작 시작")}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
