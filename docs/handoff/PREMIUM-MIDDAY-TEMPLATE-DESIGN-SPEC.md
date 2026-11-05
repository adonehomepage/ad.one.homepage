# 프리미엄 화보형 템플릿 디자인 스펙

동일 비주얼로 다른 곳에 템플릿을 다시 만들 때 쓰는 재현용 정리입니다.  
코드 기준: `zigbang.bungyang_web` 랜딩 빌더 스킨 **`midday`** (표시명: 프리미엄 화보형 / 내부 시안명 **LUMIÈRE**).

---

## 1. 한 줄 요약

| 항목 | 값 |
|------|-----|
| 표시명 | 프리미엄 화보형 |
| skin id | `midday` |
| 시안명 | LUMIÈRE (Vaulk “Lumière Central” 계열) |
| 스키마 | 다른 분양 랜딩과 **동일** (`PresaleLandingData`) — **비주얼만** 다름 |
| DB template_type | `PREMIUM` |
| 썸네일 | `/images/presale/product-life-default.png` |
| 핵심 인상 | **풀블리드 히어로** · terracotta clay 포인트 · navy 평면 섹션 · 필(pill) CTA · Pretendard · 타이틀 글자 리빌 |

---

## 2. 소스 위치 (복제 시 필수)

| 역할 | 경로 |
|------|------|
| 뷰(마크업·인터랙션) | `components/landing/presale/midday/MiddayLandingView.tsx` |
| 스킨 CSS (토큰·레이아웃) | `components/landing/presale/midday/midday-landing.css` |
| 원본 섹션 보완 CSS | `components/landing/presale/midday/lumiere-original-sections.css` |
| 타이틀 글자 리빌 | `components/landing/presale/midday/MiddayTitleReveal.tsx` |
| 프리미엄 커서 피크 | `components/landing/presale/midday/PremiumCursorPeek.tsx` |
| 스킨 분기 | `components/landing/presale/PresaleLandingView.tsx` → `data.skin === "midday"` |
| 카탈로그 메타 | `lib/landing-builder-templates.ts` (`id: "midday"`) |
| 공통 스키마·섹션 | `types/presale-landing.ts`, `lib/presale-landing-normalize.ts` |
| 공통 편집 크롬 | `components/landing/presale/presale-landing.css` |
| 시드 이미지 | `public/images/presale/lumiere/` |

공통 섹션 구성 문서: `docs/랜딩페이지-템플릿-섹션-구성.md`

---

## 3. 디자인 토큰 (CSS 변수)

루트: `.midday-landing` (`container-type: inline-size`, `container-name: midday`)

### 컬러

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--lc-ink` | `#0f1724` | 본문·제목 |
| `--lc-paper` | `#ffffff` | 기본 배경 |
| `--lc-mist` | `#f3f1ec` | 소프트 배경 |
| `--lc-cloud` | `#eef0f3` | 섹션 밴드 (`.lc-section--cloud`) |
| `--lc-clay` | `#bc785f` | **브랜드 포인트**(테라코타) · 언더라인·강조 |
| `--lc-clay-deep` | `#a5664f` | clay hover |
| `--lc-navy` | `#121826` | **평면·다크 섹션** (`.lc-section--navy`, `.lc-floorplan`) |
| `--lc-muted` | `#6b7280` | 보조 텍스트 |
| `--lc-line` | `#e5e2db` | 보더 |
| `--lc-line-soft` | `rgba(15,23,36,0.08)` | 연한 구분선 |
| `--lc-line-dark` | `rgba(255,255,255,0.14)` | 다크 위 라인 |
| `--pl-gold` / `--pl-gold-d` | `#b5985a` / `#9a7e44` | 공통 편집 셸 호환(골드) |

GNB 기본 배경: `#f6f6f3` (스크롤 시 `rgba(246,246,243,0.82)` + blur)

### 타이포

| 항목 | 값 |
|------|-----|
| 폰트 | `"Pretendard", -apple-system, BlinkMacSystemFont, system-ui, sans-serif` |
| 기본 | weight 400, letter-spacing `-0.01em`, line-height `1.6` |
| 제목 | weight 700~800, letter-spacing `-0.02em`~`-0.045em`, `word-break: keep-all` |
| 섹션 타이틀 | `clamp(34px, 4.2vw, 52px)`, weight ~720 |
| 히어로 타이틀 | `clamp(48px, 7.5vw, 96px)`, weight 800, max-width ~18ch |
| 섹션 번호 | 12px, weight 600, letter-spacing `0.14em`, uppercase |
| Eyebrow | 13px, muted |

### 간격·라디우스

| 토큰 | 값 |
|------|-----|
| `--lc-gutter` | `clamp(20px, 4.2vw, 72px)` |
| `--lc-section-pad` | `clamp(64px, 8vw, 112px)` |
| `--lc-gnb-h` | `72px` |
| `--lc-radius-pill` | `999px` |
| `--lc-radius-card` | `14px` |
| `--lc-radius-clay` | `16px` |
| `--lc-radius-sm` | `10px` |
| 래퍼 | `.lc-wrap` — full width + gutter (max-width 제한 없음) |

---

## 4. 페이지 골격 (섹션 순서)

스키마 기본 순서 (스킨 공통):

```text
[GNB]
product → overview → site → premium → floorplan
→ whyZigbang → faq → register → consultant → location
[Footer]
[선택: 이벤트 팝업]
[+ 플로팅 CTA / 등록 버튼]
```

| 섹션 키 | DOM id | 화보형 레이아웃 요약 |
|---------|--------|----------------------|
| `product` | `presale-product` | **풀블리드 히어로** (최소 100vh) |
| `overview` | `presale-overview` | 카피 + 수치 스트립(`.lc-number-strip`) |
| `site` | `presale-site` | 카피 + 2×2 입지 매트릭스(`.lc-location-matrix`) + 이미지 |
| `premium` | `presale-premium` | 카피 + 미디어/카드 그리드(`.lc-premium-grid`) · clay 카드 · 커서 피크 |
| `floorplan` | `presale-floorplan` | **네이비 배경** · 필 탭 · 흰 도면 카드 |
| `whyZigbang` | `presale-why` | 브랜드 워터마크 + 포인트 리스트 |
| `faq` | `presale-faq` | 번호 Q·토글 패널 |
| `register` | `presale-register` | 다크/강조 CTA + 혜택 리스트 |
| `consultant` | `presale-consultant` | 상담사 카드 (플래그로 off 가능) |
| `location` | `presale-location` | 주소·약도·지도 링크 |

고정: `product` 항상 최상단·숨김 불가, `whyZigbang` 숨김 불가.

---

## 5. 섹션별 비주얼 디테일

### 5.1 GNB (`.lc-gnb`)

- 높이 72px, 연한 베이지 그레이 바
- 로고 + 현장명 / 가운데 앵커 내비 / 전화·CTA
- 활성·호버 내비 밑줄 색: **clay**
- CTA: 아웃라인 → fill 시 ink 배경
- 모바일: 햄버거·드로어 (`PresaleGnbNav`)
- 히어로를 벗어나면 `is-scrolled` (반투명 + blur)

### 5.2 히어로 (`.lc-hero`) — 화보형의 핵심

- `min-height: max(100vh/100dvh, 720px)`, **full-bleed 배경 이미지**
- 오버레이 그라데이션 (상·하 어둡게, 중앙 밝게)
- 세로 구성: **head** (타이틀 좌 / 슬로건 우) → **spacer** → **mid** (가격 패널) → **bottom** (신뢰 태그 + CTA)
- 가격: 글래스 카드 아님 — **투명 텍스트 패널** (메인가 `clamp(32px~48px)`, weight 800)
- 신뢰 태그: 글래스 칩 (`PresaleGlassTrustTag`)
- CTA: `.lc-pill` (잉크/클레이/라이트 변형)

### 5.3 사업개요

- 섹션 번호 `01` 스타일 + `MiddayTitleReveal` 제목
- 하단 **숫자 스트립** (가로 분할 셀, 라벨/수치)

### 5.4 입지

- 2×2 **location-matrix** (보더 그리드, odd/even 배경 미묘 차이)
- 히어로/항공 컷 폴백: `/images/presale/lumiere/site-aerial.png`

### 5.5 프리미엄

- 그리드: 큰 미디어 + 텍스트 카드 (최대 **4장**)
- 강조 카드: `.lc-clay-card` (clay 배경, 흰 텍스트)
- PC: 이미지 위 **커서 따라가는 피크** (`PremiumCursorPeek`)
- 자동 슬라이드 간격 약 3초 (모션 축소 시 off)

### 5.6 평면

- 전체 **navy** 배경, 흰 탭(활성 시 흰 필 + navy 글자)
- 도면: 흰 카드 `border-radius: 14px`
- 2열: 도면 | 유닛 스펙

### 5.7 WHY / FAQ / 등록 / 오시는 길

- WHY: 대형 워터마크 + 포인트 행
- FAQ: `01` 번호 + `+` 토글
- 등록: 큰 타이틀 + 혜택 불릿(clay 점) + pill CTA
- 오시는 길: 카피 + map 카드

### 5.8 플로팅

- 히어로/등록 섹션 밖이면 **플로팅 등록** (`.lc-float-register`)
- 상담/전화 독은 공통 `PresaleFloatDock` + midday 토큰 오버라이드

---

## 6. 모션·인터랙션 (재현 포인트)

| 이름 | 동작 |
|------|------|
| `MiddayTitleReveal` | 뷰포트 진입 시 **글자 단위** opacity/transform 리빌 (`\n` = 줄바꿈, `\|` 제거) |
| `.midday-rise` | IntersectionObserver → `.is-inview` 페이드·상승 |
| `.midday-rise-stagger` | 자식 스태거 딜레이 |
| `PremiumCursorPeek` | pointer 추적 ease ~0.18 |
| GNB / float | 히어로·등록 IO로 scrolled·float 표시 |
| `prefers-reduced-motion` | 리빌·슬라이드·커서 ease 축소/즉시 표시 |

타이틀 리빌 클래스: `.midday-title-reveal` / `__line` / `__ch`

---

## 7. CTA 시스템 (`.lc-pill`)

공통: pill radius, 14px, weight semibold

| modifier | 스타일 |
|----------|--------|
| (default) | ink 배경, 흰 글자 |
| `--clay` | clay / clay-deep hover |
| `--dark` | navy |
| `--light` | 반투명 흰 |
| `--outline` | 보더만 |
| `--ghost-white` | 히어로용 고스트 |
| `--sm` | 작은 패딩 |

화살표 표기: `↗` 스팬 관례.

---

## 8. 반응형

Container queries on `.midday-landing`:

| 폭 | 주요 변화 |
|----|-----------|
| ≤1100px | 그리드·히어로 head 압축 |
| ≤900px | 히어로 head 1열, 슬로건 좌측 정렬 |
| ≤640px | 히어로 타이틀·가격 축소, bottom 세로 스택, CTA full width |

에디터 프리뷰:

- tablet 프레임 768px / mobile 390px
- 클래스: `presale-preview-device--tablet` / `--mobile`

---

## 9. 시드 이미지 (LUMIÈRE)

| 파일 | 용도 |
|------|------|
| `/images/presale/lumiere/apartment-hero.png` | 히어로 폴백 |
| `/images/presale/lumiere/premium-interior.png` | 프리미엄 폴백 |
| `/images/presale/lumiere/site-aerial.png` | 입지/항공 폴백 |

제출 시 샘플로 취급: `lib/presale-submit-checks.ts` (`/images/presale/lumiere/…`)

---

## 10. 다른 곳에 똑같이 만들 때 체크리스트

1. **스키마는 그대로**, 뷰+CSS만 midday 복제 (또는 동일 클래스명 `lc-*` / `midday-*` 이식).
2. 루트에 토큰 표(§3)를 그대로 두고 Pretendard 로드.
3. 히어로 = full-bleed + 다크 그라데이션 + 좌 타이틀/우 슬로건 + 투명 가격 + 하단 태그/CTA.
4. 평면 섹션만 **navy 풀밴드**, 나머지는 paper/cloud.
5. 포인트 컬러는 **clay `#bc785f`** 한 축으로 통일 (골드와 혼용 최소화).
6. 섹션 제목은 가능하면 **글자 리빌**, 본문 블록은 **rise**.
7. CTA는 전부 **pill**.
8. 모바일 ≤640에서 히어로 1열·CTA full-width 맞추기.
9. 시드 컷 3장(히어로/인테리어/항공) 준비.
10. 편집기가 필요 없으면 `editMode`·Editable* 제거하고 퍼블리시 HTML/React만 남겨도 됨 — **클래스·토큰만 유지**하면 동일 룩.

---

## 11. 관련 코드 진입점

```ts
// 스킨 분기
if (props.data.skin === "midday") {
  return <MiddayLandingView {...props} />;
}

// 카탈로그
{ id: "midday", name: "프리미엄 화보형", dbTemplateType: "PREMIUM" }
```

루트 className 예:

```html
<div class="midday-landing presale-landing">
  <header class="lc-gnb">…</header>
  <section class="lc-hero" id="presale-product">…</section>
  <div class="lc-sections">…</div>
</div>
```

---

## 12. 참고 (범위 밖)

- E-commerce형(`premium`), 브라이트 포레스트형(`serenoa`), 호갱노노형(`hognono`)은 **다른 스킨**.
- 상담사 섹션은 환경 플래그(`isLandingConsultantSectionEnabled`)에 따라 숨길 수 있음.
- 이 문서는 **디자인·구조 재현**용이며, CMS/배포 운영 절차는 포함하지 않음.
