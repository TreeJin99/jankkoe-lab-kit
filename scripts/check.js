// outputs/의 hwpx를 읽어 검산한다. 틀리면 이유를 줄마다 하나씩 알려 준다.
// 대조 기준: 확정된 요청 기록 outputs/_requests/{고객코드}.json · 회사 정보 data/company.md
//   node scripts/check.js outputs/quote_badasangsa.hwpx
//   node scripts/check.js            (outputs/의 hwpx 전부)
// 끝나는 코드: 0 통과 / 1 실패
const fs = require("fs");
const path = require("path");
const { read, ROOT } = require("./hwpx.js");
const { calc, won } = require("./calc.js");

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
  same(doc === "quote" ? "용역명" : "과업명", f["용역명"] || f["과업명"], req && req.service);
  const co = company();
  if (doc === "quote" && co["상호"] && f["상호"] !== co["상호"]) errs.push(`상호 "${f["상호"] || ""}" → data/company.md는 "${co["상호"]}"`);
  if (doc === "sow" && co["상호"] && f["수행사"] !== co["상호"]) errs.push(`수행사 "${f["수행사"] || ""}" → data/company.md는 "${co["상호"]}"`);
  for (const k of ["견적일자", "작성일"]) if (k in f && !DATE.test(f[k])) errs.push(`${k} "${f[k]}"는 2026. 10. 30. 모양이어야 합니다.`);
  if (/\d{6}-[1-4]\d{6}/.test(md)) errs.push("주민등록번호로 보이는 숫자가 있습니다.");

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
  } else {
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
