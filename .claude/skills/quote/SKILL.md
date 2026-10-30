---
name: quote
description: 받은 메일(inbox/)을 읽고 단가표로 계산해 견적서 hwpx를 outputs/에 만든다. "견적서 만들어줘", "이 메일로 견적 내줘", "견적서" 요청에 사용.
argument-hint: "[메일 파일 이름, 생략하면 가장 최근 메일]"
allowed-tools: Read Glob Grep Edit Write Agent Bash(node scripts/*) Bash(node */scripts/*)
---

# 견적서 만들기

**쓸 때**: 고객 메일로 견적서를 만들 때. **안 쓸 때**: 과업지시서(→ sow), 결과보고서(→ report), 단가표만 고칠 때, 질문만 할 때.

대상 메일: $ARGUMENTS
(비어 있으면 `inbox/`에서 파일 이름 날짜가 가장 늦은 메일. 고객코드 = 파일 이름의 날짜 뒤 부분, 예: `2026-10-28_badasangsa.txt` → `badasangsa`)

## 누가 하나
- **메인 대화**: 직접 쓰지 않는다. ① `quote-writer` 서브에이전트에게 메일 파일과 고객코드를 주고 작성을 맡긴다 → ② 받은 파일 경로로 `reviewer` 서브에이전트에게 검수를 맡긴다 → ③ 통과하면 파일 이름과 합계만 보고한다. "돌려보냄"이면 그 내용을 quote-writer에게 다시 맡긴다.
- **quote-writer**: 아래 작성 단계 1~4만 한다. 다른 서브에이전트를 부르지 않는다.

## 작성 단계
1. **메일 읽기**: 고객사, 담당자(메일 글자 그대로), 요청, 희망 오픈일.
2. **품목 고르기**: [references/item-mapping.md](references/item-mapping.md) 대로 `data/prices.md` 코드와 수량을 정한다.
3. **계산**: `node scripts/calc.js W-01:1 W-03:7 ...` 결과를 그대로 옮긴다. 직접 계산하지 않는다.
4. **양식 채우기**: `node scripts/hwpx.js draft quote {고객코드}` → 원고 빈칸 채우기([references/template-fields.md](references/template-fields.md)) → `node scripts/hwpx.js fill quote {고객코드}`. 자동 검산이 틀렸다고 하면 고쳐서 다시 fill, 통과하면 `node scripts/hwpx.js clean`. 명령·오류는 [references/kordoc-commands.md](references/kordoc-commands.md).

평가: [evals/evals.json](evals/evals.json) · [evals/trigger-evals.json](evals/trigger-evals.json)
