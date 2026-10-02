"use client";

import type { PageSection, PageSnapshot } from "@/types";
import { gnbItemsFromSections } from "@/modules/sections/duplicate";
import { LeadForm } from "@/modules/templates/render/lead-form";
import { TrackedLink, TrackedSection } from "@/modules/templates/render/tracker";
import { CanvasEditContext, type CanvasEdit, useCanvasEdit } from "@/modules/editor/edit-context";
import { InlineText } from "@/modules/editor/inline-text";
import { cn } from "@/lib/cn";

function visible(sections: PageSection[]) {
  return [...sections].filter((section) => section.isVisible).sort((a, b) => a.sortOrder - b.sortOrder);
}

function textCommit(section: PageSection, key: string, edit: CanvasEdit | null) {
  if (!edit) return undefined;
  return (value: string) => edit.patch(section.id, { ...section.content, [key]: value });
}

function HeroImageButton({ section, imageUrl }: { section: PageSection; imageUrl: string }) {
  const edit = useCanvasEdit();
  if (!edit) return null;
  return (
    <label className="absolute bottom-6 right-6 z-10 cursor-pointer rounded-full bg-white px-4 py-2 text-xs font-semibold text-text-primary">
      {imageUrl ? "이미지 바꾸기" : "히어로 이미지"}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void edit.upload(file).then((url) => edit.patch(section.id, { ...section.content, imageUrl: url, mediaMode: "image" })).catch(() => undefined);
        }}
      />
    </label>
  );
}

export function LandingPage({
  snapshot,
  mode = "live",
  highlightId,
  variant = "desktop",
  edit = null,
}: {
  snapshot: PageSnapshot;
  mode?: "live" | "preview";
  highlightId?: string | null;
  variant?: "desktop" | "mobile";
  edit?: CanvasEdit | null;
}) {
  const sections = visible(snapshot.sections);
  const gnb = gnbItemsFromSections(snapshot.sections);
  const isVideo = snapshot.templateCode === "video-ready";

  const live = mode === "live";
  const slug = snapshot.publicSlug;

  return (
    <CanvasEditContext.Provider value={edit}>
    <div className={cn("bg-white text-text-primary", variant === "mobile" && "text-[15px]")}>
      <header className="sticky top-0 z-20 border-b border-border/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <a href="#hero" className="font-semibold" onClick={(event) => edit && event.preventDefault()}>
            <InlineText value={snapshot.projectName} onCommit={edit ? edit.setSiteName : undefined} placeholder="현장명" />
          </a>
          <nav className="hidden gap-4 md:flex">
            {gnb.map((item) =>
              live ? (
                <TrackedLink
                  key={item.anchorId}
                  href={item.href}
                  slug={slug}
                  eventName="gnb_click"
                  metadata={{ section: item.anchorId }}
                  className="text-sm text-text-body hover:text-text-primary"
                >
                  {item.label}
                </TrackedLink>
              ) : (
                <a key={item.anchorId} href={item.href} className="text-sm text-text-body hover:text-text-primary">
                  {item.label}
                </a>
              ),
            )}
          </nav>
          {live ? (
            <TrackedLink href="#inquiry" slug={slug} eventName="lead_cta_click" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
              관심고객등록
            </TrackedLink>
          ) : (
            <a href="#inquiry" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white" onClick={(event) => edit && event.preventDefault()}>
              관심고객등록
            </a>
          )}
        </div>
      </header>
      {sections.map((section) => {
        const inner = (
          <>
            {section.sectionType === "hero" ? <Hero section={section} snapshot={snapshot} cinematic={isVideo} live={live} /> : null}
            {section.sectionType === "overview" ? <Overview section={section} stacked={isVideo} /> : null}
            {section.sectionType === "location" ? <Cards section={section} timeline={isVideo} /> : null}
            {section.sectionType === "premium" ? <Premium section={section} magazine={isVideo} /> : null}
            {section.sectionType === "gallery" ? <Gallery section={section} /> : null}
            {section.sectionType === "floorplan" ? <Floorplan section={section} /> : null}
            {section.sectionType === "directions" ? <Directions section={section} phone={snapshot.phone} /> : null}
            {section.sectionType === "lead_form" ? (
              <LeadForm snapshot={snapshot} section={section} disabled={mode === "preview"} />
            ) : null}
            {section.sectionType === "legal" ? <Legal section={section} snapshot={snapshot} /> : null}
          </>
        );
        const className = cn(highlightId === section.id && "ring-2 ring-primary ring-offset-4");
        return live ? (
          <TrackedSection key={section.id} slug={slug} name={section.sectionType} id={section.anchorId} className={className}>
            {inner}
          </TrackedSection>
        ) : (
          <section key={section.id} id={section.anchorId} className={className}>
            {inner}
          </section>
        );
      })}
    </div>
    </CanvasEditContext.Provider>
  );
}

function Hero({
  section,
  snapshot,
  cinematic,
  live,
}: {
  section: PageSection;
  snapshot: PageSnapshot;
  cinematic: boolean;
  live: boolean;
}) {
  const edit = useCanvasEdit();
  const content = section.content;
  const imageUrl = String(content.imageUrl ?? "");
  const videoUrl = String(content.videoUrl ?? "");
  const posterUrl = String(content.posterUrl ?? "");
  const mediaMode = String(content.mediaMode ?? "image");
  const cta = (
    <a href="#inquiry" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-text-primary" onClick={(event) => edit && event.preventDefault()}>
      <InlineText value={String(content.ctaLabel ?? "관심고객등록")} placeholder="버튼 문구" className="text-text-primary" onCommit={textCommit(section, "ctaLabel", edit)} />
    </a>
  );
  return (
    <div className={cn("relative overflow-hidden px-4 py-24 text-white", cinematic ? "min-h-[78vh]" : "min-h-[70vh]")}>
      {mediaMode === "video" && videoUrl ? (
        <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline poster={posterUrl || undefined}>
          <source src={videoUrl} />
        </video>
      ) : imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[#1c2430]" />
      )}
      <div className="absolute inset-0 bg-black/35" />
      <HeroImageButton section={section} imageUrl={imageUrl} />
      <div className="relative mx-auto max-w-6xl">
        <p className="text-sm tracking-wide text-white/80">
          <InlineText
            value={String(content.kicker ?? "")}
            placeholder="한 줄 소개"
            className="text-white"
            onCommit={textCommit(section, "kicker", edit)}
          />
        </p>
        <h1 className={cn("mt-3 max-w-3xl font-bold leading-tight break-keep", cinematic ? "text-5xl" : "text-4xl")}>
          <InlineText
            value={String(content.headline ?? snapshot.projectName)}
            placeholder="현장명"
            className="text-white"
            onCommit={edit?.setSiteName}
          />
        </h1>
        <p className="mt-4 max-w-xl text-lg text-white/85">
          <InlineText
            value={String(content.subheadline ?? "")}
            placeholder="안내 문구"
            multiline
            className="text-white"
            onCommit={textCommit(section, "subheadline", edit)}
          />
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {live ? (
            <TrackedLink href="#inquiry" slug={snapshot.publicSlug} eventName="lead_cta_click" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-text-primary">
              {String(content.ctaLabel ?? "관심고객등록")}
            </TrackedLink>
          ) : (
            cta
          )}
          {live && snapshot.phone ? (
            <TrackedLink
              href={`tel:${snapshot.phone}`}
              slug={snapshot.publicSlug}
              eventName="phone_click"
              className="rounded-full border border-white/40 px-5 py-3 text-sm font-semibold"
            >
              {snapshot.phone}
            </TrackedLink>
          ) : snapshot.phone || edit ? (
            <span className="rounded-full border border-white/40 px-5 py-3 text-sm font-semibold">
              <InlineText value={snapshot.phone} placeholder="대표 전화" className="text-white" onCommit={edit?.setPhone} />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Overview({ section, stacked }: { section: PageSection; stacked: boolean }) {
  const edit = useCanvasEdit();
  const facts = (section.content.facts as Array<{ label: string; value: string }>) ?? [];
  function setFacts(next: Array<{ label: string; value: string }>) {
    edit?.patch(section.id, { ...section.content, facts: next });
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <h2 className="text-3xl font-bold break-keep">
        <InlineText value={String(section.content.heading ?? section.title)} onCommit={textCommit(section, "heading", edit)} placeholder="제목" />
      </h2>
      <p className="mt-4 max-w-3xl text-text-body">
        <InlineText value={String(section.content.body ?? "")} multiline onCommit={textCommit(section, "body", edit)} placeholder="설명" />
      </p>
      <div className={cn("mt-10 grid gap-4", stacked ? "md:grid-cols-2" : "md:grid-cols-4")}>
        {facts.map((fact, index) => (
          <div key={`${section.id}-fact-${index}`} className="rounded-2xl bg-surface p-5">
            <p className="text-sm text-text-muted">
              <InlineText
                value={fact.label}
                placeholder="항목"
                onCommit={edit ? (value) => setFacts(facts.map((item, itemIndex) => (itemIndex === index ? { ...item, label: value } : item))) : undefined}
              />
            </p>
            <p className="mt-2 text-lg font-semibold">
              <InlineText
                value={fact.value}
                placeholder="내용"
                onCommit={edit ? (value) => setFacts(facts.map((item, itemIndex) => (itemIndex === index ? { ...item, value } : item))) : undefined}
              />
            </p>
            {edit ? (
              <button type="button" className="mt-3 text-xs text-text-muted" onClick={() => setFacts(facts.filter((_, itemIndex) => itemIndex !== index))}>
                삭제
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {edit ? (
        <button type="button" className="mt-4 text-sm font-medium text-primary" onClick={() => setFacts([...facts, { label: "항목", value: "내용" }])}>
          항목 추가
        </button>
      ) : null}
    </div>
  );
}

function Cards({ section, timeline }: { section: PageSection; timeline: boolean }) {
  const edit = useCanvasEdit();
  const cards = (section.content.cards as Array<{ title: string; body: string }>) ?? [];
  function setCards(next: Array<{ title: string; body: string }>) {
    edit?.patch(section.id, { ...section.content, cards: next });
  }
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-bold break-keep">
          <InlineText value={String(section.content.heading ?? section.title)} onCommit={textCommit(section, "heading", edit)} placeholder="제목" />
        </h2>
        <p className="mt-4 max-w-3xl text-text-body">
          <InlineText value={String(section.content.body ?? "")} multiline onCommit={textCommit(section, "body", edit)} placeholder="설명" />
        </p>
        <div className={cn("mt-10 grid gap-4", timeline ? "md:grid-cols-1" : "md:grid-cols-3")}>
          {cards.map((card, index) => (
            <div key={`${section.id}-card-${index}`} className="rounded-2xl bg-white p-6">
              {timeline ? <p className="text-sm text-primary">0{index + 1}</p> : null}
              <h3 className="text-xl font-semibold">
                <InlineText
                  value={card.title}
                  placeholder="제목"
                  onCommit={edit ? (value) => setCards(cards.map((item, itemIndex) => (itemIndex === index ? { ...item, title: value } : item))) : undefined}
                />
              </h3>
              <p className="mt-2 text-text-body">
                <InlineText
                  value={card.body}
                  multiline
                  placeholder="내용"
                  onCommit={edit ? (value) => setCards(cards.map((item, itemIndex) => (itemIndex === index ? { ...item, body: value } : item))) : undefined}
                />
              </p>
              {edit ? (
                <button type="button" className="mt-3 text-xs text-text-muted" onClick={() => setCards(cards.filter((_, itemIndex) => itemIndex !== index))}>
                  삭제
                </button>
              ) : null}
            </div>
          ))}
        </div>
        {edit ? (
          <button type="button" className="mt-4 text-sm font-medium text-primary" onClick={() => setCards([...cards, { title: "항목", body: "내용을 입력하세요." }])}>
            항목 추가
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Premium({ section, magazine }: { section: PageSection; magazine: boolean }) {
  const edit = useCanvasEdit();
  const items = (section.content.items as Array<{ title: string; body: string }>) ?? [];
  function setItems(next: Array<{ title: string; body: string }>) {
    edit?.patch(section.id, { ...section.content, items: next });
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <h2 className="text-3xl font-bold break-keep">
        <InlineText value={String(section.content.heading ?? section.title)} onCommit={textCommit(section, "heading", edit)} placeholder="제목" />
      </h2>
      <div className={cn("mt-10 grid gap-6", magazine ? "md:grid-cols-2" : "md:grid-cols-3")}>
        {items.map((item, index) => (
          <div key={`${section.id}-item-${index}`} className={cn("border border-border p-6", magazine && "min-h-48")}>
            <h3 className="text-xl font-semibold">
              <InlineText
                value={item.title}
                placeholder="제목"
                onCommit={edit ? (value) => setItems(items.map((row, itemIndex) => (itemIndex === index ? { ...row, title: value } : row))) : undefined}
              />
            </h3>
            <p className="mt-3 text-text-body">
              <InlineText
                value={item.body}
                multiline
                placeholder="내용"
                onCommit={edit ? (value) => setItems(items.map((row, itemIndex) => (itemIndex === index ? { ...row, body: value } : row))) : undefined}
              />
            </p>
            {edit ? (
              <button type="button" className="mt-3 text-xs text-text-muted" onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))}>
                삭제
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {edit ? (
        <button type="button" className="mt-4 text-sm font-medium text-primary" onClick={() => setItems([...items, { title: "특장점", body: "내용을 입력하세요." }])}>
          항목 추가
        </button>
      ) : null}
    </div>
  );
}

function Gallery({ section }: { section: PageSection }) {
  const edit = useCanvasEdit();
  const images = (section.content.images as Array<{ assetId?: string; url?: string; alt: string }>) ?? [];
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-bold break-keep">
          <InlineText value={String(section.content.heading ?? section.title)} onCommit={textCommit(section, "heading", edit)} placeholder="제목" />
        </h2>
        <div className="mt-8 flex gap-3 overflow-x-auto">
          {images.length === 0
            ? [1, 2, 3].map((item) => <div key={item} className="h-40 w-56 shrink-0 bg-[#dbe4ee]" />)
            : images.map((image, index) =>
                image.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={`${image.url}-${index}`} src={image.url} alt={image.alt} className="h-40 w-56 shrink-0 object-cover" />
                ) : (
                  <div key={image.assetId ?? index} className="h-40 w-56 shrink-0 bg-[#dbe4ee]" />
                ),
              )}
        </div>
        {edit ? (
          <label className="mt-4 inline-block cursor-pointer text-sm font-medium text-primary">
            이미지 추가
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void edit.upload(file).then((url) => {
                  edit.patch(section.id, { ...section.content, images: [...images, { url, alt: file.name }] });
                }).catch(() => undefined);
              }}
            />
          </label>
        ) : null}
      </div>
    </div>
  );
}

function Floorplan({ section }: { section: PageSection }) {
  const edit = useCanvasEdit();
  const types = (section.content.types as Array<{ name: string; summary: string; imageUrl?: string }>) ?? [];
  function setTypes(next: Array<{ name: string; summary: string; imageUrl?: string }>) {
    edit?.patch(section.id, { ...section.content, types: next });
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <h2 className="text-3xl font-bold break-keep">
        <InlineText value={String(section.content.heading ?? section.title)} onCommit={textCommit(section, "heading", edit)} placeholder="제목" />
      </h2>
      <div className="mt-8 flex gap-3 overflow-x-auto">
        {types.map((type, index) => (
          <div key={`${section.id}-type-${index}`} className="w-72 shrink-0 border border-border p-6">
            {type.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={type.imageUrl} alt="" className="mb-4 h-40 w-full object-cover" />
            ) : (
              <div className="mb-4 h-40 w-full bg-surface" />
            )}
            {edit ? (
              <label className="mb-3 inline-block cursor-pointer text-xs font-medium text-primary">
                평면 이미지
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void edit.upload(file).then((url) => {
                      setTypes(types.map((row, itemIndex) => (itemIndex === index ? { ...row, imageUrl: url } : row)));
                    }).catch(() => undefined);
                  }}
                />
              </label>
            ) : null}
            <h3 className="text-xl font-semibold">
              <InlineText
                value={type.name}
                placeholder="타입"
                onCommit={edit ? (value) => setTypes(types.map((row, itemIndex) => (itemIndex === index ? { ...row, name: value } : row))) : undefined}
              />
            </h3>
            <p className="mt-2 text-text-body">
              <InlineText
                value={type.summary}
                multiline
                placeholder="설명"
                onCommit={edit ? (value) => setTypes(types.map((row, itemIndex) => (itemIndex === index ? { ...row, summary: value } : row))) : undefined}
              />
            </p>
          </div>
        ))}
      </div>
      {edit ? (
        <button type="button" className="mt-4 text-sm font-medium text-primary" onClick={() => setTypes([...types, { name: "타입", summary: "설명을 입력하세요." }])}>
          타입 추가
        </button>
      ) : null}
    </div>
  );
}

function Directions({ section, phone }: { section: PageSection; phone: string }) {
  const edit = useCanvasEdit();
  const mapImageUrl = String(section.content.mapImageUrl ?? "");
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-bold break-keep">
          <InlineText value={String(section.content.heading ?? section.title)} onCommit={textCommit(section, "heading", edit)} placeholder="제목" />
        </h2>
        <p className="mt-4 text-lg font-medium">
          <InlineText value={String(section.content.address ?? "")} onCommit={textCommit(section, "address", edit)} placeholder="주소" />
        </p>
        <p className="mt-2 text-text-body">
          <InlineText value={String(section.content.guide ?? "")} multiline onCommit={textCommit(section, "guide", edit)} placeholder="찾아오는 방법" />
        </p>
        {phone || edit ? (
          <p className="mt-2 text-text-body">
            전화 <InlineText value={phone} onCommit={edit?.setPhone} placeholder="대표 전화" />
          </p>
        ) : null}
        {mapImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mapImageUrl} alt="" className="mt-6 h-56 w-full object-cover" />
        ) : null}
        {edit ? (
          <label className="mt-4 inline-block cursor-pointer text-sm font-medium text-primary">
            약도 이미지
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void edit.upload(file).then((url) => edit.patch(section.id, { ...section.content, mapImageUrl: url })).catch(() => undefined);
              }}
            />
          </label>
        ) : null}
      </div>
    </div>
  );
}

function Legal({ section, snapshot }: { section: PageSection; snapshot: PageSnapshot }) {
  const edit = useCanvasEdit();
  return (
    <footer className="border-t border-border bg-white px-4 py-12 text-sm text-text-muted">
      <div className="mx-auto max-w-6xl space-y-2">
        <p className="font-semibold text-text-primary">{snapshot.projectName}</p>
        <p className="font-medium text-text-body">
          <InlineText value={String(section.content.heading ?? "사업 주체 및 법적 고지")} onCommit={textCommit(section, "heading", edit)} placeholder="고지 제목" />
        </p>
        <p>
          <InlineText value={String(section.content.body ?? "")} multiline onCommit={textCommit(section, "body", edit)} placeholder="고지 문구" />
        </p>
        <p>
          광고주:{" "}
          <InlineText value={String(section.content.advertiserName || snapshot.privacy.advertiserCompanyName)} onCommit={textCommit(section, "advertiserName", edit)} placeholder="광고주" />
        </p>
        <p>
          광고사:{" "}
          <InlineText value={String(section.content.agencyName || snapshot.privacy.advertisingAgencyName)} onCommit={textCommit(section, "agencyName", edit)} placeholder="광고사" />
        </p>
        <p>
          문의: <InlineText value={snapshot.phone} onCommit={edit?.setPhone} placeholder="대표 전화" />
        </p>
      </div>
    </footer>
  );
}
