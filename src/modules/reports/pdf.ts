import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import { getProjectAnalytics } from "@/modules/analytics/service";
import { getProject } from "@/modules/projects/service";
import { formatSeoulDate } from "@/lib/datetime";
import { brandLabel } from "@/lib/config";
import { writeAudit } from "@/modules/audit/service";

async function loadFontBytes(fileName: string) {
  return readFile(path.join(process.cwd(), "src", "assets", "fonts", fileName));
}

export async function buildProjectPdf(input: {
  organizationId: string;
  projectId: string;
  actorUserId: string;
  from: Date;
  to: Date;
}) {
  const { project } = await getProject(input.organizationId, input.projectId);
  const analytics = await getProjectAnalytics(input.organizationId, input.projectId, input.from, input.to);
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "report.download",
    resourceType: "project",
    resourceId: input.projectId,
  });

  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const regular = await doc.embedFont(await loadFontBytes("Pretendard-Regular.ttf"), { subset: false });
  const bold = await doc.embedFont(await loadFontBytes("Pretendard-Bold.ttf"), { subset: false });
  const blue = rgb(0.192, 0.51, 0.965);
  const text = rgb(0.098, 0.122, 0.157);
  const muted = rgb(0.306, 0.349, 0.408);

  page.drawText(brandLabel(), { x: 48, y: 792, size: 11, font: regular, color: blue });
  page.drawText(project.name, { x: 48, y: 762, size: 22, font: bold, color: text });
  page.drawText(
    `${formatSeoulDate(input.from)} - ${formatSeoulDate(input.to)}  |  ${project.publicSlug}`,
    { x: 48, y: 738, size: 11, font: regular, color: muted },
  );

  const kpis = [
    ["조회수", String(analytics.totals.pageViews)],
    ["순 방문자", String(analytics.totals.uniqueVisitors)],
    ["전화 클릭", String(analytics.totals.phoneClicks)],
    ["관심고객", String(analytics.totals.leadSubmissions)],
    ["전환율", `${(analytics.totals.conversionRate * 100).toFixed(1)}%`],
  ];
  kpis.forEach((item, index) => {
    const x = 48 + (index % 3) * 170;
    const y = 670 - Math.floor(index / 3) * 70;
    page.drawRectangle({ x, y: y - 18, width: 150, height: 58, color: rgb(0.949, 0.957, 0.965) });
    page.drawText(item[0], { x: x + 12, y: y + 18, size: 9, font: regular, color: muted });
    page.drawText(item[1], { x: x + 12, y: y - 4, size: 18, font: bold, color: text });
  });

  page.drawText("이 보고서에는 개인정보가 포함되지 않습니다.", {
    x: 48,
    y: 72,
    size: 9,
    font: regular,
    color: muted,
  });
  page.drawText(`생성 시각 ${formatSeoulDate(new Date())}`, { x: 48, y: 56, size: 9, font: regular, color: muted });

  const bytes = await doc.save();
  return { bytes, fileName: `${project.publicSlug}-${formatSeoulDate(input.from)}-${formatSeoulDate(input.to)}.pdf` };
}
