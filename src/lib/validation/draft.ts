import { z } from "zod";
import { SECTION_TYPES } from "@/lib/constants";
import { orgText } from "@/modules/admin/org-copy";
import type { PageSection } from "@/types";

const MAX_SECTIONS = 80;
const MAX_JSON_CHARS = 180_000;

const settingsRecord = z.record(z.string(), z.unknown()).refine((value) => JSON.stringify(value).length <= MAX_JSON_CHARS, {
  message: orgText("draftPayloadTooLarge"),
});

export const pageSectionSchema: z.ZodType<PageSection> = z.object({
  id: z.string().trim().min(1).max(80),
  projectId: z.string().trim().min(1).max(80),
  rootSectionId: z.string().trim().min(1).max(80),
  sourceSectionId: z.string().trim().min(1).max(80).nullable(),
  sectionType: z.enum(SECTION_TYPES),
  title: z.string().max(200),
  content: settingsRecord,
  settings: settingsRecord,
  isVisible: z.boolean(),
  showInGnb: z.boolean(),
  gnbLabel: z.string().max(80),
  anchorId: z.string().max(80),
  sortOrder: z.number().int().min(0).max(500),
  isOriginal: z.boolean(),
  isRequired: z.boolean(),
});

export const draftPatchSchema = z.object({
  expectedRevision: z.number({ error: orgText("draftInvalidRequest") }).int().nonnegative(),
  globalSettings: settingsRecord.optional(),
  formSettings: settingsRecord.optional(),
  seoSettings: settingsRecord.optional(),
  privacySettings: settingsRecord.optional(),
  sections: z.array(pageSectionSchema).max(MAX_SECTIONS, orgText("draftTooManySections")).optional(),
});
