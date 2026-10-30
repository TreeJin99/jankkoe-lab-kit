// 산출물 예시 그림(회색 와이어프레임 PNG). 외부 의존 없이 Node 기본 모듈만 쓴다.
//   node scripts/mockup.js <screen|doc|video|print|product|other> outputs/_draft/img/파일.png
// 실제 결과물이 아니라 "이런 모양의 산출물"을 보여 주는 틀이다. 캡션은 원고에 「예시 이미지 · 실제 결과물 아님」으로 붙인다.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const W = 800, H = 480;
const GRAY = [0xe7, 0xe6, 0xe6], NAVY = [0x1f, 0x38, 0x64], MID = [0xbf, 0xbf, 0xbf], WHITE = [255, 255, 255];
const px = Buffer.alloc(W * H * 3, 255);

const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) px.set(c, (y * W + x) * 3); };
const fill = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c); };
const box = (x, y, w, h, c, t = 3) => { fill(x, y, w, t, c); fill(x, y + h - t, w, t, c); fill(x, y, t, h, c); fill(x + w - t, y, t, h, c); };
const lines = (x, y, w, n, gap = 22, c = MID) => { for (let k = 0; k < n; k++) fill(x, y + k * gap, k === n - 1 ? Math.round(w * 0.6) : w, 8, c); };

const DRAW = {
  screen() { // 브라우저 틀 + 머리 + 큰 영역 + 카드 3개
    box(40, 30, 720, 420, NAVY); fill(43, 33, 714, 34, GRAY); [60, 82, 104].forEach((x) => fill(x, 45, 12, 12, MID));
    fill(43, 67, 714, 50, NAVY); fill(70, 84, 120, 16, WHITE);
    fill(70, 140, 660, 120, GRAY); lines(100, 175, 300, 3, 26, MID);
    [70, 295, 520].forEach((x) => { fill(x, 285, 210, 140, GRAY); fill(x + 15, 300, 180, 70, MID); lines(x + 15, 385, 180, 2, 18); });
  },
  doc() { // 문서 쪽 두 장
    [[150, 30], [430, 30]].forEach(([x, y]) => {
      fill(x + 8, y + 8, 220, 420, MID); fill(x, y, 220, 420, WHITE); box(x, y, 220, 420, NAVY, 2);
      fill(x + 20, y + 25, 140, 16, NAVY); lines(x + 20, y + 65, 180, 6); fill(x + 20, y + 210, 180, 80, GRAY); lines(x + 20, y + 310, 180, 4);
    });
  },
  video() { // 16:9 장면 3칸 + 재생 막대
    [40, 290, 540].forEach((x, i) => { fill(x, 120, 220, 124, GRAY); box(x, 120, 220, 124, NAVY, 2); fill(x + 95, 167, 30, 30, i === 0 ? NAVY : MID); lines(x, 262, 200, 2, 18); });
    fill(40, 360, 720, 10, GRAY); fill(40, 360, 260, 10, NAVY);
  },
  print() { // A4 지면 + 접힌 리플릿
    fill(118, 38, 240, 340, MID); fill(110, 30, 240, 340, WHITE); box(110, 30, 240, 340, NAVY, 2);
    fill(130, 50, 200, 120, GRAY); fill(130, 190, 150, 18, NAVY); lines(130, 225, 200, 5);
    [430, 530, 630].forEach((x, i) => { fill(x, 80, 96, 240, i === 1 ? GRAY : WHITE); box(x, 80, 96, 240, NAVY, 2); lines(x + 12, 110, 72, 6, 30); });
  },
  product() { // 상자 실루엣(정면 + 윗면) + 받침
    fill(300, 120, 200, 220, GRAY); box(300, 120, 200, 220, NAVY, 3);
    for (let k = 0; k < 60; k++) fill(300 + k, 120 - k, 200, 1, k % 59 ? MID : NAVY);
    for (let k = 0; k < 60; k++) fill(500 + k, 120 - k, 1, 220, MID);
    fill(250, 360, 300, 12, MID); fill(340, 200, 120, 40, WHITE); box(340, 200, 120, 40, NAVY, 2);
  },
  other() { box(100, 60, 600, 360, NAVY); fill(103, 63, 594, 354, GRAY); fill(370, 210, 60, 60, MID); },
};

function png() {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; px.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3); }
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const v of b) c = crcTable[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const [kind, out] = process.argv.slice(2);
if (!DRAW[kind] || !out) { console.error("사용법: node scripts/mockup.js <screen|doc|video|print|product|other> 출력.png"); process.exit(1); }
DRAW[kind]();
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, png());
console.log(`예시 그림: ${out} (${kind})`);
