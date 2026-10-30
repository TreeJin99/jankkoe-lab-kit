// 스킬 평가 실행기 (킷 관리용. 실습에는 필요 없음. Claude 사용량이 듭니다)
//   node scripts/run-evals.js                 두 스킬의 evals.json 전부
//   node scripts/run-evals.js quote           한 스킬만
//   node scripts/run-evals.js quote --trigger 트리거 평가(trigger-evals.json)
// 평가마다 임시 폴더에 킷을 복사해 claude -p로 돌리고, evals.json의 checks로 채점한다.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SKILLS = ["quote", "sow"];
const WRITER = { quote: "quote-writer", sow: "doc-writer" };
const DOC_WORD = { quote: "견적서", sow: "과업지시서" };
const PARALLEL = 3;

function copyKit() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kit-eval-"));
  fs.cpSync(ROOT, dir, {
    recursive: true,
    filter: (src) => !/[\\/](\.git|outputs[\\/].+\.(hwpx|md))$/.test(src) && !src.includes(`${path.sep}_draft`),
  });
  return dir;
}

function prepare(dir, files) {
  for (const f of files || []) {
    if (f.fill) {
      const draft = path.join(dir, "outputs", "_draft", `${f.fill}_${f.code}.md`);
      fs.mkdirSync(path.dirname(draft), { recursive: true });
      fs.copyFileSync(path.join(dir, f.from), draft);
      spawnSync("node", ["scripts/hwpx.js", "fill", f.fill, f.code], { cwd: dir });
      fs.rmSync(path.dirname(draft), { recursive: true, force: true });
    } else {
      fs.copyFileSync(path.join(dir, f.from), path.join(dir, f.to));
    }
  }
}

// 설정 파일의 허용 목록을 그대로 넘겨 "신뢰한 폴더"와 같은 권한으로 돌린다.
function claude(dir, prompt, extra = []) {
  const allow = require(path.join(dir, ".claude", "settings.json")).permissions.allow;
  const args = ["-p", prompt, "--permission-mode", "default", "--allowedTools", ...allow,
    "--setting-sources", "project", "--output-format", "stream-json", "--verbose", ...extra];
  return new Promise((resolve) => {
    const t0 = Date.now();
    const p = spawn("claude", args, { cwd: dir, shell: process.platform === "win32" });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("close", () => {
      const ev = out.split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return {}; } });
      const calls = [];
      for (const e of ev) if (e.type === "assistant" && !e.parent_tool_use_id) {
        for (const c of e.message.content) if (c.type === "tool_use") calls.push({ name: c.name, input: c.input });
      }
      const result = ev.find((e) => e.type === "result") || {};
      resolve({ calls, answer: result.result || "", denials: (result.permission_denials || []).length, sec: Math.round((Date.now() - t0) / 1000), log: out });
    });
  });
}

function read(dir, rel) {
  const r = spawnSync("node", ["scripts/hwpx.js", "read", rel], { cwd: dir, encoding: "utf8" });
  return r.stdout || "";
}

function field(md, label) {
  for (const line of md.split("\n")) {
    const c = line.split("|").map((s) => s.trim());
    const i = c.indexOf(label);
    if (i > 0 && c[i + 1] !== undefined) return c[i + 1];
  }
  return null;
}

function grade(dir, ck, run) {
  const fails = [];
  const outs = fs.readdirSync(path.join(dir, "outputs")).filter((n) => n.endsWith(".hwpx"));
  if (ck.file) {
    if (!fs.existsSync(path.join(dir, ck.file))) fails.push(`${ck.file} 없음`);
    else {
      const md = read(dir, ck.file);
      if (ck.check_pass && spawnSync("node", ["scripts/check.js", ck.file], { cwd: dir }).status !== 0) fails.push("check.js 실패");
      for (const [k, v] of Object.entries(ck.field || {})) {
        const got = field(md, k) || "";
        const ok = typeof v === "number" ? Number(got.replace(/[^0-9]/g, "")) === v : got === v;
        if (!ok) fails.push(`${k}: "${got}" (기대 ${v})`);
      }
      for (const s of ck.contains || []) if (!md.includes(s)) fails.push(`문서에 "${s}" 없음`);
    }
  }
  for (const f of ck.no_file || []) if (fs.existsSync(path.join(dir, f))) fails.push(`${f}가 생기면 안 됨`);
  if (ck.no_file_glob && outs.some((n) => `outputs/${n}`.startsWith(ck.no_file_glob))) fails.push(`${ck.no_file_glob}* 파일이 생기면 안 됨`);
  if (ck.no_outputs && outs.length) fails.push(`outputs에 ${outs.join(", ")}가 생김`);
  for (const s of ck.answer_contains || []) if (!run.answer.includes(s)) fails.push(`답에 "${s}" 없음`);
  if (ck.agents) {
    const order = run.calls.filter((c) => c.name === "Agent").map((c) => c.input.subagent_type);
    const idx = ck.agents.map((a) => order.indexOf(a));
    if (idx.some((i) => i < 0) || idx.some((v, i) => i && v < idx[i - 1])) fails.push(`서브에이전트 순서 ${order.join(" → ") || "없음"} (기대 ${ck.agents.join(" → ")})`);
  }
  if (run.denials) fails.push(`권한 거부 ${run.denials}건`);
  return fails;
}

async function pool(jobs) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: PARALLEL }, async () => { while (i < jobs.length) { const k = i++; out[k] = await jobs[k](); } }));
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const only = args.filter((a) => SKILLS.includes(a));
  const trigger = args.includes("--trigger");
  const skills = only.length ? only : SKILLS;
  const jobs = [];
  for (const s of skills) {
    const base = path.join(ROOT, ".claude", "skills", s, "evals");
    if (trigger) {
      // 트리거 평가는 앞 단계 문서가 있는 상태(evals.json 1번의 준비 파일)에서 돌린다.
      const setup = JSON.parse(fs.readFileSync(path.join(base, "evals.json"), "utf8")).evals[0].files;
      for (const t of JSON.parse(fs.readFileSync(path.join(base, "trigger-evals.json"), "utf8"))) jobs.push(async () => {
        const dir = copyKit();
        prepare(dir, setup);
        const run = await claude(dir, t.query, ["--max-turns", "4"]);
        // 발동 = 이 스킬을 부름, 또는 작성 담당에게 이 문서를 맡김(설명 줄에 문서 이름)
        const fired = run.calls.some((c) => (c.name === "Skill" && c.input.skill === s)
          || (c.name === "Agent" && c.input.subagent_type === WRITER[s] && (c.input.description || "").includes(DOC_WORD[s])));
        fs.rmSync(dir, { recursive: true, force: true });
        return { name: `${s} 트리거 "${t.query}"`, ok: fired === t.should_trigger, why: `발동 ${fired}, 기대 ${t.should_trigger}` };
      });
    } else {
      for (const e of JSON.parse(fs.readFileSync(path.join(base, "evals.json"), "utf8")).evals) jobs.push(async () => {
        const dir = copyKit();
        prepare(dir, e.files);
        const run = await claude(dir, e.prompt);
        const fails = grade(dir, e.checks, run);
        const agents = run.calls.filter((c) => c.name === "Agent").map((c) => c.input.subagent_type).join(" → ");
        const logDir = path.join(os.tmpdir(), "kit-eval-logs");
        fs.mkdirSync(logDir, { recursive: true });
        fs.writeFileSync(path.join(logDir, `${s}-${e.id}.jsonl`), run.log);
        fs.rmSync(dir, { recursive: true, force: true });
        return { name: `${s} #${e.id} (${e.type}) "${e.prompt}"`, ok: !fails.length, why: fails.join("; ") || `${run.sec}초, ${agents || "서브에이전트 없음"}` };
      });
    }
  }
  const res = await pool(jobs);
  for (const r of res) console.log(`${r.ok ? "통과" : "실패"}  ${r.name}  ${r.why}`);
  console.log(`\n${res.filter((r) => r.ok).length}/${res.length} 통과`);
}

main();
