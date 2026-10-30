---
name: sow
description: outputs/의 견적서를 이어받아 빠진 것만 물은 뒤 과업지시서 hwpx를 만든다. "과업지시서 만들어줘", "방금 견적서로 과업지시서", "과업지시서" 요청에 사용.
allowed-tools: Read Glob Grep Edit Write Agent AskUserQuestion Bash(node scripts/*) Bash(node */scripts/*)
---

# 과업지시서 만들기

**쓸 때**: 만들어 둔 견적서로 과업지시서를 만들 때. **안 쓸 때**: 견적서를 만들 때(→ quote).

대상: $ARGUMENTS
(비어 있으면 `outputs/`에서 가장 최근에 저장된 `quote_{고객코드}.hwpx`)

**견적서가 없으면**: 아무것도 만들지 말고 "견적서가 없어 과업지시서를 만들 수 없습니다. 먼저 견적서를 만들까요?"라고 묻고 멈춘다.

## 0. 먼저 이렇게 말한다 (3줄)
> ① 회사 규칙(CLAUDE.md)을 읽었고 ② 과업지시서 매뉴얼(sow 스킬)로 ③ 견적서 이어받기 → 문서 담당(doc-writer) 작성 → 검수 담당(reviewer) 확인 순서로 진행합니다.

## 1. 이어받고 빠진 것만 묻기 (메인 대화)
- 견적서·요청 기록(`outputs/_requests/{고객코드}.json`)에서 고객사 · 담당자 · 용역명 · 품목 · 합계 · 오픈 희망일을 가져온다.
- AskUserQuestion으로 빠진 것만 묻는다: 과업 시작일(오늘 / 계약일 / 직접 입력) · 산출물 추가(없음 / 직접 입력) · 오픈일이 "미정"이면 오픈일.
- 수정 횟수·하자보수는 `data/company.md`의 계약 조건을 쓴다. 비어 있으면 묻고, company.md에 저장할지 확인한다.
- 받은 값은 요청 기록에 `sow` 항목으로 덧붙인다(`{"start": "2026. 10. 30.", "deliverables": [...]}`).

## 2. 맡기기
- 메인 대화는 `doc-writer`에게 고객코드를 주고 작성을 맡긴다 → 받은 경로로 `reviewer`에게 검수를 맡긴다. 질문은 메인만 한다.
- **doc-writer 작성 단계**: ① `node scripts/hwpx.js read outputs/quote_{고객코드}.hwpx` ② `node scripts/hwpx.js draft sow {고객코드}` ③ 원고 빈칸 채우기([references/template-fields.md](references/template-fields.md)) ④ `node scripts/hwpx.js fill sow {고객코드}`. 자동 검산이 틀렸다고 하면 고쳐서 다시 fill, 통과하면 `node scripts/hwpx.js clean`. 명령·오류는 [references/kordoc-commands.md](references/kordoc-commands.md).

## 3. 끝 보고 (3줄 + 파일)
> 읽은 파일: CLAUDE.md · data/company.md · 견적서 · 요청 기록
> 맡긴 담당: doc-writer 작성 → reviewer 검수
> 검산 결과: 자동 검산 통과 · 계약금액 ○○원

평가: [evals/evals.json](evals/evals.json) · [evals/trigger-evals.json](evals/trigger-evals.json)
