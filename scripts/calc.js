// 견적 금액 계산. 단가는 data/prices.md에서만 가져온다.
//   node scripts/calc.js W-01:1 W-02:1 W-03:7
// 출력: 견적서 품목 표에 그대로 옮길 줄 + 공급가액·부가세·합계
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const won = (n) => n.toLocaleString("en-US");

// data/prices.md 표를 { 코드: {code, name, unit, price} } 로 읽는다.
function loadPrices() {
  const text = fs.readFileSync(path.join(ROOT, "data", "prices.md"), "utf8");
  const prices = {};
  for (const line of text.split("\n")) {
    const c = line.split("|").map((s) => s.trim());
    if (/^[A-Z]-\d+$/.test(c[1] || "")) {
      prices[c[1]] = { code: c[1], name: c[2], unit: c[3], price: Number(c[4].replace(/,/g, "")) };
    }
  }
  return prices;
}

function calc(pairs) {
  const prices = loadPrices();
  const rows = pairs.map((p) => {
    const [code, q] = p.split(":");
    const item = prices[code];
    if (!item) throw new Error(`단가표에 없는 코드: ${code}. 지어내지 말고 비고에 "단가 확인 필요"로 적으세요.`);
    const qty = Number(q || 1);
    if (!Number.isInteger(qty) || qty < 1) throw new Error(`수량이 이상합니다: ${p}`);
    return { ...item, qty, amount: item.price * qty };
  });
  const supply = rows.reduce((s, r) => s + r.amount, 0);
  const vat = Math.floor(supply * 0.1);
  return { rows, supply, vat, total: supply + vat };
}

module.exports = { loadPrices, calc, won };

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (!args.length) throw new Error("사용법: node scripts/calc.js W-01:1 W-03:7 ...");
    const r = calc(args);
    console.log("| No | 품목 | 단위 | 수량 | 단가 | 금액 |");
    r.rows.forEach((x, i) => console.log(`| ${i + 1} | ${x.name} | ${x.unit} | ${x.qty} | ${won(x.price)} | ${won(x.amount)} |`));
    console.log(`\n공급가액 ${won(r.supply)}원\n부가세(10%) ${won(r.vat)}원\n합계 ${won(r.total)}원`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
