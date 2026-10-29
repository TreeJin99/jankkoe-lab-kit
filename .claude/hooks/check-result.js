// 결과/ 폴더에 새로 생기거나 바뀐 hwpx를 kordoc validate로 검사한다.
// 파일을 저장한 뒤(PostToolUse) 실행된다. 실패해도 작업을 막지 않고 알려만 준다.
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const dir = path.join(root, "결과");
if (!fs.existsSync(dir)) process.exit(0);

// 이미 검사한 파일(수정 시각)은 다시 검사하지 않는다. 기록은 임시 폴더에 둔다.
const id = crypto.createHash("md5").update(root).digest("hex").slice(0, 12);
const memo = path.join(os.tmpdir(), `kit-check-${id}.json`);
let seen = {};
try { seen = JSON.parse(fs.readFileSync(memo, "utf8")); } catch {}

const files = fs.readdirSync(dir).filter((f) => f.normalize("NFC").endsWith(".hwpx"));
const todo = files.filter((f) => {
  const t = fs.statSync(path.join(dir, f)).mtimeMs;
  return seen[f] !== t;
});
if (todo.length === 0) process.exit(0);

// kordoc이 깔려 있으면 그대로, 없으면 npx로 (윈도우는 npx.cmd)
const hasKordoc = spawnSync(process.platform === "win32" ? "where" : "which", ["kordoc"]).status === 0;
const lines = [];
for (const f of todo) {
  const target = path.join(dir, f);
  const [cmd, args] = hasKordoc
    ? ["kordoc", ["validate", target]]
    : ["npx", ["-y", "kordoc", "validate", target]];
  const r = spawnSync(cmd, args, { encoding: "utf8", shell: process.platform === "win32", timeout: 110000 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  if (r.status === 0 && !/오류|error/i.test(out.replace(/통과/g, ""))) {
    lines.push(`[결과 검사] ${f}: 통과`);
  } else {
    lines.push(`[결과 검사] ${f}: 확인 필요. ${out.trim().split("\n").slice(-3).join(" ")}`);
  }
  seen[f] = fs.statSync(target).mtimeMs;
}
try { fs.writeFileSync(memo, JSON.stringify(seen)); } catch {}

const msg = lines.join("\n");
process.stdout.write(JSON.stringify({
  systemMessage: msg,
  hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: msg },
}));
process.exit(0);
