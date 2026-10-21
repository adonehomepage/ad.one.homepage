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
import { createTemplateSections, TEMPLATE_CATALOG } from "@/modules/templates/definitions";
import { newProjectDraftParts } from "@/modules/projects/draft-defaults";
import { addCalendarMonths } from "@/lib/datetime";
import type { PageSection, PageSnapshot, TemplateCode } from "@/types";
import { nanoid } from "nanoid";
import { orgText } from "@/modules/admin/org-copy";

export async function checkSlugAvailable(value: string, exceptProjectId?: string) {
  const parsed = validateSlug(value);
  if (!parsed.ok) {
    throw new ApiError(parsed.code, parsed.message, 400, "publicSlug");
  }
  const reserved = await db.select().from(reservedSlugs).where(eq(reservedSlugs.slugNormalized, parsed.lookupKey)).limit(1);
  if (reserved[0] && reserved[0].projectId !== exceptProjectId) {
    throw new ApiError("SLUG_RESERVED", orgText("slugReserved"), 400, "publicSlug");
  }
  const existing = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.publicSlugNormalized, parsed.lookupKey))
    .limit(1);
  if (existing[0] && existing[0].id !== exceptProjectId) {
    throw new ApiError("SLUG_ALREADY_EXISTS", orgText("slugTaken"), 400, "publicSlug");
  }
  return parsed;
}

export async function updatePublicSlug(input: {
  organizationId: string;
  projectId: string;
  userId: string;
  publicSlug: string;
}) {
  const { project } = await getProject(input.organizationId, input.projectId);
  if (project.publishedAt) {
    throw new ApiError("SLUG_LOCKED", orgText("slugLocked"), 409, "publicSlug");
  }
  const slug = await checkSlugAvailable(input.publicSlug, input.projectId);
  await db
    .update(projects)
    .set({
      publicSlug: slug.value,
      publicSlugNormalized: slug.lookupKey,
      updatedBy: input.userId,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, input.projectId));
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.userId,
    action: "project.slug_update",
    resourceType: "project",
    resourceId: input.projectId,
    metadata: { publicSlug: slug.value },
  });
  return { publicSlug: slug.value };
}

export async function createProject(input: {
  organizationId: string;
  userId: string;
  name: string;
  publicSlug: string;
  templateCode: TemplateCode;
  durationMonths: number;
  phone?: string;
  assignedManagerId?: string;
}) {
  const name = input.name.trim();
  if (!name) throw new ApiError("VALIDATION_ERROR", orgText("projectNameRequired"), 400, "name");
  if (input.durationMonths < 1) {
    throw new ApiError("VALIDATION_ERROR", orgText("projectDurationMin"), 400, "durationMonths");
  }
  if (input.durationMonths > appConfig.maxDurationMonths) {
    throw new ApiError(
      "VALIDATION_ERROR",
      orgText("projectDurationMax").replace("{n}", String(appConfig.maxDurationMonths)),
      400,
      "durationMonths",
    );
  }
  const slug = await checkSlugAvailable(input.publicSlug);
  const [template] = await db.select().from(templates).where(eq(templates.code, input.templateCode)).limit(1);
  if (!template) throw new ApiError("VALIDATION_ERROR", orgText("templateRequired"), 400, "templateCode");

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

  const draft = newProjectDraftParts({ name, phone: input.phone?.trim() ?? "" });
  const sections = createTemplateSections(input.templateCode, project.id, draft.globalSettings).map((section) => {
    if (section.sectionType !== "hero") return section;
    return { ...section, content: { ...section.content, headline: name } };
  });
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
    globalSettings: draft.globalSettings,
    formSettings: draft.formSettings,
    seoSettings: draft.seoSettings,
    privacySettings: draft.privacySettings,
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
    const safeQ = input.q.replace(/[%_\\]/g, "");
    const like = `%${safeQ}%`;
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
    throw new ApiError("PROJECT_NOT_FOUND", orgText("projectNotFound"), 404);
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
  if (!draft) throw new ApiError("NOT_FOUND", orgText("draftNotFound"), 404);
  if (draft.revision !== input.expectedRevision || project.draftRevision !== input.expectedRevision) {
    throw new ApiError("DRAFT_CONFLICT", orgText("draftConflict"), 409, undefined, undefined, {
      currentRevision: draft.revision,
    });
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
          .where(and(eq(projectSections.id, section.id), eq(projectSections.projectId, input.projectId)))
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
      const current = await tx
        .select({ id: projectSections.id, isOriginal: projectSections.isOriginal, sectionType: projectSections.sectionType })
        .from(projectSections)
        .where(eq(projectSections.projectId, input.projectId));
      for (const row of current) {
        if (row.sectionType === "faq" || (!keepIds.includes(row.id) && !row.isOriginal)) {
          await tx.delete(projectSections).where(eq(projectSections.id, row.id));
        }
      }
    }

    const siteName = String((input.globalSettings?.siteName as string | undefined) ?? "").trim();
    await tx
      .update(projects)
      .set({
        ...(siteName ? { name: siteName } : {}),
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
  if (!draft) throw new ApiError("NOT_FOUND", orgText("draftNotFound"), 404);
  const mapped = sections
    .map(mapSectionRow)
    .filter((section) => (section.sectionType as string) !== "faq");
  const privacy = draft.privacySettings as PageSnapshot["privacy"];
  const settings = draft.globalSettings as Record<string, unknown>;
  return {
    templateCode: template.code as TemplateCode,
    projectName: String(settings.siteName || project.name),
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
