---
name: quote
description: 사용자에게 고객사·건명·품목·날짜를 물어 확정한 뒤 견적서 hwpx를 outputs/에 만든다. 업종 무관. "견적서 만들어줘", "견적 내줘", "견적서" 요청에 사용.
allowed-tools: Read Glob Grep Edit Write Agent AskUserQuestion Bash(node scripts/*) Bash(node */scripts/*) Bash(cp examples/*) Bash(ls *) Bash(mkdir -p outputs/*)
---

# 견적서 만들기

**쓸 때**: 견적서를 만들 때. **안 쓸 때**: 과업지시서(→ sow), 단가표만 고칠 때, 질문만 할 때.

사용자가 이미 준 내용: $ARGUMENTS

## 0. 가장 먼저(도구를 쓰기 전에) 이 3줄을 한국어로 말한다
> ① 회사 규칙(CLAUDE.md)을 읽었고 ② 견적 매뉴얼(quote 스킬)로 ③ 정보 확인 → 견적 담당(quote-writer) 작성 → 검수 담당(reviewer) 확인 순서로 진행합니다.

## 1. 처음이면 회사부터 (메인 대화)
`data/company.md`가 비어 있으면 견적 전에 AskUserQuestion으로 「처음이시네요. 어떻게 시작할까요?」 → [예시 회사로 체험 / 우리 회사로 시작]. 질문과 선택지는 [references/questions.md](references/questions.md).
- 예시 회사: `cp examples/saebyeok/company.md data/company.md`, `cp examples/saebyeok/prices.md data/prices.md`.
- 우리 회사 → 「회사 자료 파일 주기 / 직접 입력」을 묻는다.
  - 파일: 사업자등록증·회사소개서·가격표를 `data/회사자료/`에 넣거나 채팅창에 끌어다 놓게 한다. 이미지·PDF는 Read로, hwp·hwpx는 `node scripts/hwpx.js read 파일`로 읽어 상호 · 대표 · 사업자번호 · 업태/종목 · 주소, 가격표가 있으면 품목·단위·단가 후보를 뽑는다. 뽑은 값을 요약해 확인받은 뒤 저장. 못 읽은 칸만 묻는다. 주민등록번호·계좌번호는 읽혀도 저장하지 않는다.
  - 직접 입력: 상호 · 대표 · 업종 · 사업자번호(모르면 비움) · 연락처 · 주소를 받아 `data/company.md`에 저장. 단가표가 비어 있으면 "주로 파는 품목·서비스 2~3개"의 이름·단위·단가를 받아 `data/prices.md`에 저장. 업종에 맞는 예시를 보여 주되 값은 지어내지 않는다.
- 「우리 회사 견적서 양식이 있나요?」 [없음(기본 양식) / 있음]. 있으면 `templates/custom/`에 hwpx를 넣게 하고(hwp는 한글에서 hwpx로 저장), 요청 기록에 `"template": "templates/custom/파일.hwpx"`를 적는다. 자세한 건 [references/custom-template.md](references/custom-template.md).
- 저장할 때마다 한 줄로 알린다: "회사 정보를 data/company.md에 저장했습니다. 다음부터는 묻지 않아요."

## 2. 견적 정보 묻기 (메인 대화)
AskUserQuestion으로 고객사 · 담당자 · 건명 · 품목(단가표에서 고르기 + 새 품목) · 수량 · 견적일 · 납기 · 결제 조건(선택) · 비고를 묻는다. 이미 받은 값은 다시 묻지 않는다. 수량 단위는 단가표 단위를 따른다. 단가표에 없는 품목은 단가·단위를 묻고, 단가표에 추가할지 확인한다.

## 3. 확인하고 기록하기 (메인 대화)
모은 값을 한 번 요약해 "이대로 만들까요?"를 묻는다. 확정되면 `outputs/_requests/{고객코드}.json`에 저장한다(형식은 references/questions.md). 고객코드 = 고객사 이름을 영문 소문자로(예: 바다상사 → `badasangsa`). 저장 뒤 "요청 기록을 저장했습니다. 검산은 이 기록과 대조합니다"라고 한 줄 알린다.

## 4. 맡기기
- 메인 대화는 `quote-writer` 서브에이전트에게 고객코드를 주고 작성을 맡긴다 → 받은 경로로 `reviewer`에게 검수를 맡긴다. 서브에이전트는 질문을 못 하므로 질문은 메인만 한다.
- **quote-writer 작성 단계**: ① `node scripts/calc.js outputs/_requests/{고객코드}.json` ② `node scripts/hwpx.js draft quote {고객코드}` ③ 원고 빈칸 채우기([references/template-fields.md](references/template-fields.md)) ④ `node scripts/hwpx.js fill quote {고객코드}`. 요청 기록에 `template`이 있으면 ②④에 `--template 그 경로`를 붙인다. 자동 검산이 틀렸다고 하면 고쳐서 다시 fill, 통과하면 `node scripts/hwpx.js clean`. 명령·오류는 [references/kordoc-commands.md](references/kordoc-commands.md).

## 5. 끝 보고 (3줄 + 파일)
> 읽은 파일: CLAUDE.md · data/company.md · data/prices.md · 요청 기록
> 맡긴 담당: quote-writer 작성 → reviewer 검수
> 검산 결과: 자동 검산 통과 · 합계 ○○원

평가: [evals/evals.json](evals/evals.json) · [evals/trigger-evals.json](evals/trigger-evals.json)
