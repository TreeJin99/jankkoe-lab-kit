---
name: report
description: 과업지시서와 작업일지(data/worklog_*.md)로 결과보고서 hwpx를 만든다. "결과보고서 만들어줘", "작업일지로 결과보고서", "결과보고서" 요청에 사용.
allowed-tools: Read Glob Grep Edit Write Bash(node scripts/*)
---

# 결과보고서 만들기

대상: $ARGUMENTS
(비어 있으면 `data/worklog_{고객코드}.md`가 있는 고객 중 가장 최근)

1. **자료 읽기**: `node scripts/hwpx.js read outputs/sow_{고객코드}.hwpx` 와 `data/worklog_{고객코드}.md`. 사업명·고객사·담당자·계약금액은 과업지시서에서, 한 일과 숫자는 작업일지에서.
2. **수행 내용 뽑기**: 과업 한 줄마다 작업일지에서 실제로 한 일과 결과를 찾는다. 6줄이 넘으면 비슷한 것끼리 묶는다.
3. **숫자 맞추기**: 실적 숫자는 작업일지에 적힌 것만. 없으면 `확인 필요`. 작성일은 작업일지의 "보고서 작성일".
4. **양식 채우기**
   - `node scripts/hwpx.js draft report {고객코드}` → 원고의 빈칸을 [references/fields.md](references/fields.md) 대로 채운다.
   - `node scripts/hwpx.js fill report {고객코드}` → `outputs/report_{고객코드}.hwpx`.
   - 자동 검산이 틀렸다고 하면 고쳐서 다시 fill. 통과하면 `node scripts/hwpx.js clean`.
5. **검수**: 메인 대화가 `reviewer` 서브에이전트를 불러 검수를 맡긴다. (서브에이전트로 일하는 중이면 4단계까지만 하고 보고한다.)
