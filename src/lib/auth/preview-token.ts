import { createHmac, timingSafeEqual } from "node:crypto";
import { appConfig } from "@/lib/config";

const PREVIEW_TTL_MS = 2 * 60 * 60 * 1000;

function secret() {
  return appConfig.sessionSecret || "local-dev-only";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createPreviewToken(projectId: string, now = Date.now()) {
  const expiresAt = now + PREVIEW_TTL_MS;
  const payload = `${projectId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyPreviewToken(token: string, now = Date.now()) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [projectId, expRaw, sig] = parts;
  if (!projectId || !expRaw || !sig) return null;
  const expiresAt = Number(expRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < now) return null;
  const payload = `${projectId}.${expRaw}`;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { projectId, expiresAt };
}

export function previewTokenTtlMs() {
  return PREVIEW_TTL_MS;
}
