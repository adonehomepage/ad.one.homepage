import { eq } from "drizzle-orm";
import { addHours } from "date-fns";
import { db } from "@/lib/db";
import { passwordResetTokens, userProfiles } from "@/lib/db/schema";
import { verifyPassword, hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { createSession, revokeUserSessions, setSessionCookie, clearSessionCookie, readSessionToken, revokeSession } from "@/lib/auth/session";
import { hashToken, randomToken } from "@/lib/crypto/pii";
import { ApiError } from "@/lib/errors";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import {
  LOGIN_IP_RATE_LIMIT_MAX,
  LOGIN_RATE_LIMIT_MAX,
  LOGIN_RATE_LIMIT_WINDOW_MS,
  RESET_RATE_LIMIT_MAX,
  RESET_RATE_LIMIT_WINDOW_MS,
} from "@/lib/constants";
import { notificationProvider, shouldExposeSandboxLinks } from "@/lib/notifications";
import { appConfig } from "@/lib/config";
import { isEmail } from "@/lib/validation/phone";
import { orgText } from "@/modules/admin/org-copy";

const GENERIC_LOGIN_ERROR = orgText("loginInvalid");
/** 계정 미존재 시에도 bcrypt compare 비용을 맞추기 위한 고정 해시(실비밀번호와 무관). */
const TIMING_PAD_HASH = "$2b$12$WsF0JuQt8Bmu9pEXT/ajh.VWXP3H7ntF2PvQj6UHCrS.ApcI8Kz4m";

export async function loginWithEmail(emailRaw: string, password: string, ip: string) {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !password) {
    throw new ApiError("UNAUTHORIZED", GENERIC_LOGIN_ERROR, 401);
  }
  const ipLimited = consumeRateLimit(`login-ip:${ip}`, LOGIN_IP_RATE_LIMIT_MAX, LOGIN_RATE_LIMIT_WINDOW_MS);
  const limited = consumeRateLimit(`login:${ip}:${email}`, LOGIN_RATE_LIMIT_MAX, LOGIN_RATE_LIMIT_WINDOW_MS);
  const blocked = !ipLimited.ok ? ipLimited : !limited.ok ? limited : null;
  if (blocked) {
    const minutes = Math.max(1, Math.ceil(((blocked.retryAt ?? Date.now()) - Date.now()) / 60_000));
    throw new ApiError(
      "RATE_LIMITED",
      orgText("loginRateLimited").replace("{minutes}", String(minutes)),
      429,
      undefined,
      blocked.retryAt,
    );
  }
  const [user] = await db.select().from(userProfiles).where(eq(userProfiles.email, email)).limit(1);
  // 계정 존재 여부에 따른 응답 시간 차이를 줄이기 위해 항상 compare 수행
  const valid = await verifyPassword(password, user?.passwordHash || TIMING_PAD_HASH);
  if (!user?.passwordHash || !valid) {
    throw new ApiError("UNAUTHORIZED", GENERIC_LOGIN_ERROR, 401);
  }
  if (user.status === "SUSPENDED") {
    throw new ApiError("ACCOUNT_SUSPENDED", orgText("suspended"), 403);
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

export async function requestPasswordReset(emailRaw: string, ip = "local") {
  const email = emailRaw.trim().toLowerCase();
  const limited = consumeRateLimit(`reset:${ip}:${email || "empty"}`, RESET_RATE_LIMIT_MAX, RESET_RATE_LIMIT_WINDOW_MS);
  if (!limited.ok) {
    const minutes = Math.max(1, Math.ceil(((limited.retryAt ?? Date.now()) - Date.now()) / 60_000));
    throw new ApiError(
      "RATE_LIMITED",
      orgText("loginRateLimited").replace("{minutes}", String(minutes)),
      429,
      undefined,
      limited.retryAt,
    );
  }
  if (!isEmail(email)) return;
  const [user] = await db.select().from(userProfiles).where(eq(userProfiles.email, email)).limit(1);
  if (!user || user.status === "SUSPENDED") return;
  const token = randomToken();
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: addHours(new Date(), 2),
  });
  const resetUrl = `${appConfig.adminUrl}/reset-password?token=${token}`;
  await notificationProvider.sendPasswordResetEmail({
    to: email,
    resetUrl,
  });
  return shouldExposeSandboxLinks() ? { resetUrl } : {};
}

export async function completePasswordReset(token: string, password: string, ip = "local") {
  const limited = consumeRateLimit(`reset-complete:${ip}`, RESET_RATE_LIMIT_MAX, RESET_RATE_LIMIT_WINDOW_MS);
  if (!limited.ok) {
    const minutes = Math.max(1, Math.ceil(((limited.retryAt ?? Date.now()) - Date.now()) / 60_000));
    throw new ApiError(
      "RATE_LIMITED",
      orgText("loginRateLimited").replace("{minutes}", String(minutes)),
      429,
      undefined,
      limited.retryAt,
    );
  }
  const strength = validatePasswordStrength(password);
  if (strength) throw new ApiError("VALIDATION_ERROR", strength, 400, "password");
  if (!token.trim()) throw new ApiError("NOT_FOUND", orgText("resetLinkInvalid"), 404);
  const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, hashToken(token))).limit(1);
  if (!row || row.usedAt) {
    throw new ApiError("NOT_FOUND", orgText("resetLinkInvalid"), 404);
  }
  if (row.expiresAt < new Date()) {
    throw new ApiError("NOT_FOUND", orgText("resetLinkExpired"), 404);
  }
  await db.update(userProfiles).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(userProfiles.id, row.userId));
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id));
  await revokeUserSessions(row.userId);
}
