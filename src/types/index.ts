export type MemberRole = "SYSTEM_ADMIN" | "MEMBER";
export type MemberStatus = "INVITED" | "ACTIVE" | "SUSPENDED" | "EXPIRED";
export type ProjectStatus = "DRAFT" | "PUBLISHED" | "PAUSED" | "EXPIRED" | "PENDING_DELETION" | "DELETED";
export type TemplateCode = "image-focus" | "video-ready";
export type SectionType =
  | "hero"
  | "overview"
  | "location"
  | "premium"
  | "gallery"
  | "floorplan"
  | "directions"
  | "lead_form"
  | "legal";
export type NotificationChannel = "KAKAO_ALIMTALK" | "EMAIL";
export type VerificationStatus = "PENDING" | "VERIFIED" | "FAILED";
export type JobStatus = "QUEUED" | "SENDING" | "SENT" | "FAILED" | "CANCELLED";
export type LeadFormFieldType = "name" | "phone" | "text" | "textarea" | "select" | "radio" | "checkbox" | "date";
export type AnalyticsEventName =
  | "page_view"
  | "session_start"
  | "gnb_click"
  | "section_view"
  | "phone_click"
  | "lead_cta_click"
  | "lead_form_start"
  | "lead_submit_success"
  | "lead_submit_error";

export type PageSection = {
  id: string;
  projectId: string;
  rootSectionId: string;
  sourceSectionId: string | null;
  sectionType: SectionType;
  title: string;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
  isVisible: boolean;
  showInGnb: boolean;
  gnbLabel: string;
  anchorId: string;
  sortOrder: number;
  isOriginal: boolean;
  isRequired: boolean;
};

export type LeadFormField = {
  key: string;
  type: LeadFormFieldType;
  label: string;
  helperText?: string;
  required: boolean;
  options?: string[];
  visible: boolean;
  includeInNotification: boolean;
};

export type ProjectPrivacyConfig = {
  collectingControllerName: string;
  operatingCompanyName: string;
  advertisingAgencyName: string;
  advertiserCompanyName: string;
  collectionPurpose: string;
  collectedFields: string[];
  retentionDescription: string;
  privacyPolicyUrl: string;
  thirdPartyProvisionEnabled: boolean;
  thirdPartyRecipientName?: string;
  thirdPartyPurpose?: string;
  thirdPartyFields?: string[];
  thirdPartyRetentionDescription?: string;
  refusalConsequence: string;
  privacyContactEmail?: string;
};

export type PageSnapshot = {
  templateCode: TemplateCode;
  projectName: string;
  publicSlug: string;
  phone: string;
  globalSettings: Record<string, unknown>;
  formSettings: { fields: LeadFormField[]; intro: string; successMessage: string };
  seoSettings: { title: string; description: string; ogImageAssetId: string | null };
  privacy: ProjectPrivacyConfig;
  sections: PageSection[];
};
