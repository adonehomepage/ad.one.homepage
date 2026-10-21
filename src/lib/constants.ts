export const DEFAULT_PROJECT_DURATION_MONTHS = 3;
export const EXPIRY_NOTICE_DAYS_BEFORE = 7;
export const PROJECT_PURGE_GRACE_DAYS = 30;
export const MAX_PUBLISHED_VERSIONS = 5;
export const MAX_ADVERTISER_RECIPIENTS = 5;
export const MAX_SECTION_COPIES_PER_ORIGINAL = 3;
export const APP_TIMEZONE = "Asia/Seoul";
export const SESSION_COOKIE_NAME = "adit_session";
export const SESSION_TTL_DAYS = 14;
/** 슬라이딩과 무관한 세션 절대 상한(생성 시각 기준) */
export const SESSION_ABSOLUTE_DAYS = 30;
export const INVITE_TTL_HOURS = 72;
export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_RATE_LIMIT_MAX = 8;
export const LOGIN_IP_RATE_LIMIT_MAX = 40;
export const RESET_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const RESET_RATE_LIMIT_MAX = 5;
export const INVITE_ACCEPT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const INVITE_ACCEPT_RATE_LIMIT_MAX = 10;
export const INVITE_SEND_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const INVITE_SEND_RATE_LIMIT_MAX = 20;
export const LEAD_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const LEAD_RATE_LIMIT_MAX = 4;
export const VERIFY_RECIPIENT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const VERIFY_RECIPIENT_RATE_LIMIT_MAX = 20;
export const EXPORT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const EXPORT_RATE_LIMIT_MAX = 6;
export const PDF_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const PDF_RATE_LIMIT_MAX = 6;
export const UPLOAD_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const UPLOAD_RATE_LIMIT_MAX = 30;
export const DRAFT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const DRAFT_RATE_LIMIT_MAX = 120;
export const DUPLICATE_LEAD_WINDOW_MINUTES = 10;
export const ANALYTICS_MAX_RANGE_MS = 90 * 24 * 60 * 60 * 1000;

export const RESERVED_SLUGS = [
  "admin",
  "api",
  "login",
  "logout",
  "invite",
  "privacy",
  "terms",
  "settings",
  "assets",
  "static",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "media",
  "reset-password",
  "preview",
  "verify-recipient",
] as const;

export const MEMBER_ROLES = ["SYSTEM_ADMIN", "MEMBER"] as const;
export const MEMBER_STATUSES = ["INVITED", "ACTIVE", "SUSPENDED", "EXPIRED"] as const;
export const PROJECT_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "PAUSED",
  "EXPIRED",
  "PENDING_DELETION",
  "DELETED",
] as const;

export const TEMPLATE_CODES = ["image-focus", "video-ready", "forest", "info"] as const;

export const SECTION_TYPES = [
  "hero",
  "overview",
  "location",
  "premium",
  "gallery",
  "floorplan",
  "directions",
  "lead_form",
  "legal",
] as const;

export const REQUIRED_SECTION_TYPES = ["hero", "lead_form", "legal"] as const;
