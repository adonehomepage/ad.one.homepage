import type { Metadata } from "next";
import { brandLabel } from "@/lib/config";
import { orgText } from "@/modules/admin/org-copy";
import { peekInvitation } from "@/modules/members/service";
import { InviteFormClient } from "@/app/invite/[token]/invite-form";

export const metadata: Metadata = {
  title: orgText("inviteTitle"),
  robots: { index: false, follow: false },
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await peekInvitation(token);
  return <InviteFormClient brandName={brandLabel()} email={invite?.email ?? ""} />;
}
