import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";

async function readRepoFile(relativePath: string): Promise<string> {
  return fs.readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("proof: governance scripts enforce feature-flag contract checks", async () => {
  const packageJsonText = await readRepoFile("package.json");
  const packageJson = JSON.parse(packageJsonText) as {
    scripts?: Record<string, string>;
  };
  const scripts = packageJson.scripts ?? {};

  assert.ok(scripts["check:feature-flags"]);
  assert.match(scripts["prepare:architecture"] ?? "", /check:feature-flags/);
  assert.match(scripts["release:governance"] ?? "", /check:feature-flags/);

  const governanceScript = await readRepoFile("scripts/check-release-governance.ts");
  assert.match(governanceScript, /config\/feature-flags\.contract\.json/);
  assert.match(governanceScript, /docs\/architecture\/FEATURE_FLAGS\.md/);
});

test("proof: feature flags architecture doc defines rollout defaults and override contracts", async () => {
  const doc = await readRepoFile("docs/architecture/FEATURE_FLAGS.md");

  assert.match(doc, /Machine-readable contract: `config\/feature-flags\.contract\.json`/);
  assert.match(doc, /Rollout Defaults/);
  assert.match(doc, /development/);
  assert.match(doc, /preview/);
  assert.match(doc, /production/);
  assert.match(doc, /OOK_FEATURE_FLAGS_JSON/);
  assert.match(doc, /OOK_FEATURE_FLAGS/);
  assert.match(doc, /OOK_FF_ANALYTICS_PANELS_V0/);
});
