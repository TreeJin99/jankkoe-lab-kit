// outputs/의 hwpx를 읽어 검산한다. 틀리면 이유를 줄마다 하나씩 알려 준다.
//   node scripts/check.js outputs/quote_badasangsa.hwpx
//   node scripts/check.js            (outputs/의 hwpx 전부)
// 끝나는 코드: 0 통과 / 1 실패
const fs = require("fs");
const path = require("path");
const { read, ROOT } = require("./hwpx.js");
const { loadPrices, won } = require("./calc.js");

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

function mailFor(code) {
  const dir = path.join(ROOT, "inbox");
  const hit = fs.readdirSync(dir).map((n) => n.normalize("NFC")).find((n) => n.endsWith(`_${code}.txt`));
  return hit ? fs.readFileSync(path.join(dir, hit), "utf8") : null;
}

function quoteTotal(code) {
  const p = path.join(ROOT, "outputs", `quote_${code}.hwpx`);
  if (!fs.existsSync(p)) return null;
  return num(fields(tables(read(p)))["합계"]);
}

function check(file) {
  const name = path.basename(file).normalize("NFC");
  const m = name.match(/^(quote|sow|report)_([a-z0-9-]+)\.hwpx$/);
  if (!m) return [`파일 이름 규칙 위반: ${name} → quote|sow|report_고객코드.hwpx`];
  const [, doc, code] = m;
  const md = read(file);
  const tbls = tables(md);
  const f = fields(tbls);
  const errs = [];
  const mail = mailFor(code);
  if (!mail) errs.push(`inbox/에 고객코드 ${code}의 메일(…_${code}.txt)이 없습니다.`);

  const customer = f["고객사"] || f["발주처"];
  if (!customer) errs.push("고객사(발주처) 칸이 비어 있습니다.");
  else if (mail && !mail.includes(customer)) errs.push(`고객사 "${customer}"가 메일에 적힌 글자와 다릅니다.`);
  const person = f["담당자"] || "";
  if (mail && person) for (const w of person.split(/\s+/)) {
    if (!mail.includes(w)) errs.push(`담당자 "${person}" 중 "${w}"가 메일에 없습니다.`);
  }
  for (const k of ["견적일자", "작성일"]) if (k in f && !DATE.test(f[k])) errs.push(`${k} "${f[k]}"는 2026. 10. 30. 모양이어야 합니다.`);
  if (/\d{6}-[1-4]\d{6}/.test(md)) errs.push("주민등록번호로 보이는 숫자가 있습니다.");

  if (doc === "quote") {
    const prices = Object.values(loadPrices());
    const items = (tbls.find((t) => t[0][0] === "No" && t[0][1] === "품목") || []).slice(1).filter((r) => r[1]);
    if (!items.length) errs.push("품목이 하나도 없습니다.");
    let sum = 0;
    for (const [no, item, , qty, price, amount] of items) {
      const p = prices.find((x) => x.name === item);
      if (!p) { errs.push(`${no}번 "${item}"은 단가표에 없는 품목입니다. 품목 칸 대신 비고에 "단가 확인 필요"로 적으세요.`); continue; }
      if (num(price) !== p.price) errs.push(`${no}번 ${item} 단가 ${price} → 단가표는 ${won(p.price)}`);
      if (num(amount) !== num(price) * num(qty)) errs.push(`${no}번 ${item} 금액 ${amount} → 단가×수량 = ${won(num(price) * num(qty))}`);
      sum += num(amount);
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
