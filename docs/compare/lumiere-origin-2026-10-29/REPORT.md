# LUMIÈRE 원본 동일 재현 — 비교 보고 (2026-10-29)

커밋·푸시·배포 없음. 기존 프로젝트 데이터 미변경.

## 1. 실행한 비교 URL

| 역할 | URL |
|------|-----|
| 독립 패키지(원본 추출) | http://localhost:3020/dev/lumiere-preview |
| 애드잇 격리 비교(원본 뷰+더미만) | http://localhost:3000/dev/lumiere-origin |
| 편집 크롬 | 위 URL에 `?edit=1` |

비교 조건: 뷰포트 PC 1440×900 / 모바일 390×844, 팝업 닫은 뒤(`presale-v2-event-dismissed`), Pretendard 로드.

## 2. 1단계 — 패키지 vs 직방 원본 저장소

로컬 `zigbang.bungyang_web` (`chore/seo-pricing-to-master`)와 패키지 핵심 파일 **SHA256 바이트 동일**:

- `MiddayLandingView.tsx`, `midday-landing.css`, `lumiere-original-sections.css`, `MiddayTitleReveal.tsx`, `PremiumCursorPeek.tsx`, `presale-landing.css`, `presale-landing-dummy.ts`, `types/presale-landing.ts`, `lumiere-preview/page.tsx`, GNB/FloatDock, normalize, 시드 PNG 샘플

**확인하지 못한 것:** 직방 운영에 공개된 “프리미엄 화보형” 실서비스 URL. 라이브 사이트와 패키지 화면이 같은지는 **추정하지 않음**. 기준은 추출 패키지 = 로컬 bungyang_web midday 소스.

## 3. 2단계 — 애드잇 격리 경로

- `src/app/dev/lumiere-origin/` — 패키지 preview와 동일하게 `MiddayLandingView` + `presaleLandingDummyData`만 사용
- API·인증·편집기·애드잇 섹션 렌더러 미연결
- 원본 뷰/CSS를 패키지에서 재동기화(이전 애드잇 임의 모션·팝업 패치 제거)
- 애드잇 전용: `midday-adit-ua-restore.css` — **원본 CSS 미수정**, Tailwind preflight가 지운 UA margin만 복원

## 4. 3단계 — 메트릭·캡처

### PC 1440×900 섹션 높이 (패키지 = 애드잇)

| 섹션 | height |
|------|--------|
| scrollHeight | 8816 |
| product(hero) | 900 |
| overview | 1440 |
| site | 1083 |
| premium | 1276 |
| floorplan | 1374 |
| why | 463 |
| faq | 404 |
| register | 712 |
| location | 805 |
| footer | 288 |

### 모바일 390×844

| 섹션 | height |
|------|--------|
| scrollHeight | 9531 |
| product | 640 |
| overview | 1309 |
| site | 1341 |
| premium | 1521 |
| floorplan | 1400 |
| why | 702 |
| faq | 459 |
| register | 743 |
| location | 1022 |
| footer | 337 |

캡처 파일(이 폴더):

- `adit-pc-footer.png` / `pkg-pc-footer.png`
- `adit-mobile-hero.png` / `pkg-mobile-hero.png`
- `pc-hero-shared-or-pkg.png` (히어로)

## 5. 발견한 차이와 수정

| 차이 | 조치 |
|------|------|
| 애드잇 midday 뷰가 패키지와 어긋남(TitleReveal 상시 표시, 리빌 opacity 강제, 팝업 zoom 등) | 패키지 파일로 뷰·CSS·TitleReveal·usePresaleEventPopup·dummy 재동기화 |
| Tailwind preflight가 `p`/`figure` UA margin 제거 → 섹션 높이 ~123px 차이 | `midday-adit-ua-restore.css` (특이도 (0,0,1), 원본 클래스 규칙 유지) |
| `info` 템플릿 Legal을 lc-footer로 다시 짠 이전 작업 | 이번 격리 midday 경로와 무관. **재구성 중단** 지시 이후 midday 기준으로만 진행 |

수정 후 PC·모바일 섹션 높이 **전부 일치**.

## 6. 4단계 — 데이터 연결

- 렌더러 재작성 없음. `MiddayOriginHost` + `readMiddayPresaleData` / `defaultMiddayPresaleData`(더미 clone+전화 정규화)가 adapter.
- 격리 비교는 더미 직결. Host 경로는 동일 `MiddayLandingView` 사용.
- 편집기 `forcePopup` 연결은 원본 뷰 복원으로 **일시 미연결**(Host에서 props ignore). 디자인 변경 없이 최소 재연결 예정.
- 애드잇 정책(섹션 복제·직접 발행·내부 관심고객·3개월·만료 7일 전 알림)은 유지. 이를 이유로 스킨 CSS는 바꾸지 않음.

## 7. 아직 다른 부분 / 확인하지 못한 부분

**아직 다름(환경)**

- 애드잇 Next.js Dev Tools「1 Issue」뱃지(패키지에는 없음)
- 루트 `globals.css` Pretendard Variable vs 패키지 static Pretendard CDN(메트릭은 일치했으나 글리프 미세차는 가능)
- 편집기 캔버스 크롬·`info` 템플릿 공통 Legal 경로(이번 격리 midday 비교 범위 밖)

**확인하지 못함**

- 직방 운영 라이브 화보형 URL과의 시각 동일성
- 모션 타이밍 프레임 단위 픽셀 diff(리빌 IO·커서 피크 프레임 시퀀스)
- `MiddayOriginHost`에 프로젝트 DB 스냅샷을 넣은 뒤의 픽셀 동일성(더미 외 데이터)
- 편집기 forcePopup 미리보기 재연결 후 회귀

## 8. 다음

1. Host에 forcePopup 최소 optional만 재연결  
2. midday 프로젝트 에디터/공개 URL을 동일 더미로 채워 Host 경로 메트릭 재확인  
3. 라이브 직방 화보형 URL이 있으면 패키지와 별도 대조
