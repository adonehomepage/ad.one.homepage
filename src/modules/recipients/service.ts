import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { advertiserRecipients, notificationJobs } from "@/lib/db/schema";
import { ApiError } from "@/lib/errors";
import { appConfig } from "@/lib/config";
import { isEmail, isKoreanMobile, normalizePhone } from "@/lib/validation/phone";
import { hashToken, randomToken } from "@/lib/crypto/pii";
import { notificationProvider, shouldExposeSandboxLinks } from "@/lib/notifications";
import { writeAudit } from "@/modules/audit/service";
import { getProject } from "@/modules/projects/service";
import { assertRecipientLimit } from "@/modules/recipients/rules";
import type { NotificationChannel } from "@/types";
import { orgText } from "@/modules/admin/org-copy";

export { assertRecipientLimit };

export async function listRecipients(organizationId: string, projectId: string) {
  await getProject(organizationId, projectId);
  return db
    .select()
    .from(advertiserRecipients)
    .where(and(eq(advertiserRecipients.projectId, projectId), eq(advertiserRecipients.organizationId, organizationId)));
}

export async function addRecipient(input: {
  organizationId: string;
  projectId: string;
  userId: string;
  name: string;
  companyName?: string;
  phone?: string;
  email?: string;
  preferredChannel: NotificationChannel;
}) {
  await getProject(input.organizationId, input.projectId);
  const active = await db
    .select({ count: sql<number>`count(*)` })
    .from(advertiserRecipients)
    .where(
      and(
        eq(advertiserRecipients.projectId, input.projectId),
        eq(advertiserRecipients.isActive, true),
      ),
    );
  assertRecipientLimit(Number(active[0]?.count ?? 0));

  if (input.preferredChannel === "EMAIL") {
    if (!input.email || !isEmail(input.email)) {
      throw new ApiError("VALIDATION_ERROR", orgText("recipientEmailRequired"), 400, "email");
    }
  } else if (!input.phone || !isKoreanMobile(input.phone)) {
    throw new ApiError("VALIDATION_ERROR", orgText("recipientPhoneRequired"), 400, "phone");
  }

  const token = randomToken();
  const [row] = await db
    .insert(advertiserRecipients)
    .values({
      organizationId: input.organizationId,
      projectId: input.projectId,
      name: input.name.trim(),
      companyName: input.companyName ?? null,
      phone: input.phone ? normalizePhone(input.phone) : null,
      email: input.email?.trim().toLowerCase() ?? null,
      preferredChannel: input.preferredChannel,
      verificationStatus: "PENDING",
      verificationTokenHash: hashToken(token),
      createdBy: input.userId,
      updatedBy: input.userId,
    })
    .returning();

  const verifyUrl = `${appConfig.adminUrl}/verify-recipient?token=${token}`;
  await notificationProvider.sendRecipientVerify({
    channel: input.preferredChannel === "EMAIL" ? "EMAIL" : "KAKAO_ALIMTALK",
    to: input.preferredChannel === "EMAIL" ? input.email! : input.phone!,
    verifyUrl,
  });
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.userId,
    action: "recipient.create",
    resourceType: "advertiser_recipient",
    resourceId: row.id,
  });
  return { recipient: row, verifyUrl: shouldExposeSandboxLinks() ? verifyUrl : undefined };
}

export async function verifyRecipient(token: string) {
  const [row] = await db
    .select()
    .from(advertiserRecipients)
    .where(eq(advertiserRecipients.verificationTokenHash, hashToken(token)))
    .limit(1);
  if (!row) throw new ApiError("NOT_FOUND", orgText("recipientVerifyInvalid"), 404);
  await db
    .update(advertiserRecipients)
    .set({ verificationStatus: "VERIFIED", verifiedAt: new Date(), verificationTokenHash: null, updatedAt: new Date() })
    .where(eq(advertiserRecipients.id, row.id));
  await writeAudit({
    organizationId: row.organizationId,
    action: "recipient.verify",
    resourceType: "advertiser_recipient",
    resourceId: row.id,
  });
  return row;
}

export async function updateRecipient(input: {
  organizationId: string;
  projectId: string;
  recipientId: string;
  userId: string;
  patch: Partial<{
    name: string;
    companyName: string;
    phone: string;
    email: string;
    preferredChannel: NotificationChannel;
    isActive: boolean;
    receiveLeadAlerts: boolean;
    receiveExpiryAlerts: boolean;
  }>;
}) {
  const [row] = await db
    .select()
    .from(advertiserRecipients)
    .where(
      and(
        eq(advertiserRecipients.id, input.recipientId),
        eq(advertiserRecipients.projectId, input.projectId),
        eq(advertiserRecipients.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  if (!row) throw new ApiError("NOT_FOUND", orgText("recipientNotFound"), 404);

  const contactChanged =
    (input.patch.phone && normalizePhone(input.patch.phone) !== row.phone) ||
    (input.patch.email && input.patch.email.trim().toLowerCase() !== row.email);
  const channel = input.patch.preferredChannel ?? (row.preferredChannel as NotificationChannel);
  const nextPhone = input.patch.phone ? normalizePhone(input.patch.phone) : row.phone;
  const nextEmail = input.patch.email ? input.patch.email.trim().toLowerCase() : row.email;

  if (input.patch.isActive === true && !row.isActive) {
    const active = await db
      .select({ count: sql<number>`count(*)` })
      .from(advertiserRecipients)
      .where(and(eq(advertiserRecipients.projectId, input.projectId), eq(advertiserRecipients.isActive, true)));
    assertRecipientLimit(Number(active[0]?.count ?? 0));
  }

  const token = contactChanged ? randomToken() : null;
  await db
    .update(advertiserRecipients)
    .set({
      name: input.patch.name ?? row.name,
      companyName: input.patch.companyName ?? row.companyName,
      phone: nextPhone,
      email: nextEmail,
      preferredChannel: channel,
      isActive: input.patch.isActive ?? row.isActive,
      receiveLeadAlerts: input.patch.receiveLeadAlerts ?? row.receiveLeadAlerts,
      receiveExpiryAlerts: input.patch.receiveExpiryAlerts ?? row.receiveExpiryAlerts,
      verificationStatus: contactChanged ? "PENDING" : row.verificationStatus,
      verifiedAt: contactChanged ? null : row.verifiedAt,
      verificationTokenHash: contactChanged && token ? hashToken(token) : row.verificationTokenHash,
      updatedBy: input.userId,
      updatedAt: new Date(),
    })
    .where(eq(advertiserRecipients.id, row.id));

  if (contactChanged && token) {
    const to = channel === "EMAIL" ? nextEmail : nextPhone;
    if (to) {
      await notificationProvider.sendRecipientVerify({
        channel: channel === "EMAIL" ? "EMAIL" : "KAKAO_ALIMTALK",
        to,
        verifyUrl: `${appConfig.adminUrl}/verify-recipient?token=${token}`,
      });
    }
  }

  if (input.patch.isActive === false) {
    await db
      .update(notificationJobs)
      .set({ status: "CANCELLED", errorMessageRedacted: "recipient_inactive", updatedAt: new Date() })
      .where(
        and(
          eq(notificationJobs.recipientId, row.id),
          eq(notificationJobs.status, "QUEUED"),
        ),
      );
  }

  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.userId,
    action: "recipient.update",
    resourceType: "advertiser_recipient",
    resourceId: row.id,
  });
}

export async function deactivateRecipient(input: {
  organizationId: string;
  projectId: string;
  recipientId: string;
  userId: string;
}) {
  await updateRecipient({ ...input, patch: { isActive: false } });
}
