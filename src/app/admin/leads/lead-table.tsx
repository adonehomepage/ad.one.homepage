import Link from "next/link";
import { formatSeoul } from "@/lib/datetime";
import { leadSourceLabel, orgText } from "@/modules/admin/org-copy";

export function LeadTable({
  items,
  labels,
  showProject = true,
}: {
  items: Array<{
    id: string;
    name: string;
    phone?: string;
    projectId?: string;
    projectName?: string;
    inquiryText?: string | null;
    submittedAt: Date;
    utmSource: string | null;
  }>;
  labels?: { time: string; project: string; name: string; phone: string; source: string; inquiry?: string };
  showProject?: boolean;
}) {
  const heading = {
    time: labels?.time ?? orgText("colLeadTime"),
    project: labels?.project ?? orgText("colProject"),
    name: labels?.name ?? orgText("colName"),
    phone: labels?.phone ?? orgText("colLeadPhone"),
    inquiry: labels?.inquiry ?? orgText("colInquiry"),
    source: labels?.source ?? orgText("colLeadSource"),
  };
  return (
    <div className="ui-table">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-surface text-text-muted">
          <tr>
            <th className="w-40 px-4 py-3 font-medium">{heading.time}</th>
            {showProject ? <th className="px-4 py-3 font-medium">{heading.project}</th> : null}
            <th className="whitespace-nowrap px-4 py-3 font-medium">{heading.name}</th>
            <th className="w-36 px-4 py-3 font-medium">{heading.phone}</th>
            <th className="px-4 py-3 font-medium">{heading.inquiry}</th>
            <th className="w-24 px-4 py-3 font-medium">{heading.source}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-border">
              <td className="whitespace-nowrap px-4 py-3 text-text-muted">{formatSeoul(item.submittedAt)}</td>
              {showProject ? (
                <td className="px-4 py-3">
                  {item.projectId ? (
                    <Link href={`/admin/projects/${item.projectId}/leads`} className="font-medium text-primary">
                      {item.projectName}
                    </Link>
                  ) : (
                    item.projectName
                  )}
                </td>
              ) : null}
              <td className="whitespace-nowrap px-4 py-3">
                <Link className="font-medium text-primary" href={`/admin/leads/${item.id}`}>
                  {item.name}
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-3">{item.phone}</td>
              <td className="max-w-64 truncate px-4 py-3 text-text-body" title={item.inquiryText?.trim() || undefined}>
                {item.inquiryText?.trim() || "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-text-body">{leadSourceLabel(item.utmSource)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
