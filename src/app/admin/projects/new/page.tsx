"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { TEMPLATE_CATALOG } from "@/modules/templates/definitions";

export default function NewProjectPage() {
  const router = useRouter();
  const [durationMode, setDurationMode] = useState<"default" | "custom">("default");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const durationMonths = durationMode === "default" ? 3 : Number(form.get("durationMonths") || 3);
    setLoading(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        publicSlug: form.get("publicSlug"),
        templateCode: form.get("templateCode"),
        durationMonths,
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
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">홈페이지 만들기</h1>
        <p className="mt-2 text-sm text-text-body">공개 URL은 현장명과 자동으로 묶이지 않습니다. 원하는 텍스트를 직접 입력하세요.</p>
      </div>
      <Field label="프로젝트명 / 현장명">
        <Input name="name" required data-testid="project-name" />
      </Field>
      <Field label="공개 URL 텍스트" hint="한글, 영문, 숫자, 하이픈. 예: lumiere-central">
        <Input name="publicSlug" required data-testid="project-slug" />
      </Field>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">운영기간</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="durationMode" checked={durationMode === "default"} onChange={() => setDurationMode("default")} />
          3개월
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="durationMode" checked={durationMode === "custom"} onChange={() => setDurationMode("custom")} />
          직접 입력
          {durationMode === "custom" ? <Input name="durationMonths" type="number" min={1} defaultValue={3} className="w-24" /> : null}
          {durationMode === "custom" ? <span>개월</span> : null}
        </label>
      </fieldset>
      <fieldset className="grid gap-3 md:grid-cols-2">
        {TEMPLATE_CATALOG.map((template) => (
          <label key={template.code} className="rounded-2xl border border-border bg-white p-5">
            <input type="radio" name="templateCode" value={template.code} required className="mr-2" data-testid={`template-${template.code}`} />
            <span className="font-semibold">{template.name}</span>
            <p className="mt-2 text-sm text-text-body">{template.description}</p>
          </label>
        ))}
      </fieldset>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" loading={loading} data-testid="create-project">
        작업본 만들기
      </Button>
    </form>
  );
}
