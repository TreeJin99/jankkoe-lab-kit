# 잔꾀 연구소 실습 킷

메일 한 통을 주면 AI가 **견적서 → 과업지시서 → 결과보고서**를 한글(hwpx) 파일로 만들고, 금액을 스스로 검산합니다.
가상 회사 「새벽웹스튜디오」가 고객 「바다상사」의 홈페이지 리뉴얼 요청을 받은 상황입니다.

> 회사·고객·금액·연락처는 모두 실습용 가상 정보입니다.

---

## 1. 받기

**방법 A. ZIP으로 받기 (처음이면 이쪽)**
1. 이 페이지 위쪽 초록색 **Code** 버튼을 누릅니다.
2. 맨 아래 **Download ZIP**을 누릅니다.
3. 받은 ZIP 파일을 풀면 `jankkoe-lab-kit-main` 폴더가 생깁니다.

**방법 B. git으로 받기**
```bash
git clone https://github.com/TreeJin99/jankkoe-lab-kit.git
```

## 2. 준비

| 필요한 것 | 확인 방법 |
|---|---|
| Claude 데스크톱 앱 (Pro 이상) 또는 Claude Code | 앱 왼쪽 위에 **Code** 탭이 보이면 됩니다 |
| Node.js 20 이상 | 아래 첫 줄. 없으면 https://nodejs.org 에서 LTS 설치 |
| 한글 문서 도구 kordoc | 아래 둘째 줄. 처음 한 번은 내려받느라 시간이 조금 걸립니다 |
| (윈도우만) Git for Windows | Claude Code가 윈도우에서 쓰는 도구입니다. 없으면 https://git-scm.com 에서 설치 |

```bash
node -v
npx -y kordoc --version
```
`v20` 이상, 그리고 `4.` 으로 시작하는 숫자가 나오면 준비 끝입니다.

## 3. 열기

1. Claude 앱에서 **Code** 탭을 누릅니다.
2. 폴더 선택에서 받은 `jankkoe-lab-kit` 폴더를 고릅니다.
3. "이 폴더를 신뢰하나요?"가 나오면 **신뢰**를 누릅니다. 그래야 아래 명령을 매번 묻지 않고 실행합니다.

## 4. 실습: 이 문장 그대로 입력

차례로 하나씩 입력하고 끝날 때까지 기다립니다. (한 번에 1~2분)

```text
받은 메일로 견적서 만들어줘
```
```text
방금 견적서로 과업지시서 만들어줘
```
```text
작업일지로 결과보고서 만들어줘
```

`outputs/` 폴더에 `quote_badasangsa.hwpx`(견적서) · `sow_badasangsa.hwpx`(과업지시서) · `report_badasangsa.hwpx`(결과보고서)가 생기면 성공입니다. 한글(한컴오피스)로 열어 보세요.
맞는 금액: 공급가액 4,950,000원 + 부가세 495,000원 = **합계 5,445,000원**

## 5. 더 해 보기

**슬래시 명령** (레시피를 바로 부르기)
```text
/quote
```
```text
/sow
```
```text
/report
```

**팀원(에이전트) 부르기**
```text
reviewer한테 outputs 폴더 검사시켜
```

**규칙·자료 바꾸기**
```text
단가표에 "SNS 연동 1식 300,000원" 품목 하나 추가해줘
```
```text
앞으로 견적서 유효기간은 30일로 CLAUDE.md에 추가해
```

**다른 고객 메일로 해 보기**
`examples/inbox/` 의 메일을 `inbox/`로 복사한 뒤:
```text
푸른제과 메일로 견적서 만들어줘
```

**우리 회사 양식으로 바꾸기**
1. 우리 회사 견적서 hwpx를 `templates/quote.hwpx` 이름으로 덮어씁니다. (원래 파일은 따로 보관)
2. 이렇게 말합니다.
```text
templates/quote.hwpx 양식이 바뀌었어. 견적서 레시피의 칸 채우는 법을 새 양식에 맞게 고쳐줘
```

**ChatGPT Codex에서 쓰기**
같은 폴더를 Codex로 열면 `AGENTS.md`와 `.agents/skills/`를 읽습니다. 레시피는 `$quote` · `$sow` · `$report`로 부릅니다.

## 6. 폴더 안에 있는 것

| 하네스 요소 | 위치 | 하는 일 |
|---|---|---|
| 회사 규칙 | `CLAUDE.md` | AI가 일하기 전에 먼저 읽는 규칙 (부가세 별도, 쉼표, 파일 이름, 금지 정보) |
| 회사 규칙 (Codex용) | `AGENTS.md` | `CLAUDE.md`와 같은 내용 |
| 룰 | `.claude/rules/templates.md` | `templates/`·`outputs/` 파일을 만질 때만 읽는 한글 양식 규칙 |
| 레시피 (스킬) | `.claude/skills/quote · sow · report` | 문서별 5단계 순서. 세부는 각 폴더의 `references/` |
| 레시피 (Codex용) | `.agents/skills/` | 같은 내용 |
| 팀 (에이전트) | `.claude/agents/` | quote-writer 견적담당 · doc-writer 문서담당 · reviewer 검수담당 |
| 자동 검산 (훅) | `.claude/hooks/check-outputs.js` | `outputs/`에 hwpx가 저장되면 바로 검산. 틀리면 AI에게 돌려보내 고치게 함 |
| 권한 · 훅 설정 | `.claude/settings.json` | 실습 명령은 묻지 않고 실행, 위험한 명령(`rm -rf` 등)은 막음 |
| 계산 · 양식 · 검산 도구 | `scripts/` | `calc.js` 금액 계산 · `hwpx.js` 양식 채우기 · `check.js` 검산 |
| 받은 메일 | `inbox/` | 고객이 보낸 메일 (`날짜_고객코드.txt`) |
| 자료 | `data/` | 단가표 `prices.md`, 작업일지 `worklog_고객코드.md` |
| 양식 | `templates/` | 한글 양식 3종 (빈칸) |
| 결과 | `outputs/` | 완성 문서 (`문서_고객코드.hwpx`) |
| 연습 자료 | `examples/` | 두 번째 고객 메일 |

### 자동 검산이 하는 일
AI가 `outputs/`에 hwpx를 저장하면 `scripts/check.js`가 바로 확인합니다.
- 금액 = 단가 × 수량, 공급가액 = 금액의 합, 부가세 = 공급가액의 10%, 합계 = 공급가액 + 부가세
- 단가가 단가표와 같은지, 고객사·담당자가 메일에 적힌 글자와 같은지, 날짜 모양이 맞는지
- 과업지시서·결과보고서의 계약금액이 견적서 합계와 같은지

틀리면 이유를 AI에게 돌려보내고, AI는 고쳐서 다시 저장합니다. 직접 돌려 볼 수도 있습니다.
```bash
node scripts/check.js
```

### MCP 연결 예시 (이 킷에는 설치하지 않음)
MCP는 AI에게 바깥 도구를 이어 주는 연결선입니다. 실습에는 필요 없고, 회사에서 쓸 때 이렇게 붙입니다.
- **구글 드라이브**: claude.ai 설정 → 커넥터에서 Google Drive를 연결하면 "드라이브의 최신 단가표로 견적서 만들어줘"처럼 쓸 수 있습니다.
- **노션**: 같은 곳에서 Notion을 연결하면 "노션 프로젝트 페이지의 작업일지로 결과보고서 만들어줘"가 됩니다.

## 7. 주의

- 실습 데이터는 전부 가상입니다. **실제 고객 정보, 주민번호, 계좌번호, 비밀번호는 넣지 마세요.**
- `outputs/`의 파일은 저장소에 올라가지 않게 막아 두었습니다(`.gitignore`).
- 만든 문서는 사람이 한 번 열어 확인한 뒤 보내세요.
