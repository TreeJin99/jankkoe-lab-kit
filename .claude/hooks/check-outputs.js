// 자동 검산 훅 (PostToolUse: Write|Edit|Bash)
// outputs/에 새로 생기거나 바뀐 hwpx를 scripts/check.js로 검산한다.
// 틀리면 decision "block"으로 이유를 Claude에게 돌려보내 고치게 하고, 맞으면 짧게 알린다.
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const root = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, "..", "..");
const dir = path.join(root, "outputs");
if (!fs.existsSync(dir)) process.exit(0);

// 이미 검산한 파일(수정 시각)은 건너뛴다. 기록은 임시 폴더에 둔다.
const id = crypto.createHash("md5").update(root).digest("hex").slice(0, 12);
const memo = path.join(os.tmpdir(), `kit-check-${id}.json`);
let seen = {};
try { seen = JSON.parse(fs.readFileSync(memo, "utf8")); } catch {}

const todo = fs.readdirSync(dir)
  .filter((n) => n.endsWith(".hwpx"))
  .filter((n) => seen[n] !== fs.statSync(path.join(dir, n)).mtimeMs);
if (!todo.length) process.exit(0);

const { check } = require(path.join(root, "scripts", "check.js"));
const pass = [];
const fail = [];
for (const n of todo) {
  const file = path.join(dir, n);
  let errs;
  try { errs = check(file); } catch (e) { errs = [e.message]; }
  if (errs.length) fail.push(`${n}\n${errs.map((e) => `- ${e}`).join("\n")}`);
  else pass.push(n);
  seen[n] = fs.statSync(file).mtimeMs;
}
try { fs.writeFileSync(memo, JSON.stringify(seen)); } catch {}

const ok = pass.map((n) => `[자동 검산] ${n}: 통과`).join("\n");
if (fail.length) {
  process.stdout.write(JSON.stringify({
    decision: "block",
    reason: `[자동 검산] 틀린 곳이 있습니다. 원고를 고쳐 같은 파일 이름으로 다시 저장하세요.\n${fail.join("\n")}${ok ? `\n${ok}` : ""}`,
  }));
} else {
  process.stdout.write(JSON.stringify({
    systemMessage: ok,
    hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: ok },
  }));
}
process.exit(0);
