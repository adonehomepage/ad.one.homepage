import { getProjectAnalytics } from "@/modules/analytics/service";
import { getAuthContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { PdfDownload } from "@/app/admin/projects/[projectId]/analytics/pdf-download";
import { TrendChart } from "@/components/charts/trend-chart";

export default async function AnalyticsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { projectId } = await params;
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  const data = await getProjectAnalytics(ctx.organization.id, projectId, from, to);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">통계</h1>
          <p className="mt-2 text-sm text-text-body">전환율 = 관심고객 등록 / 순 방문자. 개인정보는 이벤트에 저장되지 않습니다.</p>
        </div>
        <PdfDownload projectId={projectId} />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["조회수", data.totals.pageViews],
          ["순 방문자", data.totals.uniqueVisitors],
          ["전화 클릭", data.totals.phoneClicks],
          ["관심고객", data.totals.leadSubmissions],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl bg-white p-5">
            <p className="text-sm text-text-muted">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-text-body">전환율 {(data.totals.conversionRate * 100).toFixed(1)}%</p>
      <div className="rounded-2xl bg-white p-5">
        <h2 className="font-semibold">일별 추이</h2>
        <div className="mt-4">
          <TrendChart data={data.daily.map((row) => ({ date: row.date, pageViews: row.pageViews, leads: row.leads }))} />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-5">
          <h2 className="font-semibold">유입 채널</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {data.channels.length === 0 ? (
              <li className="text-text-muted">아직 유입 데이터가 없습니다.</li>
            ) : (
              data.channels.map((channel) => (
                <li key={`${channel.source}-${channel.medium}`} className="flex justify-between">
                  <span>
                    {channel.source ?? "direct"} / {channel.medium ?? "-"}
                  </span>
                  <span>{Number(channel.views)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-2xl bg-white p-5">
          <h2 className="font-semibold">기기</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {data.devices.length === 0 ? (
              <li className="text-text-muted">아직 기기 데이터가 없습니다.</li>
            ) : (
              data.devices.map((device) => (
                <li key={device.deviceType ?? "unknown"} className="flex justify-between">
                  <span>{device.deviceType ?? "unknown"}</span>
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
