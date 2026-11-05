/**
 * 로컬·개발(preview)에만 템플릿별 더미 홈페이지 초안을 만든다.
 * 운영에서는 만들지 않고, 이미 있는 슬러그는 덮어쓰지 않는다.
 * 사용: npx tsx --env-file=.env.local src/scripts/seed-sample-projects.ts
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations, projects, templates, userProfiles } from "@/lib/db/schema";
import { isProd } from "@/lib/deploy-env";
import { createProject } from "@/modules/projects/service";
import { TEMPLATE_CATALOG } from "@/modules/templates/definitions";
import { SAMPLE_SITE } from "@/modules/templates/sample-site";
import type { TemplateCode } from "@/types";

const SAMPLE_PROJECTS: { templateCode: TemplateCode; publicSlug: string }[] = [
  { templateCode: "foreon", publicSlug: "noeul-foreon" },
  { templateCode: "info", publicSlug: "noeul-info" },
  { templateCode: "oak-editorial", publicSlug: "noeul-oak" },
];

async function ensureTemplates() {
  for (const template of TEMPLATE_CATALOG) {
    if (!template.code) continue;
    await db
      .insert(templates)
      .values({
        code: template.code,
        name: template.name,
        description: template.description,
        schemaJson: { code: template.code },
        isActive: true,
      })
      .onConflictDoUpdate({
        target: templates.code,
        set: {
          name: template.name,
          description: template.description,
          schemaJson: { code: template.code },
          isActive: true,
          updatedAt: new Date(),
        },
      });
  }
}

export async function seedSampleProjects() {
  if (isProd()) {
    console.info("Skip sample projects: production");
    return;
  }

  const loginId = (process.env.SEED_ADMIN_LOGIN || process.env.SEED_ADMIN_EMAIL || "teamadit").trim().toLowerCase();
  const [org] = await db.select().from(organizations).limit(1);
  const [user] = await db.select().from(userProfiles).where(eq(userProfiles.email, loginId)).limit(1);
  if (!org || !user) {
    throw new Error("organization or admin missing; run db:seed first");
  }

  await ensureTemplates();

  for (const sample of SAMPLE_PROJECTS) {
    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.publicSlugNormalized, sample.publicSlug))
      .limit(1);
    if (existing) {
      console.info(`sample exists: ${sample.publicSlug}`);
      continue;
    }
    const project = await createProject({
      organizationId: org.id,
      userId: user.id,
      name: SAMPLE_SITE.name,
      publicSlug: sample.publicSlug,
      templateCode: sample.templateCode,
      durationMonths: 3,
      phone: SAMPLE_SITE.phone,
    });
    console.info(`sample created: ${project.publicSlug} (${sample.templateCode})`);
  }
}

const isDirectRun = process.argv[1]?.replace(/\\/g, "/").endsWith("src/scripts/seed-sample-projects.ts");
if (isDirectRun) {
  seedSampleProjects()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
