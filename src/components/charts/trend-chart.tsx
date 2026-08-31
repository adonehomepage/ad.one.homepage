"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TrendChart({
  data,
}: {
  data: Array<{ date: string; pageViews: number; leads: number }>;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-text-muted">선택한 기간의 방문 데이터가 아직 없습니다.</p>;
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line type="monotone" dataKey="pageViews" name="조회" stroke="#3182f6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="leads" name="관심고객" stroke="#191f28" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
