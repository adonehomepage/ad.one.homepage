import Link from "next/link";
import { getLead, formatLeadAnswers } from "@/modules/leads/service";
import { getDraft } from "@/modules/projects/service";
import { getAuthContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { formatSeoul } from "@/lib/datetime";
import { LeadNoteForm } from "@/app/admin/leads/lead-actions";
import { Badge, badgeLabels } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { assertLeadAdminFeature } from "@/lib/feature-guard";

function leadText(settings: Record<string, unknown>, key: string, fallback: string) {
  return String(settings[key] ?? "").trim() || fallback;
}

function consentLabel(settings: Record<string, unknown>, type: string) {
  if (type === "COLLECTION") return leadText(settings, "shellConsentCollection", "수집·이용");
  if (type === "THIRD_PARTY_PROVISION") return leadText(settings, "shellConsentThird", "제3자 제공");
  return type;
}

function eventLabel(settings: Record<string, unknown>, eventType: string) {
  if (eventType === "LEAD_REGISTERED") return leadText(settings, "shellEventLead", "관심고객 등록");
  if (eventType === "EXPIRY_NOTICE") return leadText(settings, "shellEventExpiry", "만료 안내");
  return eventType;
}

function channelLabel(settings: Record<string, unknown>, channel: string) {
  if (channel === "KAKAO_ALIMTALK") return leadText(settings, "shellChannelKakao", "카카오 알림톡");
  if (channel === "EMAIL") return leadText(settings, "shellChannelEmail", "이메일");
  return channel;
}

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  assertLeadAdminFeature();
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { leadId } = await params;
  const lead = await getLead(ctx.organization.id, leadId, ctx.user.id);
  const draft = await getDraft(ctx.organization.id, lead.projectId).catch(() => null);
  const settings = (draft?.draft.globalSettings ?? {}) as Record<string, unknown>;
  const text = (key: string, fallback: string) => leadText(settings, key, fallback);
  const inquiry = lead.inquiryText || text("shellMissing", "없음");
  const source = lead.utmSource ?? "direct";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{lead.name}</h1>
          <p className="mt-2 text-sm text-text-body">
            {lead.projectName} · {lead.phone} · {formatSeoul(lead.submittedAt)}
          </p>
        </div>
        <Link href={`/admin/projects/${lead.projectId}/leads`}>
          <Button variant="ghost">{text("shellLeadBack", "목록으로")}</Button>
        </Link>
      </div>
      <div className="ui-card text-sm">
        <h2 className="font-semibold">{text("shellLeadAnswers", "등록 내용")}</h2>
        {formatLeadAnswers(lead.answersJson).length > 0 ? (
          <dl className="mt-3 space-y-2">
            {formatLeadAnswers(lead.answersJson).map((item) => (
              <div key={item.key}>
                <dt className="text-text-muted">{item.label}</dt>
                <dd className="mt-1 text-text-primary">{item.text}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 text-text-body">{text("shellLeadInquiry", "문의: {text}").replace("{text}", inquiry)}</p>
        )}
        <p className="mt-4 text-text-body">
          {text("shellLeadUtm", "유입: {source} / {medium} / {campaign}")
            .replace("{source}", source === "direct" ? text("shellChannelDirect", "direct") : source)
            .replace("{medium}", lead.utmMedium ?? "-")
            .replace("{campaign}", lead.utmCampaign ?? "-")}
        </p>
      </div>
      <div className="ui-card">
        <h2 className="font-semibold">{text("shellLeadConsent", "동의 증빙")}</h2>
        {lead.consents.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted" role="status">
            {text("shellLeadConsentEmpty", "동의 기록이 없습니다.")}
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-text-body">
            {lead.consents.map((consent) => (
              <li key={consent.id}>
                {consentLabel(settings, consent.consentType)} · {formatSeoul(consent.agreedAt)}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="ui-card">
        <h2 className="font-semibold">{text("shellLeadAlerts", "알림")}</h2>
        {lead.notifications.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted" role="status">
            {text("shellLeadAlertsEmpty", "알림 기록이 없습니다.")}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {lead.notifications.map((job) => (
              <li key={job.id} className="flex items-center gap-2 text-sm">
                <Badge value={job.status} labels={badgeLabels(settings)} />
                {eventLabel(settings, job.eventType)} · {channelLabel(settings, job.channel)}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="ui-card">
        <h2 className="font-semibold">{text("shellLeadNotes", "누적 메모")}</h2>
        {lead.notes.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted" role="status">
            {text("shellLeadNotesEmpty", "아직 메모가 없습니다.")}
          </p>
        ) : (
          <ul className="mt-3 space-y-3 text-sm">
            {lead.notes.map((note) => (
              <li key={note.id}>
                <p>{note.content}</p>
                <p className="text-text-muted">{formatSeoul(note.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <LeadNoteForm
            leadId={leadId}
            placeholder={text("shellLeadNotePlaceholder", "상담 메모. 상태 단계는 관리하지 않습니다.")}
            addLabel={text("shellLeadNoteAdd", "메모 추가")}
            failLabel={text("shellLeadNoteFail", "메모를 저장하지 못했습니다.")}
          />
        </div>
      </div>
    </div>
  );
}
