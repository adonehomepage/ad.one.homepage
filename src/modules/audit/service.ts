import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export async function writeAudit(input: {
  organizationId: string;
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}) {
  await db.insert(auditLogs).values({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    metadataJson: input.metadata ?? {},
    ipEvidence: input.ip ?? null,
  });
}
