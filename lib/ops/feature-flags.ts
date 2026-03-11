import featureFlagsContractJson from "@/config/feature-flags.contract.json";

type RuntimeName = "development" | "preview" | "production";

type FeatureFlagsContract = {
  version: string;
  flags: Array<{
    key: string;
    owner: string;
    rollout: "dark" | "beta" | "ga";
    description: string;
  }>;
  defaults: Record<RuntimeName, Record<string, boolean>>;
};

const FEATURE_FLAGS_CONTRACT = featureFlagsContractJson as FeatureFlagsContract;
const FEATURE_FLAG_SET = new Set(FEATURE_FLAGS_CONTRACT.flags.map((entry) => entry.key));

export type FeatureFlagRuntime = RuntimeName;
export type FeatureFlagKey = keyof typeof featureFlagsContractJson.defaults.production;
export type FeatureFlagSnapshot = Record<FeatureFlagKey, boolean>;

function parseBooleanToken(value: string | undefined): boolean | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (["1", "true", "on", "yes", "enabled"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "off", "no", "disabled"].includes(normalized)) {
    return false;
  }

  return null;
}

function isRuntimeName(value: string): value is RuntimeName {
  return value === "development" || value === "preview" || value === "production";
}

function isFeatureFlagKey(value: string): value is FeatureFlagKey {
  return FEATURE_FLAG_SET.has(value);
}

function toFeatureFlagEnvKey(key: FeatureFlagKey): string {
  return `OOK_FF_${key.toUpperCase()}`;
}

export function resolveFeatureFlagRuntime(env: NodeJS.ProcessEnv = process.env): FeatureFlagRuntime {
  const appEnv = env.OOK_APP_ENV?.trim().toLowerCase() ?? "";
  if (isRuntimeName(appEnv)) {
    return appEnv;
  }

  const vercelEnv = env.VERCEL_ENV?.trim().toLowerCase() ?? "";
  if (vercelEnv === "production") {
    return "production";
  }
  if (vercelEnv === "preview") {
    return "preview";
  }

  return "development";
}

function getRuntimeDefaults(runtime: FeatureFlagRuntime): FeatureFlagSnapshot {
  return { ...(FEATURE_FLAGS_CONTRACT.defaults[runtime] as FeatureFlagSnapshot) };
}

function applyStructuredOverride(
  current: FeatureFlagSnapshot,
  value: string | undefined
): FeatureFlagSnapshot {
  if (!value?.trim()) {
    return current;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return current;
  }

  if (!parsed || typeof parsed !== "object") {
    return current;
  }

  const next = { ...current };
  for (const [candidateKey, rawValue] of Object.entries(parsed as Record<string, unknown>)) {
    if (!isFeatureFlagKey(candidateKey) || typeof rawValue !== "boolean") {
      continue;
    }

    next[candidateKey] = rawValue;
  }

  return next;
}

function applyCompactOverride(current: FeatureFlagSnapshot, value: string | undefined): FeatureFlagSnapshot {
  if (!value?.trim()) {
    return current;
  }

  const next = { ...current };
  const parts = value.split(",");
  for (const part of parts) {
    const [rawKey, rawToggle] = part.split("=");
    if (!rawKey || !rawToggle) {
      continue;
    }

    const candidateKey = rawKey.trim();
    if (!isFeatureFlagKey(candidateKey)) {
      continue;
    }

    const parsed = parseBooleanToken(rawToggle);
    if (parsed === null) {
      continue;
    }

    next[candidateKey] = parsed;
  }

  return next;
}

function applyPerFlagOverrides(current: FeatureFlagSnapshot, env: NodeJS.ProcessEnv): FeatureFlagSnapshot {
  const next = { ...current };
  for (const key of Object.keys(current) as FeatureFlagKey[]) {
    const parsed = parseBooleanToken(env[toFeatureFlagEnvKey(key)]);
    if (parsed === null) {
      continue;
    }

    next[key] = parsed;
  }

  return next;
}

export function getFeatureFlagSnapshot(
  options: {
    runtime?: FeatureFlagRuntime;
    env?: NodeJS.ProcessEnv;
  } = {}
): FeatureFlagSnapshot {
  const env = options.env ?? process.env;
  const runtime = options.runtime ?? resolveFeatureFlagRuntime(env);

  const defaults = getRuntimeDefaults(runtime);
  const structured = applyStructuredOverride(defaults, env.OOK_FEATURE_FLAGS_JSON);
  const compact = applyCompactOverride(structured, env.OOK_FEATURE_FLAGS);
  return applyPerFlagOverrides(compact, env);
}

export function isFeatureEnabled(
  key: FeatureFlagKey,
  options: {
    runtime?: FeatureFlagRuntime;
    env?: NodeJS.ProcessEnv;
  } = {}
): boolean {
  return getFeatureFlagSnapshot(options)[key] === true;
}

export function getFeatureFlagContract(): FeatureFlagsContract {
  return FEATURE_FLAGS_CONTRACT;
}
