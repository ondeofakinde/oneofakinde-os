import fs from "node:fs";
import path from "node:path";

type RuntimeName = "development" | "preview" | "production";

type FeatureFlagEntry = {
  key: string;
  owner: string;
  rollout: "dark" | "beta" | "ga";
  description: string;
};

type FeatureFlagsContract = {
  version: string;
  flags: FeatureFlagEntry[];
  defaults: Record<RuntimeName, Record<string, boolean>>;
};

const CONTRACT_PATH = path.resolve(process.cwd(), "config", "feature-flags.contract.json");
const RUNTIMES: RuntimeName[] = ["development", "preview", "production"];

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function assertFlagShape(entry: unknown, index: number): asserts entry is FeatureFlagEntry {
  if (!entry || typeof entry !== "object") {
    fail(`feature flag entry #${index + 1} must be an object`);
  }

  const candidate = entry as Record<string, unknown>;
  if (typeof candidate.key !== "string" || !candidate.key.trim()) {
    fail(`feature flag entry #${index + 1} must include non-empty key`);
  }
  if (!/^[a-z0-9_]+$/.test(candidate.key)) {
    fail(`feature flag key "${candidate.key}" must be snake_case`);
  }
  if (typeof candidate.owner !== "string" || !candidate.owner.trim()) {
    fail(`feature flag "${candidate.key}" must include owner`);
  }
  if (candidate.rollout !== "dark" && candidate.rollout !== "beta" && candidate.rollout !== "ga") {
    fail(`feature flag "${candidate.key}" rollout must be one of: dark, beta, ga`);
  }
  if (typeof candidate.description !== "string" || !candidate.description.trim()) {
    fail(`feature flag "${candidate.key}" must include description`);
  }
}

function parseContract(): FeatureFlagsContract {
  if (!fs.existsSync(CONTRACT_PATH)) {
    fail("missing config/feature-flags.contract.json");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(CONTRACT_PATH, "utf8")) as unknown;
  } catch {
    fail("config/feature-flags.contract.json must contain valid json");
  }

  if (!parsed || typeof parsed !== "object") {
    fail("feature flags contract must be a json object");
  }

  const contract = parsed as Partial<FeatureFlagsContract>;
  if (typeof contract.version !== "string" || !contract.version.trim()) {
    fail("feature flags contract requires non-empty version");
  }

  if (!Array.isArray(contract.flags) || contract.flags.length === 0) {
    fail("feature flags contract requires non-empty flags[]");
  }

  const keys = new Set<string>();
  for (let index = 0; index < contract.flags.length; index += 1) {
    const entry = contract.flags[index];
    assertFlagShape(entry, index);
    if (keys.has(entry.key)) {
      fail(`feature flag key "${entry.key}" is duplicated`);
    }
    keys.add(entry.key);
  }

  if (!contract.defaults || typeof contract.defaults !== "object") {
    fail("feature flags contract requires defaults object");
  }

  for (const runtime of RUNTIMES) {
    const defaults = (contract.defaults as Record<string, unknown>)[runtime];
    if (!defaults || typeof defaults !== "object" || Array.isArray(defaults)) {
      fail(`feature flags contract defaults.${runtime} must be an object`);
    }

    const runtimeDefaults = defaults as Record<string, unknown>;
    for (const key of keys) {
      if (!(key in runtimeDefaults)) {
        fail(`feature flags contract defaults.${runtime} missing key "${key}"`);
      }
      if (typeof runtimeDefaults[key] !== "boolean") {
        fail(`feature flags contract defaults.${runtime}.${key} must be boolean`);
      }
    }

    for (const key of Object.keys(runtimeDefaults)) {
      if (!keys.has(key)) {
        fail(`feature flags contract defaults.${runtime}.${key} has no matching flag definition`);
      }
    }
  }

  return contract as FeatureFlagsContract;
}

const contract = parseContract();
console.log(
  `feature flags contract check passed (${contract.flags.length} flags, ${RUNTIMES.length} runtime defaults).`
);
