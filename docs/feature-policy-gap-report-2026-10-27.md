# 애드잇 랜딩빌더 · 기능·정책 대조 및 검증 보고

작성일: 2026-10-27  
작업 repo: `C:\Users\찬현\Desktop\내 폴더\개발\landing` (`adonehomepage/ad.one.homepage`)  
브랜치: `main` (전환·stash·commit·push 없음)  
직방 repo: 미접근

---

## 0. 작업 위치

| 항목 | 값 |
| --- | --- |
| 경로 | `C:\Users\찬현\Desktop\내 폴더\개발\landing` |
| remote | `adonehomepage/ad.one.homepage` (애드잇) |
| 브랜치 | `main` |
| 직방 repo | 미접근 |

---

## 1. 기준 문서 역할

| 문서 | 역할 |
| --- | --- |
| `docs/product-spec.md` | **기능·정책 기준** (동작·규칙) |
| `Downloads/CURSOR-Presale-Template-v2.md` + FOREON HTML | **디자인·인터랙션 참고** |
| 프리미엄 화보형 샘플 팩 | 예시 카피·이미지 |

원본 명세에 `FEATURE-` / `POLICY-` ID가 없어, 장·절 기준으로 ID를 부여해 대조했다.

### 확인 필요 (충돌·미확정)

| ID | 내용 |
| --- | --- |
| CONF-001 | **결정·반영** — FAQ는 기본 템플릿·샘플에서 제외. 기존 DB는 `fill-sample.ts`로 숨김·재채움. 렌더러는 레거시만 유지 |
| CONF-002 | **결정·반영** — v1은 foreon 제공, 단지 정보형은 카탈로그 오픈 대기 |
| CONF-003 | **결정·반영** — 히어로 영상 UX·카피 제거, 이미지 전용. 영상은 후속 |
| CONF-004 | 법인명·수집주체·보관기간·카카오 채널 (설정값, 복사 금지) |
| CONF-005 | R2·상용 알림톡 — 결제/계약 전 보류 |

위 항목은 추측으로 바꾸지 않았다.

---

## 2. 이번 구현

**FEATURE-EDIT-04 복제본 삭제** (숨기기와 분리)

- `removeCloneSection` + API 재사용
- 좌측 패널: `복제 n/3` · 복제 · 숨기기 · **복제본 삭제**(확인 다이얼로그)
- 수정 파일:
  - `src/modules/sections/duplicate.ts`
  - `src/modules/sections/duplicate.test.ts`
  - `src/modules/editor/editor-shell.tsx`
  - `src/modules/projects/draft-defaults.ts`
  - `src/app/api/projects/[id]/sections/[sectionId]/route.ts`
  - `e2e/publish.spec.ts`

---

## 3. ID별 최종 상태 (요약)

| ID | 상태 | 검증 |
| --- | --- | --- |
| FEATURE-AUTH-01~03, POLICY-ORG-01 | 일치 | 코드 |
| FEATURE-PROJ-01~03 | 일치 | E2E 통과 |
| FEATURE-TMPL-01 (2종) | **부분** (foreon 제공 + 단지 정보형 오픈 대기) | 코드 |
| POLICY-TMPL-02 (FAQ 제외) | **일치** (신규 템플릿·샘플에서 FAQ 제외, 레거시만 렌더) | 코드 |
| FEATURE-TMPL-03 (영상) | **일치** (히어로 이미지 전용, 영상 UX 제거) | 코드 |
| FEATURE-EDIT-01~03,05~08 | 일치 | vitest + 브라우저 |
| FEATURE-EDIT-04 | **일치(이번 보완)** | vitest + 브라우저(복제→삭제→overview 1개) |
| FEATURE-EDIT-09 (단일 히어로) | 부분 일치(이전 작업) | 코드 |
| FEATURE-PUB-01~03 | 일치 | **브라우저 API 플로우 + E2E** |
| FEATURE-MEDIA-01 | 부분 일치 (local, R2 보류) | 코드 |
| FEATURE-LEAD / RCV / LIFE / ANL / AUD | 일치~부분 | 코드 (상용 발송·실접수는 미연동) |
| FEATURE-NOTI-01 | 부분 일치 (sandbox + after() 처리) | 코드 |
| POLICY-PII-01 | 적용 검토 필요 | 설정 미확정 |
| POLICY-EXCLUDE-01 | 일치 | 코드 검사 |

상세 대조표는 아래 §4를 본다.

---

## 4. 전체 대조표

상태: 일치 | 부분 일치 | 미구현 | 미확인 | 적용 검토 필요

| ID | 요구 동작·정책 | 현재 상태 | 차이 | 수정 대상 | 관련 ID | 검증 |
| --- | --- | --- | --- | --- | --- | --- |
| FEATURE-AUTH-01 | 초대 기반 로그인·비밀번호 | 일치 | — | auth/service | POLICY-AUTH-01 | 로그인 E2E |
| FEATURE-AUTH-02 | 계정 정지·세션 무효 | 일치 | — | members/service | POLICY-AUTH-01 | 코드+단위 |
| FEATURE-AUTH-03 | SYSTEM_ADMIN/MEMBER | 일치 | — | constants, withAdmin | — | 코드 |
| POLICY-ORG-01 | organization_id 격리 | 일치 | — | schema, services | — | 코드 |
| FEATURE-PROJ-01 | 생성·목록·상태머신 | 일치 | — | projects, publishing | POLICY-LIFE-01 | E2E publish |
| FEATURE-PROJ-02 | 운영기간 기본 3개월/N개월 | 일치 | — | constants, new/page | — | UI+코드 |
| FEATURE-PROJ-03 | slug 독립입력·예약어·중복 | 일치 | — | RESERVED_SLUGS, check-slug | — | 단위+E2E |
| FEATURE-TMPL-01 | 템플릿 2종 | 부분 일치 | foreon 제공 + 단지 정보형 오픈 대기 | definitions, new/page | CONF-002 | 생성 UI |
| POLICY-TMPL-02 | FAQ 섹션 제외 | 일치 | 신규·샘플 FAQ 없음, DB 레거시만 렌더 | definitions, landing-page | CONF-001 | 코드 |
| FEATURE-TMPL-03 | 히어로 이미지/영상 | 일치 | 히어로 이미지 전용, 영상 UX 제거 | landing-page, property-panel | CONF-003 | 편집기 |
| FEATURE-EDIT-01 | 섹션 복제 원본당 ≤3 | 일치 | — | duplicate.ts | — | vitest |
| FEATURE-EDIT-02 | DnD 정렬 + 키보드 대체 | 일치 | — | editor-shell | — | 브라우저 |
| FEATURE-EDIT-03 | ON/OFF(숨기기)·내용보존 | 일치 | 라벨 숨기기 | editor-shell | — | 브라우저 |
| FEATURE-EDIT-04 | 복제본 삭제 | 일치 | UI·확인·단위·브라우저 검증 완료 | editor-shell, duplicate.ts, DELETE API | FEATURE-EDIT-03 | 브라우저+vitest |
| FEATURE-EDIT-05 | GNB 동기화 | 일치 | — | gnbItemsFromSections | — | vitest |
| FEATURE-EDIT-06 | 섹션 추가 금지 | 일치 | — | editor | POLICY-TMPL | 코드검사 |
| FEATURE-EDIT-07 | 자동저장·충돌 | 일치 | — | draft route | — | 코드 |
| FEATURE-EDIT-08 | PC/모바일 미리보기·noindex | 일치 | — | editor, preview | — | 브라우저 |
| FEATURE-EDIT-09 | 히어로 단일 이미지·반응형 | 부분 일치 | 모바일 필드 제거, 데이터 유지 | landing-page, property-panel | — | 브라우저 |
| FEATURE-PUB-01 | 작업본/공개본 분리 | 일치 | — | publishing | — | E2E |
| FEATURE-PUB-02 | 발행·재발행 | 일치 | — | publish API | — | E2E |
| FEATURE-PUB-03 | 버전 5개·복구 | 일치 | — | versions | — | E2E |
| FEATURE-MEDIA-01 | 이미지 업로드 | 부분 일치 | local 동작, R2 보류 | uploads, storage | CONF-005 | 업로드 |
| FEATURE-LEAD-01 | 이름·연락처·동의·스냅샷 | 일치 | 수집 플래그/설정 의존 | leads | POLICY-PII-01 | 코드 |
| FEATURE-LEAD-02 | 목록·메모·내보내기 | 일치 | — | leads admin | — | 코드 |
| FEATURE-RCV-01 | 수신자 ≤5·인증 | 일치 | — | recipients | — | 단위 |
| FEATURE-NOTI-01 | 리드 즉시 알림 | 부분 일치 | 잡 생성+후처리 있음, 상용채널 sandbox | notifications | CONF-004 | 코드 |
| FEATURE-LIFE-01 | 만료 7일전·만료·30일정리 | 일치 | 발송 sandbox | lifecycle jobs | — | 코드 |
| FEATURE-ANL-01 | 방문·클릭·UTM·PDF | 일치 | — | analytics, reports | — | 코드 |
| FEATURE-AUD-01 | 감사로그·설정·privacy | 일치 | privacy placeholder | audit, settings | CONF-004 | 코드 |
| POLICY-PII-01 | 수집주체 실명·동의 | 적용 검토 필요 | 설정 미확정 시 수집 차단 | settings, leads | CONF-004 | 설정화면 |
| POLICY-EXCLUDE-01 | 결제·광고주계정·승인대기 제외 | 일치 | — | — | — | 코드검사 |

---

## 5. 수행한 테스트

### 코드 검사

- `vitest` `src/modules/sections/duplicate.test.ts` — 5통과 (복제 한도·GNB·복제본 삭제)
- `tsc --noEmit` — 통과
- Playwright `e2e/publish.spec.ts` — 통과 (생성→발행→비공개→재공개→버전)

### 브라우저 검증 (코드 검사와 구분)

- 편집기: 복제 → `복제 1/3` · `복제본 삭제` → 확인 → draft `overviewCount: 1`
- 연결 흐름(세션 fetch):
  1. 프로젝트 생성
  2. 저장
  3. 재조회
  4. 발행
  5. 공개 페이지 확인
  6. 수정 (공개 미반영 확인)
  7. 재발행 (공개 반영 확인)
  8. 버전 2개 확인  
  → **통과**
- 실접수·카카오 상용 발송·운영 배포 — **미실시** (승인 환경 필요)

---

## 6. 남은 차이 / 실행 전 결정

1. ~~템플릿 2종·FAQ·히어로 영상~~ — CONF-001/002/003 반영 완료(2026-10-28)
2. **상용 알림톡/이메일·R2** — 공급자 키·비용·CONF-004 / CONF-005; 지금은 sandbox / local
3. 프로젝트 목록 a11y 스냅샷에 “불러오는 중…”이 남는 현상 — API는 200, 기능 플로우는 정상. UI 잔여 표시는 별도 확인 가능

위험한 마이그레이션·유료 연동·운영 배포는 하지 않았다.

---

## 7. 핵심 금지사항 (product-spec)

섹션 추가 없음 / FAQ는 신규·샘플에서 제외(DB 레거시만 렌더, `fill-sample`로 숨김) / 제작 신청 없음 / 승인 대기 없음 / 광고주 계정 없음 / 결제 없음 / 직방 자산 재사용 없음.
