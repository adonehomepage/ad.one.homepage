# 독립형 분양 랜딩페이지 제작·운영 플랫폼

현재 폴더에서 새로 만든 독립 프로젝트입니다. 기존 red-ads-portal, 직방 저장소·코드·에셋·환경변수는 사용하지 않습니다.

Git은 `main` 브랜치로만 초기화되어 있습니다. `deploy`/`dev` 브랜치는 만들지 않았습니다. 원격 GitHub는 나중에 연결하면 됩니다.

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

## 구성

- 공개 랜딩: `/[slug]`
- 관리자: `/admin`
- 인증: 초대 기반 이메일 로그인. 공개 회원가입 없음.
- DB: 이 프로젝트 전용 Postgres (`localhost:5433`, 컨테이너 `adit-landing-saas-db`)
- 알림: 채널 미연결 시 샌드박스 어댑터. 실제 고객 개인정보 수집은 `LEAD_COLLECTION_ENABLED=false`가 기본입니다.

## 출시 전 확정 필요

브랜드명, 운영 법인명, 개인정보 처리 주체, 공개 도메인, 카카오 채널, 실제 발송 공급자는 아직 설정값입니다. 확정 전까지 실제 고객 데이터를 넣지 마세요.
