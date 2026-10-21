import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { verifyPreviewToken } from "@/lib/auth/preview-token";
import { getAuthContext } from "@/lib/auth/session";
import { buildSnapshot } from "@/modules/projects/service";
import { LandingPage } from "@/modules/templates/render/landing-page";
import { orgText } from "@/modules/admin/org-copy";

export const metadata: Metadata = {
  title: orgText("previewTitle"),
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

export default async function SignedPreviewPage({ params }: Props) {
  const ctx = await getAuthContext();
  if (!ctx) notFound();
  const { token } = await params;
  const parsed = verifyPreviewToken(decodeURIComponent(token));
  if (!parsed) notFound();

  let snapshot;
  try {
    snapshot = await buildSnapshot(ctx.organization.id, parsed.projectId);
  } catch {
    notFound();
  }
  return (
    <main className="min-h-screen bg-white">
      <p className="border-b border-border bg-primary-soft px-4 py-3 text-center text-sm text-primary-soft-foreground">
        {orgText("previewBanner")}
      </p>
      <LandingPage snapshot={snapshot} mode="preview" />
    </main>
  );
}
