import { addHours, isAfter } from "date-fns";
import { and, count, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { memberInvitations, organizationMembers, userProfiles } from "@/lib/db/schema";
import { hashToken, randomToken } from "@/lib/crypto/pii";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { revokeUserSessions } from "@/lib/auth/session";
import { ApiError } from "@/lib/errors";
import { INVITE_TTL_HOURS } from "@/lib/constants";
import { notificationProvider, shouldExposeSandboxLinks } from "@/lib/notifications";
import { writeAudit } from "@/modules/audit/service";
import { appConfig } from "@/lib/config";
import { isEmail } from "@/lib/validation/phone";
import type { MemberRole } from "@/types";
import { orgText } from "@/modules/admin/org-copy";

export async function listMembers(organizationId: string) {
  return db
    .select({
      memberId: organizationMembers.id,
      userId: userProfiles.id,
      email: userProfiles.email,
      name: userProfiles.name,
      role: organizationMembers.role,
      status: organizationMembers.status,
      lastLoginAt: userProfiles.lastLoginAt,
      createdAt: organizationMembers.createdAt,
    })
    .from(organizationMembers)
    .innerJoin(userProfiles, eq(userProfiles.id, organizationMembers.userId))
    .where(eq(organizationMembers.organizationId, organizationId));
}

export async function inviteMember(input: {
  organizationId: string;
  actorUserId: string;
  email: string;
  name: string;
  role: MemberRole;
}) {
  const email = input.email.trim().toLowerCase();
  if (!isEmail(email)) {
    throw new ApiError("VALIDATION_ERROR", orgText("emailInvalid"), 400, "email");
  }

  const existingUser = await db.select().from(userProfiles).where(eq(userProfiles.email, email)).limit(1);
  if (existingUser[0]) {
    const existingMember = await db
      .select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, input.organizationId), eq(organizationMembers.userId, existingUser[0].id)))
      .limit(1);
    if (existingMember[0] && existingMember[0].status !== "EXPIRED") {
      throw new ApiError("CONFLICT", orgText("memberAlreadyInvited"));
    }
  }

  const token = randomToken();
  await db.transaction(async (tx) => {
    await tx
      .update(memberInvitations)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(memberInvitations.organizationId, input.organizationId),
          eq(memberInvitations.email, email),
          isNull(memberInvitations.acceptedAt),
          isNull(memberInvitations.revokedAt),
        ),
      );

    await tx.insert(memberInvitations).values({
      organizationId: input.organizationId,
      email,
      name: input.name.trim(),
      role: input.role,
      tokenHash: hashToken(token),
      invitedBy: input.actorUserId,
      expiresAt: addHours(new Date(), INVITE_TTL_HOURS),
    });

    if (!existingUser[0]) {
      const [user] = await tx
        .insert(userProfiles)
        .values({ email, name: input.name.trim(), status: "INVITED" })
        .returning();
      await tx.insert(organizationMembers).values({
        organizationId: input.organizationId,
        userId: user.id,
        role: input.role,
        status: "INVITED",
        invitedBy: input.actorUserId,
      });
    } else if (existingUser[0]) {
      await tx
        .update(organizationMembers)
        .set({ status: "INVITED", role: input.role, invitedBy: input.actorUserId, updatedAt: new Date() })
        .where(
          and(eq(organizationMembers.organizationId, input.organizationId), eq(organizationMembers.userId, existingUser[0].id)),
        );
      await tx.update(userProfiles).set({ name: input.name.trim(), status: "INVITED", updatedAt: new Date() }).where(eq(userProfiles.id, existingUser[0].id));
    }
  });

  const inviteUrl = `${appConfig.adminUrl}/invite/${token}`;
  await notificationProvider.sendInviteEmail({
    to: email,
    inviteUrl,
    organizationName: orgText("workspaceName"),
  });
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "member.invite",
    resourceType: "member_invitation",
    metadata: { email },
  });
  return { inviteUrl: shouldExposeSandboxLinks() ? inviteUrl : undefined };
}

/** 초대 수락 전 이메일 표시용(패스워드 매니저 autocomplete). 민감 정보는 이메일만. */
export async function peekInvitation(token: string) {
  if (!token.trim()) return null;
  const [invite] = await db
    .select({ email: memberInvitations.email, name: memberInvitations.name, expiresAt: memberInvitations.expiresAt, revokedAt: memberInvitations.revokedAt, acceptedAt: memberInvitations.acceptedAt })
    .from(memberInvitations)
    .where(eq(memberInvitations.tokenHash, hashToken(token)))
    .limit(1);
  if (!invite || invite.revokedAt || invite.acceptedAt || isAfter(new Date(), invite.expiresAt)) return null;
  return { email: invite.email, name: invite.name };
}

export async function acceptInvitation(token: string, password: string) {
  const strength = validatePasswordStrength(password);
  if (strength) {
    throw new ApiError("VALIDATION_ERROR", strength, 400, "password");
  }
  const [invite] = await db
    .select()
    .from(memberInvitations)
    .where(eq(memberInvitations.tokenHash, hashToken(token)))
    .limit(1);
  if (!invite || invite.revokedAt || invite.acceptedAt) {
    throw new ApiError("NOT_FOUND", orgText("inviteInvalid"), 404);
  }
  if (isAfter(new Date(), invite.expiresAt)) {
    const [invitedUser] = await db.select().from(userProfiles).where(eq(userProfiles.email, invite.email)).limit(1);
    if (invitedUser) {
      await db
        .update(organizationMembers)
        .set({ status: "EXPIRED", updatedAt: new Date() })
        .where(and(eq(organizationMembers.userId, invitedUser.id), eq(organizationMembers.organizationId, invite.organizationId)));
    }
    throw new ApiError("VALIDATION_ERROR", orgText("inviteExpired"));
  }

  const [claimed] = await db
    .update(memberInvitations)
    .set({ acceptedAt: new Date() })
    .where(and(eq(memberInvitations.id, invite.id), isNull(memberInvitations.acceptedAt), isNull(memberInvitations.revokedAt)))
    .returning();
  if (!claimed) {
    throw new ApiError("NOT_FOUND", orgText("inviteInvalid"), 404);
  }

  const [user] = await db.select().from(userProfiles).where(eq(userProfiles.email, invite.email)).limit(1);
  if (!user) {
    throw new ApiError("NOT_FOUND", orgText("inviteUserMissing"), 404);
  }
  await db
    .update(userProfiles)
    .set({ passwordHash: await hashPassword(password), status: "ACTIVE", name: invite.name, updatedAt: new Date() })
    .where(eq(userProfiles.id, user.id));
  await db
    .update(organizationMembers)
    .set({ status: "ACTIVE", role: invite.role, updatedAt: new Date() })
    .where(and(eq(organizationMembers.userId, user.id), eq(organizationMembers.organizationId, invite.organizationId)));
  await writeAudit({
    organizationId: invite.organizationId,
    actorUserId: user.id,
    action: "member.activate",
    resourceType: "user",
    resourceId: user.id,
  });
  return user;
}

export async function countActiveAdmins(organizationId: string, exceptUserId?: string) {
  const rows = await db
    .select({ value: count() })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.role, "SYSTEM_ADMIN"),
        eq(organizationMembers.status, "ACTIVE"),
        exceptUserId ? ne(organizationMembers.userId, exceptUserId) : undefined,
      ),
    );
  return rows[0]?.value ?? 0;
}

export async function suspendMember(input: {
  organizationId: string;
  actorUserId: string;
  memberId: string;
}) {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(and(eq(organizationMembers.id, input.memberId), eq(organizationMembers.organizationId, input.organizationId)))
    .limit(1);
  if (!member) throw new ApiError("NOT_FOUND", orgText("memberNotFound"), 404);
  if (member.role === "SYSTEM_ADMIN") {
    const remaining = await countActiveAdmins(input.organizationId, member.userId);
    if (remaining < 1) {
      throw new ApiError("FORBIDDEN", orgText("memberLastAdminSuspend"));
    }
  }
  await db
    .update(organizationMembers)
    .set({ status: "SUSPENDED", suspendedAt: new Date(), suspendedBy: input.actorUserId, updatedAt: new Date() })
    .where(eq(organizationMembers.id, member.id));
  await db.update(userProfiles).set({ status: "SUSPENDED", updatedAt: new Date() }).where(eq(userProfiles.id, member.userId));
  await revokeUserSessions(member.userId);
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "member.suspend",
    resourceType: "member",
    resourceId: member.id,
  });
}

export async function reactivateMember(input: {
  organizationId: string;
  actorUserId: string;
  memberId: string;
}) {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(and(eq(organizationMembers.id, input.memberId), eq(organizationMembers.organizationId, input.organizationId)))
    .limit(1);
  if (!member) throw new ApiError("NOT_FOUND", orgText("memberNotFound"), 404);
  await db
    .update(organizationMembers)
    .set({ status: "ACTIVE", suspendedAt: null, suspendedBy: null, updatedAt: new Date() })
    .where(eq(organizationMembers.id, member.id));
  await db.update(userProfiles).set({ status: "ACTIVE", updatedAt: new Date() }).where(eq(userProfiles.id, member.userId));
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "member.reactivate",
    resourceType: "member",
    resourceId: member.id,
  });
}

export async function changeRole(input: {
  organizationId: string;
  actorUserId: string;
  memberId: string;
  role: MemberRole;
}) {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(and(eq(organizationMembers.id, input.memberId), eq(organizationMembers.organizationId, input.organizationId)))
    .limit(1);
  if (!member) throw new ApiError("NOT_FOUND", orgText("memberNotFound"), 404);
  if (member.role === "SYSTEM_ADMIN" && input.role !== "SYSTEM_ADMIN") {
    const remaining = await countActiveAdmins(input.organizationId, member.userId);
    if (remaining < 1) {
      throw new ApiError("FORBIDDEN", orgText("memberLastAdminDemote"));
    }
  }
  await db.update(organizationMembers).set({ role: input.role, updatedAt: new Date() }).where(eq(organizationMembers.id, member.id));
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "member.role_change",
    resourceType: "member",
    resourceId: member.id,
    metadata: { role: input.role },
  });
}

export async function revokeInvitation(input: { organizationId: string; actorUserId: string; invitationId: string }) {
  await db
    .update(memberInvitations)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(memberInvitations.id, input.invitationId),
        eq(memberInvitations.organizationId, input.organizationId),
        isNull(memberInvitations.acceptedAt),
      ),
    );
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "member.invite_revoke",
    resourceType: "member_invitation",
    resourceId: input.invitationId,
  });
}
