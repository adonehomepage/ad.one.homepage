import { createHmac, createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { appConfig } from "@/lib/config";
import { ApiError } from "@/lib/errors";

function keyFromSecret(secret: string, salt: string) {
  return scryptSync(secret, salt, 32);
}

export function encryptPii(plaintext: string) {
  const secret = appConfig.piiEncryptionKey;
  if (!secret) {
    throw new ApiError("INTERNAL_ERROR", "개인정보 암호화 키가 설정되지 않았습니다.", 500);
  }
  const iv = randomBytes(12);
  const key = keyFromSecret(secret, "adit-pii-v1");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptPii(payload: string) {
  const secret = appConfig.piiEncryptionKey;
  if (!secret) {
    throw new ApiError("INTERNAL_ERROR", "개인정보 암호화 키가 설정되지 않았습니다.", 500);
  }
  const [iv, tag, data] = payload.split(".");
  const key = keyFromSecret(secret, "adit-pii-v1");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

export function phoneLookupHash(normalizedPhone: string) {
  const secret = appConfig.piiLookupHmacKey;
  if (!secret) {
    throw new ApiError("INTERNAL_ERROR", "연락처 검색 키가 설정되지 않았습니다.", 500);
  }
  return createHmac("sha256", secret).update(normalizedPhone).digest("hex");
}

export function hashToken(token: string) {
  return createHmac("sha256", appConfig.sessionSecret || "local-dev-only").update(token).digest("hex");
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string) {
  return createHmac("sha256", "snapshot").update(value).digest("hex");
}
