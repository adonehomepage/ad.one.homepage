import { randomBytes } from "node:crypto";
import { writeFileSync, existsSync } from "node:fs";

if (existsSync(".env.local")) {
  console.info(".env.local already exists");
  process.exit(0);
}

const secret = () => randomBytes(32).toString("base64url");
const contents = `# 로컬 전용. Git에 커밋하지 마세요.
APP_NAME=브랜드명미정
APP_ENV=local
APP_PUBLIC_URL=http://localhost:3000
APP_ADMIN_URL=http://localhost:3000
APP_TIMEZONE=Asia/Seoul

DEFAULT_PROJECT_DURATION_MONTHS=3
EXPIRY_NOTICE_DAYS_BEFORE=7
PROJECT_PURGE_GRACE_DAYS=30
MAX_PUBLISHED_VERSIONS=5
MAX_SECTION_COPIES_PER_ORIGINAL=3
MAX_ADVERTISER_RECIPIENTS=5
LEAD_RETENTION_MONTHS=6
LEAD_COLLECTION_ENABLED=false

DATABASE_URL=postgres://adit:adit_local_dev@localhost:5433/adit_landing
SESSION_SECRET=${secret()}

SEED_ADMIN_LOGIN=teamadit
SEED_ADMIN_PASSWORD="!adit1017"
SEED_ADMIN_NAME=시스템 관리자
SEED_ORG_NAME=광고사명미정

STORAGE_PROVIDER=local
STORAGE_BUCKET_PUBLIC=public-assets
STORAGE_BUCKET_PRIVATE=private-assets
STORAGE_PUBLIC_BASE_URL=http://localhost:3000/media
STORAGE_LOCAL_ROOT=./storage

EMAIL_PROVIDER=sandbox
KAKAO_MESSAGE_PROVIDER=sandbox
SMS_FALLBACK_ENABLED=false

CRON_SECRET=${secret()}
PII_ENCRYPTION_KEY=${secret()}
PII_LOOKUP_HMAC_KEY=${secret()}
`;

writeFileSync(".env.local", contents);
console.info("Wrote .env.local");
