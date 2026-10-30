---
name: report
description: 과업지시서와 작업일지(data/worklog_*.md)로 결과보고서 hwpx를 만든다. "결과보고서 만들어줘", "작업일지로 결과보고서", "결과보고서" 요청에 사용.
argument-hint: "[고객코드, 생략하면 작업일지가 있는 가장 최근 고객]"
allowed-tools: Read Glob Grep Edit Write Agent Bash(node scripts/*) Bash(node */scripts/*)
---

# 결과보고서 만들기

**쓸 때**: 일이 끝나고 작업일지로 결과보고서를 만들 때. **안 쓸 때**: 견적서·과업지시서를 만들 때.

**과업지시서나 작업일지가 없으면**: 아무것도 만들지 말고 무엇이 없는지 알려 주고 멈춘다.

대상: $ARGUMENTS
(비어 있으면 `data/worklog_{고객코드}.md`가 있는 고객 중 가장 최근)

## 누가 하나
- **메인 대화**: 직접 쓰지 않는다. ① `doc-writer` 서브에이전트에게 "결과보고서, 고객코드 ○○"로 작성을 맡긴다 → ② 받은 파일 경로로 `reviewer`에게 검수를 맡긴다 → ③ 통과하면 파일 이름만 보고한다.
- **doc-writer**: 아래 작성 단계 1~4만 한다. 다른 서브에이전트를 부르지 않는다.

## 작성 단계
1. **자료 읽기**: `node scripts/hwpx.js read outputs/sow_{고객코드}.hwpx` 와 `data/worklog_{고객코드}.md`.
2. **수행 내용 뽑기**: 과업 한 줄마다 작업일지에서 실제로 한 일과 결과를 찾는다. 6줄이 넘으면 묶는다.
3. **숫자 맞추기**: 실적은 작업일지 숫자만. 계약금액·고객사·담당자는 과업지시서 그대로. 작성일은 작업일지의 "보고서 작성일".
4. **양식 채우기**: `node scripts/hwpx.js draft report {고객코드}` → 빈칸 채우기([references/template-fields.md](references/template-fields.md)) → `node scripts/hwpx.js fill report {고객코드}`. 자동 검산이 틀렸다고 하면 고쳐서 다시 fill, 통과하면 `node scripts/hwpx.js clean`. 명령·오류는 [references/kordoc-commands.md](references/kordoc-commands.md).

평가: [evals/evals.json](evals/evals.json) · [evals/trigger-evals.json](evals/trigger-evals.json)
