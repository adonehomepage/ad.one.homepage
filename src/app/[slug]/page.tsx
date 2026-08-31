import type { Metadata } from "next";
import { getPublishedBySlug } from "@/modules/publishing/service";
import { LandingPage } from "@/modules/templates/render/landing-page";
import { PublicTracker } from "@/modules/templates/render/tracker";
import { slugLookupKey } from "@/lib/validation/slug";
import { appConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const published = await getPublishedBySlug(slugLookupKey(decodeURIComponent(slug)));
  if (!published) {
    return { title: "비공개 페이지", robots: { index: false, follow: false } };
  }
  const seo = published.snapshot.seoSettings;
  const url = `${appConfig.publicUrl}/${published.project.publicSlug}`;
  return {
    title: seo.title || published.snapshot.projectName,
    description: seo.description,
    alternates: { canonical: url },
    openGraph: {
      title: seo.title || published.snapshot.projectName,
      description: seo.description,
    },
  };
}

export default async function PublicLandingPage({ params }: Props) {
  const { slug } = await params;
  const published = await getPublishedBySlug(slugLookupKey(decodeURIComponent(slug)));
  if (!published) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">현재 공개되지 않은 홈페이지입니다</h1>
          <p className="mt-3 text-text-body">운영이 종료되었거나 아직 발행되지 않았습니다.</p>
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
