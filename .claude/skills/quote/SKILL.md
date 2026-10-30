---
name: quote
description: 받은 메일(inbox/)을 읽고 단가표로 계산해 견적서 hwpx를 outputs/에 만든다. "견적서 만들어줘", "이 메일로 견적 내줘", "견적서" 요청에 사용.
argument-hint: "[메일 파일 이름, 생략하면 가장 최근 메일]"
allowed-tools: Read Glob Grep Edit Write Bash(node scripts/*)
---

# 견적서 만들기

대상 메일: $ARGUMENTS
(비어 있으면 `inbox/`에서 파일 이름 날짜가 가장 늦은 메일)
고객코드 = 메일 파일 이름에서 날짜와 `_` 뒤 부분. 예) `inbox/2026-10-28_badasangsa.txt` → `badasangsa`

1. **메일 읽기**: 고객사, 담당자(메일에 적힌 글자 그대로), 요청 내용, 희망 오픈일을 적어 둔다.
2. **품목 고르기**: [references/items.md](references/items.md) 기준으로 `data/prices.md`의 코드와 수량을 정한다.
3. **계산**: `node scripts/calc.js W-01:1 W-03:7 ...` 결과(품목 줄, 공급가액·부가세·합계)를 그대로 옮긴다. 직접 계산하지 않는다.
4. **양식 채우기**
   - `node scripts/hwpx.js draft quote {고객코드}` → 원고 `outputs/_draft/quote_{고객코드}.md`가 생긴다.
   - 원고의 빈칸을 채운다. 칸별 값은 [references/fields.md](references/fields.md).
   - `node scripts/hwpx.js fill quote {고객코드}` → `outputs/quote_{고객코드}.hwpx` 저장.
   - 저장되면 자동 검산(훅)이 돈다. "틀린 곳이 있습니다"가 오면 이유대로 원고를 고쳐 다시 fill 한다. 통과하면 `node scripts/hwpx.js clean`.
5. **검수**: 메인 대화가 `reviewer` 서브에이전트를 불러 `outputs/quote_{고객코드}.hwpx` 검수를 맡긴다. (지금 서브에이전트로 일하는 중이면 4단계까지만 하고 파일 경로·합계를 보고한다.)
