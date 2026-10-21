import type { MetadataRoute } from "next";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { appConfig } from "@/lib/config";
import { getDeployEnv } from "@/lib/deploy-env";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (getDeployEnv() !== "production") {
    return [];
  }

  const base = appConfig.publicUrl.replace(/\/$/, "");
  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const now = new Date();
    const rows = await db
      .select({
        slug: projects.publicSlug,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(
        and(
          eq(projects.status, "PUBLISHED"),
          isNull(projects.deletedAt),
          or(isNull(projects.expiresAt), gt(projects.expiresAt, now)),
        ),
      )
      .limit(5_000);
    for (const row of rows) {
      entries.push({
        url: `${base}/${row.slug}`,
        lastModified: row.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // DB 미연결 시 정적 항목만
  }

  return entries;
}
