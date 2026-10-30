# 우리 회사 견적서 양식으로 만들기

1. 사용자가 `templates/custom/`에 hwpx를 넣는다. hwp만 있으면 한글에서 "다른 이름으로 저장 → hwpx"로 바꿔 달라고 한다.
2. `node scripts/hwpx.js draft quote {고객코드} --template templates/custom/파일.hwpx`로 원고를 꺼낸다.
3. 원고의 칸 이름을 질문으로 받은 값과 맞춘다(예: 「수신」·「귀중」→ 고객사, 「품명」→ 품목, 「공급가」→ 공급가액). 애매한 칸은 AskUserQuestion으로 "이 칸에는 무엇을 넣을까요?"라고 묻는다.
4. 빈칸만 채우고 `node scripts/hwpx.js fill quote {고객코드} --template templates/custom/파일.hwpx`.
5. 자동 검산은 우리 회사 양식일 때 공급가액 · 부가세 · 합계 숫자가 문서에 있는지만 본다.
6. 채우기가 실패하면(건너뛴 칸이 많거나 표 구조가 복잡함) 기본 양식(templates/quote.hwpx)으로 만들고 이유를 한 줄로 알린다.
