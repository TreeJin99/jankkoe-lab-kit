// outputs/의 hwpx를 읽어 검산한다. 틀리면 이유를 줄마다 하나씩 알려 준다.
// 대조 기준: 확정된 요청 기록 outputs/_requests/{고객코드}.json · 회사 정보 data/company.md
//   node scripts/check.js outputs/quote_badasangsa.hwpx
//   node scripts/check.js            (outputs/의 hwpx 전부)
// 끝나는 코드: 0 통과 / 1 실패
const fs = require("fs");
const path = require("path");
const { read, ROOT } = require("./hwpx.js");
const { calc, won, totalLine } = require("./calc.js");

const num = (s) => Number(String(s || "").replace(/[^0-9]/g, "")) || 0;
const DATE = /^\d{4}\. \d{1,2}\. \d{1,2}\.$/;

// kordoc 마크다운의 표를 [ [칸, 칸, ...], ... ] 목록으로
function tables(md) {
  const out = [];
  let cur = null;
  for (const line of md.split("\n")) {
    if (line.trim().startsWith("|")) {
      const cells = line.trim().slice(1, -1).split("|").map((s) => s.trim().replace(/\\~/g, "~"));
      if (cells.every((c) => /^-+$/.test(c))) continue;
      (cur = cur || []).push(cells);
    } else if (cur) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out;
}

// 라벨 | 값 | 라벨 | 값 모양 표를 { 라벨: 값 } 으로
function fields(tbls) {
  const f = {};
  for (const t of tbls) for (const row of t) for (let i = 0; i + 1 < row.length; i += 2) {
    if (row[i] && !/^\d+$/.test(row[i]) && !(row[i] in f)) f[row[i]] = row[i + 1];
  }
  return f;
}

function requestFor(code) {
  const p = path.join(ROOT, "outputs", "_requests", `${code}.json`);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
}

// data/company.md 표를 { 항목: 값 }으로
function company() {
  const p = path.join(ROOT, "data", "company.md");
  const c = {};
  if (!fs.existsSync(p)) return c;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|$/);
    if (m && m[1] !== "항목" && !/^-+$/.test(m[1])) c[m[1]] = m[2];
  }
  return c;
}

function quoteTotal(code) {
  const p = path.join(ROOT, "outputs", `quote_${code}.hwpx`);
  if (!fs.existsSync(p)) return null;
  return num(fields(tables(read(p)))["합계"]);
}

function check(file) {
  const name = path.basename(file).normalize("NFC");
  const m = name.match(/^(quote|sow)_([a-z0-9-]+)\.hwpx$/);
  if (!m) return [`파일 이름 규칙 위반: ${name} → quote|sow_고객코드.hwpx`];
  const [, doc, code] = m;
  const md = read(file);
  const tbls = tables(md);
  const f = fields(tbls);
  const errs = [];
  const req = requestFor(code);
  if (!req) errs.push(`확정된 요청 기록 outputs/_requests/${code}.json이 없습니다. 사용자에게 받은 값을 먼저 저장하세요.`);
  const same = (label, got, want) => { if (req && want && got !== want) errs.push(`${label} "${got || ""}" → 요청 기록은 "${want}"`); };
  same(doc === "quote" ? "고객사" : "발주처", f["고객사"] || f["발주처"], req && req.customer);
  same("담당자", f["담당자"], req && req.contact);
  same(doc === "quote" ? "건명" : "과업명", f["건명"] || f["과업명"], req && req.service);
  if (doc === "quote" && req && !md.includes(`${req.customer} 귀하`)) errs.push(`제목 아래 "${req.customer} 귀하" 줄이 없습니다.`);
  const co = company();
  if (doc === "quote" && co["상호"] && f["상호"] !== co["상호"]) errs.push(`상호 "${f["상호"] || ""}" → data/company.md는 "${co["상호"]}"`);
  if (doc === "sow" && co["상호"] && f["수행사"] !== co["상호"]) errs.push(`수행사 "${f["수행사"] || ""}" → data/company.md는 "${co["상호"]}"`);
  for (const k of ["견적일자", "작성일"]) if (k in f && !DATE.test(f[k])) errs.push(`${k} "${f[k]}"는 2026. 10. 30. 모양이어야 합니다.`);
  if (/\d{6}-[1-4]\d{6}/.test(md)) errs.push("주민등록번호로 보이는 숫자가 있습니다.");

  if (doc === "quote" && req && req.template) {
    // 우리 회사 양식: 칸 위치가 제각각이라 합계 숫자만 본문에서 대조
    const want = (() => { try { return calc(req.items); } catch (e) { errs.push(e.message); return null; } })();
    if (want) for (const [label, v] of [["공급가액", want.supply], ["부가세", want.vat], ["합계", want.total]]) {
      if (!md.includes(won(v))) errs.push(`${label} ${won(v)}이 문서에 없습니다 (우리 회사 양식 · 합계만 검산).`);
    }
    return errs.filter((e) => !/^(고객사|담당자|건명|상호|제목 아래)/.test(e));
  }
  if (doc === "quote") {
    const items = (tbls.find((t) => t[0][0] === "No" && t[0][1] === "품목") || []).slice(1).filter((r) => r[1]);
    if (!items.length) errs.push("품목이 하나도 없습니다.");
    let sum = 0;
    for (const [no, item, , qty, price, amount] of items) {
      if (num(amount) !== num(price) * num(qty)) errs.push(`${no}번 ${item} 금액 ${amount} → 단가×수량 = ${won(num(price) * num(qty))}`);
      sum += num(amount);
    }
    if (req) {
      let want;
      try { want = calc(req.items); } catch (e) { errs.push(e.message); }
      if (want) {
        if (items.length !== want.rows.length) errs.push(`품목 ${items.length}줄 → 요청 기록은 ${want.rows.length}줄`);
        want.rows.forEach((w, i) => {
          const r = items[i];
          if (r && (r[1] !== w.name || num(r[3]) !== w.qty || num(r[4]) !== w.price)) errs.push(`${i + 1}번 "${r[1]} ${r[3]} × ${r[4]}" → 요청 기록은 "${w.name} ${w.qty} × ${won(w.price)}"`);
        });
      }
    }
    const supply = num(f["공급가액"]), vat = num(f["부가세(10%)"]), total = num(f["합계"]);
    if (supply !== sum) errs.push(`공급가액 ${won(supply)} → 품목 금액 합 ${won(sum)}`);
    if (vat !== Math.floor(supply * 0.1)) errs.push(`부가세 ${won(vat)} → 공급가액의 10% = ${won(Math.floor(supply * 0.1))}`);
    if (total !== supply + vat) errs.push(`합계 ${won(total)} → 공급가액 + 부가세 = ${won(supply + vat)}`);
    if ((f["합계금액"] || "") !== totalLine(supply + vat)) errs.push(`합계금액 "${f["합계금액"] || ""}" → "${totalLine(supply + vat)}"`);
  } else {
    const tasks = md.match(/과업 \d+\./g) ? [...new Set(md.split("\n").filter((l) => /^□?\s*과업 \d+\./.test(l.trim())))] : [];
    if (!tasks.length) errs.push("과업 내용에 '과업 1.' 같은 과업이 하나도 없습니다.");
    const blocks = md.split(/\n□?\s*과업 \d+\./).slice(1);
    blocks.forEach((blk, i) => {
      const tb = tables(blk.split("\n## ")[0]);
      const t = tb.find((x) => (x[0][0] || "").startsWith("주 산출물"));
      if (!t || !t.slice(1).some((r) => r[0])) errs.push(`과업 ${i + 1}에 주 산출물(예시)이 없습니다.`);
      const rq = tb.find((x) => x[0][1] === "요구사항");
      if (!rq || rq.slice(1).filter((r) => r[1]).length < 4) errs.push(`과업 ${i + 1}의 요구사항이 4개보다 적습니다.`);
    });
    const insp = tables(md).find((x) => x[0][1] === "검수 항목");
    if (!insp || insp.slice(1).filter((r) => r[1]).length < 3) errs.push("검수 항목이 3개보다 적습니다.");
    if (/\((건명|작성일|고객사|담당자|상호|대표|착수일|납기|견적서 합계|과업 이름|한 줄|산출물|형태|항목|지금 상태|끝나면 달라지는 상태|무엇을 어디까지|요구사항|상세|비고|견적 품목|기준|방법|계약 조건 또는 확인 필요|없음|이번 [^)]*|이 과업[^)]*|자료·개인정보[^)]*|산출물 권리[^)]*|발주처가 줄[^)]*)\)/.test(md)) errs.push("채우지 않은 ( ) 자리가 남아 있습니다.");
    const qt = quoteTotal(code);
    const contract = num(f["계약금액"]);
    if (qt === null) errs.push(`견적서 outputs/quote_${code}.hwpx가 없어 계약금액을 대조할 수 없습니다.`);
    else if (contract !== qt) errs.push(`계약금액 ${won(contract)} → 견적서 합계 ${won(qt)}`);
  }
  return errs;
}

module.exports = { check };

if (require.main === module) {
  const dir = path.join(ROOT, "outputs");
  const files = process.argv.length > 2
    ? process.argv.slice(2)
    : fs.readdirSync(dir).filter((n) => n.endsWith(".hwpx")).map((n) => path.join(dir, n));
  let bad = 0;
  for (const f of files) {
    let errs;
    try { errs = check(f); } catch (e) { errs = [e.message]; }
    const n = path.basename(f);
    if (errs.length) { bad++; console.log(`실패: ${n}\n${errs.map((e) => `- ${e}`).join("\n")}`); }
    else console.log(`통과: ${n}`);
  }
  process.exit(bad ? 1 : 0);
}
