import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { advertiserRecipients, leads, notificationJobs, organizationMembers, projects, userProfiles } from "@/lib/db/schema";
import { appConfig } from "@/lib/config";
import { plusDays } from "@/lib/datetime";
import { writeAudit } from "@/modules/audit/service";
import { notificationProvider } from "@/lib/notifications";
import { displayPhone } from "@/lib/validation/phone";

export async function processNotificationJobs(limit = 20) {
  const jobs = await db
    .select()
    .from(notificationJobs)
    .where(and(eq(notificationJobs.status, "QUEUED"), lte(notificationJobs.scheduledAt, new Date())))
    .limit(limit);

  for (const job of jobs) {
    await db
      .update(notificationJobs)
      .set({ status: "SENDING", attemptCount: job.attemptCount + 1, updatedAt: new Date() })
      .where(eq(notificationJobs.id, job.id));
    const payload = job.payloadJson as Record<string, string>;
    try {
      let result;
      if (job.eventType === "LEAD_REGISTERED") {
        result = await notificationProvider.sendLeadNotification({
          channel: job.channel as "KAKAO_ALIMTALK" | "EMAIL",
          to: payload.to,
          projectName: payload.projectName,
          leadName: payload.leadName,
          leadPhone: payload.leadPhone,
          unitType: payload.unitType,
          inquiry: payload.inquiry,
          submittedAt: payload.submittedAt,
        });
      } else {
        result = await notificationProvider.sendExpiryNotification({
          channel: job.channel as "KAKAO_ALIMTALK" | "EMAIL",
          to: payload.to,
          projectName: payload.projectName,
          publicUrl: payload.publicUrl,
          expiresAt: payload.expiresAt,
          remainingDays: Number(payload.remainingDays ?? 7),
        });
      }
      if (result.ok) {
        await db
          .update(notificationJobs)
          .set({ status: "SENT", sentAt: new Date(), providerMessageId: result.providerMessageId, updatedAt: new Date() })
          .where(eq(notificationJobs.id, job.id));
      } else {
        await failJob(job.id, job.attemptCount + 1, result.error ?? "provider_error");
      }
    } catch (error) {
      await failJob(job.id, job.attemptCount + 1, error instanceof Error ? error.message : "unknown");
    }
  }
  return jobs.length;
}

async function failJob(id: string, attempts: number, message: string) {
  const redacted = message.replace(/01[016789]\d{7,8}/g, "01********");
  const status = attempts >= 5 ? "FAILED" : "QUEUED";
  await db
    .update(notificationJobs)
    .set({
      status,
      errorMessageRedacted: redacted,
      scheduledAt: status === "QUEUED" ? new Date(Date.now() + 2 ** attempts * 1000) : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(notificationJobs.id, id));
}

export async function retryNotification(organizationId: string, jobId: string, actorUserId: string) {
  await db
    .update(notificationJobs)
    .set({ status: "QUEUED", scheduledAt: new Date(), updatedAt: new Date() })
    .where(and(eq(notificationJobs.id, jobId), eq(notificationJobs.organizationId, organizationId)));
  await writeAudit({
    organizationId,
    actorUserId,
    action: "notification.retry",
    resourceType: "notification_job",
    resourceId: jobId,
  });
}

export async function enqueueExpiryNotices() {
    const due = await db
      .select()
      .from(projects)
      .where(
        sql`${projects.status} = 'PUBLISHED' and ${projects.expiresAt} is not null and ${projects.expiresAt} > now() and ${projects.expiresAt} <= ${plusDays(new Date(), appConfig.expiryNoticeDaysBefore)}`,
      );

  for (const project of due) {
    const publicUrl = `${appConfig.publicUrl}/${project.publicSlug}`;
    const expiresAt = project.expiresAt!.toISOString();
    const recipients = await db
      .select()
      .from(advertiserRecipients)
      .where(
        and(
          eq(advertiserRecipients.projectId, project.id),
          eq(advertiserRecipients.isActive, true),
          eq(advertiserRecipients.verificationStatus, "VERIFIED"),
          eq(advertiserRecipients.receiveExpiryAlerts, true),
        ),
      );
    for (const recipient of recipients) {
      const to = recipient.preferredChannel === "EMAIL" ? recipient.email : recipient.phone;
      if (!to) continue;
      await db
        .insert(notificationJobs)
        .values({
          organizationId: project.organizationId,
          projectId: project.id,
          recipientId: recipient.id,
          eventType: "EXPIRY_NOTICE",
          channel: recipient.preferredChannel,
          payloadJson: {
            to,
            projectName: project.name,
            publicUrl,
            expiresAt,
            remainingDays: String(appConfig.expiryNoticeDaysBefore),
          },
          idempotencyKey: `expiry:${project.id}:${expiresAt}:${recipient.id}`,
        })
        .onConflictDoNothing();
    }

    if (project.assignedManagerId) {
      const [member] = await db
        .select({ email: userProfiles.email })
        .from(organizationMembers)
        .innerJoin(userProfiles, eq(userProfiles.id, organizationMembers.userId))
        .where(eq(organizationMembers.userId, project.assignedManagerId))
        .limit(1);
      if (member?.email) {
        await db
          .insert(notificationJobs)
          .values({
            organizationId: project.organizationId,
            projectId: project.id,
            eventType: "EXPIRY_NOTICE",
            channel: "EMAIL",
            payloadJson: {
              to: member.email,
              projectName: project.name,
              publicUrl,
              expiresAt,
              remainingDays: String(appConfig.expiryNoticeDaysBefore),
            },
            idempotencyKey: `expiry:${project.id}:${expiresAt}:manager`,
          })
          .onConflictDoNothing();
      }
    }
  }
}

export async function expireProjects() {
  const due = await db
    .select()
    .from(projects)
    .where(sql`${projects.status} = 'PUBLISHED' and ${projects.expiresAt} is not null and ${projects.expiresAt} <= now()`);
  for (const project of due) {
    await db
      .update(projects)
      .set({
        status: "EXPIRED",
        deletionScheduledAt: plusDays(new Date(), appConfig.purgeGraceDays),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, project.id));
    await writeAudit({
      organizationId: project.organizationId,
      action: "project.expire",
      resourceType: "project",
      resourceId: project.id,
    });
  }
}

export async function purgeProjects() {
  const due = await db
    .select()
    .from(projects)
    .where(
      sql`${projects.status} in ('EXPIRED','PENDING_DELETION') and ${projects.deletionScheduledAt} is not null and ${projects.deletionScheduledAt} <= now()`,
    );
  for (const project of due) {
    await db.update(projects).set({ status: "DELETED", updatedAt: new Date() }).where(eq(projects.id, project.id));
    await writeAudit({
      organizationId: project.organizationId,
      action: "project.purge",
      resourceType: "project",
      resourceId: project.id,
    });
  }
}

export async function purgePersonalData() {
  const due = await db.select().from(leads).where(sql`${leads.deletedAt} is null and ${leads.retentionUntil} is not null and ${leads.retentionUntil} <= now()`);
  for (const lead of due) {
    await db
      .update(leads)
      .set({
        name: "파기됨",
        phoneCiphertext: "purged",
        inquiryText: null,
        answersJson: {},
        deletedAt: new Date(),
      })
      .where(eq(leads.id, lead.id));
    await writeAudit({
      organizationId: lead.organizationId,
      action: "lead.purge",
      resourceType: "lead",
      resourceId: lead.id,
    });
  }
}

export { displayPhone };
