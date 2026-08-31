import Link from "next/link";
import { formatSeoul } from "@/lib/datetime";

export function LeadTable({
  items,
}: {
  items: Array<{ id: string; name: string; phone?: string; projectName?: string; submittedAt: Date; utmSource: string | null }>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface text-text-muted">
          <tr>
            <th className="px-4 py-3">등록 일시</th>
            <th className="px-4 py-3">프로젝트</th>
            <th className="px-4 py-3">이름</th>
            <th className="px-4 py-3">연락처</th>
            <th className="px-4 py-3">유입</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-border">
              <td className="px-4 py-3">{formatSeoul(item.submittedAt)}</td>
              <td className="px-4 py-3">{item.projectName}</td>
              <td className="px-4 py-3">
                <Link className="text-primary" href={`/admin/leads/${item.id}`}>
                  {item.name}
                </Link>
              </td>
              <td className="px-4 py-3">{item.phone}</td>
              <td className="px-4 py-3">{item.utmSource ?? "direct"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
