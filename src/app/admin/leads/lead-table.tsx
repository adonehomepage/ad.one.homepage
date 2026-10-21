import Link from "next/link";
import { formatSeoul } from "@/lib/datetime";
import { orgText } from "@/modules/admin/org-copy";

export function LeadTable({
  items,
  labels,
}: {
  items: Array<{ id: string; name: string; phone?: string; projectName?: string; submittedAt: Date; utmSource: string | null }>;
  labels?: { time: string; project: string; name: string; phone: string; source: string };
}) {
  const heading = {
    time: labels?.time ?? orgText("colLeadTime"),
    project: labels?.project ?? orgText("colProject"),
    name: labels?.name ?? orgText("colName"),
    phone: labels?.phone ?? orgText("colLeadPhone"),
    source: labels?.source ?? orgText("colLeadSource"),
  };
  return (
    <div className="ui-table">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface text-text-muted">
          <tr>
            <th className="px-4 py-3">{heading.time}</th>
            <th className="px-4 py-3">{heading.project}</th>
            <th className="px-4 py-3">{heading.name}</th>
            <th className="px-4 py-3">{heading.phone}</th>
            <th className="px-4 py-3">{heading.source}</th>
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
