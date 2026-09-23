import { APP_TIMEZONE, DEFAULT_PROJECT_DURATION_MONTHS, EXPIRY_NOTICE_DAYS_BEFORE, MAX_ADVERTISER_RECIPIENTS, MAX_PUBLISHED_VERSIONS, MAX_SECTION_COPIES_PER_ORIGINAL, PROJECT_PURGE_GRACE_DAYS } from "@/lib/constants";

function read(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

function readInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBool(name: string, fallback: boolean) {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return fallback;
}

export const appConfig = {
  name: read("APP_NAME", "브랜드명미정"),
  env: read("APP_ENV", "local"),
  publicUrl: read("APP_PUBLIC_URL", "http://localhost:3000"),
  adminUrl: read("APP_ADMIN_URL", "http://localhost:3000"),
  timezone: read("APP_TIMEZONE", APP_TIMEZONE),
  defaultDurationMonths: readInt("DEFAULT_PROJECT_DURATION_MONTHS", DEFAULT_PROJECT_DURATION_MONTHS),
  expiryNoticeDaysBefore: readInt("EXPIRY_NOTICE_DAYS_BEFORE", EXPIRY_NOTICE_DAYS_BEFORE),
  purgeGraceDays: readInt("PROJECT_PURGE_GRACE_DAYS", PROJECT_PURGE_GRACE_DAYS),
  maxPublishedVersions: readInt("MAX_PUBLISHED_VERSIONS", MAX_PUBLISHED_VERSIONS),
  maxSectionCopies: readInt("MAX_SECTION_COPIES_PER_ORIGINAL", MAX_SECTION_COPIES_PER_ORIGINAL),
  maxRecipients: readInt("MAX_ADVERTISER_RECIPIENTS", MAX_ADVERTISER_RECIPIENTS),
  leadRetentionMonths: readInt("LEAD_RETENTION_MONTHS", 6),
  slugReuseCooldownDays: readInt("SLUG_REUSE_COOLDOWN_DAYS", 365),
  maxDurationMonths: readInt("MAX_DURATION_MONTHS", 120),
  leadCollectionEnabled: readBool("LEAD_COLLECTION_ENABLED", false),
  databaseUrl: read("DATABASE_URL"),
  sessionSecret: read("SESSION_SECRET"),
  storageProvider: read("STORAGE_PROVIDER", "local"),
  storagePublicBucket: read("STORAGE_BUCKET_PUBLIC", "public-assets"),
  storagePrivateBucket: read("STORAGE_BUCKET_PRIVATE", "private-assets"),
  storagePublicBaseUrl: read("STORAGE_PUBLIC_BASE_URL", "http://localhost:3000/media"),
  storageLocalRoot: read("STORAGE_LOCAL_ROOT", "./storage"),
  s3Endpoint: read("S3_ENDPOINT"),
  s3Region: read("S3_REGION", "ap-northeast-2"),
  s3AccessKeyId: read("S3_ACCESS_KEY_ID"),
  s3SecretAccessKey: read("S3_SECRET_ACCESS_KEY"),
  s3ForcePathStyle: readBool("S3_FORCE_PATH_STYLE", false),
  emailProvider: read("EMAIL_PROVIDER", "sandbox"),
  emailFrom: read("EMAIL_FROM_ADDRESS"),
  kakaoProvider: read("KAKAO_MESSAGE_PROVIDER", "sandbox"),
  kakaoChannelName: read("KAKAO_CHANNEL_NAME"),
  smsFallbackEnabled: readBool("SMS_FALLBACK_ENABLED", false),
  cronSecret: read("CRON_SECRET"),
  legalCompanyName: read("LEGAL_COMPANY_NAME"),
  privacyControllerName: read("PRIVACY_CONTROLLER_NAME"),
  privacyContactEmail: read("PRIVACY_CONTACT_EMAIL"),
  privacyPolicyUrl: read("PRIVACY_POLICY_URL"),
  piiEncryptionKey: read("PII_ENCRYPTION_KEY"),
  piiLookupHmacKey: read("PII_LOOKUP_HMAC_KEY"),
  errorMonitoringDsn: read("ERROR_MONITORING_DSN"),
  dbPoolMax: readInt("DB_POOL_MAX", 0),
};

/** @deprecated Prefer `isProd` / `isNonProd` from `@/lib/deploy-env`. */
export function isProductionLike() {
  const env = appConfig.env.toLowerCase();
  return env === "production" || env === "prod" || env === "staging" || env === "preview" || env === "dev";
}

/** Vercel/serverless에서는 풀을 작게 유지합니다. */
export function dbPoolSize() {
  if (appConfig.dbPoolMax > 0) return appConfig.dbPoolMax;
  if (process.env.VERCEL) return 1;
  const env = appConfig.env.toLowerCase();
  if (env === "preview" || env === "production" || env === "prod" || env === "dev") return 1;
  return 10;
}

export function brandLabel() {
  return appConfig.name || "브랜드명미정";
}
