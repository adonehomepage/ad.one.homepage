# 독립형 분양 랜딩페이지 제작·운영 플랫폼

현재 폴더의 독립 프로젝트입니다. 직방 `red-ads-portal` 코드·시크릿은 재사용하지 않습니다.  
배포·인프라 패턴만 참고할 때는 [docs/zigbang-infra-request-prompt.md](docs/zigbang-infra-request-prompt.md)로 요약 MD를 요청하세요.

Git은 **`main`만** 사용합니다. `deploy`/`dev` 브랜치는 없습니다.  
원격: `https://github.com/adonehomepage/ad.one.homepage`

## 로컬 실행

1. Docker Desktop이 켜져 있는지 확인합니다.
2. `.env.example`을 참고해 `.env.local`을 만듭니다. `SESSION_SECRET`, `CRON_SECRET`, `PII_ENCRYPTION_KEY`, `PII_LOOKUP_HMAC_KEY`는 로컬 전용 난수로 넣습니다.
3. 아래를 실행합니다.

```bash
npm run db:up
npm run db:push
npm run db:seed
npm run dev
```

기본 시드 계정(로컬 전용):

- 아이디: `SEED_ADMIN_LOGIN` (기본 `teamadit`)
- 비밀번호: `SEED_ADMIN_PASSWORD`

헬스체크: `GET /api/health` (업타임) · `GET /api/ready` (DB)

## 구성

- 공개 랜딩: `/[slug]`
- 관리자: `/admin`
- 인증: 초대 기반 로그인. 공개 회원가입 없음.
- DB: 로컬 Postgres (`localhost:5433`, 컨테이너 `adit-landing-saas-db`)
- 스토리지: 로컬 `STORAGE_PROVIDER=local` / 배포 시 `s3`
- 알림: 샌드박스 기본. `LEAD_COLLECTION_ENABLED=false`

## Vercel 배포 (Preview = dev, Production = prod)

자세한 절차: [docs/deployment.md](docs/deployment.md)

요약:

1. Vercel에 GitHub 저장소 연결 (`main` → Production)
2. Preview / Production에 **서로 다른** `DATABASE_URL`·시크릿 설정
3. 배포 환경은 `STORAGE_PROVIDER=s3` (로컬 디스크 불가)
4. `LEAD_COLLECTION_ENABLED`와 실알림은 확정 전까지 끄기

## 출시 전 확정 필요

브랜드명, 운영 법인명, 개인정보 처리 주체, 공개 도메인, 카카오 채널, 실제 발송 공급자. 확정 전까지 실제 고객 데이터를 넣지 마세요.
