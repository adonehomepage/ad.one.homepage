import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { addMonths } from "date-fns";
import { db } from "@/lib/db";
import { advertiserRecipients, leadConsents, leadNotes, leads, notificationJobs, projects } from "@/lib/db/schema";
import { ApiError } from "@/lib/errors";
import { appConfig } from "@/lib/config";
import { decryptPii, encryptPii, phoneLookupHash, sha256 } from "@/lib/crypto/pii";
import { displayPhone, isKoreanMobile, normalizePhone } from "@/lib/validation/phone";
import { orgText } from "@/modules/admin/org-copy";
import { writeAudit } from "@/modules/audit/service";
import { csvCell } from "@/modules/leads/csv";
import { getPublishedBySlug } from "@/modules/publishing/service";
import { getProject } from "@/modules/projects/service";
import type { PageSnapshot } from "@/types";

export { csvCell } from "@/modules/leads/csv";

function chrome(settings: Record<string, unknown> | undefined, key: string, fallback: string) {
  return String(settings?.[key] ?? "").trim() || fallback;
}

function noticeLabel(snapshot: PageSnapshot, key: keyof NonNullable<PageSnapshot["privacy"]["noticeLabels"]>, fallback: string, chromeKey: string) {
  return String(snapshot.privacy.noticeLabels?.[key] ?? "").trim() || chrome(snapshot.globalSettings, chromeKey, fallback);
}

function notificationDetails(fields: PageSnapshot["formSettings"]["fields"], answers: Record<string, unknown>) {
  return fields
    .filter((field) => field.includeInNotification !== false && field.type !== "name" && field.type !== "phone")
    .map((field) => {
      const value = answers[field.key];
      const text = Array.isArray(value) ? value.map(String).filter(Boolean).join(", ") : String(value ?? "").trim();
      return text ? `${field.label}: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function consentText(snapshot: PageSnapshot, type: "COLLECTION" | "THIRD_PARTY_PROVISION") {
  const p = snapshot.privacy;
  if (type === "COLLECTION") {
    return [
      `${noticeLabel(snapshot, "controller", "수집 주체", "noticeController")}: ${p.collectingControllerName}`,
      `${noticeLabel(snapshot, "purpose", "수집 목적", "noticePurposeCollect")}: ${p.collectionPurpose}`,
      `${noticeLabel(snapshot, "fields", "수집 항목", "noticeFieldsCollect")}: ${p.collectedFields.join(", ")}`,
      `${noticeLabel(snapshot, "retention", "보유 기간", "noticeRetention")}: ${p.retentionDescription}`,
      `${noticeLabel(snapshot, "refusal", "거부 시 영향", "noticeRefusalImpact")}: ${p.refusalConsequence}`,
    ].join("\n");
  }
  return [
    `${chrome(snapshot.globalSettings, "noticeThirdRecipient", "제공받는 자")}: ${p.thirdPartyRecipientName ?? ""}`,
    `${noticeLabel(snapshot, "purpose", "이용 목적", "noticePurposeUse")}: ${p.thirdPartyPurpose ?? ""}`,
    `${noticeLabel(snapshot, "fields", "제공 항목", "noticeFieldsProvide")}: ${(p.thirdPartyFields ?? []).join(", ")}`,
    `${noticeLabel(snapshot, "retention", "보유 기간", "noticeRetention")}: ${p.thirdPartyRetentionDescription ?? ""}`,
  ].join("\n");
}

export async function submitPublicLead(input: {
  slug: string;
  name: string;
  phone: string;
  answers: Record<string, unknown>;
  consents: { collection: boolean; thirdParty?: boolean };
  utm?: Record<string, string | undefined>;
  referrer?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  if (!appConfig.leadCollectionEnabled) {
    throw new ApiError("LEAD_COLLECTION_DISABLED", orgText("leadCollectionDisabled"));
  }
  const published = await getPublishedBySlug(input.slug.trim().normalize("NFC").toLowerCase());
  if (!published) {
    throw new ApiError("PROJECT_EXPIRED", orgText("leadProjectClosed"), 403);
  }
  const snapshot = published.snapshot;
  const settings = snapshot.globalSettings;
  if (!input.consents.collection) {
    throw new ApiError("CONSENT_REQUIRED", chrome(settings, "formCollectionErrorPh", "개인정보 수집 및 이용에 동의해 주세요."));
  }
  if (snapshot.privacy.thirdPartyProvisionEnabled && !input.consents.thirdParty) {
    throw new ApiError("CONSENT_REQUIRED", chrome(settings, "formThirdErrorPh", "개인정보 제3자 제공에 동의해 주세요."));
  }
  const name = input.name.trim();
  if (!name) throw new ApiError("VALIDATION_ERROR", chrome(settings, "formNameErrorPh", "이름을 입력해 주세요."), 400, "name");
  if (!isKoreanMobile(input.phone)) {
    throw new ApiError("VALIDATION_ERROR", chrome(settings, "formPhoneErrorPh", "올바른 휴대전화 번호를 입력해 주세요."), 400, "phone");
  }
  const phone = normalizePhone(input.phone);
  const lookup = phoneLookupHash(phone);
  const recent = await db
    .select({ id: leads.id })
    .from(leads)
    .where(
      and(
        eq(leads.projectId, published.project.id),
        eq(leads.phoneLookupHash, lookup),
        gte(leads.submittedAt, new Date(Date.now() - 10 * 60 * 1000)),
      ),
    )
    .limit(1);

  const [lead] = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(leads)
      .values({
        organizationId: published.project.organizationId,
        projectId: published.project.id,
        publishedVersionId: published.version.id,
        name,
        phoneCiphertext: encryptPii(phone),
        phoneLookupHash: lookup,
        inquiryText: typeof input.answers.inquiry === "string" ? input.answers.inquiry : null,
        answersJson: input.answers,
        utmSource: input.utm?.utm_source ?? null,
        utmMedium: input.utm?.utm_medium ?? null,
        utmCampaign: input.utm?.utm_campaign ?? null,
        utmContent: input.utm?.utm_content ?? null,
        utmTerm: input.utm?.utm_term ?? null,
        referrer: input.referrer ?? null,
        possibleDuplicate: Boolean(recent[0]),
        retentionUntil: addMonths(new Date(), appConfig.leadRetentionMonths),
      })
      .returning();

    const collectionText = consentText(snapshot, "COLLECTION");
    await tx.insert(leadConsents).values({
      organizationId: published.project.organizationId,
      projectId: published.project.id,
      leadId: created.id,
      consentType: "COLLECTION",
      policyVersion: "v1",
      consentTextSnapshot: collectionText,
      consentTextHash: sha256(collectionText),
      ipEvidence: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    });
    if (snapshot.privacy.thirdPartyProvisionEnabled) {
      const third = consentText(snapshot, "THIRD_PARTY_PROVISION");
      await tx.insert(leadConsents).values({
        organizationId: published.project.organizationId,
        projectId: published.project.id,
        leadId: created.id,
        consentType: "THIRD_PARTY_PROVISION",
        policyVersion: "v1",
        consentTextSnapshot: third,
        consentTextHash: sha256(third),
        ipEvidence: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      });
    }

    const recipients = await tx
      .select()
      .from(advertiserRecipients)
      .where(
        and(
          eq(advertiserRecipients.projectId, published.project.id),
          eq(advertiserRecipients.isActive, true),
          eq(advertiserRecipients.verificationStatus, "VERIFIED"),
          eq(advertiserRecipients.receiveLeadAlerts, true),
        ),
      );

    for (const recipient of recipients) {
      const channel = recipient.preferredChannel;
      const to = channel === "EMAIL" ? recipient.email : recipient.phone;
      if (!to) continue;
      await tx.insert(notificationJobs).values({
        organizationId: published.project.organizationId,
        projectId: published.project.id,
        recipientId: recipient.id,
        leadId: created.id,
        eventType: "LEAD_REGISTERED",
        channel,
        payloadJson: {
          projectName: snapshot.projectName,
          leadName: name,
          leadPhone: displayPhone(phone),
          unitType: input.answers.unitType ?? null,
          inquiry: input.answers.inquiry ?? null,
          details: notificationDetails(snapshot.formSettings.fields, input.answers),
          submittedAt: created.submittedAt.toISOString(),
          purposeDisclaimer: orgText("leadPurposeDisclaimer"),
          to,
        },
        idempotencyKey: `lead:${created.id}:${recipient.id}`,
      });
    }
    return [created];
  });

  return { id: lead.id };
}

export async function listLeads(input: {
  organizationId: string;
  projectId?: string;
  q?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(Math.max(1, input.limit ?? 50), 500);
  const filters = [eq(leads.organizationId, input.organizationId), sql`${leads.deletedAt} is null`];
  if (input.projectId) filters.push(eq(leads.projectId, input.projectId));
  if (input.from) filters.push(gte(leads.submittedAt, input.from));
  if (input.to) filters.push(lte(leads.submittedAt, input.to));
  if (input.q) {
    const safeQ = input.q.replace(/[%_\\]/g, "");
    const nameMatch = ilike(leads.name, `%${safeQ}%`);
    const normalized = normalizePhone(input.q);
    if (isKoreanMobile(input.q) || /^\d{10,11}$/.test(normalized)) {
      try {
        filters.push(or(nameMatch, eq(leads.phoneLookupHash, phoneLookupHash(normalized)))!);
      } catch {
        filters.push(nameMatch);
      }
    } else {
      filters.push(nameMatch);
    }
  }

  const rows = await db
    .select({ lead: leads, projectName: projects.name, projectSlug: projects.publicSlug })
    .from(leads)
    .innerJoin(projects, eq(projects.id, leads.projectId))
    .where(and(...filters))
    .orderBy(desc(leads.submittedAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return rows.map((row) => ({
    ...row.lead,
    projectName: row.projectName,
    projectSlug: row.projectSlug,
    phone: displayPhone(decryptPii(row.lead.phoneCiphertext)),
    phoneCiphertext: undefined,
  }));
}

export async function getLead(organizationId: string, leadId: string, actorUserId: string) {
  const [row] = await db
    .select({ lead: leads, projectName: projects.name })
    .from(leads)
    .innerJoin(projects, eq(projects.id, leads.projectId))
    .where(and(eq(leads.id, leadId), eq(leads.organizationId, organizationId)))
    .limit(1);
  if (!row) throw new ApiError("NOT_FOUND", orgText("leadNotFound"), 404);
  const notes = await db.select().from(leadNotes).where(eq(leadNotes.leadId, leadId)).orderBy(desc(leadNotes.createdAt));
  const consents = await db.select().from(leadConsents).where(eq(leadConsents.leadId, leadId));
  const jobs = await db.select().from(notificationJobs).where(eq(notificationJobs.leadId, leadId));
  await writeAudit({
    organizationId,
    actorUserId,
    action: "lead.view",
    resourceType: "lead",
    resourceId: leadId,
  });
  return {
    ...row.lead,
    projectName: row.projectName,
    phone: displayPhone(decryptPii(row.lead.phoneCiphertext)),
    notes,
    consents,
    notifications: jobs.map((job) => ({ ...job, payloadJson: { eventType: job.eventType } })),
  };
}

export async function addLeadNote(input: {
  organizationId: string;
  leadId: string;
  authorId: string;
  content: string;
}) {
  const content = input.content.trim();
  if (!content) throw new ApiError("VALIDATION_ERROR", orgText("leadNoteEmpty"));
  if (content.length > 4000) throw new ApiError("VALIDATION_ERROR", orgText("leadNoteTooLong"));
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, input.leadId), eq(leads.organizationId, input.organizationId)))
    .limit(1);
  if (!lead) throw new ApiError("NOT_FOUND", orgText("leadNotFound"), 404);
  const [note] = await db
    .insert(leadNotes)
    .values({
      organizationId: input.organizationId,
      projectId: lead.projectId,
      leadId: lead.id,
      authorId: input.authorId,
      content,
    })
    .returning();
  return note;
}

export function formatLeadAnswers(answers: unknown) {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return [];
  const labels: Record<string, string> = {
    unitType: orgText("leadAnswerUnitType"),
    inquiry: orgText("leadAnswerInquiry"),
  };
  return Object.entries(answers as Record<string, unknown>).flatMap(([key, value]) => {
    const text = Array.isArray(value) ? value.map(String).filter(Boolean).join(", ") : String(value ?? "").trim();
    if (!text) return [];
    return [{ key, label: labels[key] ?? orgText("leadAnswerExtra"), text }];
  });
}

export async function exportLeads(input: { organizationId: string; projectId: string; actorUserId: string }) {
  await getProject(input.organizationId, input.projectId);
  const rows: Awaited<ReturnType<typeof listLeads>> = [];
  let page = 1;
  for (;;) {
    const batch = await listLeads({
      organizationId: input.organizationId,
      projectId: input.projectId,
      page,
      limit: 500,
    });
    rows.push(...batch);
    if (batch.length < 500) break;
    page += 1;
    if (page > 200) break;
  }
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "lead.export",
    resourceType: "project",
    resourceId: input.projectId,
    metadata: { count: rows.length },
  });
  const header = orgText("leadCsvHeader");
  const body = rows
    .map((row) =>
      [
        row.submittedAt.toISOString(),
        row.name,
        row.phone ?? "",
        row.inquiryText ?? "",
        formatLeadAnswers(row.answersJson).map((item) => `${item.label}: ${item.text}`).join(" / "),
        row.utmSource ?? "",
      ].map(csvCell).join(","),
    )
    .join("\n");
  return `${header}\n${body}`;
}
