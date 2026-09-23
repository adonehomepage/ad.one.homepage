/**
 * Vercel Ignore Build Step 용.
 * exit 0 = 빌드 스킵, exit 1 = 빌드 진행
 *
 * Vercel Project → Settings → Git → Ignore Build Step:
 *   node scripts/vercel-ignore-build.mjs
 */
import { execSync } from "node:child_process";

const paths = [
  ".",
  ":!*.md",
  ":!docs/**",
  ":!README.md",
  ":!AGENTS.md",
  ":!CLAUDE.md",
];

try {
  execSync(`git diff --quiet HEAD^ HEAD -- ${paths.map((p) => `"${p}"`).join(" ")}`, {
    stdio: "pipe",
  });
  console.log("Only docs/markdown changed — skipping build");
  process.exit(0);
} catch (error) {
  const status = /** @type {{ status?: number }} */ (error).status;
  if (status === 1) {
    console.log("Code changed — proceeding with build");
    process.exit(1);
  }
  // 첫 커밋 등 diff 실패 시에는 안전하게 빌드
  console.log("Could not compare commits — proceeding with build");
  process.exit(1);
}
