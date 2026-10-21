import { cookies } from "next/headers";
import { addDays, isAfter, min } from "date-fns";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizationMembers, organizations, sessions, userProfiles } from "@/lib/db/schema";
import { hashToken, randomToken } from "@/lib/crypto/pii";
import { SESSION_ABSOLUTE_DAYS, SESSION_COOKIE_NAME, SESSION_TTL_DAYS } from "@/lib/constants";
import { isLocal } from "@/lib/deploy-env";
import type { MemberRole, MemberStatus } from "@/types";

export type AuthContext = {
  user: typeof userProfiles.$inferSelect;
  member: typeof organizationMembers.$inferSelect;
  organization: typeof organizations.$inferSelect;
  sessionId: string;
};

const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
const SESSION_ABSOLUTE_MS = SESSION_ABSOLUTE_DAYS * 24 * 60 * 60 * 1000;

/** 남은 수명이 TTL의 절반 미만이면 연장 대상 */
export function shouldSlideSession(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() - now.getTime() < SESSION_TTL_MS / 2;
}

/** 생성 시각 기준 절대 상한을 넘겼는지 */
export function isSessionPastAbsolute(createdAt: Date, now = new Date()) {
  return now.getTime() - createdAt.getTime() >= SESSION_ABSOLUTE_MS;
}

export async function createSession(userId: string) {
  const token = randomToken();
  const tokenHash = hashToken(token);
  const expiresAt = addDays(new Date(), SESSION_TTL_DAYS);
  const [row] = await db
    .insert(sessions)
    .values({ userId, tokenHash, expiresAt })
    .returning();
  return { token, session: row };
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: !isLocal(),
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: !isLocal(),
    path: "/",
    maxAge: 0,
  });
}

export async function readSessionToken() {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const token = await readSessionToken();
  if (!token) return null;
  const tokenHash = hashToken(token);
  const [row] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)))
    .limit(1);
  if (!row || isAfter(new Date(), row.expiresAt)) return null;

  if (isSessionPastAbsolute(row.createdAt)) {
    await revokeSession(row.id);
    await clearSessionCookie();
    return null;
  }

  if (shouldSlideSession(row.expiresAt)) {
    const absoluteEnd = addDays(row.createdAt, SESSION_ABSOLUTE_DAYS);
    const expiresAt = min([addDays(new Date(), SESSION_TTL_DAYS), absoluteEnd]);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, row.id));
    await setSessionCookie(token);
  }

  const [user] = await db.select().from(userProfiles).where(eq(userProfiles.id, row.userId)).limit(1);
  if (!user) return null;

  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, user.id))
    .limit(1);
  if (!member) return null;

  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, member.organizationId))
    .limit(1);
  if (!organization) return null;

  return { user, member, organization, sessionId: row.id };
}

export async function revokeSession(sessionId: string) {
  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sessionId));
}

export async function revokeUserSessions(userId: string) {
  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.userId, userId));
}

export function isActiveMember(member: { status: string; role: string }) {
  return member.status === "ACTIVE";
}

export function isSystemAdmin(member: { role: string; status: string }) {
  return member.status === "ACTIVE" && (member.role as MemberRole) === "SYSTEM_ADMIN";
}

export function memberStatus(value: string): MemberStatus {
  return value as MemberStatus;
}
