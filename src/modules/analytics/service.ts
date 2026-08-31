import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { analyticsEvents, dailyProjectMetrics } from "@/lib/db/schema";
import { getProject } from "@/modules/projects/service";
import { sanitizeAnalyticsMetadata } from "@/modules/analytics/sanitize";
import type { AnalyticsEventName } from "@/types";

export { sanitizeAnalyticsMetadata };

export async function trackEvent(input: {
  organizationId: string;
  projectId: string;
  publishedVersionId?: string | null;
  eventName: AnalyticsEventName;
  anonymousSessionId?: string;
  anonymousVisitorId?: string;
  referrer?: string | null;
  utm?: Record<string, string | undefined>;
  deviceType?: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(analyticsEvents).values({
    organizationId: input.organizationId,
    projectId: input.projectId,
    publishedVersionId: input.publishedVersionId ?? null,
    eventName: input.eventName,
    anonymousSessionId: input.anonymousSessionId ?? null,
    anonymousVisitorId: input.anonymousVisitorId ?? null,
    referrer: input.referrer ?? null,
    utmSource: input.utm?.utm_source ?? null,
    utmMedium: input.utm?.utm_medium ?? null,
    utmCampaign: input.utm?.utm_campaign ?? null,
    utmContent: input.utm?.utm_content ?? null,
    utmTerm: input.utm?.utm_term ?? null,
    deviceType: input.deviceType ?? "unknown",
    metadataJson: sanitizeAnalyticsMetadata(input.metadata ?? {}),
  });
}

export async function getProjectAnalytics(organizationId: string, projectId: string, from: Date, to: Date) {
  await getProject(organizationId, projectId);
  const rows = await db
    .select()
    .from(dailyProjectMetrics)
    .where(
      and(
        eq(dailyProjectMetrics.projectId, projectId),
        gte(dailyProjectMetrics.metricDate, from.toISOString().slice(0, 10)),
        lte(dailyProjectMetrics.metricDate, to.toISOString().slice(0, 10)),
      ),
    );
  const totals = rows.reduce(
    (acc, row) => ({
      pageViews: acc.pageViews + row.pageViews,
      uniqueVisitors: acc.uniqueVisitors + row.uniqueVisitors,
      phoneClicks: acc.phoneClicks + row.phoneClicks,
      leadCtaClicks: acc.leadCtaClicks + row.leadCtaClicks,
      leadSubmissions: acc.leadSubmissions + row.leadSubmissions,
    }),
    { pageViews: 0, uniqueVisitors: 0, phoneClicks: 0, leadCtaClicks: 0, leadSubmissions: 0 },
  );
  let daily = rows.map((row) => ({
    date: String(row.metricDate),
    pageViews: row.pageViews,
    uniqueVisitors: row.uniqueVisitors,
    phoneClicks: row.phoneClicks,
    leadCtaClicks: row.leadCtaClicks,
    leads: row.leadSubmissions,
  }));
  let computedTotals = totals;

  if (computedTotals.pageViews === 0 && computedTotals.leadSubmissions === 0) {
    const live = await db
      .select({
        date: sql<string>`to_char((${analyticsEvents.occurredAt} at time zone 'Asia/Seoul')::date, 'YYYY-MM-DD')`,
        pageViews: sql<number>`count(*) filter (where ${analyticsEvents.eventName} = 'page_view')::int`,
        uniqueVisitors: sql<number>`count(distinct ${analyticsEvents.anonymousVisitorId}) filter (where ${analyticsEvents.eventName} = 'page_view')::int`,
        phoneClicks: sql<number>`count(*) filter (where ${analyticsEvents.eventName} = 'phone_click')::int`,
        leadCtaClicks: sql<number>`count(*) filter (where ${analyticsEvents.eventName} = 'lead_cta_click')::int`,
        leads: sql<number>`count(*) filter (where ${analyticsEvents.eventName} = 'lead_submit_success')::int`,
      })
      .from(analyticsEvents)
      .where(and(eq(analyticsEvents.projectId, projectId), gte(analyticsEvents.occurredAt, from), lte(analyticsEvents.occurredAt, to)))
      .groupBy(sql`(occurred_at at time zone 'Asia/Seoul')::date`)
      .orderBy(sql`(occurred_at at time zone 'Asia/Seoul')::date`);
    if (live.length > 0) {
      daily = live.map((row) => ({
        date: row.date,
        pageViews: Number(row.pageViews),
        uniqueVisitors: Number(row.uniqueVisitors),
        phoneClicks: Number(row.phoneClicks),
        leadCtaClicks: Number(row.leadCtaClicks),
        leads: Number(row.leads),
      }));
      computedTotals = daily.reduce(
        (acc, row) => ({
          pageViews: acc.pageViews + row.pageViews,
          uniqueVisitors: acc.uniqueVisitors + row.uniqueVisitors,
          phoneClicks: acc.phoneClicks + row.phoneClicks,
          leadCtaClicks: acc.leadCtaClicks + row.leadCtaClicks,
          leadSubmissions: acc.leadSubmissions + row.leads,
        }),
        { pageViews: 0, uniqueVisitors: 0, phoneClicks: 0, leadCtaClicks: 0, leadSubmissions: 0 },
      );
    }
  }

  const conversionRate = computedTotals.uniqueVisitors ? computedTotals.leadSubmissions / computedTotals.uniqueVisitors : 0;

  const channels = await db
    .select({
      source: analyticsEvents.utmSource,
      medium: analyticsEvents.utmMedium,
      views: sql<number>`count(*) filter (where ${analyticsEvents.eventName} = 'page_view')`,
    })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.projectId, projectId), gte(analyticsEvents.occurredAt, from), lte(analyticsEvents.occurredAt, to)))
    .groupBy(analyticsEvents.utmSource, analyticsEvents.utmMedium);

  const devices = await db
    .select({
      deviceType: analyticsEvents.deviceType,
      count: sql<number>`count(*)`,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.projectId, projectId),
        eq(analyticsEvents.eventName, "page_view"),
        gte(analyticsEvents.occurredAt, from),
        lte(analyticsEvents.occurredAt, to),
      ),
    )
    .groupBy(analyticsEvents.deviceType);

  return { totals: { ...computedTotals, conversionRate }, daily, channels, devices };
}

export async function getOrganizationTrend(organizationId: string, from: Date, to: Date) {
  const live = await db
    .select({
      date: sql<string>`to_char((${analyticsEvents.occurredAt} at time zone 'Asia/Seoul')::date, 'YYYY-MM-DD')`,
      pageViews: sql<number>`count(*) filter (where ${analyticsEvents.eventName} = 'page_view')::int`,
      leads: sql<number>`count(*) filter (where ${analyticsEvents.eventName} = 'lead_submit_success')::int`,
    })
    .from(analyticsEvents)
    .where(
      and(eq(analyticsEvents.organizationId, organizationId), gte(analyticsEvents.occurredAt, from), lte(analyticsEvents.occurredAt, to)),
    )
    .groupBy(sql`(occurred_at at time zone 'Asia/Seoul')::date`)
    .orderBy(sql`(occurred_at at time zone 'Asia/Seoul')::date`);
  return live.map((row) => ({
    date: row.date,
    pageViews: Number(row.pageViews),
    leads: Number(row.leads),
  }));
}

export async function aggregateAnalytics() {
  await db.execute(sql`
    insert into daily_project_metrics (
      id, organization_id, project_id, metric_date, page_views, unique_visitors, phone_clicks, lead_cta_clicks, lead_submissions
    )
    select gen_random_uuid(), organization_id, project_id, (occurred_at at time zone 'Asia/Seoul')::date,
      count(*) filter (where event_name = 'page_view'),
      count(distinct anonymous_visitor_id) filter (where event_name = 'page_view'),
      count(*) filter (where event_name = 'phone_click'),
      count(*) filter (where event_name = 'lead_cta_click'),
      count(*) filter (where event_name = 'lead_submit_success')
    from analytics_events
    where occurred_at >= now() - interval '2 days'
    group by organization_id, project_id, (occurred_at at time zone 'Asia/Seoul')::date
    on conflict (project_id, metric_date) do update set
      page_views = excluded.page_views,
      unique_visitors = excluded.unique_visitors,
      phone_clicks = excluded.phone_clicks,
      lead_cta_clicks = excluded.lead_cta_clicks,
      lead_submissions = excluded.lead_submissions
  `);
}
