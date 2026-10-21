import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { advertiserRecipients, projectDrafts, projects, projectSections, projectVersions } from "@/lib/db/schema";
import { ApiError } from "@/lib/errors";
import { appConfig } from "@/lib/config";
import { addCalendarMonths } from "@/lib/datetime";
import { orgText } from "@/modules/admin/org-copy";
import { writeAudit } from "@/modules/audit/service";
import { buildSnapshot, getDraft, getProject, mapSectionRow } from "@/modules/projects/service";
import type { PageSection, PageSnapshot } from "@/types";

function revalidatePublicSlug(slug: string) {
  revalidatePath(`/${slug}`);
  revalidatePath("/sitemap.xml");
}

function chrome(settings: Record<string, unknown> | undefined, key: string, fallback: string) {
  return String(settings?.[key] ?? "").trim() || fallback;
}

function validatePublish(snapshot: PageSnapshot, firstPublish: boolean) {
  const g = snapshot.globalSettings;
  const errors: string[] = [];
  if (!snapshot.projectName.trim()) errors.push(chrome(g, "publishErrName", "프로젝트명이 필요합니다."));
  if (!snapshot.publicSlug.trim()) errors.push(chrome(g, "publishErrSlug", "공개 URL이 필요합니다."));
  const hero = snapshot.sections.find((section) => section.sectionType === "hero" && section.isVisible);
  if (!hero) errors.push(chrome(g, "publishErrHero", "히어로 섹션이 필요합니다."));
  const form = snapshot.sections.find((section) => section.sectionType === "lead_form" && section.isVisible);
  if (!form) errors.push(chrome(g, "publishErrForm", "관심고객 등록 섹션이 필요합니다."));
  const legal = snapshot.sections.find((section) => section.sectionType === "legal" && section.isVisible);
  if (!legal) errors.push(chrome(g, "publishErrLegal", "법적 고지 섹션을 숨길 수 없습니다."));
  if (!snapshot.privacy.collectingControllerName.trim()) errors.push(chrome(g, "publishErrController", "개인정보 수집 주체를 입력해 주세요."));
  if (!snapshot.formSettings.fields.some((field) => field.type === "name" && field.required)) {
    errors.push(chrome(g, "publishErrNameField", "이름 필수 필드가 필요합니다."));
  }
  if (!snapshot.formSettings.fields.some((field) => field.type === "phone" && field.required)) {
    errors.push(chrome(g, "publishErrPhoneField", "연락처 필수 필드가 필요합니다."));
  }
  if (firstPublish && snapshot.privacy.collectingControllerName === "처리주체미정" && appConfig.env === "production") {
    errors.push(chrome(g, "publishErrControllerProd", "실제 개인정보 처리 주체를 설정한 뒤에 발행할 수 있습니다."));
  }
  if (errors.length) {
    throw new ApiError("PUBLISH_VALIDATION_FAILED", errors.join(" "));
  }
}

export async function publishProject(input: {
  organizationId: string;
  projectId: string;
  userId: string;
  changeSummary?: string;
}) {
  const { project } = await getProject(input.organizationId, input.projectId);
  if (project.status === "EXPIRED") {
    throw new ApiError("PROJECT_EXPIRED", orgText("publishExpired"));
  }
  if (project.status === "PENDING_DELETION" || project.status === "DELETED") {
    throw new ApiError("FORBIDDEN", orgText("publishDeleted"));
  }

  const snapshot = await buildSnapshot(input.organizationId, input.projectId);
  const firstPublish = !project.publishedAt;
  validatePublish(snapshot, firstPublish);

  const latest = await db
    .select({ versionNumber: projectVersions.versionNumber })
    .from(projectVersions)
    .where(eq(projectVersions.projectId, input.projectId))
    .orderBy(desc(projectVersions.versionNumber))
    .limit(1);
  const versionNumber = (latest[0]?.versionNumber ?? 0) + 1;
  const now = new Date();
  const publishedAt = project.publishedAt ?? now;
  const expiresAt = project.expiresAt ?? addCalendarMonths(publishedAt, project.durationMonths);

  const [version] = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(projectVersions)
      .values({
        organizationId: input.organizationId,
        projectId: input.projectId,
        versionNumber,
        snapshotJson: snapshot,
        changeSummary:
          input.changeSummary ??
          (firstPublish
            ? chrome(snapshot.globalSettings, "publishChangeFirst", "최초 발행")
            : chrome(snapshot.globalSettings, "publishChangeAgain", "재발행")),
        publishedBy: input.userId,
        publishedAt: now,
      })
      .returning();

    const versions = await tx
      .select({ id: projectVersions.id, versionNumber: projectVersions.versionNumber })
      .from(projectVersions)
      .where(eq(projectVersions.projectId, input.projectId))
      .orderBy(desc(projectVersions.publishedAt));
    const extra = versions.slice(appConfig.maxPublishedVersions);
    for (const row of extra) {
      if (row.id !== created.id) {
        await tx.delete(projectVersions).where(eq(projectVersions.id, row.id));
      }
    }

    await tx
      .update(projects)
      .set({
        status: "PUBLISHED",
        publishedAt,
        expiresAt,
        currentPublishedVersionId: created.id,
        hasUnpublishedChanges: false,
        deletionScheduledAt: null,
        updatedBy: input.userId,
        updatedAt: now,
      })
      .where(eq(projects.id, input.projectId));
    return [created];
  });

  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.userId,
    action: firstPublish ? "project.publish" : "project.republish",
    resourceType: "project",
    resourceId: input.projectId,
    metadata: { versionId: version.id, versionNumber },
  });
  revalidatePublicSlug(project.publicSlug);
  return version;
}

export async function listVersions(organizationId: string, projectId: string) {
  await getProject(organizationId, projectId);
  return db
    .select()
    .from(projectVersions)
    .where(and(eq(projectVersions.projectId, projectId), eq(projectVersions.organizationId, organizationId)))
    .orderBy(desc(projectVersions.publishedAt))
    .limit(appConfig.maxPublishedVersions);
}

export async function restoreVersion(input: {
  organizationId: string;
  projectId: string;
  versionId: string;
  userId: string;
  republish: boolean;
}) {
  const { project } = await getDraft(input.organizationId, input.projectId);
  const [version] = await db
    .select()
    .from(projectVersions)
    .where(and(eq(projectVersions.id, input.versionId), eq(projectVersions.projectId, input.projectId)))
    .limit(1);
  if (!version) throw new ApiError("NOT_FOUND", orgText("versionNotFound"), 404);
  const snapshot = version.snapshotJson as PageSnapshot;

  await db.transaction(async (tx) => {
    await tx.delete(projectSections).where(eq(projectSections.projectId, input.projectId));
    await tx.insert(projectSections).values(
      snapshot.sections.map((section: PageSection) => ({
        id: crypto.randomUUID(),
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
      })),
    );
    await tx
      .update(projectDrafts)
      .set({
        globalSettings: snapshot.globalSettings,
        formSettings: snapshot.formSettings,
        seoSettings: snapshot.seoSettings,
        privacySettings: snapshot.privacy,
        revision: project.draftRevision + 1,
        updatedBy: input.userId,
        updatedAt: new Date(),
      })
      .where(eq(projectDrafts.projectId, input.projectId));
    const siteName = String(snapshot.globalSettings.siteName ?? snapshot.projectName ?? "").trim();
    await tx
      .update(projects)
      .set({
        ...(siteName ? { name: siteName } : {}),
        draftRevision: project.draftRevision + 1,
        hasUnpublishedChanges: true,
        updatedBy: input.userId,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, input.projectId));
  });

  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.userId,
    action: "project.restore_version",
    resourceType: "project_version",
    resourceId: input.versionId,
  });

  const draftRevision = project.draftRevision + 1;
  if (input.republish) {
    const published = await publishProject({
      organizationId: input.organizationId,
      projectId: input.projectId,
      userId: input.userId,
      changeSummary: orgText("versionRestorePublish").replace("{n}", String(version.versionNumber)),
    });
    return { restored: true, republished: true, draftRevision, version: published };
  }
  return { restored: true, republished: false, draftRevision };
}

export async function pauseProject(input: { organizationId: string; projectId: string; userId: string; reason?: string }) {
  const { project } = await getProject(input.organizationId, input.projectId);
  if (project.status !== "PUBLISHED") {
    throw new ApiError("VALIDATION_ERROR", orgText("pauseOnlyPublished"), 400);
  }
  await db
    .update(projects)
    .set({ status: "PAUSED", updatedBy: input.userId, updatedAt: new Date() })
    .where(eq(projects.id, project.id));
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.userId,
    action: "project.pause",
    resourceType: "project",
    resourceId: project.id,
    metadata: { reason: input.reason ?? "" },
  });
  revalidatePublicSlug(project.publicSlug);
}

export async function resumeProject(input: { organizationId: string; projectId: string; userId: string }) {
  const { project } = await getProject(input.organizationId, input.projectId);
  if (!project.currentPublishedVersionId) {
    throw new ApiError("PUBLISH_VALIDATION_FAILED", orgText("resumeNoVersion"));
  }
  if (project.expiresAt && project.expiresAt <= new Date()) {
    throw new ApiError("PROJECT_EXPIRED", orgText("resumeExpired"));
  }
  await db
    .update(projects)
    .set({ status: "PUBLISHED", updatedBy: input.userId, updatedAt: new Date() })
    .where(eq(projects.id, project.id));
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.userId,
    action: "project.resume",
    resourceType: "project",
    resourceId: project.id,
  });
  revalidatePublicSlug(project.publicSlug);
}

export async function extendProject(input: {
  organizationId: string;
  projectId: string;
  userId: string;
  additionalMonths: number;
}) {
  if (input.additionalMonths < 1) {
    throw new ApiError("VALIDATION_ERROR", orgText("extendMinMonths"));
  }
  const { project } = await getProject(input.organizationId, input.projectId);
  const base = project.expiresAt && project.expiresAt > new Date() ? project.expiresAt : new Date();
  const expiresAt = addCalendarMonths(base, input.additionalMonths);
  const nextStatus = project.currentPublishedVersionId ? "PUBLISHED" : project.status === "DRAFT" ? "DRAFT" : "PUBLISHED";
  await db
    .update(projects)
    .set({
      durationMonths: project.durationMonths + input.additionalMonths,
      expiresAt,
      status: nextStatus === "DRAFT" ? "DRAFT" : "PUBLISHED",
      deletionScheduledAt: null,
      updatedBy: input.userId,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, project.id));
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.userId,
    action: "project.extend",
    resourceType: "project",
    resourceId: project.id,
    metadata: { additionalMonths: input.additionalMonths, expiresAt: expiresAt.toISOString() },
  });
  return { expiresAt };
}

export async function deleteProject(input: { organizationId: string; projectId: string; userId: string; confirmName: string }) {
  const { project } = await getProject(input.organizationId, input.projectId);
  if (input.confirmName.trim() !== project.name) {
    throw new ApiError("VALIDATION_ERROR", orgText("deleteConfirmName"));
  }
  const now = new Date();
  await db
    .update(projects)
    .set({
      status: "DELETED",
      deletedAt: now,
      deletionScheduledAt: now,
      updatedBy: input.userId,
      updatedAt: now,
    })
    .where(eq(projects.id, project.id));
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.userId,
    action: "project.delete",
    resourceType: "project",
    resourceId: project.id,
  });
}

/** 프로젝트 없으면 null(호출측에서 notFound). 있으면만·일시중지 등은 안내 문구. */
export async function getUnpublishedNotice(slugNormalized: string) {
  const [project] = await db
    .select({ id: projects.id, status: projects.status, expiresAt: projects.expiresAt })
    .from(projects)
    .where(eq(projects.publicSlugNormalized, slugNormalized))
    .limit(1);
  const generic = {
    title: orgText("publicUnpublishedTitle"),
    body: orgText("publicUnpublishedBody"),
  };
  if (!project) return null;

  const expired = Boolean(project.expiresAt && project.expiresAt <= new Date()) || project.status === "EXPIRED";
  const noticeKey =
    project.status === "PAUSED"
      ? ("paused" as const)
      : project.status === "PENDING_DELETION" || project.status === "DELETED"
        ? ("pendingDeletion" as const)
        : expired
          ? ("expired" as const)
          : project.status === "DRAFT"
            ? ("draft" as const)
            : ("generic" as const);

  const defaults =
    noticeKey === "paused"
      ? { title: orgText("publicPausedTitle"), body: orgText("publicPausedBody"), titleKey: "publicPausedTitle", bodyKey: "publicPausedBody" }
      : noticeKey === "pendingDeletion"
        ? {
            title: project.status === "DELETED" ? orgText("publicDeletedTitle") : orgText("publicPendingDeletionTitle"),
            body: project.status === "DELETED" ? orgText("publicDeletedBody") : orgText("publicPendingDeletionBody"),
            titleKey: project.status === "DELETED" ? "publicDeletedTitle" : "publicPendingDeletionTitle",
            bodyKey: project.status === "DELETED" ? "publicDeletedBody" : "publicPendingDeletionBody",
          }
        : noticeKey === "expired"
          ? { title: orgText("publicExpiredTitle"), body: orgText("publicExpiredBody"), titleKey: "publicExpiredTitle", bodyKey: "publicExpiredBody" }
          : noticeKey === "draft"
            ? { title: orgText("publicDraftTitle"), body: orgText("publicDraftBody"), titleKey: "publicDraftTitle", bodyKey: "publicDraftBody" }
            : { title: generic.title, body: generic.body, titleKey: "publicUnpublishedTitle", bodyKey: "publicUnpublishedBody" };

  const [draft] = await db.select({ globalSettings: projectDrafts.globalSettings }).from(projectDrafts).where(eq(projectDrafts.projectId, project.id)).limit(1);
  const settings = (draft?.globalSettings ?? {}) as Record<string, unknown>;
  return {
    title: String(settings[defaults.titleKey] ?? settings.publicUnpublishedTitle ?? "").trim() || defaults.title,
    body: String(settings[defaults.bodyKey] ?? settings.publicUnpublishedBody ?? "").trim() || defaults.body,
  };
}

export async function getPublishedBySlug(slugNormalized: string) {
  const [project] = await db.select().from(projects).where(eq(projects.publicSlugNormalized, slugNormalized)).limit(1);
  if (!project || project.status !== "PUBLISHED" || !project.currentPublishedVersionId) return null;
  if (project.expiresAt && project.expiresAt <= new Date()) return null;
  const [version] = await db.select().from(projectVersions).where(eq(projectVersions.id, project.currentPublishedVersionId)).limit(1);
  if (!version) return null;
  return { project, snapshot: version.snapshotJson as PageSnapshot, version };
}

export { mapSectionRow, advertiserRecipients };
