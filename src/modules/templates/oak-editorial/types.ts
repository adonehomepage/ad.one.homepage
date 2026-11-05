export type OakPlanType = {
  id: string;
  name: string;
  area: string;
  supply: string;
  rooms: string;
  heading: string;
  description: string;
  /** 업로드 평면도 이미지. 비어 있으면 SVG 개념도 사용 */
  floorplanImageUrl: string;
};

export type OakSpecRow = { label: string; value: string };
export type OakGalleryItem = { imageUrl: string; eyebrow: string; title: string; body: string; alt: string };
export type OakHeroPhoto = { src: string; alt: string; label: string };
export type OakFaqItem = { question: string; answer: string };
export type OakLocationRow = { title: string; body: string };
export type OakStat = { value: string; label: string };

export type OakEditorialData = {
  brandName: string;
  logoText: string;
  /** GNB 로고 하단 보조 문구 (프리미엄 화보형 navSubtitle과 동일 역할) */
  logoSubtitle: string;
  /** GNB 로고 이미지. 비우면 기본 샘플 로고 */
  logoUrl: string;
  nav: { overview: string; spaces: string; plans: string; location: string; register: string };
  hero: {
    eyebrowLeft: string;
    eyebrowRight: string;
    title: string;
    sideEyebrow: string;
    sideHeadline: string;
    sideMeta: string;
    bottomLead: string;
    exploreLabel: string;
    captionNote: string;
    photos: OakHeroPhoto[];
  };
  manifesto: {
    eyebrow: string;
    title: string;
    body: string;
  };
  overview: {
    eyebrow: string;
    title: string;
    imageUrl: string;
    imageNote: string;
    infoEyebrow: string;
    infoTitle: string;
    infoBody: string;
    stats: OakStat[];
    specs: OakSpecRow[];
    footnote: string;
  };
  spaces: {
    eyebrow: string;
    title: string;
    items: OakGalleryItem[];
    viewAllLabel: string;
    /** 특장점 4장 맞춤을 한 번 적용했는지. 이후 삭제는 그대로 둔다. */
    itemCapSettled?: boolean;
  };
  floorplan: {
    eyebrow: string;
    title: string;
    lead: string;
    detailEyebrow: string;
    conceptNote: string;
    expandLabel: string;
    registerLinkLabel: string;
    plans: OakPlanType[];
    locationMapNote: string;
  };
  location: {
    eyebrow: string;
    title: string;
    lead: string;
    rows: OakLocationRow[];
    footnote: string;
    mapCaption: string;
    mapImageUrl: string;
    /** 약도 클릭 시 새 탭 (네이버 지도 등). 비우면 이미지만 표시 */
    mapLinkUrl: string;
  };
  faq: {
    eyebrow: string;
    title: string;
    items: OakFaqItem[];
  };
  register: {
    eyebrow: string;
    title: string;
    body: string;
    privacySummary: string;
    privacyBody: string;
    consentLabel: string;
    submitLabel: string;
  };
  footer: {
    eyebrow: string;
    wordmark: string;
    tagline: string;
    copyright: string;
    credit: string;
  };
  floatingBrand: string;
  floatingCta: string;
  fontLicenseNote: string;
  isSampleData: boolean;
};

export const OAK_DATA_KEY = "oakEditorialData" as const;
