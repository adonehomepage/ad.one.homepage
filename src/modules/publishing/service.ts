import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { advertiserRecipients, projectDrafts, projects, projectSections, projectVersions } from "@/lib/db/schema";
import { ApiError } from "@/lib/errors";
import { appConfig } from "@/lib/config";
import { addCalendarMonths } from "@/lib/datetime";
import { writeAudit } from "@/modules/audit/service";
import { buildSnapshot, getDraft, getProject, mapSectionRow } from "@/modules/projects/service";
import type { PageSection, PageSnapshot } from "@/types";

function validatePublish(snapshot: PageSnapshot, firstPublish: boolean) {
  const errors: string[] = [];
  if (!snapshot.projectName.trim()) errors.push("프로젝트명이 필요합니다.");
  if (!snapshot.publicSlug.trim()) errors.push("공개 URL이 필요합니다.");
  const hero = snapshot.sections.find((section) => section.sectionType === "hero" && section.isVisible);
  if (!hero) errors.push("히어로 섹션이 필요합니다.");
  const form = snapshot.sections.find((section) => section.sectionType === "lead_form" && section.isVisible);
  if (!form) errors.push("관심고객 등록 섹션이 필요합니다.");
  const legal = snapshot.sections.find((section) => section.sectionType === "legal" && section.isVisible);
  if (!legal) errors.push("법적 고지 섹션을 숨길 수 없습니다.");
  if (!snapshot.privacy.collectingControllerName.trim()) errors.push("개인정보 수집 주체를 입력해 주세요.");
  if (!snapshot.formSettings.fields.some((field) => field.type === "name" && field.required)) {
    errors.push("이름 필수 필드가 필요합니다.");
  }
  if (!snapshot.formSettings.fields.some((field) => field.type === "phone" && field.required)) {
    errors.push("연락처 필수 필드가 필요합니다.");
  }
  if (firstPublish && snapshot.privacy.collectingControllerName === "처리주체미정" && appConfig.env === "production") {
    errors.push("실제 개인정보 처리 주체를 설정한 뒤에 발행할 수 있습니다.");
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
    throw new ApiError("PROJECT_EXPIRED", "만료된 프로젝트는 연장 후 다시 공개할 수 있습니다.");
  }
  if (project.status === "PENDING_DELETION" || project.status === "DELETED") {
    throw new ApiError("FORBIDDEN", "삭제 대상 프로젝트는 발행할 수 없습니다.");
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
        changeSummary: input.changeSummary ?? (firstPublish ? "최초 발행" : "재발행"),
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
  if (!version) throw new ApiError("NOT_FOUND", "버전을 찾을 수 없습니다.", 404);
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
    await tx
      .update(projects)
      .set({
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

  if (input.republish) {
    return publishProject({
      organizationId: input.organizationId,
      projectId: input.projectId,
      userId: input.userId,
      changeSummary: `버전 ${version.versionNumber} 복구 발행`,
    });
  }
  return { restored: true };
}

export async function pauseProject(input: { organizationId: string; projectId: string; userId: string; reason?: string }) {
  const { project } = await getProject(input.organizationId, input.projectId);
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
}

export async function resumeProject(input: { organizationId: string; projectId: string; userId: string }) {
  const { project } = await getProject(input.organizationId, input.projectId);
  if (!project.currentPublishedVersionId) {
    throw new ApiError("PUBLISH_VALIDATION_FAILED", "발행된 버전이 없어 재공개할 수 없습니다.");
  }
  if (project.expiresAt && project.expiresAt <= new Date()) {
    throw new ApiError("PROJECT_EXPIRED", "만료된 프로젝트는 연장 후 재공개할 수 있습니다.");
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
}

export async function extendProject(input: {
  organizationId: string;
  projectId: string;
  userId: string;
  additionalMonths: number;
}) {
  if (input.additionalMonths < 1) {
    throw new ApiError("VALIDATION_ERROR", "연장 기간은 1개월 이상이어야 합니다.");
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
    throw new ApiError("VALIDATION_ERROR", "삭제를 확인하려면 프로젝트명을 정확히 입력해 주세요.");
  }
  const now = new Date();
  await db
    .update(projects)
    .set({
      status: "PENDING_DELETION",
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

export async function getPublishedBySlug(slugNormalized: string) {
  const [project] = await db.select().from(projects).where(eq(projects.publicSlugNormalized, slugNormalized)).limit(1);
  if (!project || project.status !== "PUBLISHED" || !project.currentPublishedVersionId) return null;
  if (project.expiresAt && project.expiresAt <= new Date()) return null;
  const [version] = await db.select().from(projectVersions).where(eq(projectVersions.id, project.currentPublishedVersionId)).limit(1);
  if (!version) return null;
  return { project, snapshot: version.snapshotJson as PageSnapshot, version };
}

export { mapSectionRow, advertiserRecipients };
