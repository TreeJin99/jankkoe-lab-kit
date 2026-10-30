// 견적 금액 계산. 확정된 요청 기록(outputs/_requests/{고객코드}.json)의 품목으로 계산한다.
//   node scripts/calc.js outputs/_requests/badasangsa.json
// 품목 단가는 기록에 적힌 값. 단가표(data/prices.md)에 같은 품목이 있으면 단가가 같은지도 확인한다.
// 출력: 견적서 품목 표에 그대로 옮길 줄 + 공급가액·부가세·합계
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const won = (n) => n.toLocaleString("en-US");

// data/prices.md 표를 { 품목명: {code, name, unit, price} } 로 읽는다. (비어 있어도 된다)
function loadPrices() {
  const file = path.join(ROOT, "data", "prices.md");
  const prices = {};
  if (!fs.existsSync(file)) return prices;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const c = line.split("|").map((s) => s.trim());
    if (c.length > 5 && c[2] && /\d/.test(c[4] || "") && c[1] !== "코드") {
      prices[c[2]] = { code: c[1], name: c[2], unit: c[3], price: Number(c[4].replace(/[^0-9]/g, "")) };
    }
  }
  return prices;
}

function loadRequest(file) {
  const r = JSON.parse(fs.readFileSync(path.resolve(ROOT, file), "utf8"));
  if (!Array.isArray(r.items) || !r.items.length) throw new Error("요청 기록에 품목(items)이 없습니다.");
  return r;
}

function calc(items) {
  const prices = loadPrices();
  const rows = items.map((it) => {
    const qty = Number(it.qty), price = Number(it.price);
    if (!it.name || !it.unit) throw new Error(`품목 이름·단위가 비어 있습니다: ${JSON.stringify(it)}`);
    if (!Number.isInteger(qty) || qty < 1) throw new Error(`${it.name} 수량이 이상합니다: ${it.qty}`);
    if (!Number.isInteger(price) || price < 1) throw new Error(`${it.name} 단가가 없습니다. 사용자에게 물어보세요.`);
    const p = prices[it.name];
    if (p && p.price !== price) throw new Error(`${it.name} 단가 ${won(price)}가 단가표 ${won(p.price)}와 다릅니다.`);
    return { ...it, qty, price, amount: price * qty };
  });
  const supply = rows.reduce((s, r) => s + r.amount, 0);
  const vat = Math.floor(supply * 0.1);
  return { rows, supply, vat, total: supply + vat };
}

module.exports = { loadPrices, loadRequest, calc, won };

if (require.main === module) {
  try {
    const file = process.argv[2];
    if (!file) throw new Error("사용법: node scripts/calc.js outputs/_requests/{고객코드}.json");
    const r = calc(loadRequest(file).items);
    console.log("| No | 품목 | 단위 | 수량 | 단가 | 금액 |");
    r.rows.forEach((x, i) => console.log(`| ${i + 1} | ${x.name} | ${x.unit} | ${x.qty} | ${won(x.price)} | ${won(x.amount)} |`));
    console.log(`\n공급가액 ${won(r.supply)}원\n부가세(10%) ${won(r.vat)}원\n합계 ${won(r.total)}원`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
