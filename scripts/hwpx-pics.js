// 생성된 과업지시서 hwpx에 산출물 예시 그림을 넣는다(견본 모드 generate는 그림을 넣지 않아서).
// 원고의 〔그림 N〕 문단을 그림 문단으로 바꾸고 BinData·목록에 PNG를 더한다. Node 기본 모듈만 쓴다.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b) => { let c = 0xffffffff; for (const v of b) c = CRC[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function unzip(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const n = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = [];
  for (let i = 0; i < n; i++) {
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const nl = buf.readUInt16LE(p + 28), el = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nl).toString("utf8");
    const lnl = buf.readUInt16LE(off + 26), lel = buf.readUInt16LE(off + 28);
    const raw = buf.slice(off + 30 + lnl + lel, off + 30 + lnl + lel + csize);
    files.push({ name, data: method === 8 ? zlib.inflateRawSync(raw) : raw });
    p += 46 + nl + el + cl;
  }
  return files;
}

function zip(files) {
  const parts = [], central = [];
  let off = 0;
  for (const f of files) {
    const store = f.name === "mimetype";
    const comp = store ? f.data : zlib.deflateRawSync(f.data);
    const name = Buffer.from(f.name, "utf8"), crc = crc32(f.data);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(store ? 0 : 8, 8);
    h.writeUInt32LE(crc, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(f.data.length, 22); h.writeUInt16LE(name.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(store ? 0 : 8, 10);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(f.data.length, 24); c.writeUInt16LE(name.length, 28); c.writeUInt32LE(off, 42);
    parts.push(h, name, comp); central.push(c, name); off += 30 + name.length + comp.length;
  }
  const cd = Buffer.concat(central), e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, e]);
}

// pics: [{ n, file }]  hwpx 안의 〔그림 n〕 문단을 file(PNG) 그림으로 바꾼다
function insertPics(hwpx, pics) {
  const files = unzip(fs.readFileSync(hwpx));
  const get = (n) => files.find((f) => f.name === n);
  const sec = get("Contents/section0.xml"), hpf = get("Contents/content.hpf");
  let s = sec.data.toString("utf8"), m = hpf.data.toString("utf8"), done = 0;
  for (const { n, file } of pics) {
    const png = fs.readFileSync(file);
    const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
    const W = 30000, H = Math.round((W * h) / w), id = `kitpic${n}`;
    const re = new RegExp(`<hp:p ([^>]*)>(?:(?!</hp:p>).)*?〔그림 ${n}〕(?:(?!</hp:p>).)*?</hp:p>`, "s");
    const hit = s.match(re);
    if (!hit) continue;
    const paraAttr = hit[1].replace(/\s*pageBreak="\d"/, "");
    const pic = `<hp:p ${paraAttr}><hp:run charPrIDRef="0"><hp:pic id="${9500000 + n}" zOrder="0" numberingType="PICTURE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" href="" groupLevel="0" instid="${9500000 + n}" reverse="0" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core"><hp:offset x="0" y="0"/><hp:orgSz width="${W}" height="${H}"/><hp:curSz width="${W}" height="${H}"/><hp:flip horizontal="0" vertical="0"/><hp:rotationInfo angle="0" centerX="${W / 2}" centerY="${Math.round(H / 2)}" rotateimage="1"/><hp:renderingInfo><hc:transMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/><hc:scaMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/><hc:rotMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/></hp:renderingInfo><hp:imgRect><hc:pt0 x="0" y="0"/><hc:pt1 x="${W}" y="0"/><hc:pt2 x="${W}" y="${H}"/><hc:pt3 x="0" y="${H}"/></hp:imgRect><hp:imgClip left="0" right="${W}" top="0" bottom="${H}"/><hp:inMargin left="0" right="0" top="0" bottom="0"/><hp:imgDim dimwidth="${W}" dimheight="${H}"/><hc:img binaryItemIDRef="${id}" bright="0" contrast="0" effect="REAL_PIC" alpha="0"/><hp:effects/><hp:sz width="${W}" widthRelTo="ABSOLUTE" height="${H}" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/><hp:outMargin left="0" right="0" top="0" bottom="0"/></hp:pic></hp:run></hp:p>`;
    s = s.replace(hit[0], pic);
    m = m.replace("</opf:manifest>", `<opf:item id="${id}" href="BinData/${id}.png" media-type="image/png" isEmbeded="1"/></opf:manifest>`);
    files.push({ name: `BinData/${id}.png`, data: png });
    done++;
  }
  sec.data = Buffer.from(s, "utf8"); hpf.data = Buffer.from(m, "utf8");
  fs.writeFileSync(hwpx, zip(files));
  return done;
}

module.exports = { insertPics };
