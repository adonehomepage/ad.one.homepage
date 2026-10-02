# Vercel 배포 · 환경 분리 (Preview = dev, Production = prod)

운영 브랜치는 **`main`**, 개발 점검은 **`deploy/dev`** 입니다.  
환경 분리는 Vercel **Preview(개발)** / **Production(운영)** 과 각각의 시크릿·DB·R2 버킷으로 합니다.

| 주소 | 환경 | 브랜치 |
|------|------|--------|
| https://ad-one-homepage.vercel.app | Production | `main` push |
| https://ad-one-homepage-dev.vercel.app | Preview | `deploy/dev`로 만든 Preview에 별칭을 다시 붙인 뒤 |

`deploy/dev`에 push하면 Preview 배포는 새로 생기지만, 짧은 개발 주소는 자동으로 따라가지 않습니다. Ready가 된 그 Preview 배포에 `ad-one-homepage-dev.vercel.app` 별칭을 다시 지정합니다.

## 환경 매핑

| 구분 | Vercel | APP_ENV | DB | 용도 |
|------|--------|---------|----|------|
| 로컬 | - | `local` | Docker `localhost:5433` | 개발자 PC |
| 개발(dev) | Preview | `preview` | Neon/Supabase **dev** DB | PR·미리보기 URL |
| 운영(prod) | Production | `production` | Neon/Supabase **prod** DB | 확정 도메인 |

관심고객 실제 수집(`LEAD_COLLECTION_ENABLED`)과 실알림은 **법인·처리 주체 확정 전 `false` / sandbox 유지**.

헬퍼: `getDeployEnv()` / `isProd()` / `isNonProd()` (`src/lib/deploy-env.ts`)

## GitHub → Vercel

1. Vercel에 `adonehomepage/ad.one.homepage` 연결
2. Production Branch: `main`
3. 개발 배포: 브랜치 `deploy/dev` (대시보드 Deployments → Create Deployment → `deploy/dev` → Create Preview Deployment)
4. Framework: Next.js, Build: `npm run build`, Install: `npm ci`
5. (선택) Build Command 앞에 검증: `npm run verify && npm run build`
6. (선택) **Ignore Build Step**: `node scripts/vercel-ignore-build.mjs`  
   → `docs/**`·`*.md`만 바뀐 push는 빌드 스킵

## 환경 변수 (이름만 · 값은 Vercel UI에)

**공통(양쪽)**  
`APP_NAME`, `APP_TIMEZONE`, `SESSION_SECRET`, `CRON_SECRET`, `PII_ENCRYPTION_KEY`, `PII_LOOKUP_HMAC_KEY`,  
`LEAD_COLLECTION_ENABLED=false`, `EMAIL_PROVIDER=sandbox`, `KAKAO_MESSAGE_PROVIDER=sandbox`

**Preview / Production 각각 다르게**

| 키 | Preview(dev) | Production(prod) |
|----|--------------|------------------|
| `APP_ENV` | `preview` | `production` |
| `APP_PUBLIC_URL` | `https://ad-one-homepage-dev.vercel.app` | `https://ad-one-homepage.vercel.app` |
| `APP_ADMIN_URL` | 개발 주소와 동일 | 운영 주소와 동일 |
| `DATABASE_URL` | **dev** Postgres | **prod** Postgres |
| `STORAGE_PROVIDER` | `s3` | `s3` |
| `STORAGE_BUCKET_PUBLIC` | `public-assets-dev` | `public-assets` |
| `STORAGE_BUCKET_PRIVATE` | `private-assets-dev` | `private-assets` |
| `STORAGE_PUBLIC_BASE_URL` | `https://ad-one-homepage-dev.vercel.app/media` | `https://ad-one-homepage.vercel.app/media` |
| `S3_*` | 같은 R2 계정 자격 증명, 버킷 이름만 다름 | 왼쪽과 같은 계정 |
| `ERROR_MONITORING_DSN` | 선택(dev 프로젝트) | 운영 DSN |

선택 플래그:

| 키 | 설명 |
|----|------|
| `FEATURE_LEAD_ADMIN` | prod에서 관심고객 UI 강제 노출. 비우면 prod는 수집 활성 시에만 |
| `CRON_ALLOW_NON_PROD` | Preview에서도 cron 실작업 (기본 false) |

Vercel에 `CRON_SECRET`을 넣으면 Cron 요청에 `Authorization: Bearer …`가 붙고, 앱의 `assertCron`과 맞습니다. ([vercel.json](../vercel.json))  
**Preview cron은 인증 후 `{ skipped: true }`로 no-op** 합니다. Production만 실작업합니다.

## DB

- 로컬: `docker compose` + `npm run db:push` / `db:seed`
- Preview/Prod: 관리형 Postgres **인스턴스(또는 브랜치)를 분리**
- 배포 후 스키마: CI 또는 수동으로 `drizzle-kit push` / migrate (프로덕션은 배포 직후 1회 확인)

## 스토리지

서버리스에서는 `STORAGE_PROVIDER=local`이 동작하지 않습니다.

- 로컬: `local` + `./storage` + `/media/...`
- Preview/Prod: Cloudflare R2를 S3 호환 API로 사용 (`STORAGE_PROVIDER=s3`)
  - 버킷 4개: `public-assets`, `private-assets`, `public-assets-dev`, `private-assets-dev`
  - 버킷 공개 접근은 끈 채로 둡니다. 이미지는 앱의 `/media/{버킷}/{키}`가 R2에서 읽어 보냅니다.
  - `S3_REGION=auto`, `S3_FORCE_PATH_STYLE=true`
  - `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`는 R2 계정 API 토큰의 S3 자격 증명입니다. 토큰 값(`cfat_…`)은 앱이 쓰지 않습니다.
  - 값은 Vercel에만 두고, 문서·채팅·스크린샷에 넣지 않습니다.

## 헬스체크

| 경로 | 역할 |
|------|------|
| `GET /api/health` | 업타임용 — DB 없이 항상 200 |
| `GET /api/ready` | DB `select 1` — 실패 시 503 |

## 배포 체크리스트 (운영 전)

- [ ] Preview와 Production `DATABASE_URL`이 서로 다름
- [ ] `LEAD_COLLECTION_ENABLED=false` (확정 전)
- [ ] 알림 공급자 sandbox
- [ ] `SESSION_SECRET` / PII 키가 환경별로 다르고 충분히 긴가
- [ ] `/api/health` 200, `/api/ready` 200
- [ ] Preview cron이 `{ skipped: true }` (실데이터 미변경)
- [ ] 스토리지 = s3
- [ ] 미완성 관심고객 UI가 prod에서 숨겨짐(또는 `FEATURE_LEAD_ADMIN` 의도적 허용)
- [ ] 시크릿이 PR·스크린샷·문서에 없음

## 직방 참고 MD

요청문: [zigbang-infra-request-prompt.md](./zigbang-infra-request-prompt.md)  
받은 요약: [reference/zigbang-red-ads-portal-infra-patterns.md](./reference/zigbang-red-ads-portal-infra-patterns.md)
