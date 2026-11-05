import { SAMPLE_LOGO_URL, SAMPLE_PREMIUM_BASE } from "@/modules/templates/definitions";
import { SAMPLE_SITE } from "@/modules/templates/sample-site";
import type { OakEditorialData } from "./types";

const img = (name: string) => `${SAMPLE_PREMIUM_BASE}/${name}`;

/** 분양 광고 홈페이지용 임시 예시 (프리미엄 화보형 샘플 에셋). isSampleData=true */
export function defaultOakEditorialData(): OakEditorialData {
  return {
    brandName: SAMPLE_SITE.name,
    logoText: SAMPLE_SITE.name,
    logoSubtitle: "OFFICIAL",
    logoUrl: SAMPLE_LOGO_URL,
    nav: {
      overview: "사업개요",
      spaces: "프리미엄",
      plans: "평면안내",
      location: "입지환경",
      register: "관심고객 등록 ↗",
    },
    hero: {
      eyebrowLeft: "신규 분양 안내",
      eyebrowRight: "PREMIUM RESIDENCE / 01",
      title: SAMPLE_SITE.name,
      sideEyebrow: "분양 홈페이지 예시",
      sideHeadline: "교통과 생활이\n가까운 새 아파트.",
      sideMeta: "SAMPLE EDITION — 2026",
      bottomLead: "관심고객 등록하고 분양 일정을 먼저 받아보세요.",
      exploreLabel: "단지 살펴보기 ↓",
      captionNote: "예시 단지 · 연출 이미지 (실제 공급과 무관)",
      photos: [
        {
          src: img("hero-main.png"),
          alt: "단지 대표 조감 예시",
          label: "01 / 단지 전경",
        },
        {
          src: img("hero-2.png"),
          alt: "단지 외관 예시",
          label: "02 / 외관",
        },
        {
          src: img("hero-3.png"),
          alt: "생활 공간 예시",
          label: "03 / 생활",
        },
      ],
    },
    manifesto: {
      eyebrow: `PROJECT STORY\n\n${SAMPLE_SITE.name}`,
      title: "일상이 가까워지는\n완성된 주거.",
      body: "교통과 생활, 교육과 녹지가 맞닿은 자리.\n가족의 오늘과 내일을 담을 공간을 제안합니다.",
    },
    overview: {
      eyebrow: "01 — 사업개요",
      title: "중심을 누리는\n완성된 주거.",
      imageUrl: img("premium-interior.png"),
      imageNote: "인테리어 참고 이미지 · 실제 시공과 다를 수 있습니다",
      infoEyebrow: "단지 한눈에",
      infoTitle: "생활에 맞춘 규모와\n합리적인 타입 구성.",
      infoBody:
        "세대수·면적·주차 등 핵심 정보를 한곳에서 확인하세요. 상세 조건은 상담 시 안내드립니다.",
      stats: [
        { value: "525", label: "총 세대수 · 예시" },
        { value: "59–84", label: "전용면적 ㎡ · 예시" },
      ],
      specs: [
        { label: "사업명", value: `${SAMPLE_SITE.name} (예시)` },
        { label: "대지위치", value: SAMPLE_SITE.address },
        { label: "문의전화", value: SAMPLE_SITE.phone },
        { label: "건축규모", value: "지하 3층 ~ 지상 29층, 7개 동" },
        { label: "대지면적", value: "입력 예정" },
        { label: "주차대수", value: "세대당 1.2대 이상 · 예시" },
        { label: "공급타입", value: "59㎡ · 84㎡" },
        { label: "입주예정", value: "일정 확정 후 안내" },
      ],
      footnote: "※ 본 페이지 수치는 이해를 돕기 위한 예시이며, 사업 진행에 따라 변경될 수 있습니다.",
    },
    spaces: {
      eyebrow: "02 — 프리미엄",
      title: "일상을 바꾸는\n특장점.",
      items: [
        {
          imageUrl: img("premium-ocean.png"),
          eyebrow: "01 / VIEW",
          title: "탁 트인 조망",
          body: "단지에서 바라보는 열린 전망.\n여유로운 일상을 제안합니다.",
          alt: "조망 특장점 예시",
        },
        {
          imageUrl: img("premium-transit.png"),
          eyebrow: "02 / TRANSIT",
          title: "편리한 교통",
          body: "주요 교통망과의 연결로\n출퇴근과 이동이 한결 수월합니다.",
          alt: "교통 특장점 예시",
        },
        {
          imageUrl: img("premium-school.png"),
          eyebrow: "03 / LIFE",
          title: "생활 인프라",
          body: "교육·쇼핑·녹지가 가까운\n일상의 반경을 넓혀 줍니다.",
          alt: "생활 인프라 예시",
        },
        {
          imageUrl: img("premium-smart.png"),
          eyebrow: "04 / SMART",
          title: "스마트 라이프",
          body: "AI 주차와 얼굴인식 출입 등,\n단지 생활이 한층 편리해집니다.",
          alt: "스마트 라이프 예시",
        },
      ],
      viewAllLabel: "특장점 사진 전체 보기 ↗",
    },
    floorplan: {
      eyebrow: "03 — 평면안내",
      title: "라이프에 맞는 타입.",
      lead: "타입을 선택하면 면적과 구조 안내가 바뀝니다.\n실제 평면은 이미지를 교체해 등록하세요.",
      detailEyebrow: "TYPE DETAIL",
      conceptNote: "평면 이미지는 이해를 돕기 위한 예시입니다.\n실제 시공·축척과 다를 수 있습니다.",
      expandLabel: "확대 보기 ↗",
      registerLinkLabel: "관심고객 등록",
      locationMapNote: "",
      plans: [
        {
          id: "59A",
          name: "59A",
          area: "59.84㎡",
          supply: "약 25평형",
          rooms: "침실 3 · 욕실 2",
          heading: "콤팩트하게,\n알차게.",
          description: "효율적인 동선과 수납으로 신혼·소가족에게 적합한 기본형입니다.",
          floorplanImageUrl: img("floor-58a.png"),
        },
        {
          id: "84A",
          name: "84A",
          area: "84.92㎡",
          supply: "약 33평형",
          rooms: "침실 3 · 욕실 2",
          heading: "함께하는 공간,\n각자의 편안함.",
          description: "거실을 중심으로 가족의 동선을 잇고, 침실은 독립적으로 배치한 타입입니다.",
          floorplanImageUrl: img("floor-84a.png"),
        },
        {
          id: "84B",
          name: "84B",
          area: "84.78㎡",
          supply: "약 33평형",
          rooms: "침실 3 · 욕실 2 · 알파공간",
          heading: "같은 면적,\n다른 가능성.",
          description: "알파공간으로 취미·업무 등 라이프스타일에 유연하게 대응합니다.",
          floorplanImageUrl: img("floor-84a.png"),
        },
      ],
    },
    location: {
      eyebrow: "04 — 입지환경",
      title: "가까울수록,\n삶은 커집니다.",
      lead: "교통·생활·교육·녹지 등 현장 주변 정보를 한눈에 살펴보세요.",
      rows: [
        { title: "01 — 교통", body: SAMPLE_SITE.transitBody },
        { title: "02 — 생활", body: SAMPLE_SITE.lifeBody },
        { title: "03 — 교육·녹지", body: `${SAMPLE_SITE.schoolBody.replace(/\.$/, "")}. ${SAMPLE_SITE.greenBody}` },
      ],
      footnote: "※ 시설·위치·거리는 예시이며 실제 입지와 다를 수 있습니다.",
      mapCaption: "입지·약도 이미지 · 클릭 시 지도 링크로 이동할 수 있습니다",
      mapImageUrl: img("directions-map.png"),
      mapLinkUrl: "",
    },
    faq: {
      eyebrow: "05 — 자주 묻는 질문",
      title: "궁금한 점 확인하기.",
      items: [
        {
          question: "분양 일정과 가격은 어디에서 확인하나요?",
          answer:
            "확정된 입주자모집공고와 분양 일정·공급가격은 관심고객 등록 후 안내드리거나, 문의 전화로 확인하실 수 있습니다.",
        },
        {
          question: "관심고객 등록 후에는 어떻게 되나요?",
          answer: "동의한 목적에 따라 분양·방문 안내를 드립니다. 청약 접수가 아니며, 상담 희망 시에만 연락드립니다.",
        },
        {
          question: "평면도와 사진은 실제 제공 공간인가요?",
          answer:
            "이미지는 이해를 돕기 위한 예시입니다. 실제 면적·마감·옵션은 정식 안내 자료를 확인해야 합니다.",
        },
        {
          question: "견본주택 방문을 예약할 수 있나요?",
          answer: "관심고객 등록 또는 문의 전화로 방문 상담을 신청해 주세요. 운영 시간에 맞춰 안내드립니다.",
        },
      ],
    },
    register: {
      eyebrow: "06 — 관심고객 등록",
      title: "분양 일정을\n먼저 받아보세요.",
      body: "관심 타입을 남겨 주시면\n일정·방문 안내를 우선 전달드립니다.",
      privacySummary: "개인정보 수집·이용 안내",
      privacyBody:
        "수집 주체·목적·항목·보유기간·동의 거부 시 영향은 운영 정책에 따릅니다. 자세한 내용은 개인정보 처리방침을 확인해 주세요.",
      consentLabel: "[필수] 개인정보 수집·이용에 동의합니다.",
      submitLabel: "관심고객 등록 ↗",
    },
    footer: {
      eyebrow: `${SAMPLE_SITE.name}\n\n분양 안내 홈페이지 예시`,
      wordmark: SAMPLE_SITE.name,
      tagline: "관심고객 등록으로\n일정을 먼저 확인하세요.",
      copyright: `© ${SAMPLE_SITE.name} — SAMPLE 2026`,
      credit: "ADIT · 예시 데이터 (실제 공급과 무관)",
    },
    floatingBrand: SAMPLE_SITE.name,
    floatingCta: "관심고객 등록 ↗",
    fontLicenseNote:
      "본 템플릿은 Pretendard를 사용합니다. Pretendard 라이선스(SIL OFL)를 준수하세요.",
    isSampleData: true,
  };
}
