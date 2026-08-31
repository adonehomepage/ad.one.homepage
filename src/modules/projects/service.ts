import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  advertiserRecipients,
  leads,
  projectDrafts,
  projects,
  projectSections,
  reservedSlugs,
  templates,
} from "@/lib/db/schema";
import { ApiError } from "@/lib/errors";
import { appConfig } from "@/lib/config";
import { validateSlug } from "@/lib/validation/slug";
import { writeAudit } from "@/modules/audit/service";
import { createTemplateSections, defaultFormFields, placeholderPrivacy, TEMPLATE_CATALOG } from "@/modules/templates/definitions";
import { addCalendarMonths } from "@/lib/datetime";
import type { PageSection, PageSnapshot, TemplateCode } from "@/types";
import { nanoid } from "nanoid";

export async function checkSlugAvailable(value: string, exceptProjectId?: string) {
  const parsed = validateSlug(value);
  if (!parsed.ok) {
    throw new ApiError(parsed.code, parsed.message, 400, "publicSlug");
  }
  const reserved = await db.select().from(reservedSlugs).where(eq(reservedSlugs.slugNormalized, parsed.lookupKey)).limit(1);
  if (reserved[0] && reserved[0].projectId !== exceptProjectId) {
    throw new ApiError("SLUG_RESERVED", "사용할 수 없는 공개 URL입니다.", 400, "publicSlug");
  }
  const existing = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.publicSlugNormalized, parsed.lookupKey))
    .limit(1);
  if (existing[0] && existing[0].id !== exceptProjectId) {
    throw new ApiError("SLUG_ALREADY_EXISTS", "이미 사용 중인 공개 URL입니다.", 400, "publicSlug");
  }
  return parsed;
}

export async function createProject(input: {
  organizationId: string;
  userId: string;
  name: string;
  publicSlug: string;
  templateCode: TemplateCode;
  durationMonths: number;
  assignedManagerId?: string;
}) {
  const name = input.name.trim();
  if (!name) throw new ApiError("VALIDATION_ERROR", "프로젝트명을 입력해 주세요.", 400, "name");
  if (input.durationMonths < 1) {
    throw new ApiError("VALIDATION_ERROR", "운영기간은 1개월 이상이어야 합니다.", 400, "durationMonths");
  }
  if (input.durationMonths > appConfig.maxDurationMonths) {
    throw new ApiError(
      "VALIDATION_ERROR",
      `운영기간 상한은 설정값 ${appConfig.maxDurationMonths}개월입니다.`,
      400,
      "durationMonths",
    );
  }
  const slug = await checkSlugAvailable(input.publicSlug);
  const [template] = await db.select().from(templates).where(eq(templates.code, input.templateCode)).limit(1);
  if (!template) throw new ApiError("VALIDATION_ERROR", "템플릿을 선택해 주세요.", 400, "templateCode");

  const [project] = await db
    .insert(projects)
    .values({
      organizationId: input.organizationId,
      templateId: template.id,
      name,
      publicSlug: slug.value,
      publicSlugNormalized: slug.lookupKey,
      status: "DRAFT",
      durationMonths: input.durationMonths,
      assignedManagerId: input.assignedManagerId ?? input.userId,
      createdBy: input.userId,
      updatedBy: input.userId,
    })
    .returning();

  const sections = createTemplateSections(input.templateCode, project.id);
  await db.insert(projectSections).values(
    sections.map((section) => ({
      id: section.id,
      organizationId: input.organizationId,
      projectId: project.id,
      rootSectionId: section.rootSectionId,
      sourceSectionId: section.sourceSectionId,
      sectionType: section.sectionType,
      title: section.title,
      contentJson: section.content,
      settingsJson: section.settings,
      anchorId: section.anchorId,
      gnbLabel: section.gnbLabel,
      sortOrder: section.sortOrder,
      isOriginal: section.isOriginal,
      isRequired: section.isRequired,
      isVisible: section.isVisible,
      showInGnb: section.showInGnb,
      createdBy: input.userId,
    })),
  );

  await db.insert(projectDrafts).values({
    organizationId: input.organizationId,
    projectId: project.id,
    templateSnapshot: { code: input.templateCode, name: template.name },
    globalSettings: { phone: "", ctaLabel: "관심고객 등록" },
    formSettings: {
      intro: "상담을 원하시면 정보를 남겨 주세요.",
      successMessage: "관심고객 등록이 완료되었습니다.",
      fields: defaultFormFields(),
    },
    seoSettings: { title: name, description: "", ogImageAssetId: null },
    privacySettings: placeholderPrivacy(),
    revision: 1,
    updatedBy: input.userId,
  });

  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.userId,
    action: "project.create",
    resourceType: "project",
    resourceId: project.id,
    metadata: { name, slug: slug.value },
  });
  return project;
}

export async function listProjects(input: {
  organizationId: string;
  q?: string;
  status?: string;
  templateCode?: string;
  expiringSoon?: boolean;
  page?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const limit = 20;
  const filters = [eq(projects.organizationId, input.organizationId), sql`${projects.status} <> 'DELETED'`];
  if (input.status) filters.push(eq(projects.status, input.status));
  if (input.q) {
    const like = `%${input.q}%`;
    filters.push(or(ilike(projects.name, like), ilike(projects.publicSlug, like))!);
  }
  if (input.expiringSoon) {
    filters.push(sql`${projects.expiresAt} is not null and ${projects.expiresAt} <= now() + interval '7 days'`);
  }

  const rows = await db
    .select({
      project: projects,
      templateCode: templates.code,
      templateName: templates.name,
      leadCount: sql<number>`(select count(*) from leads where leads.project_id = ${projects.id} and leads.deleted_at is null)`,
    })
    .from(projects)
    .innerJoin(templates, eq(templates.id, projects.templateId))
    .where(and(...filters))
    .orderBy(desc(projects.updatedAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return { items: rows, page, limit };
}

export async function getProject(organizationId: string, projectId: string) {
  const [row] = await db
    .select({ project: projects, template: templates })
    .from(projects)
    .innerJoin(templates, eq(templates.id, projects.templateId))
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)))
    .limit(1);
  if (!row || row.project.status === "DELETED") {
    throw new ApiError("PROJECT_NOT_FOUND", "프로젝트를 찾을 수 없습니다.", 404);
  }
  return row;
}

export async function getDraft(organizationId: string, projectId: string) {
  const { project, template } = await getProject(organizationId, projectId);
  const [draft] = await db.select().from(projectDrafts).where(eq(projectDrafts.projectId, projectId)).limit(1);
  const sections = await db
    .select()
    .from(projectSections)
    .where(eq(projectSections.projectId, projectId))
    .orderBy(projectSections.sortOrder);
  return { project, template, draft, sections };
}

export function mapSectionRow(row: typeof projectSections.$inferSelect): PageSection {
  return {
    id: row.id,
    projectId: row.projectId,
    rootSectionId: row.rootSectionId,
    sourceSectionId: row.sourceSectionId,
    sectionType: row.sectionType as PageSection["sectionType"],
    title: row.title,
    content: (row.contentJson ?? {}) as Record<string, unknown>,
    settings: (row.settingsJson ?? {}) as Record<string, unknown>,
    isVisible: row.isVisible,
    showInGnb: row.showInGnb,
    gnbLabel: row.gnbLabel ?? row.title,
    anchorId: row.anchorId,
    sortOrder: row.sortOrder,
    isOriginal: row.isOriginal,
    isRequired: row.isRequired,
  };
}

export async function saveDraft(input: {
  organizationId: string;
  projectId: string;
  userId: string;
  expectedRevision: number;
  globalSettings?: Record<string, unknown>;
  formSettings?: Record<string, unknown>;
  seoSettings?: Record<string, unknown>;
  privacySettings?: Record<string, unknown>;
  sections?: PageSection[];
}) {
  const { project, draft } = await getDraft(input.organizationId, input.projectId);
  if (!draft) throw new ApiError("NOT_FOUND", "작업본을 찾을 수 없습니다.", 404);
  if (draft.revision !== input.expectedRevision || project.draftRevision !== input.expectedRevision) {
    throw new ApiError("DRAFT_CONFLICT", "다른 담당자가 먼저 수정했습니다. 최신 작업본을 불러오세요.");
  }

  const nextRevision = draft.revision + 1;
  await db.transaction(async (tx) => {
    await tx
      .update(projectDrafts)
      .set({
        globalSettings: input.globalSettings ?? draft.globalSettings,
        formSettings: input.formSettings ?? draft.formSettings,
        seoSettings: input.seoSettings ?? draft.seoSettings,
        privacySettings: input.privacySettings ?? draft.privacySettings,
        revision: nextRevision,
        updatedBy: input.userId,
        updatedAt: new Date(),
      })
      .where(eq(projectDrafts.projectId, input.projectId));

    if (input.sections) {
      for (const section of input.sections) {
        const existing = await tx
          .select({ id: projectSections.id })
          .from(projectSections)
          .where(eq(projectSections.id, section.id))
          .limit(1);
        if (existing[0]) {
          await tx
            .update(projectSections)
            .set({
              title: section.title,
              contentJson: section.content,
              settingsJson: section.settings,
              gnbLabel: section.gnbLabel,
              sortOrder: section.sortOrder,
              isVisible: section.isVisible,
              showInGnb: section.showInGnb,
              updatedAt: new Date(),
            })
            .where(and(eq(projectSections.id, section.id), eq(projectSections.projectId, input.projectId)));
        } else {
          await tx.insert(projectSections).values({
            id: section.id,
            organizationId: input.organizationId,
            projectId: input.projectId,
            rootSectionId: section.rootSectionId,
            sourceSectionId: section.sourceSectionId,
            sectionType: section.sectionType,
            title: section.title,
            contentJson: section.content,
            settingsJson: section.settings,
            anchorId: section.anchorId,
            gnbLabel: section.gnbLabel,
            sortOrder: section.sortOrder,
            isOriginal: section.isOriginal,
            isRequired: section.isRequired,
            isVisible: section.isVisible,
            showInGnb: section.showInGnb,
            createdBy: input.userId,
          });
        }
      }
      const keepIds = input.sections.map((section) => section.id);
      const current = await tx.select({ id: projectSections.id, isOriginal: projectSections.isOriginal }).from(projectSections).where(eq(projectSections.projectId, input.projectId));
      for (const row of current) {
        if (!keepIds.includes(row.id) && !row.isOriginal) {
          await tx.delete(projectSections).where(eq(projectSections.id, row.id));
        }
      }
    }

    await tx
      .update(projects)
      .set({
        draftRevision: nextRevision,
        hasUnpublishedChanges: true,
        updatedBy: input.userId,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, input.projectId));
  });

  return { revision: nextRevision };
}

export async function buildSnapshot(organizationId: string, projectId: string): Promise<PageSnapshot> {
  const { project, template, draft, sections } = await getDraft(organizationId, projectId);
  if (!draft) throw new ApiError("NOT_FOUND", "작업본을 찾을 수 없습니다.", 404);
  const mapped = sections.map(mapSectionRow);
  const privacy = draft.privacySettings as PageSnapshot["privacy"];
  return {
    templateCode: template.code as TemplateCode,
    projectName: project.name,
    publicSlug: project.publicSlug,
    phone: String((draft.globalSettings as Record<string, unknown>).phone ?? ""),
    globalSettings: draft.globalSettings as Record<string, unknown>,
    formSettings: draft.formSettings as PageSnapshot["formSettings"],
    seoSettings: draft.seoSettings as PageSnapshot["seoSettings"],
    privacy,
    sections: mapped,
  };
}

export { addCalendarMonths, TEMPLATE_CATALOG, nanoid };
