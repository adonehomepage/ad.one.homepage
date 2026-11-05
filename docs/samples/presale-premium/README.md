# 프리미엄 화보형 예시 팩

원본: `C:\Users\찬현\Desktop\프리미엄-화보형-섹션예시`

| 경로 | 용도 |
|------|------|
| `00-섹션별-예시내용.md` | 섹션별 카피·이미지 매핑 |
| `/samples/presale-premium/*` (`public/samples/presale-premium/`) | 정적 이미지 |
| `src/modules/templates/definitions.ts` (`sampleByType` / `createTemplateSections`) | 코드에 넣는 예시 카피·이미지 |

**새 프로젝트·제작 미리보기**는 `createTemplateSections`가 처음부터 이 팩으로 채운다. 에디터에 「샘플로 채우기」 버튼은 없다.

기존 DB만 일괄 맞출 때: `npx tsx --env-file=.env.local src/scripts/fill-sample.ts`

한계: 삭제·삭제 예정 프로젝트는 건너뛴다. 기존 섹션은 카피·가시성을 갱신하고, 비어 있거나 foreon 원본 타입이 빠진 경우 해당 섹션을 INSERT한다. FAQ·독립 gallery 원본은 숨긴다. 현장명·전화·로고·상단 보조 문구·팝업 `enabled`는 draft/프로젝트 값을 유지한다.

WHY 직방·호갱노노·담당상담사·FAQ 섹션은 Adit에 포함하지 않는다.
