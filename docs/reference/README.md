# landing에 이식한 인프라·최적화 (직방 코드 비포함)

직방 저장소는 수정하지 않았습니다. 일반 Next.js + Postgres + Vercel 패턴과 계획서의 안전한 항목만 반영했습니다.

## 직방 패턴 요약 (작업용 MD)

→ **[zigbang-red-ads-portal-infra-patterns.md](./zigbang-red-ads-portal-infra-patterns.md)**

요청용 빈 프롬프트: [zigbang-infra-request-prompt.md](../zigbang-infra-request-prompt.md)

## 반영됨

1. Preview(dev) / Production(prod) 환경 문서 · env 예시 분리 — [deployment.md](../deployment.md)
2. `STORAGE_PROVIDER=local|s3` 업로드·미디어 분기
3. 서버리스 DB 풀 축소 (`DB_POOL_MAX` / Vercel에서 max=1, prepare 조정)
4. `GET /api/health` (가벼움) · `GET /api/ready` (DB)
5. 보안 헤더 · API no-store · `/media` 장기 캐시 (`next.config.ts`)
6. Cron + `CRON_SECRET` + **Preview no-op**
7. `getDeployEnv` / `isProd` / `isNonProd` · `FEATURE_LEAD_ADMIN`
8. `generateBuildId` ← `VERCEL_GIT_COMMIT_SHA`
9. `npm run verify` · Ignore Build Step 스크립트
10. `ERROR_MONITORING_DSN` 설정 키 유지 (연동은 DSN 확정 후)
11. `LEAD_COLLECTION_ENABLED=false` 기본 유지

시크릿 값·직방 비즈니스 로직은 가져오지 않습니다.
