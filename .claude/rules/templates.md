---
paths:
  - "templates/**"
  - "outputs/**"
---

# 한글 양식(hwpx) 다루기

- 양식은 `node scripts/hwpx.js draft` → 원고 수정 → `fill`로만 채웁니다. hwpx를 새로 만들거나 압축을 풀어 고치지 않습니다.
- 원고는 `outputs/_draft/`에만 둡니다. 다 끝나면 `node scripts/hwpx.js clean`으로 지웁니다.
- 원고에서는 빈칸(`|  |`)만 채웁니다. 표의 줄 수·제목·이미 적힌 글자는 그대로 둡니다.
- 칸이 넘치면 칸을 늘리지 말고 글을 줄입니다. 남는 줄은 번호만 두고 비웁니다.
- fill이 "건너뛴 칸"을 알리면 원고를 고쳐 다시 fill 합니다.
