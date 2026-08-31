import { eq } from "drizzle-orm";
import { addHours } from "date-fns";
import { db } from "@/lib/db";
import { passwordResetTokens, userProfiles } from "@/lib/db/schema";
import { verifyPassword, hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { createSession, revokeUserSessions, setSessionCookie, clearSessionCookie, readSessionToken, revokeSession } from "@/lib/auth/session";
import { hashToken, randomToken } from "@/lib/crypto/pii";
import { ApiError } from "@/lib/errors";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { LOGIN_RATE_LIMIT_MAX, LOGIN_RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { notificationProvider } from "@/lib/notifications";
import { appConfig } from "@/lib/config";
import { isEmail } from "@/lib/validation/phone";

const GENERIC_LOGIN_ERROR = "아이디 또는 비밀번호가 올바르지 않습니다.";

export async function loginWithEmail(emailRaw: string, password: string, ip: string) {
  const limited = consumeRateLimit(`login:${ip}:${emailRaw.toLowerCase()}`, LOGIN_RATE_LIMIT_MAX, LOGIN_RATE_LIMIT_WINDOW_MS);
  if (!limited.ok) {
    throw new ApiError("RATE_LIMITED", "잠시 후 다시 시도해 주세요.", 429);
  }
  const email = emailRaw.trim().toLowerCase();
  const [user] = await db.select().from(userProfiles).where(eq(userProfiles.email, email)).limit(1);
  if (!user?.passwordHash) {
    throw new ApiError("UNAUTHORIZED", GENERIC_LOGIN_ERROR, 401);
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new ApiError("UNAUTHORIZED", GENERIC_LOGIN_ERROR, 401);
  }
  if (user.status === "SUSPENDED") {
    throw new ApiError("ACCOUNT_SUSPENDED", "정지된 계정입니다.", 403);
  }
  if (user.status !== "ACTIVE") {
    throw new ApiError("UNAUTHORIZED", GENERIC_LOGIN_ERROR, 401);
  }
  const { token } = await createSession(user.id);
  await db.update(userProfiles).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(userProfiles.id, user.id));
  await setSessionCookie(token);
  return { id: user.id, name: user.name, email: user.email };
}

export async function logoutCurrent() {
  const token = await readSessionToken();
  if (token) {
    const { hashToken: hash } = await import("@/lib/crypto/pii");
    const { sessions } = await import("@/lib/db/schema");
    const [row] = await db.select().from(sessions).where(eq(sessions.tokenHash, hash(token))).limit(1);
    if (row) await revokeSession(row.id);
  }
  await clearSessionCookie();
}

export async function requestPasswordReset(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  if (!isEmail(email)) return;
  const [user] = await db.select().from(userProfiles).where(eq(userProfiles.email, email)).limit(1);
  if (!user || user.status === "SUSPENDED") return;
  const token = randomToken();
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: addHours(new Date(), 2),
  });
  await notificationProvider.sendPasswordResetEmail({
    to: email,
    resetUrl: `${appConfig.adminUrl}/reset-password?token=${token}`,
  });
}

export async function completePasswordReset(token: string, password: string) {
  const strength = validatePasswordStrength(password);
  if (strength) throw new ApiError("VALIDATION_ERROR", strength, 400, "password");
  const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, hashToken(token))).limit(1);
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    throw new ApiError("NOT_FOUND", "유효하지 않은 재설정 링크입니다.", 404);
  }
  await db.update(userProfiles).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(userProfiles.id, row.userId));
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id));
  await revokeUserSessions(row.userId);
}
