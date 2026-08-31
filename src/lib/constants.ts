export const DEFAULT_PROJECT_DURATION_MONTHS = 3;
export const EXPIRY_NOTICE_DAYS_BEFORE = 7;
export const PROJECT_PURGE_GRACE_DAYS = 30;
export const MAX_PUBLISHED_VERSIONS = 5;
export const MAX_ADVERTISER_RECIPIENTS = 5;
export const MAX_SECTION_COPIES_PER_ORIGINAL = 3;
export const APP_TIMEZONE = "Asia/Seoul";
export const SESSION_COOKIE_NAME = "adit_session";
export const SESSION_TTL_DAYS = 14;
export const INVITE_TTL_HOURS = 72;
export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_RATE_LIMIT_MAX = 8;
export const LEAD_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const LEAD_RATE_LIMIT_MAX = 4;
export const DUPLICATE_LEAD_WINDOW_MINUTES = 10;

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

export const TEMPLATE_CODES = ["image-focus", "video-ready"] as const;

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
