# 명령 모음 · 오류 대처 (quote)

명령은 프로젝트 맨 위 폴더에서 한 줄에 하나씩 실행합니다(`;` `&&` `|`로 잇지 않기). 원고 수정은 Edit 도구로 합니다. kordoc이 없으면 scripts가 `npx -y kordoc`으로 알아서 받아 씁니다.

| 할 일 | 명령 |
|---|---|
| 금액 계산 | `node scripts/calc.js outputs/_requests/{고객코드}.json` |
| 양식을 원고로 꺼내기 | `node scripts/hwpx.js draft quote {고객코드}` → `outputs/_draft/quote_{고객코드}.md` |
| 원고를 양식에 넣어 저장 | `node scripts/hwpx.js fill quote {고객코드}` → `outputs/quote_{고객코드}.hwpx` |
| hwpx 내용 읽기 | `node scripts/hwpx.js read outputs/파일.hwpx` |
| 검산만 따로 | `node scripts/check.js outputs/quote_{고객코드}.hwpx` |
| 원고 지우기 | `node scripts/hwpx.js clean` |

| 이런 말이 나오면 | 이렇게 |
|---|---|
| `원고가 없습니다` | draft부터 다시 |
| `건너뛴 칸 N개` | 원고에서 표 줄 수·제목·이미 적힌 글자를 바꿨는지 보고 되돌린 뒤 다시 fill |
| `[자동 검산] 틀린 곳이 있습니다` | 줄마다 적힌 맞는 값으로 원고를 고쳐 다시 fill (파일 이름 그대로) |
| `kordoc 실행 실패` | `node -v`가 20 이상인지 확인. 처음 한 번은 kordoc을 내려받느라 느릴 수 있음 |
| `고객코드는 영문 소문자·숫자·하이픈만` | 고객사 이름을 영문 소문자로 (예: `badasangsa`) |
| `확정된 요청 기록 … 이 없습니다` | 메인 대화가 질문으로 받은 값을 `outputs/_requests/{고객코드}.json`에 먼저 저장 |
| `단가가 없습니다` | 메인 대화가 사용자에게 단가를 물어 요청 기록에 넣음 |
