import { addHours, isAfter } from "date-fns";
import { and, count, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { memberInvitations, organizationMembers, userProfiles } from "@/lib/db/schema";
import { hashToken, randomToken } from "@/lib/crypto/pii";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { revokeUserSessions } from "@/lib/auth/session";
import { ApiError } from "@/lib/errors";
import { INVITE_TTL_HOURS } from "@/lib/constants";
import { notificationProvider } from "@/lib/notifications";
import { writeAudit } from "@/modules/audit/service";
import { appConfig } from "@/lib/config";
import { isEmail } from "@/lib/validation/phone";
import type { MemberRole } from "@/types";

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
    throw new ApiError("VALIDATION_ERROR", "올바른 이메일을 입력해 주세요.", 400, "email");
  }

  const existingUser = await db.select().from(userProfiles).where(eq(userProfiles.email, email)).limit(1);
  if (existingUser[0]) {
    const existingMember = await db
      .select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, input.organizationId), eq(organizationMembers.userId, existingUser[0].id)))
      .limit(1);
    if (existingMember[0] && existingMember[0].status !== "EXPIRED") {
      throw new ApiError("CONFLICT", "이미 초대되었거나 소속된 계정입니다.");
    }
  }

  const token = randomToken();
  await db.insert(memberInvitations).values({
    organizationId: input.organizationId,
    email,
    name: input.name.trim(),
    role: input.role,
    tokenHash: hashToken(token),
    invitedBy: input.actorUserId,
    expiresAt: addHours(new Date(), INVITE_TTL_HOURS),
  });

  if (!existingUser[0]) {
    const [user] = await db
      .insert(userProfiles)
      .values({ email, name: input.name.trim(), status: "INVITED" })
      .returning();
    await db.insert(organizationMembers).values({
      organizationId: input.organizationId,
      userId: user.id,
      role: input.role,
      status: "INVITED",
      invitedBy: input.actorUserId,
    });
  }

  const inviteUrl = `${appConfig.adminUrl}/invite/${token}`;
  await notificationProvider.sendInviteEmail({
    to: email,
    inviteUrl,
    organizationName: "워크스페이스",
  });
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "member.invite",
    resourceType: "member_invitation",
    metadata: { email },
  });
  return { inviteUrl: appConfig.env === "local" ? inviteUrl : undefined };
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
    throw new ApiError("NOT_FOUND", "유효하지 않은 초대입니다.", 404);
  }
  if (isAfter(new Date(), invite.expiresAt)) {
    const [invitedUser] = await db.select().from(userProfiles).where(eq(userProfiles.email, invite.email)).limit(1);
    if (invitedUser) {
      await db
        .update(organizationMembers)
        .set({ status: "EXPIRED", updatedAt: new Date() })
        .where(and(eq(organizationMembers.userId, invitedUser.id), eq(organizationMembers.organizationId, invite.organizationId)));
    }
    throw new ApiError("VALIDATION_ERROR", "초대 링크가 만료되었습니다. 관리자에게 재초대를 요청해 주세요.");
  }

  const [user] = await db.select().from(userProfiles).where(eq(userProfiles.email, invite.email)).limit(1);
  if (!user) {
    throw new ApiError("NOT_FOUND", "초대 대상 계정을 찾을 수 없습니다.", 404);
  }
  await db
    .update(userProfiles)
    .set({ passwordHash: await hashPassword(password), status: "ACTIVE", name: invite.name, updatedAt: new Date() })
    .where(eq(userProfiles.id, user.id));
  await db
    .update(organizationMembers)
    .set({ status: "ACTIVE", role: invite.role, updatedAt: new Date() })
    .where(and(eq(organizationMembers.userId, user.id), eq(organizationMembers.organizationId, invite.organizationId)));
  await db.update(memberInvitations).set({ acceptedAt: new Date() }).where(eq(memberInvitations.id, invite.id));
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
  if (!member) throw new ApiError("NOT_FOUND", "직원을 찾을 수 없습니다.", 404);
  if (member.role === "SYSTEM_ADMIN") {
    const remaining = await countActiveAdmins(input.organizationId, member.userId);
    if (remaining < 1) {
      throw new ApiError("FORBIDDEN", "마지막 활성 시스템 관리자는 정지할 수 없습니다.");
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

export async function reactivateMember(input: { organizationId: string; actorUserId: string; memberId: string }) {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(and(eq(organizationMembers.id, input.memberId), eq(organizationMembers.organizationId, input.organizationId)))
    .limit(1);
  if (!member) throw new ApiError("NOT_FOUND", "직원을 찾을 수 없습니다.", 404);
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
  if (!member) throw new ApiError("NOT_FOUND", "직원을 찾을 수 없습니다.", 404);
  if (member.role === "SYSTEM_ADMIN" && input.role !== "SYSTEM_ADMIN") {
    const remaining = await countActiveAdmins(input.organizationId, member.userId);
    if (remaining < 1) {
      throw new ApiError("FORBIDDEN", "마지막 활성 시스템 관리자의 권한은 해제할 수 없습니다.");
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
    .where(and(eq(memberInvitations.id, input.invitationId), eq(memberInvitations.organizationId, input.organizationId), isNull(memberInvitations.acceptedAt)));
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "member.invite_revoke",
    resourceType: "member_invitation",
    resourceId: input.invitationId,
  });
}
