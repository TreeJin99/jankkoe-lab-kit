---
name: sow
description: outputs/의 견적서를 바탕으로 과업지시서 hwpx를 만든다. "과업지시서 만들어줘", "방금 견적서로 과업지시서", "과업지시서" 요청에 사용.
allowed-tools: Read Glob Grep Edit Write Bash(node scripts/*)
---

# 과업지시서 만들기

대상: $ARGUMENTS
(비어 있으면 `outputs/`에서 가장 최근에 저장된 `quote_{고객코드}.hwpx`)

1. **견적서 읽기**: `node scripts/hwpx.js read outputs/quote_{고객코드}.hwpx`. 고객사·담당자·건명·품목·합계를 적어 둔다. 희망 오픈일은 `inbox/`의 같은 고객코드 메일에서.
2. **과업 뽑기**: 견적서 품목 한 줄이 과업 한 줄. 무엇을 하는지와 산출물을 짧게 적는다.
3. **견적서와 맞추기**: 과업명 = 건명, 발주처·담당자 = 견적서 그대로, 계약금액 = 견적서 합계 + ` (부가세 포함)`.
4. **양식 채우기**
   - `node scripts/hwpx.js draft sow {고객코드}` → 원고의 빈칸을 [references/fields.md](references/fields.md) 대로 채운다.
   - `node scripts/hwpx.js fill sow {고객코드}` → `outputs/sow_{고객코드}.hwpx`.
   - 자동 검산이 틀렸다고 하면 고쳐서 다시 fill. 통과하면 `node scripts/hwpx.js clean`.
5. **검수**: 메인 대화가 `reviewer` 서브에이전트를 불러 검수를 맡긴다. (서브에이전트로 일하는 중이면 4단계까지만 하고 보고한다.)
