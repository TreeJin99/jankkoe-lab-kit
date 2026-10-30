// 한글 양식(hwpx) 다루기. kordoc 하나만 쓴다. 맥·윈도우 공통.
//   node scripts/hwpx.js draft <quote|sow> <고객코드>   원고(md)를 outputs/_draft/에 만든다
//                                                     quote = 양식 빈칸 원고, sow = 목차·과업 틀(templates/sow-outline.md)
//   node scripts/hwpx.js fill  <quote|sow> <고객코드>   quote = 원고를 양식에 채움(patch), sow = 원고로 새로 생성(generate, 견본 templates/sow.hwpx)
//   node scripts/hwpx.js read  <파일.hwpx>                    내용을 읽어 화면에 출력
//   node scripts/hwpx.js clean                               outputs/_draft/ 원고 삭제
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DOCS = { quote: "견적서", sow: "과업지시서" };
const DRAFT_DIR = path.join(ROOT, "outputs", "_draft");

// kordoc은 Node.js 20 이상에서만 이 킷이 쓰는 기능을 낸다(낮은 버전에서는 npx가 옛 kordoc을 받아 엉뚱한 오류가 난다).
function needNode20() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 20) throw new Error(`Node.js 20 이상이 필요합니다 (지금 v${process.versions.node}). https://nodejs.org 에서 LTS를 설치한 뒤 다시 해 주세요.`);
}

// kordoc이 깔려 있으면 그대로, 없으면 npx로 받아서 실행한다.
function kordoc(args) {
  needNode20();
  const win = process.platform === "win32";
  const has = spawnSync(win ? "where" : "which", ["kordoc"]).status === 0;
  const [cmd, full] = has ? ["kordoc", args] : ["npx", ["-y", "kordoc", ...args]];
  const quoted = win ? full.map((a) => (/\s/.test(a) ? `"${a}"` : a)) : full;
  const r = spawnSync(cmd, quoted, { encoding: "utf8", shell: win, maxBuffer: 1 << 26 });
  if (r.error) throw new Error(`kordoc 실행 실패: ${r.error.message}. Node.js 20 이상인지 확인하세요.`);
  return { code: r.status, out: r.stdout || "", err: r.stderr || "" };
}

function read(file) {
  const r = kordoc([file, "--silent"]);
  if (r.code !== 0) throw new Error(`읽기 실패: ${file}\n${r.err}`);
  return r.out;
}

// --template 경로가 있으면 기본 양식 대신 그 양식(우리 회사 hwpx)을 쓴다
const TPL = (() => { const i = process.argv.indexOf("--template"); return i > 0 ? path.resolve(ROOT, process.argv[i + 1]) : null; })();

// 결과 파일 이름은 한글: outputs/견적서_바다상사.hwpx (고객사 이름은 요청 기록에서, 파일명에 못 쓰는 글자만 뺌, NFC)
const safeName = (s) => String(s || "").normalize("NFC").replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
const reqPath = (code) => path.join(ROOT, "outputs", "_requests", `${code}.json`);
function outName(doc, code) {
  const rp = reqPath(code);
  const customer = fs.existsSync(rp) ? JSON.parse(fs.readFileSync(rp, "utf8")).customer : "";
  return `${DOCS[doc]}_${safeName(customer) || code}.hwpx`.normalize("NFC");
}

function paths(doc, code) {
  if (!DOCS[doc]) throw new Error(`문서 종류는 quote · sow 중 하나입니다: ${doc}`);
  if (!/^[a-z0-9-]+$/.test(code || "")) throw new Error(`고객코드는 영문 소문자·숫자·하이픈만: ${code}`);
  return {
    template: (doc === "quote" && TPL) || path.join(ROOT, "templates", `${doc}.hwpx`),
    draft: path.join(DRAFT_DIR, `${doc}_${code}.md`),
    output: path.join(ROOT, "outputs", outName(doc, code)),
  };
}

// 저장 뒤: hwpx 문서 정보 제목을 한글로, 요청 기록에 결과 파일 경로를 남긴다
function finish(doc, code, output) {
  const title = path.basename(output, ".hwpx");
  require("./hwpx-pics.js").setTitle(output, title);
  const rp = reqPath(code);
  if (fs.existsSync(rp)) {
    const r = JSON.parse(fs.readFileSync(rp, "utf8"));
    r.outputs = { ...(r.outputs || {}), [doc]: path.relative(ROOT, output).split(path.sep).join("/") };
    fs.writeFileSync(rp, JSON.stringify(r, null, 2));
  }
}

function main() {
  const [cmd, a, b] = process.argv.slice(2);
  if (cmd === "draft" && a === "sow") {
    const p = paths(a, b);
    fs.mkdirSync(DRAFT_DIR, { recursive: true });
    fs.copyFileSync(path.join(ROOT, "templates", "sow-outline.md"), p.draft);
    console.log(`원고: ${path.relative(ROOT, p.draft)}\n괄호 ( ) 자리를 채우고, 과업 블록(### 과업 N.)과 일정 줄은 과업 수만큼 늘리세요.\n`);
    console.log(fs.readFileSync(p.draft, "utf8"));
  } else if (cmd === "fill" && a === "sow") {
    const p = paths(a, b);
    if (!fs.existsSync(p.draft)) throw new Error(`원고가 없습니다. 먼저 draft: ${path.relative(ROOT, p.draft)}`);
    const left = (fs.readFileSync(p.draft, "utf8").match(/\((건명|작성일|고객사|상호|대표|착수일|납기|과업 이름|짧은 라벨|항목|산출물|형태|관련 과업|검사항목|대상|주소|연락처|이 과업[^)]*|무엇을[^)]*|어떻게[^)]*|업종 \/[^)]*|연도별[^)]*|설립일[^)]*|사업자번호[^)]*|고객사 대표[^)]*|견적서 합계금액[^)]*|한 줄 소개|계약 조건 또는 확인 필요|자료·개인정보[^)]*|산출물 권리[^)]*|발주처가 줄[^)]*|산출물\(형태\)[^)]*)\)/g) || []);
    if (left.length) { console.log(`아직 안 채운 자리 ${left.length}곳: ${[...new Set(left)].join(" ")}`); process.exit(2); }
    // 그림(![](경로))은 견본 모드가 넣지 않으므로 〔그림 N〕 자리로 바꿔 생성한 뒤 따로 넣는다
    const pics = [];
    const md = fs.readFileSync(p.draft, "utf8").replace(/^!\[[^\]]*\]\(([^)]+)\)\s*$/gm, (_, src) => {
      const cands = [path.resolve(path.dirname(p.draft), src), path.resolve(ROOT, src)];
      const file = cands.find((c) => fs.existsSync(c));
      if (!file) { console.log(`그림 파일을 찾지 못해 건너뜀: ${src}`); return ""; }
      pics.push({ n: pics.length + 1, file });
      return `〔그림 ${pics.length}〕`;
    });
    const gen = path.join(DRAFT_DIR, `.gen_${a}_${b}.md`);
    fs.writeFileSync(gen, md);
    const r = kordoc(["generate", gen, "-o", p.output, "--template", p.template, "--silent"]);
    if (r.code !== 0 || !fs.existsSync(p.output)) throw new Error(`생성 실패\n${r.out}${r.err}`);
    let put = 0;
    if (pics.length) {
      put = require("./hwpx-pics.js").insertPics(p.output, pics);
      if (kordoc(["validate", p.output, "--silent"]).code !== 0) {
        kordoc(["generate", gen.replace(/$/, ""), "-o", p.output, "--template", p.template, "--silent"]);
        fs.writeFileSync(gen, md.replace(/^〔그림 \d+〕$/gm, ""));
        kordoc(["generate", gen, "-o", p.output, "--template", p.template, "--silent"]);
        put = 0;
        console.log("그림을 넣은 파일이 구조 검사를 통과하지 못해 그림 없이 저장했습니다.");
      }
    }
    fs.rmSync(gen, { force: true });
    finish(a, b, p.output);
    console.log(`저장: ${path.relative(ROOT, p.output)} (과업지시서, 견본 서식으로 생성${pics.length ? `, 그림 ${put}/${pics.length}장` : ""})`);
  } else if (cmd === "draft") {
    const p = paths(a, b);
    fs.mkdirSync(DRAFT_DIR, { recursive: true });
    const r = kordoc([p.template, "--keep-layout-tables", "--keep-empty-cols", "--silent", "-o", p.draft]);
    if (r.code !== 0) throw new Error(r.err);
    console.log(`원고: ${path.relative(ROOT, p.draft)}\n빈칸(|  |)만 채운 뒤 fill 하세요.\n`);
    console.log(fs.readFileSync(p.draft, "utf8"));
  } else if (cmd === "fill") {
    const p = paths(a, b);
    if (!fs.existsSync(p.draft)) throw new Error(`원고가 없습니다. 먼저 draft: ${path.relative(ROOT, p.draft)}`);
    const r = kordoc(["patch", p.template, p.draft, "-o", p.output, "--json", "--silent"]);
    let res = {};
    try { res = JSON.parse(r.out); } catch { throw new Error(`patch 실패\n${r.out}${r.err}`); }
    if (res.skipped && res.skipped.length) {
      console.log(`건너뛴 칸 ${res.skipped.length}개. 원고를 고쳐 다시 fill 하세요:\n${JSON.stringify(res.skipped, null, 1)}`);
      process.exit(2);
    }
    finish(a, b, p.output);
    console.log(`저장: ${path.relative(ROOT, p.output)} (${DOCS[a]}, 채운 칸 ${res.applied}개)`);
  } else if (cmd === "read") {
    console.log(read(path.resolve(a)));
  } else if (cmd === "clean") {
    fs.rmSync(DRAFT_DIR, { recursive: true, force: true });
    console.log("원고 폴더를 지웠습니다.");
  } else {
    console.log(fs.readFileSync(__filename, "utf8").split("\n").slice(1, 6).join("\n"));
  }
}

module.exports = { read, ROOT, DOCS, safeName };
if (require.main === module) {
  try { main(); } catch (e) { console.error(e.message); process.exit(1); }
}
