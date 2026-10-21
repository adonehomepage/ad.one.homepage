import Link from "next/link";
import { getProjectAnalytics } from "@/modules/analytics/service";
import { getDraft } from "@/modules/projects/service";
import { getAuthContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { PdfDownload } from "@/app/admin/projects/[projectId]/analytics/pdf-download";
import { TrendChart } from "@/components/charts/trend-chart";
import { cn } from "@/lib/cn";

function analyticsText(settings: Record<string, unknown>, key: string, fallback: string) {
  return String(settings[key] ?? "").trim() || fallback;
}

const RANGE_DAYS = [7, 14, 30] as const;

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { projectId } = await params;
  const query = await searchParams;
  const requested = Number(query.days);
  const days = (RANGE_DAYS as readonly number[]).includes(requested) ? requested : 7;
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const data = await getProjectAnalytics(ctx.organization.id, projectId, from, to);
  const draft = await getDraft(ctx.organization.id, projectId).catch(() => null);
  const settings = (draft?.draft.globalSettings ?? {}) as Record<string, unknown>;
  const text = (key: string, fallback: string) => analyticsText(settings, key, fallback);
  const rate = (data.totals.conversionRate * 100).toFixed(1);
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold tracking-tight">{text("shellAnalytics", "통계")}</h1>
          <PdfDownload projectId={projectId} label={text("shellPdf", "PDF 보고서")} days={days} />
        </div>
        <p className="mt-1 text-sm text-text-body">{text("shellAnalyticsBody", "전환율 = 관심고객 등록 / 순 방문자. 개인정보는 이벤트에 저장되지 않습니다.")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {RANGE_DAYS.map((value) => (
              <Link
                key={value}
                href={`/admin/projects/${projectId}/analytics?days=${value}`}
                className={cn("ui-chip", days === value && "border-primary bg-primary-soft text-primary-soft-foreground")}
              >
                {text("shellAnalyticsDays", "최근 {count}일").replace("{count}", String(value))}
              </Link>
            ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["shellViews", "조회수", data.totals.pageViews],
          ["shellVisitors", "순 방문자", data.totals.uniqueVisitors],
          ["shellPhoneClicks", "전화 클릭", data.totals.phoneClicks],
          ["shellLeads", "관심고객", data.totals.leadSubmissions],
        ].map(([key, fallback, value]) => (
          <div key={String(key)} className="ui-card">
            <p className="text-sm text-text-muted">{text(String(key), String(fallback))}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-text-body">{text("shellConversion", "전환율 {rate}%").replace("{rate}", rate)}</p>
      <div className="ui-card">
        <h2 className="font-semibold">{text("shellDaily", "일별 추이")}</h2>
        <div className="mt-4">
          <TrendChart
            data={data.daily.map((row) => ({ date: row.date, pageViews: row.pageViews, leads: row.leads }))}
            emptyLabel={text("shellAnalyticsEmpty", "선택한 기간의 방문 데이터가 아직 없습니다.")}
            viewsLabel={text("shellTrendViews", "조회")}
            leadsLabel={text("shellTrendLeads", "관심고객")}
          />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="ui-card">
          <h2 className="font-semibold">{text("shellChannels", "유입 채널")}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {data.channels.length === 0 ? (
              <li className="text-text-muted">{text("shellChannelsEmpty", "아직 유입 데이터가 없습니다.")}</li>
            ) : (
              data.channels.map((channel) => (
                <li key={`${channel.source}-${channel.medium}-${channel.campaign}`} className="flex justify-between gap-3">
                  <span>
                    {(channel.source ?? "direct") === "direct" ? text("shellChannelDirect", "direct") : channel.source} / {channel.medium ?? "-"}
                    {channel.campaign ? ` / ${channel.campaign}` : ""}
                  </span>
                  <span>{Number(channel.views)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="ui-card">
          <h2 className="font-semibold">{text("shellDevices", "기기")}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {data.devices.length === 0 ? (
              <li className="text-text-muted">{text("shellDevicesEmpty", "아직 기기 데이터가 없습니다.")}</li>
            ) : (
              data.devices.map((device) => (
                <li key={device.deviceType ?? "unknown"} className="flex justify-between">
                  <span>
                    {{
                      desktop: text("shellDeviceDesktop", "desktop"),
                      mobile: text("shellDeviceMobile", "mobile"),
                      tablet: text("shellDeviceTablet", "tablet"),
                      unknown: text("shellDeviceUnknown", "unknown"),
                    }[device.deviceType ?? "unknown"] ?? device.deviceType}
                  </span>
                  <span>{Number(device.count)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
