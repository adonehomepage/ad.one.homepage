import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { getProjectAnalytics } from "@/modules/analytics/service";
import { getProject } from "@/modules/projects/service";
import { formatSeoulDate } from "@/lib/datetime";
import { brandLabel } from "@/lib/config";
import { writeAudit } from "@/modules/audit/service";
import { orgText } from "@/modules/admin/org-copy";

const regularFontPath = path.join(process.cwd(), "src/assets/fonts/Pretendard-Regular.ttf");
const boldFontPath = path.join(process.cwd(), "src/assets/fonts/Pretendard-Bold.ttf");

async function openReportPdf() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(await readFile(regularFontPath), { subset: true });
  const bold = await doc.embedFont(await readFile(boldFontPath), { subset: true });
  return { doc, regular, bold };
}

function drawLines(
  page: PDFPage,
  lines: string[],
  startY: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
) {
  let y = startY;
  for (const line of lines) {
    if (y < 72) break;
    page.drawText(line.slice(0, 90), { x: 48, y, size, font, color });
    y -= size + 6;
  }
  return y;
}

export async function renderHangulPdfSample(title: string) {
  const { doc, regular, bold } = await openReportPdf();
  const page = doc.addPage([595, 842]);
  page.drawText(title, { x: 48, y: 760, size: 22, font: bold, color: rgb(0.098, 0.122, 0.157) });
  page.drawText(orgText("reportNoPii"), {
    x: 48,
    y: 72,
    size: 9,
    font: regular,
    color: rgb(0.306, 0.349, 0.408),
  });
  return doc.save();
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

  const { doc, regular, bold } = await openReportPdf();
  const page = doc.addPage([595, 842]);
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
    [orgText("reportViews"), String(analytics.totals.pageViews)],
    [orgText("reportUniques"), String(analytics.totals.uniqueVisitors)],
    [orgText("reportPhoneClicks"), String(analytics.totals.phoneClicks)],
    [orgText("reportLeads"), String(analytics.totals.leadSubmissions)],
    [orgText("reportConversion"), `${(analytics.totals.conversionRate * 100).toFixed(1)}%`],
  ];
  kpis.forEach((item, index) => {
    const x = 48 + (index % 3) * 170;
    const y = 670 - Math.floor(index / 3) * 70;
    page.drawRectangle({ x, y: y - 18, width: 150, height: 58, color: rgb(0.949, 0.957, 0.965) });
    page.drawText(item[0], { x: x + 12, y: y + 18, size: 9, font: regular, color: muted });
    page.drawText(item[1], { x: x + 12, y: y - 4, size: 18, font: bold, color: text });
  });

  let y = 500;
  page.drawText(orgText("reportDaily"), { x: 48, y, size: 13, font: bold, color: text });
  y -= 20;
  const dailyLines = analytics.daily.slice(-14).map(
    (row) => `${row.date}  조회 ${row.pageViews}  순방문 ${row.uniqueVisitors}  관심 ${row.leads}`,
  );
  y = drawLines(page, dailyLines.length ? dailyLines : ["-"], y, regular, 10, muted);

  y -= 16;
  page.drawText(orgText("reportChannels"), { x: 48, y, size: 13, font: bold, color: text });
  y -= 20;
  const channelLines = analytics.channels.slice(0, 12).map((channel) => {
    const source = channel.source ?? "direct";
    const medium = channel.medium ?? "-";
    const campaign = channel.campaign ? ` / ${channel.campaign}` : "";
    return `${source} / ${medium}${campaign}  ${Number(channel.views)}`;
  });
  y = drawLines(page, channelLines.length ? channelLines : ["-"], y, regular, 10, muted);

  y -= 16;
  page.drawText(orgText("reportDevices"), { x: 48, y, size: 13, font: bold, color: text });
  y -= 20;
  const deviceLines = analytics.devices.map((device) => `${device.deviceType ?? "unknown"}  ${Number(device.count)}`);
  drawLines(page, deviceLines.length ? deviceLines : ["-"], y, regular, 10, muted);

  page.drawText(orgText("reportNoPii"), {
    x: 48,
    y: 72,
    size: 9,
    font: regular,
    color: muted,
  });
  page.drawText(orgText("reportGeneratedAt").replace("{date}", formatSeoulDate(new Date())), {
    x: 48,
    y: 56,
    size: 9,
    font: regular,
    color: muted,
  });

  const bytes = await doc.save();
  return { bytes, fileName: `${project.publicSlug}-${formatSeoulDate(input.from)}-${formatSeoulDate(input.to)}.pdf` };
}
