# 명령 모음 · 오류 대처 (sow)

명령은 프로젝트 맨 위 폴더에서 한 줄에 하나씩 실행합니다(`;` `&&` `|`로 잇지 않기). 원고 수정은 Edit 도구로 합니다. kordoc이 없으면 scripts가 `npx -y kordoc`으로 알아서 받아 씁니다.

| 할 일 | 명령 |
|---|---|
| 목차·과업 틀 받기 | `node scripts/hwpx.js draft sow {고객코드}` → `outputs/_draft/sow_{고객코드}.md` |
| 원고로 새로 만들기 | `node scripts/hwpx.js fill sow {고객코드}` → `outputs/과업지시서_{고객사}.hwpx` (보고서 서식으로 생성한 뒤 표지 · 목차 · 쪽 나눔 · 회색 머리칸을 맞춤) |
| hwpx 내용 읽기 | `node scripts/hwpx.js read outputs/파일.hwpx` |
| 검산만 따로 | `node scripts/check.js outputs/과업지시서_{고객사}.hwpx` |
| 원고 지우기 | `node scripts/hwpx.js clean` |

| 이런 말이 나오면 | 이렇게 |
|---|---|
| `원고가 없습니다` | draft부터 다시 |
| `아직 안 채운 자리 N곳` | 원고의 ( ) 자리를 채운 뒤 다시 fill |
| `건너뛴 칸 N개` | 원고에서 표 줄 수·제목·이미 적힌 글자를 바꿨는지 보고 되돌린 뒤 다시 fill |
| `[자동 검산] 틀린 곳이 있습니다` | 줄마다 적힌 맞는 값으로 원고를 고쳐 다시 fill (파일 이름 그대로) |
| `kordoc 실행 실패` | `node -v`가 20 이상인지 확인. 처음 한 번은 kordoc을 내려받느라 느릴 수 있음 |
| `고객코드는 영문 소문자·숫자·하이픈만` | 견적서 파일 이름의 `quote_` 뒤 부분을 그대로 씀 |
