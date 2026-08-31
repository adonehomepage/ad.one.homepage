import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  bigint,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  status: text("status").notNull().default("ACTIVE"),
  ...timestamps,
});

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  passwordHash: text("password_hash"),
  status: text("status").notNull().default("INVITED"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestamps,
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => userProfiles.id),
    role: text("role").notNull(),
    status: text("status").notNull(),
    invitedBy: uuid("invited_by"),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspendedBy: uuid("suspended_by"),
    ...timestamps,
  },
  (table) => [
    unique().on(table.organizationId, table.userId),
    index("organization_members_org_idx").on(table.organizationId, table.status),
  ],
);

export const memberInvitations = pgTable("member_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  tokenHash: text("token_hash").notNull(),
  invitedBy: uuid("invited_by").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userProfiles.id),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => userProfiles.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  schemaJson: jsonb("schema_json").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    templateId: uuid("template_id")
      .notNull()
      .references(() => templates.id),
    name: text("name").notNull(),
    publicSlug: text("public_slug").notNull(),
    publicSlugNormalized: text("public_slug_normalized").notNull(),
    status: text("status").notNull().default("DRAFT"),
    durationMonths: integer("duration_months").notNull().default(3),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    deletionScheduledAt: timestamp("deletion_scheduled_at", { withTimezone: true }),
    currentPublishedVersionId: uuid("current_published_version_id"),
    draftRevision: integer("draft_revision").notNull().default(1),
    hasUnpublishedChanges: boolean("has_unpublished_changes").notNull().default(true),
    assignedManagerId: uuid("assigned_manager_id"),
    createdBy: uuid("created_by").notNull(),
    updatedBy: uuid("updated_by"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    unique("projects_slug_unique").on(table.publicSlugNormalized),
    index("projects_org_status_idx").on(table.organizationId, table.status, table.expiresAt),
  ],
);

export const reservedSlugs = pgTable("reserved_slugs", {
  slugNormalized: text("slug_normalized").primaryKey(),
  reason: text("reason").notNull(),
  projectId: uuid("project_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectDrafts = pgTable("project_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  projectId: uuid("project_id")
    .notNull()
    .unique()
    .references(() => projects.id),
  templateSnapshot: jsonb("template_snapshot").notNull(),
  globalSettings: jsonb("global_settings").notNull(),
  formSettings: jsonb("form_settings").notNull(),
  seoSettings: jsonb("seo_settings").notNull(),
  privacySettings: jsonb("privacy_settings").notNull(),
  revision: integer("revision").notNull(),
  updatedBy: uuid("updated_by").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectSections = pgTable(
  "project_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    rootSectionId: uuid("root_section_id").notNull(),
    sourceSectionId: uuid("source_section_id"),
    sectionType: text("section_type").notNull(),
    title: text("title").notNull(),
    contentJson: jsonb("content_json").notNull(),
    settingsJson: jsonb("settings_json").notNull(),
    anchorId: text("anchor_id").notNull(),
    gnbLabel: text("gnb_label"),
    sortOrder: integer("sort_order").notNull(),
    isOriginal: boolean("is_original").notNull(),
    isRequired: boolean("is_required").notNull(),
    isVisible: boolean("is_visible").notNull().default(true),
    showInGnb: boolean("show_in_gnb").notNull().default(true),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.projectId, table.anchorId),
    index("project_sections_order_idx").on(table.projectId, table.sortOrder),
    index("project_sections_root_idx").on(table.projectId, table.rootSectionId),
  ],
);

export const projectVersions = pgTable(
  "project_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    versionNumber: integer("version_number").notNull(),
    snapshotJson: jsonb("snapshot_json").notNull(),
    changeSummary: text("change_summary"),
    publishedBy: uuid("published_by").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.projectId, table.versionNumber),
    index("project_versions_published_idx").on(table.projectId, table.publishedAt),
  ],
);

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  projectId: uuid("project_id"),
  storageProvider: text("storage_provider").notNull(),
  bucketName: text("bucket_name").notNull(),
  objectKey: text("object_key").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  width: integer("width"),
  height: integer("height"),
  durationSeconds: integer("duration_seconds"),
  visibility: text("visibility").notNull(),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const projectPrivacyPolicies = pgTable("project_privacy_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  version: text("version").notNull(),
  collectingControllerName: text("collecting_controller_name").notNull(),
  advertiserCompanyName: text("advertiser_company_name"),
  collectionPurpose: text("collection_purpose").notNull(),
  collectedFields: jsonb("collected_fields").notNull(),
  retentionDescription: text("retention_description").notNull(),
  thirdPartyEnabled: boolean("third_party_enabled").notNull(),
  thirdPartyRecipientName: text("third_party_recipient_name"),
  thirdPartyPurpose: text("third_party_purpose"),
  thirdPartyFields: jsonb("third_party_fields"),
  thirdPartyRetentionDescription: text("third_party_retention_description"),
  policyText: text("policy_text").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    publishedVersionId: uuid("published_version_id"),
    name: text("name").notNull(),
    phoneCiphertext: text("phone_ciphertext").notNull(),
    phoneLookupHash: text("phone_lookup_hash").notNull(),
    inquiryText: text("inquiry_text"),
    answersJson: jsonb("answers_json").notNull(),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmContent: text("utm_content"),
    utmTerm: text("utm_term"),
    referrer: text("referrer"),
    possibleDuplicate: boolean("possible_duplicate").notNull().default(false),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    retentionUntil: timestamp("retention_until", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("leads_org_project_idx").on(table.organizationId, table.projectId, table.submittedAt),
    index("leads_phone_hash_idx").on(table.projectId, table.phoneLookupHash),
  ],
);

export const leadConsents = pgTable("lead_consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id),
  consentType: text("consent_type").notNull(),
  policyVersion: text("policy_version").notNull(),
  consentTextSnapshot: text("consent_text_snapshot").notNull(),
  consentTextHash: text("consent_text_hash").notNull(),
  agreedAt: timestamp("agreed_at", { withTimezone: true }).notNull().defaultNow(),
  ipEvidence: text("ip_evidence"),
  userAgent: text("user_agent"),
});

export const leadNotes = pgTable(
  "lead_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    authorId: uuid("author_id").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [index("lead_notes_lead_idx").on(table.leadId, table.createdAt)],
);

export const advertiserRecipients = pgTable(
  "advertiser_recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    name: text("name").notNull(),
    companyName: text("company_name"),
    phone: text("phone"),
    email: text("email"),
    preferredChannel: text("preferred_channel").notNull(),
    receiveLeadAlerts: boolean("receive_lead_alerts").notNull().default(true),
    receiveExpiryAlerts: boolean("receive_expiry_alerts").notNull().default(true),
    verificationStatus: text("verification_status").notNull().default("PENDING"),
    verificationTokenHash: text("verification_token_hash"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by").notNull(),
    updatedBy: uuid("updated_by"),
    ...timestamps,
  },
  (table) => [index("recipients_project_idx").on(table.projectId, table.isActive)],
);

export const notificationJobs = pgTable(
  "notification_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    recipientId: uuid("recipient_id"),
    leadId: uuid("lead_id"),
    eventType: text("event_type").notNull(),
    channel: text("channel").notNull(),
    payloadJson: jsonb("payload_json").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    status: text("status").notNull().default("QUEUED"),
    attemptCount: integer("attempt_count").notNull().default(0),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    providerMessageId: text("provider_message_id"),
    errorCode: text("error_code"),
    errorMessageRedacted: text("error_message_redacted"),
    ...timestamps,
  },
  (table) => [index("notification_jobs_status_idx").on(table.status, table.scheduledAt)],
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    publishedVersionId: uuid("published_version_id"),
    eventName: text("event_name").notNull(),
    anonymousSessionId: text("anonymous_session_id"),
    anonymousVisitorId: text("anonymous_visitor_id"),
    referrer: text("referrer"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmContent: text("utm_content"),
    utmTerm: text("utm_term"),
    deviceType: text("device_type"),
    metadataJson: jsonb("metadata_json").notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("analytics_events_project_idx").on(table.projectId, table.occurredAt)],
);

export const dailyProjectMetrics = pgTable(
  "daily_project_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    metricDate: date("metric_date").notNull(),
    pageViews: integer("page_views").notNull().default(0),
    uniqueVisitors: integer("unique_visitors").notNull().default(0),
    phoneClicks: integer("phone_clicks").notNull().default(0),
    leadCtaClicks: integer("lead_cta_clicks").notNull().default(0),
    leadSubmissions: integer("lead_submissions").notNull().default(0),
  },
  (table) => [unique().on(table.projectId, table.metricDate)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    actorUserId: uuid("actor_user_id"),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: uuid("resource_id"),
    metadataJson: jsonb("metadata_json").notNull().default({}),
    ipEvidence: text("ip_evidence"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_logs_org_idx").on(table.organizationId, table.occurredAt)],
);

export const organizationSettings = pgTable("organization_settings", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organizations.id),
  brandName: text("brand_name"),
  legalCompanyName: text("legal_company_name"),
  publicBaseDomain: text("public_base_domain"),
  defaultDurationMonths: integer("default_duration_months").notNull().default(3),
  leadRetentionMonths: integer("lead_retention_months"),
  kakaoChannelName: text("kakao_channel_name"),
  supportEmail: text("support_email"),
  privacyOfficerName: text("privacy_officer_name"),
  privacyContactEmail: text("privacy_contact_email"),
  updatedBy: uuid("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
