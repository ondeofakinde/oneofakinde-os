import fs from "node:fs";
import path from "node:path";

type ReleaseChecksConfig = {
  required_checks?: string[];
};

const REQUIRED_FILES = [
  ".github/CODEOWNERS",
  ".github/pull_request_template.md",
  "config/release-required-checks.json",
  ".github/workflows/ci.yml"
];

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function readFileOrFail(relativePath: string): string {
  const fullPath = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`missing required governance file: ${relativePath}`);
  }

  return fs.readFileSync(fullPath, "utf8");
}

for (const relativePath of REQUIRED_FILES) {
  readFileOrFail(relativePath);
}

const checksConfigText = readFileOrFail("config/release-required-checks.json");
let checksConfig: ReleaseChecksConfig;

try {
  checksConfig = JSON.parse(checksConfigText) as ReleaseChecksConfig;
} catch {
  fail("config/release-required-checks.json must contain valid json");
}

const requiredChecks = checksConfig.required_checks ?? [];
if (!Array.isArray(requiredChecks) || requiredChecks.length === 0) {
  fail("config/release-required-checks.json must define required_checks[]");
}

for (const check of requiredChecks) {
  if (typeof check !== "string" || !check.trim()) {
    fail("every required check must be a non-empty string");
  }
}

const workflow = readFileOrFail(".github/workflows/ci.yml");

if (!workflow.includes("pull_request:")) {
  fail("ci workflow must run on pull_request");
}

for (const check of requiredChecks) {
  const marker = `\n  ${check}:`;
  if (!workflow.includes(marker)) {
    fail(`required check "${check}" is not declared as a ci job`);
  }
}

console.log(
  `release governance check passed (${requiredChecks.length} required check(s) mapped in ci workflow).`
);
