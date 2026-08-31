"use client";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { PageSection, PageSnapshot, ProjectPrivacyConfig } from "@/types";

type DraftPatch = {
  globalSettings?: Record<string, unknown>;
  formSettings?: PageSnapshot["formSettings"];
  seoSettings?: PageSnapshot["seoSettings"];
  privacySettings?: ProjectPrivacyConfig;
};

export function PropertyPanel({
  selected,
  snapshot,
  projectId,
  onSectionChange,
  onPhoneChange,
  onDraftChange,
}: {
  selected: PageSection;
  snapshot: PageSnapshot;
  projectId: string;
  onSectionChange: (next: PageSection) => void;
  onPhoneChange: (phone: string) => void;
  onDraftChange: (patch: DraftPatch) => void;
}) {
  async function upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("projectId", projectId);
    const res = await fetch("/api/uploads", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message ?? "업로드에 실패했습니다.");
    return json.url as string;
  }

  function patchContent(patch: Record<string, unknown>) {
    onSectionChange({ ...selected, content: { ...selected.content, ...patch } });
  }

  return (
    <div className="space-y-4">
      <PageSettings snapshot={snapshot} onDraftChange={onDraftChange} />
      <div className="border-t border-border pt-4">
        <p className="mb-3 text-xs font-medium text-text-muted">선택 섹션</p>
        <Field label="섹션 제목">
          <Input
            value={selected.title}
            onChange={(event) =>
              onSectionChange({ ...selected, title: event.target.value, gnbLabel: event.target.value })
            }
          />
        </Field>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selected.showInGnb}
            onChange={(event) => onSectionChange({ ...selected, showInGnb: event.target.checked })}
          />
          GNB 표시
        </label>
      </div>

      {selected.sectionType === "hero" ? (
        <HeroFields
          selected={selected}
          snapshot={snapshot}
          onPhoneChange={onPhoneChange}
          patchContent={patchContent}
          upload={upload}
        />
      ) : null}
      {selected.sectionType === "overview" ? (
        <>
          <HeadingBody selected={selected} patchContent={patchContent} />
          <PairList
            label="개요 항목"
            items={(selected.content.facts as Array<{ label: string; value: string }>) ?? []}
            fields={[
              { key: "label", label: "항목" },
              { key: "value", label: "내용" },
            ]}
            onChange={(facts) => patchContent({ facts })}
          />
        </>
      ) : null}
      {selected.sectionType === "location" ? (
        <>
          <HeadingBody selected={selected} patchContent={patchContent} />
          <PairList
            label="입지 카드"
            items={(selected.content.cards as Array<{ title: string; body: string }>) ?? []}
            fields={[
              { key: "title", label: "제목" },
              { key: "body", label: "설명", multiline: true },
            ]}
            onChange={(cards) => patchContent({ cards })}
          />
        </>
      ) : null}
      {selected.sectionType === "premium" ? (
        <>
          <HeadingBody selected={selected} patchContent={patchContent} />
          <PairList
            label="특장점"
            items={(selected.content.items as Array<{ title: string; body: string }>) ?? []}
            fields={[
              { key: "title", label: "제목" },
              { key: "body", label: "설명", multiline: true },
            ]}
            onChange={(items) => patchContent({ items })}
          />
        </>
      ) : null}
      {selected.sectionType === "gallery" ? (
        <GalleryFields selected={selected} patchContent={patchContent} upload={upload} />
      ) : null}
      {selected.sectionType === "floorplan" ? (
        <FloorplanFields selected={selected} patchContent={patchContent} upload={upload} />
      ) : null}
      {selected.sectionType === "directions" ? (
        <>
          <HeadingBody selected={selected} patchContent={patchContent} />
          <Field label="주소">
            <Input
              value={String(selected.content.address ?? "")}
              onChange={(event) => patchContent({ address: event.target.value })}
            />
          </Field>
          <Field label="찾아오시는 길">
            <Textarea
              value={String(selected.content.guide ?? "")}
              onChange={(event) => patchContent({ guide: event.target.value })}
            />
          </Field>
          <Field label="약도 이미지">
            <input
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                patchContent({ mapImageUrl: await upload(file) });
              }}
            />
          </Field>
        </>
      ) : null}
      {selected.sectionType === "lead_form" ? (
        <>
          <HeadingBody selected={selected} patchContent={patchContent} />
          <Field label="폼 안내 문구">
            <Textarea
              value={snapshot.formSettings.intro}
              onChange={(event) =>
                onDraftChange({ formSettings: { ...snapshot.formSettings, intro: event.target.value } })
              }
            />
          </Field>
          <Field label="등록 완료 메시지">
            <Input
              value={snapshot.formSettings.successMessage}
              onChange={(event) =>
                onDraftChange({ formSettings: { ...snapshot.formSettings, successMessage: event.target.value } })
              }
            />
          </Field>
        </>
      ) : null}
      {selected.sectionType === "legal" ? (
        <>
          <HeadingBody selected={selected} patchContent={patchContent} />
          <Field label="광고주">
            <Input
              value={String(selected.content.advertiserName ?? "")}
              onChange={(event) => patchContent({ advertiserName: event.target.value })}
            />
          </Field>
          <Field label="광고사">
            <Input
              value={String(selected.content.agencyName ?? "")}
              onChange={(event) => patchContent({ agencyName: event.target.value })}
            />
          </Field>
          <Field label="문의">
            <Input
              value={String(selected.content.contact ?? "")}
              onChange={(event) => patchContent({ contact: event.target.value })}
            />
          </Field>
        </>
      ) : null}
    </div>
  );
}

function PageSettings({
  snapshot,
  onDraftChange,
}: {
  snapshot: PageSnapshot;
  onDraftChange: (patch: DraftPatch) => void;
}) {
  const privacy = snapshot.privacy;
  return (
    <details className="rounded-xl bg-surface p-3">
      <summary className="cursor-pointer text-sm font-semibold">페이지 설정</summary>
      <div className="mt-3 space-y-3">
        <Field label="검색 제목">
          <Input
            value={snapshot.seoSettings.title}
            onChange={(event) => onDraftChange({ seoSettings: { ...snapshot.seoSettings, title: event.target.value } })}
          />
        </Field>
        <Field label="검색 설명">
          <Textarea
            value={snapshot.seoSettings.description}
            onChange={(event) =>
              onDraftChange({ seoSettings: { ...snapshot.seoSettings, description: event.target.value } })
            }
          />
        </Field>
        <Field label="수집 주체" hint="출시 전 확정값으로 바꾸세요">
          <Input
            value={privacy.collectingControllerName}
            onChange={(event) =>
              onDraftChange({ privacySettings: { ...privacy, collectingControllerName: event.target.value } })
            }
          />
        </Field>
        <Field label="광고주 회사명">
          <Input
            value={privacy.advertiserCompanyName}
            onChange={(event) =>
              onDraftChange({ privacySettings: { ...privacy, advertiserCompanyName: event.target.value } })
            }
          />
        </Field>
        <Field label="광고사명">
          <Input
            value={privacy.advertisingAgencyName}
            onChange={(event) =>
              onDraftChange({ privacySettings: { ...privacy, advertisingAgencyName: event.target.value } })
            }
          />
        </Field>
      </div>
    </details>
  );
}

function HeadingBody({
  selected,
  patchContent,
}: {
  selected: PageSection;
  patchContent: (patch: Record<string, unknown>) => void;
}) {
  return (
    <>
      <Field label="제목">
        <Input
          value={String(selected.content.heading ?? "")}
          onChange={(event) => patchContent({ heading: event.target.value })}
        />
      </Field>
      <Field label="본문">
        <Textarea
          value={String(selected.content.body ?? "")}
          onChange={(event) => patchContent({ body: event.target.value })}
        />
      </Field>
    </>
  );
}

function HeroFields({
  selected,
  snapshot,
  onPhoneChange,
  patchContent,
  upload,
}: {
  selected: PageSection;
  snapshot: PageSnapshot;
  onPhoneChange: (phone: string) => void;
  patchContent: (patch: Record<string, unknown>) => void;
  upload: (file: File) => Promise<string>;
}) {
  return (
    <>
      <Field label="상단 라벨">
        <Input value={String(selected.content.kicker ?? "")} onChange={(event) => patchContent({ kicker: event.target.value })} />
      </Field>
      <Field label="현장명 / 헤드라인">
        <Input value={String(selected.content.headline ?? "")} onChange={(event) => patchContent({ headline: event.target.value })} />
      </Field>
      <Field label="핵심 카피">
        <Textarea
          value={String(selected.content.subheadline ?? "")}
          onChange={(event) => patchContent({ subheadline: event.target.value })}
        />
      </Field>
      <Field label="등록 버튼 문구">
        <Input value={String(selected.content.ctaLabel ?? "")} onChange={(event) => patchContent({ ctaLabel: event.target.value })} />
      </Field>
      <Field label="전화 버튼 문구">
        <Input value={String(selected.content.phoneLabel ?? "")} onChange={(event) => patchContent({ phoneLabel: event.target.value })} />
      </Field>
      <Field label="상담 전화">
        <Input value={snapshot.phone} onChange={(event) => onPhoneChange(event.target.value)} />
      </Field>
      <Field label="히어로 이미지">
        <input
          type="file"
          accept="image/*"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            patchContent({ imageUrl: await upload(file), mediaMode: "image" });
          }}
        />
      </Field>
      {snapshot.templateCode === "video-ready" ? (
        <>
          <Field label="히어로 영상">
            <input
              type="file"
              accept="video/mp4,video/webm"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                patchContent({ videoUrl: await upload(file), mediaMode: "video" });
              }}
            />
          </Field>
          <Field label="포스터 이미지">
            <input
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                patchContent({ posterUrl: await upload(file) });
              }}
            />
          </Field>
        </>
      ) : null}
    </>
  );
}

function PairList<T extends Record<string, string>>({
  label,
  items,
  fields,
  onChange,
}: {
  label: string;
  items: T[];
  fields: Array<{ key: keyof T & string; label: string; multiline?: boolean }>;
  onChange: (next: T[]) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {items.map((item, index) => (
        <div key={index} className="space-y-2 rounded-xl border border-border p-3">
          {fields.map((field) => (
            <Field key={field.key} label={field.label}>
              {field.multiline ? (
                <Textarea
                  value={item[field.key] ?? ""}
                  onChange={(event) =>
                    onChange(items.map((row, i) => (i === index ? { ...row, [field.key]: event.target.value } : row)))
                  }
                />
              ) : (
                <Input
                  value={item[field.key] ?? ""}
                  onChange={(event) =>
                    onChange(items.map((row, i) => (i === index ? { ...row, [field.key]: event.target.value } : row)))
                  }
                />
              )}
            </Field>
          ))}
          <button type="button" className="text-xs text-danger" onClick={() => onChange(items.filter((_, i) => i !== index))}>
            삭제
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        onClick={() => onChange([...items, Object.fromEntries(fields.map((field) => [field.key, ""])) as T])}
      >
        항목 추가
      </Button>
    </div>
  );
}

function GalleryFields({
  selected,
  patchContent,
  upload,
}: {
  selected: PageSection;
  patchContent: (patch: Record<string, unknown>) => void;
  upload: (file: File) => Promise<string>;
}) {
  const images = (selected.content.images as Array<{ url?: string; alt: string }>) ?? [];
  return (
    <>
      <HeadingBody selected={selected} patchContent={patchContent} />
      <div className="space-y-2">
        {images.map((image, index) => (
          <div key={`${image.url}-${index}`} className="flex items-center justify-between gap-2 rounded-xl border border-border p-2 text-xs">
            <span className="truncate">{image.alt || image.url}</span>
            <button type="button" className="text-danger" onClick={() => patchContent({ images: images.filter((_, i) => i !== index) })}>
              삭제
            </button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="soft"
        onClick={async () => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            const url = await upload(file);
            patchContent({ images: [...images, { url, alt: file.name }] });
          };
          input.click();
        }}
      >
        갤러리 이미지 추가
      </Button>
    </>
  );
}

function FloorplanFields({
  selected,
  patchContent,
  upload,
}: {
  selected: PageSection;
  patchContent: (patch: Record<string, unknown>) => void;
  upload: (file: File) => Promise<string>;
}) {
  const types = (selected.content.types as Array<{ name: string; summary: string; imageUrl?: string }>) ?? [];
  return (
    <>
      <HeadingBody selected={selected} patchContent={patchContent} />
      <div className="space-y-3">
        {types.map((type, index) => (
          <div key={index} className="space-y-2 rounded-xl border border-border p-3">
            <Field label="타입명">
              <Input
                value={type.name}
                onChange={(event) =>
                  patchContent({ types: types.map((row, i) => (i === index ? { ...row, name: event.target.value } : row)) })
                }
              />
            </Field>
            <Field label="설명">
              <Textarea
                value={type.summary}
                onChange={(event) =>
                  patchContent({
                    types: types.map((row, i) => (i === index ? { ...row, summary: event.target.value } : row)),
                  })
                }
              />
            </Field>
            <Field label="평면 이미지">
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const imageUrl = await upload(file);
                  patchContent({ types: types.map((row, i) => (i === index ? { ...row, imageUrl } : row)) });
                }}
              />
            </Field>
            <button type="button" className="text-xs text-danger" onClick={() => patchContent({ types: types.filter((_, i) => i !== index) })}>
              삭제
            </button>
          </div>
        ))}
        <Button type="button" variant="ghost" onClick={() => patchContent({ types: [...types, { name: "", summary: "" }] })}>
          타입 추가
        </Button>
      </div>
    </>
  );
}
