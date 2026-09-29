"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { TEMPLATE_CATALOG, createTemplateSections, placeholderPrivacy, defaultFormFields } from "@/modules/templates/definitions";
import { LandingPage } from "@/modules/templates/render/landing-page";
import type { PageSnapshot, TemplateCode } from "@/types";
import { cn } from "@/lib/cn";

const STEPS = ["정보 입력", "템플릿 선택", "제작"];

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [durationMode, setDurationMode] = useState<"default" | "custom">("default");
  const [name, setName] = useState("");
  const [publicSlug, setPublicSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [durationMonths, setDurationMonths] = useState(3);
  const [templateCode, setTemplateCode] = useState<TemplateCode>("image-focus");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const preview = useMemo<PageSnapshot>(() => {
    return {
      templateCode,
      projectName: name || "현장명",
      publicSlug: publicSlug || "preview",
      phone,
      globalSettings: { phone, siteName: name },
      formSettings: {
        intro: "상담을 원하시면 정보를 남겨 주세요.",
        successMessage: "관심고객 등록이 완료되었습니다.",
        fields: defaultFormFields(),
      },
      seoSettings: { title: name, description: "", ogImageAssetId: null },
      privacy: placeholderPrivacy(),
      sections: createTemplateSections(templateCode, "preview").map((section) =>
        section.sectionType === "hero" ? { ...section, content: { ...section.content, headline: name || "현장명" } } : section,
      ),
    };
  }, [templateCode, name, publicSlug, phone]);

  async function create() {
    setLoading(true);
    setError("");
    const months = durationMode === "default" ? 3 : durationMonths;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        publicSlug,
        templateCode,
        durationMonths: months,
        phone,
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.message ?? "만들지 못했습니다.");
      return;
    }
    router.push(`/admin/projects/${json.project.id}/editor`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm text-text-muted">홈페이지 만들기</p>
        <ol className="mt-3 flex flex-wrap gap-2">
          {STEPS.map((label, index) => {
            const number = index + 1;
            return (
              <li
                key={label}
                className={cn(
                  "rounded-full px-3 py-1 text-sm",
                  number === step ? "bg-primary text-white" : "bg-white text-text-body",
                )}
              >
                {number}. {label}
              </li>
            );
          })}
        </ol>
      </div>

      {step === 1 ? (
        <form
          className="max-w-2xl space-y-6 rounded-none border border-border bg-white p-6"
          onSubmit={(event) => {
            event.preventDefault();
            setStep(2);
          }}
        >
          <div>
            <h1 className="text-3xl font-bold">정보 입력</h1>
            <p className="mt-2 text-sm text-text-body">현장명과 대표 전화는 홈페이지 전체에서 함께 쓰입니다. 공개 URL은 따로 정합니다.</p>
          </div>
          <Field label="현장명">
            <Input name="name" required value={name} onChange={(event) => setName(event.target.value)} data-testid="project-name" />
          </Field>
          <Field label="공개 URL 텍스트" hint="한글, 영문, 숫자, 하이픈. 예: lumiere-central">
            <Input name="publicSlug" required value={publicSlug} onChange={(event) => setPublicSlug(event.target.value)} data-testid="project-slug" />
          </Field>
          <Field label="대표 전화">
            <Input name="phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="02-000-0000" data-testid="project-phone" />
          </Field>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">운영기간</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={durationMode === "default"} onChange={() => setDurationMode("default")} />
              3개월
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={durationMode === "custom"} onChange={() => setDurationMode("custom")} />
              직접 입력
              {durationMode === "custom" ? (
                <Input
                  type="number"
                  min={1}
                  value={durationMonths}
                  onChange={(event) => setDurationMonths(Number(event.target.value || 3))}
                  className="w-24"
                />
              ) : null}
              {durationMode === "custom" ? <span>개월</span> : null}
            </label>
          </fieldset>
          <Button type="submit" data-testid="wizard-next">
            템플릿 선택
          </Button>
        </form>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="space-y-3">
            <h1 className="text-2xl font-bold">템플릿 선택</h1>
            {TEMPLATE_CATALOG.map((template) => (
              <button
                key={template.code}
                type="button"
                onClick={() => setTemplateCode(template.code)}
                className={cn(
                  "block w-full border bg-white p-4 text-left",
                  templateCode === template.code ? "border-primary" : "border-border",
                )}
              >
                <span className="font-semibold">{template.name}</span>
                <p className="mt-2 text-sm text-text-body">{template.description}</p>
                <input
                  type="radio"
                  readOnly
                  checked={templateCode === template.code}
                  className="sr-only"
                  data-testid={`template-${template.code}`}
                />
              </button>
            ))}
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                이전
              </Button>
              <Button type="button" loading={loading} data-testid="create-project" onClick={() => void create()}>
                제작하기
              </Button>
            </div>
          </div>
          <div className="h-[720px] overflow-hidden border border-border bg-white">
            <div className="origin-top-left scale-[0.55]" style={{ width: "182%" }}>
              <LandingPage snapshot={preview} mode="preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
