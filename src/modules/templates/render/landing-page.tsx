import type { PageSection, PageSnapshot } from "@/types";
import { gnbItemsFromSections } from "@/modules/sections/duplicate";
import { LeadForm } from "@/modules/templates/render/lead-form";
import { TrackedLink, TrackedSection } from "@/modules/templates/render/tracker";
import { cn } from "@/lib/cn";

function visible(sections: PageSection[]) {
  return [...sections].filter((section) => section.isVisible).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function LandingPage({
  snapshot,
  mode = "live",
  highlightId,
  variant = "desktop",
}: {
  snapshot: PageSnapshot;
  mode?: "live" | "preview";
  highlightId?: string | null;
  variant?: "desktop" | "mobile";
}) {
  const sections = visible(snapshot.sections);
  const gnb = gnbItemsFromSections(snapshot.sections);
  const isVideo = snapshot.templateCode === "video-ready";

  const live = mode === "live";
  const slug = snapshot.publicSlug;

  return (
    <div className={cn("bg-white text-text-primary", variant === "mobile" && "text-[15px]")}>
      <header className="sticky top-0 z-20 border-b border-border/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <a href="#hero" className="font-semibold">
            {snapshot.projectName}
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
              관심고객 등록
            </TrackedLink>
          ) : (
            <a href="#inquiry" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
              관심고객 등록
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
            {section.sectionType === "directions" ? <Directions section={section} /> : null}
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
  const content = section.content;
  const imageUrl = String(content.imageUrl ?? "");
  const videoUrl = String(content.videoUrl ?? "");
  const posterUrl = String(content.posterUrl ?? "");
  const mediaMode = String(content.mediaMode ?? "image");
  const cta = (
    <a href="#inquiry" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-text-primary">
      {String(content.ctaLabel ?? "관심고객 등록")}
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
        <div className="absolute inset-0 bg-gradient-to-br from-[#1b2430] via-[#243044] to-[#3182f6]" />
      )}
      <div className="absolute inset-0 bg-black/35" />
      <div className="relative mx-auto max-w-6xl">
        <p className="text-sm tracking-wide text-white/80">{String(content.kicker ?? "")}</p>
        <h1 className={cn("mt-3 font-bold", cinematic ? "max-w-3xl text-5xl leading-tight" : "max-w-2xl text-4xl leading-tight")}>
          {String(content.headline ?? snapshot.projectName)}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-white/85">{String(content.subheadline ?? "")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {live ? (
            <TrackedLink href="#inquiry" slug={snapshot.publicSlug} eventName="lead_cta_click" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-text-primary">
              {String(content.ctaLabel ?? "관심고객 등록")}
            </TrackedLink>
          ) : (
            cta
          )}
          {snapshot.phone ? (
            live ? (
              <TrackedLink
                href={`tel:${snapshot.phone}`}
                slug={snapshot.publicSlug}
                eventName="phone_click"
                className="rounded-full border border-white/40 px-5 py-3 text-sm font-semibold"
              >
                {String(content.phoneLabel ?? "전화 문의")}
              </TrackedLink>
            ) : (
              <a href={`tel:${snapshot.phone}`} className="rounded-full border border-white/40 px-5 py-3 text-sm font-semibold">
                {String(content.phoneLabel ?? "전화 문의")}
              </a>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Overview({ section, stacked }: { section: PageSection; stacked: boolean }) {
  const facts = (section.content.facts as Array<{ label: string; value: string }>) ?? [];
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <h2 className="text-3xl font-bold">{String(section.content.heading ?? section.title)}</h2>
      <p className="mt-4 max-w-3xl text-text-body">{String(section.content.body ?? "")}</p>
      <div className={cn("mt-10 grid gap-4", stacked ? "md:grid-cols-2" : "md:grid-cols-4")}>
        {facts.map((fact) => (
          <div key={fact.label} className="rounded-2xl bg-surface p-5">
            <p className="text-sm text-text-muted">{fact.label}</p>
            <p className="mt-2 text-lg font-semibold">{fact.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Cards({ section, timeline }: { section: PageSection; timeline: boolean }) {
  const cards = (section.content.cards as Array<{ title: string; body: string }>) ?? [];
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-bold">{String(section.content.heading ?? section.title)}</h2>
        <p className="mt-4 max-w-3xl text-text-body">{String(section.content.body ?? "")}</p>
        <div className={cn("mt-10 grid gap-4", timeline ? "md:grid-cols-1" : "md:grid-cols-3")}>
          {cards.map((card, index) => (
            <div key={card.title} className="rounded-2xl bg-white p-6 shadow-sm">
              {timeline ? <p className="text-sm text-primary">0{index + 1}</p> : null}
              <h3 className="text-xl font-semibold">{card.title}</h3>
              <p className="mt-2 text-text-body">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Premium({ section, magazine }: { section: PageSection; magazine: boolean }) {
  const items = (section.content.items as Array<{ title: string; body: string }>) ?? [];
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <h2 className="text-3xl font-bold">{String(section.content.heading ?? section.title)}</h2>
      <div className={cn("mt-10 grid gap-6", magazine ? "md:grid-cols-2" : "md:grid-cols-3")}>
        {items.map((item) => (
          <div key={item.title} className={cn("rounded-2xl border border-border p-6", magazine && "min-h-48")}>
            <h3 className="text-xl font-semibold">{item.title}</h3>
            <p className="mt-3 text-text-body">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Gallery({ section }: { section: PageSection }) {
  const images = (section.content.images as Array<{ assetId?: string; url?: string; alt: string }>) ?? [];
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-bold">{String(section.content.heading ?? section.title)}</h2>
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {images.length === 0
            ? [1, 2, 3].map((item) => <div key={item} className="h-40 rounded-2xl bg-[#dbe4ee]" />)
            : images.map((image) =>
                image.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={image.url} src={image.url} alt={image.alt} className="h-40 w-full rounded-2xl object-cover" />
                ) : (
                  <div key={image.assetId} className="h-40 rounded-2xl bg-[#dbe4ee]" />
                ),
              )}
        </div>
      </div>
    </div>
  );
}

function Floorplan({ section }: { section: PageSection }) {
  const types = (section.content.types as Array<{ name: string; summary: string; imageUrl?: string }>) ?? [];
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <h2 className="text-3xl font-bold">{String(section.content.heading ?? section.title)}</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {types.map((type) => (
          <div key={type.name} className="rounded-2xl border border-border p-6">
            {type.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={type.imageUrl} alt="" className="mb-4 h-40 w-full rounded-xl object-cover" />
            ) : null}
            <h3 className="text-xl font-semibold">{type.name}</h3>
            <p className="mt-2 text-text-body">{type.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Directions({ section }: { section: PageSection }) {
  const mapImageUrl = String(section.content.mapImageUrl ?? "");
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-bold">{String(section.content.heading ?? section.title)}</h2>
        <p className="mt-4 text-lg font-medium">{String(section.content.address ?? "")}</p>
        <p className="mt-2 text-text-body">{String(section.content.guide ?? "")}</p>
        {mapImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mapImageUrl} alt="" className="mt-6 h-56 w-full rounded-2xl object-cover" />
        ) : null}
      </div>
    </div>
  );
}

function Legal({ section, snapshot }: { section: PageSection; snapshot: PageSnapshot }) {
  return (
    <footer className="border-t border-border bg-white px-4 py-12 text-sm text-text-muted">
      <div className="mx-auto max-w-6xl space-y-2">
        <p className="font-medium text-text-body">{String(section.content.heading ?? "사업 주체 및 법적 고지")}</p>
        <p>{String(section.content.body ?? "")}</p>
        <p>광고주: {String(section.content.advertiserName || snapshot.privacy.advertiserCompanyName)}</p>
        <p>광고사: {String(section.content.agencyName || snapshot.privacy.advertisingAgencyName)}</p>
        <p>문의: {String(section.content.contact || snapshot.phone || "-")}</p>
      </div>
    </footer>
  );
}
