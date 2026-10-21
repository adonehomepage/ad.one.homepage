import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedBySlug, getUnpublishedNotice } from "@/modules/publishing/service";
import { LandingPage } from "@/modules/templates/render/landing-page";
import { PublicTracker } from "@/modules/templates/render/tracker";
import { slugLookupKey } from "@/lib/validation/slug";
import { appConfig, brandLabel } from "@/lib/config";
import { orgText } from "@/modules/admin/org-copy";

/** 발행 직후 revalidatePath로 갱신. 짧은 ISR로 DB 부하를 줄인다. */
export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

function ogFallbackImage(snapshot: { sections: { sectionType: string; content: Record<string, unknown> }[]; globalSettings: Record<string, unknown> }) {
  const hero = snapshot.sections.find((section) => section.sectionType === "hero");
  const fromHero = String(hero?.content.imageUrl ?? hero?.content.backgroundImageUrl ?? "").trim();
  if (fromHero) return fromHero;
  const logo = String(snapshot.globalSettings.logoUrl ?? "").trim();
  return logo || undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const key = slugLookupKey(decodeURIComponent(slug));
  const published = await getPublishedBySlug(key);
  if (!published) {
    const notice = await getUnpublishedNotice(key);
    if (!notice) return { title: orgText("notFoundTitle"), robots: { index: false, follow: false } };
    return { title: notice.title, robots: { index: false, follow: false } };
  }
  const seo = published.snapshot.seoSettings;
  const url = `${appConfig.publicUrl}/${published.project.publicSlug}`;
  const image = seo.ogImageUrl?.trim() || ogFallbackImage(published.snapshot);
  const imageUrl = image ? (image.startsWith("http") ? image : `${appConfig.publicUrl}${image}`) : undefined;
  return {
    title: seo.title || published.snapshot.projectName,
    description: seo.description,
    robots: { index: true, follow: true },
    alternates: { canonical: url },
    openGraph: {
      title: seo.title || published.snapshot.projectName,
      description: seo.description,
      url,
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
  };
}

export default async function PublicLandingPage({ params }: Props) {
  const { slug } = await params;
  const key = slugLookupKey(decodeURIComponent(slug));
  const published = await getPublishedBySlug(key);
  if (!published) {
    const notice = await getUnpublishedNotice(key);
    if (!notice) notFound();
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-6 text-center">
        <div>
          <p className="text-sm font-medium text-primary">{brandLabel()}</p>
          <h1 className="mt-2 text-2xl font-bold" data-testid="unpublished-title">
            {notice.title}
          </h1>
          <p className="mt-3 text-text-body" data-testid="unpublished-body">
            {notice.body}
          </p>
          <Link href="/" className="mt-8 inline-flex h-12 items-center rounded-[14px] border border-border bg-white px-5 text-[17px] font-semibold text-text-body">
            {orgText("publicHome")}
          </Link>
        </div>
      </div>
    );
  }
  return (
    <>
      <PublicTracker slug={published.project.publicSlug} />
      <LandingPage snapshot={published.snapshot} />
    </>
  );
}
