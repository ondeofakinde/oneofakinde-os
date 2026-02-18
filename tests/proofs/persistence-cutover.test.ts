import assert from "node:assert/strict";
import test from "node:test";
import { getPersistenceBackend } from "../../lib/bff/persistence";

const ENV_KEYS = [
  "OOK_APP_ENV",
  "VERCEL_ENV",
  "NODE_ENV",
  "OOK_BFF_PERSISTENCE_BACKEND",
  "OOK_BFF_DB_PATH",
  "OOK_BFF_DATABASE_URL",
  "DATABASE_URL"
] as const;

async function withEnv(
  overrides: Partial<Record<(typeof ENV_KEYS)[number], string | null>>,
  run: () => void | Promise<void>
): Promise<void> {
  const previous = new Map<string, string | undefined>();

  for (const key of ENV_KEYS) {
    previous.set(key, process.env[key]);

    if (!(key in overrides)) {
      continue;
    }

    const value = overrides[key];
    if (value === null || value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    await run();
  } finally {
    for (const key of ENV_KEYS) {
      const value = previous.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("persistence cutover: production requires postgres connection", async () => {
  await withEnv(
    {
      OOK_APP_ENV: "production",
      OOK_BFF_PERSISTENCE_BACKEND: null,
      OOK_BFF_DB_PATH: null,
      OOK_BFF_DATABASE_URL: null,
      DATABASE_URL: null
    },
    () => {
      assert.throws(
        () => getPersistenceBackend(),
        /requires DATABASE_URL/i
      );
    }
  );
});

test("persistence cutover: production rejects file backend", async () => {
  await withEnv(
    {
      OOK_APP_ENV: "production",
      OOK_BFF_PERSISTENCE_BACKEND: "file",
      OOK_BFF_DB_PATH: "/tmp/ook-file-db.json",
      OOK_BFF_DATABASE_URL: "postgres://example.com/ook"
    },
    () => {
      assert.throws(
        () => getPersistenceBackend(),
        /forbids file backend/i
      );
    }
  );
});

test("persistence cutover: production resolves to postgres", async () => {
  await withEnv(
    {
      OOK_APP_ENV: "production",
      OOK_BFF_PERSISTENCE_BACKEND: "postgres",
      OOK_BFF_DB_PATH: null,
      OOK_BFF_DATABASE_URL: "postgres://example.com/ook"
    },
    () => {
      assert.equal(getPersistenceBackend(), "postgres");
    }
  );
});

test("persistence cutover: non-production can use file backend", async () => {
  await withEnv(
    {
      OOK_APP_ENV: "staging",
      OOK_BFF_PERSISTENCE_BACKEND: "file",
      OOK_BFF_DB_PATH: "/tmp/ook-file-db.json",
      OOK_BFF_DATABASE_URL: null,
      DATABASE_URL: null
    },
    () => {
      assert.equal(getPersistenceBackend(), "file");
    }
  );
});

test("persistence cutover: NODE_ENV production enforces postgres", async () => {
  await withEnv(
    {
      OOK_APP_ENV: null,
      VERCEL_ENV: null,
      NODE_ENV: "production",
      OOK_BFF_PERSISTENCE_BACKEND: null,
      OOK_BFF_DB_PATH: null,
      OOK_BFF_DATABASE_URL: "postgres://example.com/ook"
    },
    () => {
      assert.equal(getPersistenceBackend(), "postgres");
    }
  );
});
