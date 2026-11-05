"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DialogBody, DialogFooter, DialogHeader, DialogShell } from "@/components/ui/dialog-shell";
import { Field, Input } from "@/components/ui/input";
import { createTemplateSections, sampleGlobalExtras, templateCatalog } from "@/modules/templates/definitions";
import { SAMPLE_SITE } from "@/modules/templates/sample-site";
import { newProjectDraftParts } from "@/modules/projects/draft-defaults";
import { LandingPage } from "@/modules/templates/render/landing-page";
import type { PageSnapshot, TemplateCode } from "@/types";
import { cn } from "@/lib/cn";
import { useDialogFocusTrap } from "@/lib/a11y/dialog-focus";
import { validateSlug } from "@/lib/validation/slug";
import { formatPhoneInput } from "@/lib/validation/phone";
import { applySiteIdentity, defaultMiddayPresaleData, MIDDAY_DATA_KEY } from "@/modules/templates/midday-origin/midday-data";
import { applyOakSiteIdentity, OAK_DATA_KEY } from "@/modules/templates/oak-editorial/oak-data";
import { defaultOakEditorialData } from "@/modules/templates/oak-editorial/default-data";

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
  const [templateCode, setTemplateCode] = useState<TemplateCode>("foreon");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [slugError, setSlugError] = useState("");
  const [loading, setLoading] = useState(false);
  const slugTimerRef = useRef<number | null>(null);
  const slugAbortRef = useRef<AbortController | null>(null);
  const detailsPanelRef = useRef<HTMLDivElement>(null);
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
    const projectName =
      name.trim() || (templateCode === "oak-editorial" ? "임시 현장" : "광안 센텀 비스타동원");
    const draft = newProjectDraftParts({ name: projectName, phone });
    const popup = draft.globalSettings.popup as Record<string, unknown> | undefined;
    let globalSettings: Record<string, unknown> = {
      ...draft.globalSettings,
      popup: { ...popup, enabled: false },
    };
    if (templateCode === "midday" || templateCode === "info") {
      const midday = applySiteIdentity(defaultMiddayPresaleData(), {
        siteName: projectName,
        phone: phone.trim() || undefined,
      });
      // 선택 화면 미리보기에서는 이벤트 팝업을 끄고 본문만 비교한다.
      midday.popup = { ...midday.popup, enabled: false };
      globalSettings = {
        ...globalSettings,
        [MIDDAY_DATA_KEY]: midday,
        siteName: projectName,
        phone: midday.gnb.phone,
      };
    }
    if (templateCode === "oak-editorial") {
      // 이름 미입력 시 기본 가상 현장 + 프리미엄 화보형 샘플
      const oak = name.trim()
        ? applyOakSiteIdentity(defaultOakEditorialData(), { siteName: name.trim() })
        : defaultOakEditorialData();
      globalSettings = {
        ...globalSettings,
        [OAK_DATA_KEY]: oak,
        siteName: oak.brandName,
        logoUrl: oak.logoUrl,
      };
    }
    return {
      templateCode,
      projectName,
      publicSlug: publicSlug || "preview",
      phone: String(globalSettings.phone ?? ""),
      globalSettings,
      formSettings: draft.formSettings,
      seoSettings: draft.seoSettings,
      privacy: draft.privacySettings,
      sections: createTemplateSections(
        templateCode,
        "preview",
        {
          ...sampleGlobalExtras(),
          ...globalSettings,
        },
        { stableIds: true },
      ).map((section) =>
        section.sectionType === "hero"
          ? {
              ...section,
              content:
                templateCode === "oak-editorial"
                  ? section.content
                  : { ...section.content, headline: projectName },
            }
          : section,
      ),
    };
  }, [templateCode, name, publicSlug, phone]);

  function checkSlugLocal(value: string) {
    const result = validateSlug(value);
    if (!result.ok) setSlugError(result.message);
    return result.ok;
  }

  async function checkSlugRemote(value: string) {
    slugAbortRef.current?.abort();
    if (!checkSlugLocal(value)) {
      slugAbortRef.current = null;
      return false;
    }
    const controller = new AbortController();
    slugAbortRef.current = controller;
    try {
      const res = await fetch(`/api/projects/check-slug?value=${encodeURIComponent(value)}`, { signal: controller.signal });
      const json = await res.json();
      if (slugAbortRef.current !== controller) return false;
      if (!res.ok) {
        setSlugError(json.message ?? pickerText("pickerFail", "만들지 못했습니다."));
        return false;
      }
      setSlugError("");
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return false;
      return true;
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
    <div className="flex h-screen flex-col bg-text-primary">
      <header className="grid h-[60px] shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-white/10 bg-text-primary px-5 text-white" aria-label={pickerText("pickerTitle", "템플릿 선택")}>
        <div className="flex min-w-0 items-center gap-3.5">
          <Link href="/admin/projects" className="inline-flex h-[38px] shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/5 pl-2 pr-3.5 text-xs font-bold text-white/90 hover:bg-white/10">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                <path d="M15 6 9 12l6 6" />
              </svg>
            </span>
            {pickerText("pickerHome", "홈페이지")}
          </Link>
          <span className="h-7 w-px shrink-0 bg-white/15" aria-hidden />
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="shrink-0 text-[10px] font-extrabold tracking-[0.18em] text-primary">ADONEBRIDGE</span>
            <span className="truncate text-[15px] font-extrabold tracking-tight">{pickerText("pickerTitle", "템플릿 선택")}</span>
          </div>
        </div>
        <Button
          type="button"
          className="h-[38px] px-4 text-[13px] font-extrabold"
          onClick={() => {
            setNotice("");
            setDetailsOpen(true);
          }}
        >
          {pickerText("pickerMake", "제작하기")}
        </Button>
      </header>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[300px_1fr]" inert={detailsOpen}>
        <aside className="flex max-h-[34vh] min-h-0 flex-col border-b border-white/10 bg-[#161920] lg:max-h-none lg:border-b-0 lg:border-r lg:border-white/10">
          <p className="shrink-0 border-b border-white/10 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
            {pickerText("pickerCount", "템플릿 {count}").replace("{count}", String(catalog.length))}
          </p>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3" role="listbox" aria-label={pickerText("pickerTitle", "템플릿 선택")}>
            {catalog.map((template) => {
              const active = template.code != null && template.code === templateCode;
              return (
                <button
                  key={template.name}
                  type="button"
                  role="option"
                  aria-selected={active}
                  aria-disabled={template.comingSoon || undefined}
                  disabled={template.comingSoon}
                  title={template.comingSoon ? pickerText("pickerComingSoon", "오픈 대기 중이에요. 준비되는 대로 바로 안내드릴게요.") : undefined}
                  onClick={() => {
                    if (!template.code || template.comingSoon) return;
                    setNotice("");
                    setTemplateCode(template.code);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-[16px] border px-3 py-3 text-left",
                    template.comingSoon
                      ? "cursor-not-allowed border-white/5 bg-white/5 opacity-70"
                      : active
                        ? "border-primary/60 bg-primary/15"
                        : "border-transparent hover:bg-white/5",
                  )}
                >
                  <span className={cn("h-14 w-11 shrink-0 rounded-[14px] bg-white/10 ring-1 ring-white/10", template.comingSoon && "opacity-60")} aria-hidden>
                    <span className={cn("block h-full w-full rounded-[14px]", active ? "bg-primary/40" : "bg-white/10")} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className={cn("text-sm font-bold leading-tight", template.comingSoon ? "text-white/55" : active ? "text-primary" : "text-white")}>{template.name}</span>
                      {template.comingSoon ? (
                        <span className="rounded-[6px] bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white/70">
                          {pickerText("pickerSoon", "오픈 대기")}
                        </span>
                      ) : null}
                    </span>
                    <span className={cn("mt-1 block text-xs leading-snug", template.comingSoon ? "text-white/35" : "text-white/50")}>{template.description}</span>
                  </span>
                  {template.code ? (
                    <input type="radio" readOnly checked={active} className="sr-only" data-testid={`template-${template.code}`} />
                  ) : null}
                </button>
              );
            })}
          </div>
          {notice ? <p className="px-4 pb-4 text-sm text-white/70">{notice}</p> : null}
        </aside>
        <div className="min-h-0 overflow-auto bg-text-body">
          <div className="min-h-full bg-white">
            <LandingPage key={preview.templateCode} snapshot={preview} mode="preview" />
          </div>
        </div>
      </div>
      {detailsOpen ? (
        <DialogShell titleId="project-details-title" panelRef={detailsPanelRef} onClose={() => { if (!loading) setDetailsOpen(false); }} closeLabel={pickerText("pickerClose", "닫기")} closeDisabled={loading} closeOnOutside={false} size="md">
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <DialogHeader titleId="project-details-title" title={pickerText("pickerDetails", "현장 정보")} onClose={() => { if (!loading) setDetailsOpen(false); }} closeLabel={pickerText("pickerClose", "닫기")} closeDisabled={loading} />
            <DialogBody className="space-y-4">
              <p className="text-sm leading-relaxed text-text-body">{pickerText("pickerDetailsBody", "{name}으로 제작을 시작합니다. 현장명과 공개 URL은 나중에 페이지에서도 고칠 수 있습니다.").replace("{name}", selected.name)}</p>
              <Field label={pickerText("pickerSiteName", "현장명")}>
                <Input
                  ref={nameInputRef}
                  id="project-name"
                  name="name"
                  autoComplete="off"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  data-testid="project-name"
                />
              </Field>
              <Field label={pickerText("pickerSlug", "공개 URL 텍스트")} hint={pickerText("pickerSlugHint", "한글, 영문, 숫자, 하이픈. 예: gwang-an-centum")}>
                <Input
                  id="project-slug"
                  name="publicSlug"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="h-12"
                  required
                  value={publicSlug}
                  onChange={(event) => {
                    const value = event.target.value;
                    setPublicSlug(value);
                    checkSlugLocal(value);
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
                  <p id="project-slug-error" className="text-sm text-danger" role="alert" data-testid="project-slug-error">
                    {slugError}
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
                    <Input type="number" min={1} value={durationMonths} onChange={(event) => setDurationMonths(Number(event.target.value || 3))} className="h-11 min-h-11 w-24" />
                  ) : null}
                  {durationMode === "custom" ? <span>{pickerText("pickerMonths", "{count}개월").replace("{count}", "")}</span> : null}
                </label>
              </fieldset>
              {error ? (
                <p className="text-sm text-danger" role="alert" aria-live="assertive">
                  {error}
                </p>
              ) : null}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" className="h-11 px-4 text-[15px]" onClick={() => setDetailsOpen(false)} disabled={loading}>
                {pickerText("pickerClose", "닫기")}
              </Button>
              <Button type="submit" className="h-11 px-4 text-[15px]" loading={loading} data-testid="create-project">
                {pickerText("pickerStart", "제작 시작")}
              </Button>
            </DialogFooter>
          </form>
        </DialogShell>
      ) : null}
    </div>
  );
}
