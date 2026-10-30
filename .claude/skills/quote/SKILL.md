---
name: quote
description: 사용자에게 고객사·품목·날짜를 물어 확정한 뒤 견적서 hwpx를 outputs/에 만든다. "견적서 만들어줘", "견적 내줘", "견적서" 요청에 사용.
argument-hint: "[고객사·품목 등 이미 정한 내용, 없으면 질문으로 받음]"
allowed-tools: Read Glob Grep Edit Write Agent AskUserQuestion Bash(node scripts/*) Bash(node */scripts/*) Bash(cp examples/*)
---

# 견적서 만들기

**쓸 때**: 견적서를 만들 때. **안 쓸 때**: 과업지시서(→ sow), 단가표만 고칠 때, 질문만 할 때.

사용자가 이미 준 내용: $ARGUMENTS

## 0. 가장 먼저(도구를 쓰기 전에) 이 3줄을 한국어로 말한다
> ① 회사 규칙(CLAUDE.md)을 읽었고 ② 견적 매뉴얼(quote 스킬)로 ③ 정보 확인 → 견적 담당(quote-writer) 작성 → 검수 담당(reviewer) 확인 순서로 진행합니다.

## 1. 회사 정보 확인 (메인 대화)
`data/company.md`와 `data/prices.md`가 비어 있으면 견적 전에 AskUserQuestion으로 묻는다. 질문과 선택지는 [references/questions.md](references/questions.md).
- 「예시 회사(새벽웹스튜디오)로 먼저 해 보기」를 고르면 `cp examples/saebyeok/company.md data/company.md`, `cp examples/saebyeok/prices.md data/prices.md`.
- 직접 입력하면 `data/company.md`에 채워 두고 다음부터 다시 묻지 않는다.

## 2. 견적 정보 묻기 (메인 대화)
AskUserQuestion으로 고객사 · 담당자 · 용역명 · 품목과 수량 · 견적일 · 오픈 희망일 · 비고를 묻는다. 이미 받은 값은 다시 묻지 않는다. 단가표에 없는 품목은 단가를 묻고, 단가표에 추가할지 확인한다.

## 3. 확인하고 기록하기 (메인 대화)
모은 값을 한 번 요약해 "이대로 만들까요?"를 묻는다. 확정되면 `outputs/_requests/{고객코드}.json`에 저장한다(형식은 references/questions.md). 고객코드 = 고객사 이름을 영문 소문자로(예: 바다상사 → `badasangsa`).

## 4. 맡기기
- 메인 대화는 `quote-writer` 서브에이전트에게 고객코드를 주고 작성을 맡긴다 → 받은 경로로 `reviewer`에게 검수를 맡긴다. 서브에이전트는 질문을 못 하므로 질문은 메인만 한다.
- **quote-writer 작성 단계**: ① `node scripts/calc.js outputs/_requests/{고객코드}.json` ② `node scripts/hwpx.js draft quote {고객코드}` ③ 원고 빈칸 채우기([references/template-fields.md](references/template-fields.md)) ④ `node scripts/hwpx.js fill quote {고객코드}`. 자동 검산이 틀렸다고 하면 고쳐서 다시 fill, 통과하면 `node scripts/hwpx.js clean`. 명령·오류는 [references/kordoc-commands.md](references/kordoc-commands.md).

## 5. 끝 보고 (3줄 + 파일)
> 읽은 파일: CLAUDE.md · data/company.md · data/prices.md · 요청 기록
> 맡긴 담당: quote-writer 작성 → reviewer 검수
> 검산 결과: 자동 검산 통과 · 합계 ○○원

평가: [evals/evals.json](evals/evals.json) · [evals/trigger-evals.json](evals/trigger-evals.json)
