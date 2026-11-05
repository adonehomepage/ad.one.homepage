/**
 * 로컬·개발 DB에만 관심고객, 알림 로그, 활동 로그, 방문 기록을 넣는다.
 * 운영 DB에서는 실행하지 않고, 이미 넣은 예시는 다시 만들지 않는다.
 * 사용: npx tsx --env-file=.env.local src/scripts/seed-sample-activity.ts
 */
import { addDays, addMonths } from "date-fns";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { analyticsEvents, auditLogs, leadConsents, leadNotes, leads, notificationJobs, projects, userProfiles } from "@/lib/db/schema";
import { decryptPii, encryptPii, phoneLookupHash, sha256 } from "@/lib/crypto/pii";
import { isProd } from "@/lib/deploy-env";
import { appConfig } from "@/lib/config";
import { normalizePhone } from "@/lib/validation/phone";
import { SAMPLE_SITE } from "@/modules/templates/sample-site";

const SLUGS = ["noeul-foreon", "noeul-info", "noeul-oak"] as const;

const SAMPLE_LEADS: Array<{
  key: string;
  slug: (typeof SLUGS)[number];
  name: string;
  phone: string;
  unit: string;
  inquiry: string;
  source: string;
  daysAgo: number;
}> = [
  { key: "sample-lead-foreon-1", slug: "noeul-foreon", name: "김서연", phone: "01020001801", unit: "84A", inquiry: "견본주택 방문 일정을 알고 싶습니다.", source: "naver", daysAgo: 1 },
  { key: "sample-lead-foreon-2", slug: "noeul-foreon", name: "박민준", phone: "01020001802", unit: "59A", inquiry: "84타입 잔여 세대가 있는지 문의드립니다.", source: "kakao", daysAgo: 2 },
  { key: "sample-lead-info-1", slug: "noeul-info", name: "이하은", phone: "01020001803", unit: "84A", inquiry: "청약 일정보다 상담을 먼저 받고 싶습니다.", source: "direct", daysAgo: 0 },
  { key: "sample-lead-info-2", slug: "noeul-info", name: "정우진", phone: "01020001804", unit: "59A", inquiry: "주차와 학군 안내를 요청합니다.", source: "naver", daysAgo: 3 },
  { key: "sample-lead-oak-1", slug: "noeul-oak", name: "최수아", phone: "01020001805", unit: "84B", inquiry: "주말 방문 예약이 가능한지 확인 부탁드립니다.", source: "instagram", daysAgo: 1 },
  { key: "sample-lead-oak-2", slug: "noeul-oak", name: "한도윤", phone: "01020001806", unit: "84A", inquiry: "관심고객 혜택 안내를 문자로 받고 싶습니다.", source: "kakao", daysAgo: 4 },
];

function daysAgo(days: number, hours = 10) {
  const date = addDays(new Date(), -days);
  date.setHours(hours, 20, 0, 0);
  return date;
}

function assertNotProduction() {
  if (isProd()) {
    console.info("Skip sample activity: production");
    return false;
  }
  const url = process.env.DATABASE_URL ?? "";
  if (url.includes("falling-shadow")) {
    throw new Error("refused: production database");
  }
  return true;
}

async function resetUnreadableSamples() {
  const [row] = await db
    .select({ id: leads.id, phoneCiphertext: leads.phoneCiphertext })
    .from(leads)
    .where(sql`${leads.answersJson}->>'sampleKey' like 'sample-lead-%'`)
    .limit(1);
  if (!row) return false;
  try {
    decryptPii(row.phoneCiphertext);
    return false;
  } catch {
    const sampleLeads = await db
      .select({ id: leads.id })
      .from(leads)
      .where(sql`${leads.answersJson}->>'sampleKey' like 'sample-lead-%'`);
    const ids = sampleLeads.map((item) => item.id);
    if (ids.length > 0) {
      await db.delete(leadNotes).where(inArray(leadNotes.leadId, ids));
      await db.delete(leadConsents).where(inArray(leadConsents.leadId, ids));
      await db.delete(notificationJobs).where(inArray(notificationJobs.leadId, ids));
      await db.delete(leads).where(inArray(leads.id, ids));
    }
    await db.delete(notificationJobs).where(sql`${notificationJobs.idempotencyKey} like 'sample-%'`);
    await db.delete(auditLogs).where(sql`${auditLogs.metadataJson}->>'sampleKey' like 'sample-%'`);
    await db.delete(analyticsEvents).where(sql`${analyticsEvents.metadataJson}->>'sampleKey' like 'sample-traffic-%'`);
    return true;
  }
}

export async function seedSampleActivity() {
  if (!assertNotProduction()) return { skipped: true as const };
  const reset = await resetUnreadableSamples();
  if (reset) console.info("sample rows reset: unreadable phone");

  const [actor] = await db.select({ id: userProfiles.id }).from(userProfiles).limit(1);
  if (!actor) throw new Error("admin missing; run db:seed first");

  const rows = await db
    .select({ id: projects.id, organizationId: projects.organizationId, slug: projects.publicSlugNormalized, name: projects.name })
    .from(projects)
    .where(sql`${projects.publicSlugNormalized} in (${sql.join(SLUGS.map((slug) => sql`${slug}`), sql`, `)})`);
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  for (const slug of SLUGS) {
    if (!bySlug.has(slug)) throw new Error(`sample project missing: ${slug}`);
  }

  let leadCount = 0;
  let noticeCount = 0;
  for (const sample of SAMPLE_LEADS) {
    const project = bySlug.get(sample.slug)!;
    const [existing] = await db
      .select({ id: leads.id })
      .from(leads)
      .where(sql`${leads.answersJson}->>'sampleKey' = ${sample.key}`)
      .limit(1);
    if (existing) continue;

    const phone = normalizePhone(sample.phone);
    const submittedAt = daysAgo(sample.daysAgo, 11);
    const [lead] = await db
      .insert(leads)
      .values({
        organizationId: project.organizationId,
        projectId: project.id,
        name: sample.name,
        phoneCiphertext: encryptPii(phone),
        phoneLookupHash: phoneLookupHash(phone),
        inquiryText: sample.inquiry,
        answersJson: { sampleKey: sample.key, unitType: sample.unit, inquiry: sample.inquiry },
        utmSource: sample.source,
        utmMedium: sample.source === "direct" ? null : "cpc",
        utmCampaign: SAMPLE_SITE.name,
        referrer: sample.source === "direct" ? null : `https://${sample.source}.example`,
        submittedAt,
        retentionUntil: addMonths(submittedAt, appConfig.leadRetentionMonths),
      })
      .returning();

    const consent = `${SAMPLE_SITE.name} 관심고객 예시 동의`;
    await db.insert(leadConsents).values({
      organizationId: project.organizationId,
      projectId: project.id,
      leadId: lead.id,
      consentType: "COLLECTION",
      policyVersion: "sample",
      consentTextSnapshot: consent,
      consentTextHash: sha256(consent),
      agreedAt: submittedAt,
    });
    if (sample.key.endsWith("-1")) {
      await db.insert(leadNotes).values({
        organizationId: project.organizationId,
        projectId: project.id,
        leadId: lead.id,
        authorId: actor.id,
        content: "예시 상담 메모. 방문 희망 시간을 다시 확인하면 됩니다.",
        createdAt: daysAgo(sample.daysAgo, 15),
      });
    }

    const jobs = [
      { suffix: "kakao", channel: "KAKAO_ALIMTALK", status: "SENT", error: null as string | null },
      { suffix: "email", channel: "EMAIL", status: sample.daysAgo % 2 === 0 ? "FAILED" : "QUEUED", error: sample.daysAgo % 2 === 0 ? "예시 발송 실패" : null },
    ];
    for (const job of jobs) {
      await db.insert(notificationJobs).values({
        organizationId: project.organizationId,
        projectId: project.id,
        leadId: lead.id,
        eventType: "LEAD_REGISTERED",
        channel: job.channel,
        payloadJson: {
          sampleKey: `${sample.key}:${job.suffix}`,
          projectName: project.name,
          leadName: sample.name,
          unitType: sample.unit,
        },
        idempotencyKey: `sample:${sample.key}:${job.suffix}`,
        status: job.status,
        attemptCount: job.status === "QUEUED" ? 0 : 1,
        scheduledAt: submittedAt,
        sentAt: job.status === "SENT" ? submittedAt : null,
        errorMessageRedacted: job.error,
        createdAt: submittedAt,
        updatedAt: submittedAt,
      });
      noticeCount += 1;
    }
    leadCount += 1;
  }

  for (const slug of SLUGS) {
    const project = bySlug.get(slug)!;
    const key = `sample-expiry-${slug}`;
    const [existing] = await db
      .select({ id: notificationJobs.id })
      .from(notificationJobs)
      .where(eq(notificationJobs.idempotencyKey, key))
      .limit(1);
    if (existing) continue;
    const when = daysAgo(2, 9);
    await db.insert(notificationJobs).values({
      organizationId: project.organizationId,
      projectId: project.id,
      eventType: "EXPIRY_NOTICE",
      channel: "EMAIL",
      payloadJson: { sampleKey: key, projectName: project.name },
      idempotencyKey: key,
      status: "SENT",
      attemptCount: 1,
      scheduledAt: when,
      sentAt: when,
      createdAt: when,
      updatedAt: when,
    });
    noticeCount += 1;
  }

  const audits = [
    { key: "sample-audit-create", action: "project.create", resourceType: "project", days: 6 },
    { key: "sample-audit-publish", action: "project.publish", resourceType: "project", days: 5 },
    { key: "sample-audit-lead", action: "lead.view", resourceType: "lead", days: 1 },
    { key: "sample-audit-recipient", action: "recipient.create", resourceType: "recipient", days: 4 },
    { key: "sample-audit-retry", action: "notification.retry", resourceType: "notification", days: 0 },
  ];
  let auditCount = 0;
  const first = bySlug.get(SLUGS[0])!;
  for (const audit of audits) {
    const [existing] = await db
      .select({ id: auditLogs.id })
      .from(auditLogs)
      .where(sql`${auditLogs.metadataJson}->>'sampleKey' = ${audit.key}`)
      .limit(1);
    if (existing) continue;
    const when = daysAgo(audit.days, 14);
    await db.insert(auditLogs).values({
      organizationId: first.organizationId,
      actorUserId: actor.id,
      action: audit.action,
      resourceType: audit.resourceType,
      resourceId: first.id,
      metadataJson: { sampleKey: audit.key, projectName: first.name },
      occurredAt: when,
    });
    auditCount += 1;
  }

  let eventCount = 0;
  for (const slug of SLUGS) {
    const project = bySlug.get(slug)!;
    const [existing] = await db
      .select({ id: analyticsEvents.id })
      .from(analyticsEvents)
      .where(sql`${analyticsEvents.metadataJson}->>'sampleKey' = ${`sample-traffic-${slug}`}`)
      .limit(1);
    if (existing) continue;
    const events = [];
    for (let day = 0; day < 7; day += 1) {
      const when = daysAgo(day, 13);
      const views = 8 + day * 2;
      for (let index = 0; index < views; index += 1) {
        events.push({
          organizationId: project.organizationId,
          projectId: project.id,
          eventName: "page_view",
          anonymousVisitorId: `sample-${slug}-${day}-${index % 5}`,
          utmSource: index % 2 === 0 ? "naver" : "kakao",
          utmMedium: "cpc",
          utmCampaign: SAMPLE_SITE.name,
          deviceType: index % 3 === 0 ? "mobile" : "desktop",
          metadataJson: { sampleKey: `sample-traffic-${slug}` },
          occurredAt: when,
        });
      }
      events.push({
        organizationId: project.organizationId,
        projectId: project.id,
        eventName: "phone_click",
        anonymousVisitorId: `sample-${slug}-phone-${day}`,
        deviceType: "mobile",
        metadataJson: { sampleKey: `sample-traffic-${slug}` },
        occurredAt: when,
      });
      events.push({
        organizationId: project.organizationId,
        projectId: project.id,
        eventName: "lead_cta_click",
        anonymousVisitorId: `sample-${slug}-cta-${day}`,
        deviceType: "desktop",
        metadataJson: { sampleKey: `sample-traffic-${slug}` },
        occurredAt: when,
      });
      if (day % 2 === 0) {
        events.push({
          organizationId: project.organizationId,
          projectId: project.id,
          eventName: "lead_submit_success",
          anonymousVisitorId: `sample-${slug}-lead-${day}`,
          deviceType: "mobile",
          metadataJson: { sampleKey: `sample-traffic-${slug}` },
          occurredAt: when,
        });
      }
    }
    await db.insert(analyticsEvents).values(events);
    eventCount += events.length;
  }

  const result = { leadCount, noticeCount, auditCount, eventCount };
  console.info(`sample leads created: ${leadCount}`);
  console.info(`sample notifications created: ${noticeCount}`);
  console.info(`sample audit logs created: ${auditCount}`);
  console.info(`sample analytics events created: ${eventCount}`);
  return result;
}

const isDirectRun = process.argv[1]?.replace(/\\/g, "/").endsWith("src/scripts/seed-sample-activity.ts");
if (isDirectRun) {
  seedSampleActivity()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : "sample activity failed");
      process.exit(1);
    });
}
