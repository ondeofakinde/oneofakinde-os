import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

const requiredPaths = [
  ".next/BUILD_ID",
  ".next/server/pages-manifest.json",
  ".next/server/pages/_document.js"
];

const missing = requiredPaths.filter((relativePath) => {
  const absolutePath = path.join(projectRoot, relativePath);
  return !fs.existsSync(absolutePath);
});

if (missing.length > 0) {
  console.error("[prestart] Missing production build artifacts:");
  for (const relativePath of missing) {
    console.error(`  - ${relativePath}`);
  }
  console.error("[prestart] Run `npm run build` before `npm run start`.");
  process.exit(1);
}
