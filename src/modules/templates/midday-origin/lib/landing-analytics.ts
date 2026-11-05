/**
 * 직방 GTM/추적 비활성 — 애드잇에서는 회사 analytics 미연결.
 */

export const LANDING_ANALYTICS_EVENTS = {
  pageView: "landing_page_view",
  phoneClick: "landing_phone_click",
  leadSubmit: "landing_lead_submit",
} as const;

export type LandingAnalyticsEventName =
  (typeof LANDING_ANALYTICS_EVENTS)[keyof typeof LANDING_ANALYTICS_EVENTS];

export type LandingAnalyticsContext = {
  projectId: string;
  landingId?: string | null;
  landingSlug?: string | null;
  landingUrl: string;
};

export const LANDING_GTM_ID_DEV_DEFAULT = "";

export function resolveLandingGtmId(): string | null {
  return null;
}

export function buildLandingAnalyticsContext(_input: {
  projectId?: string;
  path?: string;
  landingId?: string | null;
  landingSlug?: string | null;
}): LandingAnalyticsContext {
  return {
    projectId: _input.projectId || "",
    landingId: _input.landingId ?? null,
    landingSlug: _input.landingSlug ?? null,
    landingUrl: typeof window !== "undefined" ? window.location.href : "",
  };
}

export function trackLandingLeadSubmit(_ctx?: LandingAnalyticsContext): void {
  /* no-op: 회사 추적 코드 미연결 */
}

export function trackLandingPhoneClick(_ctx?: LandingAnalyticsContext): void {
  /* no-op */
}

export function trackLandingPageView(_ctx?: LandingAnalyticsContext): void {
  /* no-op */
}
