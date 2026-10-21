"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { orgText } from "@/modules/admin/org-copy";

export function TrendChart({
  data,
  emptyLabel = orgText("trendEmpty"),
  viewsLabel = orgText("trendViews"),
  leadsLabel = orgText("trendLeads"),
}: {
  data: Array<{ date: string; pageViews: number; leads: number }>;
  emptyLabel?: string;
  viewsLabel?: string;
  leadsLabel?: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-text-muted">{emptyLabel}</p>;
  }
  const totalViews = data.reduce((sum, row) => sum + row.pageViews, 0);
  const totalLeads = data.reduce((sum, row) => sum + row.leads, 0);
  const summary = orgText("chartSummary").replace("{views}", String(totalViews)).replace("{leads}", String(totalLeads));
  return (
    <div className="w-full">
      <p className="sr-only">{summary}</p>
      <div className="h-64 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="pageViews" name={viewsLabel} stroke="#3182f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="leads" name={leadsLabel} stroke="#191f28" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{summary}</caption>
        <thead>
          <tr>
            <th>{orgText("chartDate")}</th>
            <th>{viewsLabel}</th>
            <th>{leadsLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.date}>
              <td>{row.date}</td>
              <td>{row.pageViews}</td>
              <td>{row.leads}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
