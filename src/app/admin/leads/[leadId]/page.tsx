import { getLead } from "@/modules/leads/service";
import { getAuthContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { formatSeoul } from "@/lib/datetime";
import { LeadNoteForm } from "@/app/admin/leads/lead-actions";
import { Badge } from "@/components/ui/badge";

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { leadId } = await params;
  const lead = await getLead(ctx.organization.id, leadId, ctx.user.id);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{lead.name}</h1>
        <p className="mt-2 text-sm text-text-body">
          {lead.projectName} · {lead.phone} · {formatSeoul(lead.submittedAt)}
        </p>
      </div>
      <div className="rounded-2xl bg-white p-5 text-sm">
        <p>문의: {lead.inquiryText || "-"}</p>
        <p className="mt-2">유입: {lead.utmSource ?? "direct"} / {lead.utmMedium ?? "-"} / {lead.utmCampaign ?? "-"}</p>
      </div>
      <div className="rounded-2xl bg-white p-5">
        <h2 className="font-semibold">동의 증빙</h2>
        <ul className="mt-3 space-y-2 text-sm text-text-body">
          {lead.consents.map((consent) => (
            <li key={consent.id}>
              {consent.consentType} · {formatSeoul(consent.agreedAt)}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl bg-white p-5">
        <h2 className="font-semibold">알림</h2>
        <ul className="mt-3 space-y-2">
          {lead.notifications.map((job) => (
            <li key={job.id} className="flex items-center gap-2 text-sm">
              <Badge value={job.status} />
              {job.eventType} · {job.channel}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl bg-white p-5">
        <h2 className="font-semibold">누적 메모</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {lead.notes.map((note) => (
            <li key={note.id}>
              <p>{note.content}</p>
              <p className="text-text-muted">{formatSeoul(note.createdAt)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <LeadNoteForm leadId={leadId} />
        </div>
      </div>
    </div>
  );
}
