# red-ads-portal → landing SaaS 인프라·최적화 이식 가이드

> **대상:** `landing` (Next.js + Postgres + cron) 개발자  
> **출처:** `zigbang/red-ads-portal`에서 **패턴만** 추출 (시크릿·고객 데이터·직방 비즈니스 로직 제외)  
> **landing 현재 배포:** Vercel Preview = dev / Production = prod · 브랜치 `main`만 (`docs/deployment.md`)  
> 작성일: 2026-09-23

---

## 이식 우선순위 Top 10 (landing에 바로 쓰기)

| 순위 | 항목 | 난이도 | 비고 |
|------|------|--------|------|
| 1 | `APP_ENV` / deploy env 단일 헬퍼 (`local` \| `preview`/`dev` \| `production`/`prod`) | 낮음 | 기능 플래그·알림·시드 전부 이걸로 분기 |
| 2 | Preview(dev)·Production(prod) **DB·스토리지·시크릿 완전 분리** | 중간 | 배포 전 체크리스트로 고정 |
| 3 | Cron = `Authorization: Bearer CRON_SECRET` + **Production만 실작업** (Preview는 no-op) | 낮음 | Preview cron 중복 실행 방지 |
| 4 | `GET /api/health` — **항상 빠르게 200** (무거운 DB 검사는 별도 `/api/ready`) | 낮음 | 업타임 체크용 |
| 5 | 보안 헤더 + 정적/미디어 캐시 정책 (`Cache-Control` 분리) | 낮음 | HTML/API는 no-store, 해시 자산은 long-cache |
| 6 | 서버리스 Postgres 풀: `max=1`, prepare 비활성 등 | 낮음 | Vercel에서 커넥션 고갈 방지 |
| 7 | 미완성 기능은 **env 플래그로 PROD 숨김** (DEV에서만 노출) | 중간 | 배포는 같이 가도 UI/라우트만 차단 |
| 8 | 배포 전 `npm run build` + 가벼운 verify (CI) | 중간 | Vercel Build 또는 GitHub Action |
| 9 | 구조화 JSON 로그 (`event`, `deployEnv`, `pid`) — 부트/헬스 샘플링 | 낮음 | 관측 도구 붙이기 쉬움 |
| 10 | `generateBuildId`를 커밋 SHA에 고정 | 낮음 | 캐시 혼선 디버깅 |

**후순위:** AWS ECS+CDK+OIDC, ALB, CloudWatch — landing이 Vercel인 동안 필수 아님.

---

## 1. 환경 구성

### red-ads-portal (참고)

| 환경 | 역할 | 브랜치 트리거 | URL 패턴 |
|------|------|---------------|----------|
| `local` | 로컬 개발 | - | localhost |
| `dev` | 검증·실험 | `deploy/dev` push | `*-dev.*` |
| `prod` | 운영 | `master` push | 운영 도메인 |

- 헬퍼: `getDeployEnv()` → `"local" | "dev" | "prod"` (`NEXT_PUBLIC_DEPLOY_ENV`)
- 미완성 기능: `getDeployEnv() !== "prod"` 일 때만 라우트/GNB 노출
- 공개값(`NEXT_PUBLIC_*`)은 빌드에, 비밀은 SSM → 런타임 주입

### landing 권장

| 환경 | Vercel | `APP_ENV` | DB |
|------|--------|-----------|-----|
| local | - | `local` | Docker |
| dev | Preview | `preview` | **dev** DB |
| prod | Production | `production` | **prod** DB |

- 브랜치 `main`만 유지해도 됨. 분리는 Vercel Env Scope.
- `APP_PUBLIC_URL` / `APP_ADMIN_URL` / `STORAGE_PUBLIC_BASE_URL` 환경별 분리.

---

## 2. 배포

### red-ads (AWS 참고)

- GitHub Actions → OIDC → CDK → ECS
- 배포 전 Actions에서 `npm ci` + `npm run build` (+ verify)
- concurrency: **prod는 `cancel-in-progress: true`**, dev는 false
- `paths-ignore`: `*.md`, `docs/**` → 문서만 바꾼 push로 배포 스킵
- ALB health: `/api/health`

### landing (Vercel)에 가져올 것

1. Production = `main`만
2. Preview = PR / Preview Deploy
3. Build: `npm ci` → (선택) verify → `npm run build`
4. 문서-only 커밋은 Ignore Build Step으로 스킵 가능
5. 롤백: 이전 Production 배포 Redeploy
6. 배포 후: `/api/health` 200, 핵심 페이지 1회

**제외:** 사내 Verdaccio, OIDC role, CDK/ECS 스택 자체.

---

## 3. 환경 변수·시크릿 (이름만 · 값 금지)

| 카테고리 | 예시 키 | Preview vs Production |
|----------|---------|----------------------|
| 앱 | `APP_NAME`, `APP_ENV`, `APP_PUBLIC_URL`, `APP_ADMIN_URL` | URL·ENV만 다르게 |
| 세션 | `SESSION_SECRET` | **환경별 다른 값** |
| DB | `DATABASE_URL` | **인스턴스 분리** |
| PII | `PII_ENCRYPTION_KEY`, `PII_LOOKUP_HMAC_KEY` | 환경별 분리 |
| 스토리지 | `STORAGE_PROVIDER`, `S3_*`, `STORAGE_PUBLIC_BASE_URL` | 버킷/prefix 분리 |
| Cron | `CRON_SECRET` | 값 분리 권장 |
| 알림 | `EMAIL_PROVIDER`, 메시징 키 | preview=sandbox, prod=실채널(확정 후) |
| 플래그 | `LEAD_COLLECTION_ENABLED` | 확정 전 `false` |
| 모니터링 | `ERROR_MONITORING_DSN` | 프로젝트 분리 |

운영 규칙:

- `NEXT_PUBLIC_*` = 공개 가능 값만
- 비밀은 Vercel Encrypted — 문서/로그/이슈에 값 금지
- 필수 시크릿 비어 있으면 배포 fail
- PROD에 아직 없는 연동을 억지로 주입하지 말 것 (기동 hang)

---

## 4. 데이터·스토리지

| 주제 | 권장 |
|------|------|
| DB | Preview/Prod **별 DATABASE_URL** |
| 마이그레이션 | 배포 직후 drizzle push/migrate 1회 확인 |
| 업로드 | 서버리스에서는 `STORAGE_PROVIDER=s3` (local 금지) |
| 캐시 | 해시 자산 long-cache, HTML/index no-cache |

**함정:** pretty URL을 **rewrite**로 HTML에 매핑하면 상대경로 자산이 깨져 404가 난다.  
→ **redirect**로 실제 경로로 보내거나 절대 경로/`<base href>` 사용.

---

## 5. 백그라운드 작업

- HTTP Cron + `CRON_SECRET` Bearer
- **Production만** 실작업; Preview는 early-return `{ skipped: true }`
- instrumentation에서 무거운 `pg`/native 초기화 금지 → lazy start

---

## 6. 성능·안정성

### 가져오기 좋음

- `optimizePackageImports`
- `pg` 등 `serverExternalPackages`
- 부트 JSON 로그 1회
- health 로그 샘플링
- 권한 API `Cache-Control: no-store`
- 공개 GET만 `s-maxage` + SWR
- 기능 플래그로 PROD 미노출

### 당장 제외

- CDK / ECS / ALB / CloudWatch YAML
- 사내 npm·OIDC
- 직방 Slack/Sanity/호갱 전용 시크릿
- 상담사·비즈프로필·미디어믹스 도메인

---

## 7. 배포 전 체크리스트

- [ ] Preview ≠ Production `DATABASE_URL`
- [ ] `SESSION_SECRET` / PII 키 환경별·충분히 김
- [ ] `LEAD_COLLECTION_ENABLED=false` (확정 전)
- [ ] 알림 sandbox (prod 확정 전)
- [ ] Preview cron이 실데이터 안 건드림
- [ ] `/api/health` 200
- [ ] 스토리지 = s3
- [ ] 미완성 기능 prod off
- [ ] 시크릿이 PR·스크린샷·문서에 없음

---

## 8. 작업 티켓 초안

### P0

- `isProd` / `isNonProd` 헬퍼
- Cron Preview no-op

### P1

- `/api/health` vs `/api/ready` 분리
- 캐시·보안 헤더 점검

### P2

- `generateBuildId` ← `VERCEL_GIT_COMMIT_SHA`
- 미완성 기능 `FEATURE_*` 플래그

### 하지 말 것

- red-ads CDK/ECS 통째 이식
- 직방 시크릿·채널·도메인 복사

---

## 9. red-ads에서 보면 좋은 경로 (패턴만)

- `lib/deploy-env.ts`
- `lib/*-feature-flags.ts`
- `.github/workflows/deploy-dev.yml`, `deploy-prod.yml`
- `next.config.js` (buildId, headers, redirect vs rewrite)
- `app/api/health/route.ts`
- `app/api/cron/*/route.ts`
- `instrumentation.ts`
- `ci/cdk/app.ts` (공개 env vs 시크릿 분리 개념)

landing: `docs/deployment.md`, `docs/reference/README.md`
