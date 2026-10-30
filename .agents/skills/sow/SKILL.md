---
name: sow
description: outputs/의 견적서를 바탕으로 과업지시서 hwpx를 만든다. "과업지시서 만들어줘", "방금 견적서로 과업지시서", "과업지시서" 요청에 사용.
allowed-tools: Read Glob Grep Edit Write Agent Bash(node scripts/*) Bash(node */scripts/*)
---

# 과업지시서 만들기

**쓸 때**: 만들어 둔 견적서로 과업지시서를 만들 때. **안 쓸 때**: 견적서·결과보고서를 만들 때.

**견적서가 없으면**: 아무것도 만들지 말고 "견적서가 없어 과업지시서를 만들 수 없습니다. 견적서부터 만들까요?"라고 답하고 멈춘다.

대상: $ARGUMENTS
(비어 있으면 `outputs/`에서 가장 최근에 저장된 `quote_{고객코드}.hwpx`)

## 누가 하나
- **메인 대화**: 직접 쓰지 않는다. ① `doc-writer` 서브에이전트에게 "과업지시서, 고객코드 ○○"로 작성을 맡긴다 → ② 받은 파일 경로로 `reviewer`에게 검수를 맡긴다 → ③ 통과하면 파일 이름과 계약금액만 보고한다.
- **doc-writer**: 아래 작성 단계 1~4만 한다. 다른 서브에이전트를 부르지 않는다.

## 작성 단계
1. **견적서 읽기**: `node scripts/hwpx.js read outputs/quote_{고객코드}.hwpx`. 희망 오픈일은 같은 고객코드 메일에서.
2. **과업 뽑기**: 견적서 품목 한 줄이 과업 한 줄. 과업 내용과 산출물을 짧게.
3. **견적서와 맞추기**: 과업명 = 건명, 발주처·담당자 = 견적서 그대로, 계약금액 = 견적서 합계 + ` (부가세 포함)`.
4. **양식 채우기**: `node scripts/hwpx.js draft sow {고객코드}` → 빈칸 채우기([references/template-fields.md](references/template-fields.md)) → `node scripts/hwpx.js fill sow {고객코드}`. 자동 검산이 틀렸다고 하면 고쳐서 다시 fill, 통과하면 `node scripts/hwpx.js clean`. 명령·오류는 [references/kordoc-commands.md](references/kordoc-commands.md).

평가: [evals/evals.json](evals/evals.json) · [evals/trigger-evals.json](evals/trigger-evals.json)
