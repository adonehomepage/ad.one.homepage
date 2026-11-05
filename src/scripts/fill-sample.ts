/**
 * 운영용: 기존 프로젝트 작업본을 프리미엄 화보형 예시 팩으로 다시 맞춘다.
 * 새 프로젝트는 createTemplateSections가 처음부터 샘플을 넣으므로 이 스크립트가 필요 없다.
 * 사용: npx tsx --env-file=.env.local src/scripts/fill-sample.ts
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectDrafts, projectSections, projects } from "@/lib/db/schema";
import { clampLaunchExcludedSection } from "@/modules/sections/duplicate";
import { applySampleCopy, createTemplateSections, SAMPLE_LEAD_INTRO, sampleGlobalExtras } from "@/modules/templates/definitions";
import type { PageSection } from "@/types";

function toRow(project: typeof projects.$inferSelect, section: PageSection) {
  return {
    id: section.id,
    organizationId: project.organizationId,
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
    createdBy: project.createdBy,
  };
}

async function main() {
  const rows = await db.select().from(projects);
  const extras = sampleGlobalExtras();
  let updated = 0;

  for (const project of rows) {
    if (project.deletedAt || project.status === "DELETED" || project.status === "PENDING_DELETION") continue;
    const [draft] = await db.select().from(projectDrafts).where(eq(projectDrafts.projectId, project.id)).limit(1);
    if (!draft) continue;
    const templateCode = String((draft.templateSnapshot as { code?: string } | null)?.code ?? "");
    // oak-editorial은 전용 스키마·샘플을 쓰므로 foreon 화보형 팩으로 덮지 않는다.
    if (templateCode === "oak-editorial" || templateCode === "midday" || templateCode === "info") continue;

    const existing = await db.select().from(projectSections).where(eq(projectSections.projectId, project.id));
    const asSections: PageSection[] = existing.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      rootSectionId: row.rootSectionId,
      sourceSectionId: row.sourceSectionId,
      sectionType: row.sectionType as PageSection["sectionType"],
      title: row.title,
      content: (row.contentJson ?? {}) as Record<string, unknown>,
      settings: (row.settingsJson ?? {}) as Record<string, unknown>,
      anchorId: row.anchorId,
      gnbLabel: row.gnbLabel ?? "",
      sortOrder: row.sortOrder,
      isOriginal: row.isOriginal,
      isRequired: row.isRequired,
      isVisible: row.isVisible,
      showInGnb: row.showInGnb,
    }));

    const draftGlobals = (draft.globalSettings ?? {}) as Record<string, unknown>;
    const draftPopup = (draftGlobals.popup as Record<string, unknown> | undefined) ?? {};
    const extrasPopup = (extras.popup as Record<string, unknown> | undefined) ?? {};
    const siteName = String(draftGlobals.siteName ?? project.name).trim() || project.name;
    const phone = String(draftGlobals.phone ?? extras.phone ?? "").trim();
    const logoUrl = String(draftGlobals.logoUrl ?? "").trim();
    const navSubtitle = String(draftGlobals.navSubtitle ?? "").trim();
    const globals = {
      ...draftGlobals,
      ...extras,
      // 현장명·전화·로고·상단 보조 문구는 프로젝트/draft를 유지한다. 샘플 extras로 덮지 않는다.
      siteName,
      phone,
      logoUrl: logoUrl || String(extras.logoUrl ?? ""),
      navSubtitle: navSubtitle || String(extras.navSubtitle ?? ""),
      popup: {
        ...draftPopup,
        ...extrasPopup,
        // 꺼 둔 팝업을 샘플 적용으로 다시 켜지 않는다. 카피·이미지만 맞춘다.
        enabled: draftPopup.enabled === true,
      },
    };

    const formSettings = {
      ...((draft.formSettings ?? {}) as Record<string, unknown>),
      intro: SAMPLE_LEAD_INTRO,
    };

    const toInsert: PageSection[] = [];
    let toUpdate: PageSection[] = [];

    if (asSections.length === 0) {
      // 섹션이 비어 있으면 템플릿을 만들고 INSERT한다. (UPDATE만 하면 0행이라 랜딩이 비어 남는다.)
      toInsert.push(...createTemplateSections("foreon", project.id, globals).map(clampLaunchExcludedSection));
    } else {
      toUpdate = applySampleCopy(asSections, globals).map(clampLaunchExcludedSection);
      const originalTypes = new Set(asSections.filter((section) => section.isOriginal).map((section) => section.sectionType));
      const usedAnchors = new Set(asSections.map((section) => section.anchorId));
      let sortOrder = Math.max(0, ...asSections.map((section) => section.sortOrder)) + 1;
      for (const section of createTemplateSections("foreon", project.id, globals)) {
        if (!section.isOriginal || originalTypes.has(section.sectionType) || usedAnchors.has(section.anchorId)) continue;
        toInsert.push(clampLaunchExcludedSection({ ...section, sortOrder }));
        usedAnchors.add(section.anchorId);
        sortOrder += 1;
      }
    }

    for (const section of toUpdate) {
      await db
        .update(projectSections)
        .set({
          title: section.title,
          contentJson: section.content,
          settingsJson: section.settings,
          gnbLabel: section.gnbLabel,
          anchorId: section.anchorId,
          isVisible: section.isVisible,
          showInGnb: section.showInGnb,
          updatedAt: new Date(),
        })
        .where(eq(projectSections.id, section.id));
    }

    if (toInsert.length > 0) {
      await db.insert(projectSections).values(toInsert.map((section) => toRow(project, section)));
    }

    await db
      .update(projectDrafts)
      .set({
        globalSettings: globals,
        formSettings,
        revision: draft.revision + 1,
        updatedAt: new Date(),
      })
      .where(eq(projectDrafts.projectId, project.id));

    await db
      .update(projects)
      .set({
        name: siteName,
        hasUnpublishedChanges: true,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, project.id));

    updated += 1;
    console.log(`filled ${project.publicSlug}${toInsert.length ? ` (+${toInsert.length} sections)` : ""}`);
  }

  console.log(`done: ${updated} projects`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
