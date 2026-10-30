// 생성한 과업지시서 hwpx를 하우스 모양으로 다듬는다(실제 위탁 용역 과업지시서 배치 기준).
// - 표 머리칸 색을 회색(#E7E6E6)으로, 맨 위 「용역 과업지시서」 띠를 회색 바탕으로
// - 표지 과업명은 가운데, 「목차」와 큰 목차(1.~5.)는 새 쪽 맨 위에서 시작
// Node 기본 모듈만 쓴다(hwpx-pics.js의 zip 읽기·쓰기 재사용).
const fs = require("fs");
const { unzip, zip } = require("./hwpx-pics.js");

const GRAY = "#E7E6E6";
const BIG = ["위탁회사(계약당사자) 현황 및 실적", "과업 내용", "과업 추진일정", "최종 산출물", "검수 계획"];

function sowLook(hwpx, title) {
  const files = unzip(fs.readFileSync(hwpx));
  const H = files.find((f) => f.name === "Contents/header.xml"), S = files.find((f) => f.name === "Contents/section0.xml");
  let h = H.data.toString("utf8"), s = S.data.toString("utf8");

  // 1) 머리칸·띠 색을 회색 한 벌로
  h = h.replace(/faceColor="#(DFE6F7|F2F2F2|E6E6E6)"/g, `faceColor="${GRAY}"`);
  // 2) 맨 위 제목 표(첫 표)의 칸 서식에 회색 바탕
  const firstTc = s.match(/<hp:tc [^>]*borderFillIDRef="(\d+)"/);
  if (firstTc) {
    const id = firstTc[1];
    h = h.replace(new RegExp(`(<hh:borderFill id="${id}" [\\s\\S]*?)(<hh:fillBrush>[\\s\\S]*?</hh:fillBrush>)?(</hh:borderFill>)`), (_, a, __, c) =>
      `${a}<hh:fillBrush><hh:winBrush faceColor="${GRAY}" hatchColor="#000000" alpha="0"/></hh:fillBrush>${c}`);
  }
  // 3) 문단 서식 복제 도우미
  let count = Number((h.match(/<hh:paraProperties itemCnt="(\d+)"/) || [])[1] || 0);
  const clone = (id, edit) => {
    const m = h.match(new RegExp(`<hh:paraPr id="${id}" [\\s\\S]*?</hh:paraPr>`));
    if (!m) return id;
    const nid = String(count++);
    h = h.replace("</hh:paraProperties>", edit(m[0].replace(`id="${id}"`, `id="${nid}"`)) + "</hh:paraProperties>");
    return nid;
  };
  const center = (x) => x.replace(/horizontal="\w+"/, 'horizontal="CENTER"');
  const pageTop = (x) => x.replace(/pageBreakBefore="\d"/, 'pageBreakBefore="1"');
  // 표 밖 문단만 대상으로
  const paras = [];
  const re = /<hp:p [^>]*>(?:(?!<hp:p )[\s\S])*?<\/hp:p>/g;
  for (let m; (m = re.exec(s)); ) {
    const p = m[0];
    if (p.includes("<hp:tbl")) continue;
    const before = s.slice(0, m.index);
    if ((before.match(/<hp:tbl[ >]/g) || []).length > (before.match(/<\/hp:tbl>/g) || []).length) continue; // 표 칸 안 문단
    paras.push({ p, at: m.index, text: (p.match(/<hp:t>([^<]*)<\/hp:t>/g) || []).map((t) => t.replace(/<\/?hp:t>/g, "")).join("").trim() });
  }
  // 같은 글자의 문단(목차 줄 · 본문 제목)이 여럿이라 위치로 바꾼다
  const edits = [];
  const setPara = (para, edit) => {
    const id = (para.p.match(/paraPrIDRef="(\d+)"/) || [])[1];
    if (!id) return;
    const nid = clone(id, edit);
    edits.push({ at: para.at, len: para.p.length, text: para.p.replace(`paraPrIDRef="${id}"`, `paraPrIDRef="${nid}"`) });
  };
  const titlePara = paras.find((x) => title && x.text === title);
  // 표지 과업명은 쪽 가운데쯤(위아래 여백 약 5cm)
  const gap = (x) => x.replace(/<hc:prev value="\d+"/g, '<hc:prev value="14000"').replace(/<hc:next value="\d+"/g, '<hc:next value="14000"');
  if (titlePara) setPara(titlePara, (x) => gap(center(x)));
  const sign = paras.find((x) => x.text.startsWith("서명:"));
  if (sign) setPara(sign, (x) => x.replace(/horizontal="\w+"/, 'horizontal="RIGHT"'));
  const toc = paras.find((x) => x.text === "목차");
  if (toc) setPara(toc, (x) => pageTop(center(x)));
  for (const name of BIG) {
    const hits = paras.filter((x) => x.text.replace(/^\d\.\s*/, "") === name);
    if (hits.length) setPara(hits[hits.length - 1], pageTop);
  }
  for (const e of edits.sort((x, y) => y.at - x.at)) s = s.slice(0, e.at) + e.text + s.slice(e.at + e.len);
  h = h.replace(/<hh:paraProperties itemCnt="\d+"/, `<hh:paraProperties itemCnt="${count}"`);
  H.data = Buffer.from(h, "utf8"); S.data = Buffer.from(s, "utf8");
  fs.writeFileSync(hwpx, zip(files));
}

module.exports = { sowLook };
