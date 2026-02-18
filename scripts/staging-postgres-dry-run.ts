import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { getPersistenceBackend, migratePostgresPersistence } from "../lib/bff/persistence";

type SnapshotCounts = {
  drops: string;
  worlds: string;
  studios: string;
  accounts: string;
  sessions: string;
  payments: string;
  receipts: string;
  certificates: string;
  webhookEvents: string;
};

function resolveConnectionString(): string {
  const value = process.env.OOK_BFF_DATABASE_URL?.trim() ?? process.env.DATABASE_URL?.trim() ?? "";
  if (!value) {
    throw new Error("OOK_BFF_DATABASE_URL (or DATABASE_URL) is required for staging Postgres dry run");
  }

  return value;
}

async function main(): Promise<void> {
  if (!process.env.OOK_BFF_PERSISTENCE_BACKEND) {
    process.env.OOK_BFF_PERSISTENCE_BACKEND = "postgres";
  }

  const backend = getPersistenceBackend();
  if (backend !== "postgres") {
    throw new Error(`expected postgres backend for dry run, received "${backend}"`);
  }

  const connectionString = resolveConnectionString();
  await migratePostgresPersistence();

  const sslMode = process.env.OOK_BFF_DATABASE_SSL?.trim().toLowerCase();
  const pool = new Pool({
    connectionString,
    max: Number(process.env.OOK_BFF_DATABASE_POOL_MAX ?? "4"),
    ssl: sslMode === "require" ? { rejectUnauthorized: false } : undefined
  });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const transientKey = `dry_run_${randomUUID()}`;
    await client.query(
      "INSERT INTO bff_meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
      [transientKey, JSON.stringify({ createdAt: new Date().toISOString() })]
    );
    await client.query("DELETE FROM bff_meta WHERE key = $1", [transientKey]);

    const snapshot = await client.query<SnapshotCounts>(`
      SELECT
        (SELECT COUNT(*)::text FROM bff_catalog_drops) AS drops,
        (SELECT COUNT(*)::text FROM bff_catalog_worlds) AS worlds,
        (SELECT COUNT(*)::text FROM bff_catalog_studios) AS studios,
        (SELECT COUNT(*)::text FROM bff_accounts) AS accounts,
        (SELECT COUNT(*)::text FROM bff_sessions) AS sessions,
        (SELECT COUNT(*)::text FROM bff_payments) AS payments,
        (SELECT COUNT(*)::text FROM bff_receipts) AS receipts,
        (SELECT COUNT(*)::text FROM bff_certificates) AS certificates,
        (SELECT COUNT(*)::text FROM bff_stripe_webhook_events) AS "webhookEvents"
    `);

    await client.query("ROLLBACK");

    const counts = snapshot.rows[0];
    console.log("staging postgres dry run passed");
    console.log(
      `snapshot: drops=${counts?.drops ?? "0"} worlds=${counts?.worlds ?? "0"} studios=${counts?.studios ?? "0"} accounts=${counts?.accounts ?? "0"} sessions=${counts?.sessions ?? "0"} payments=${counts?.payments ?? "0"} receipts=${counts?.receipts ?? "0"} certificates=${counts?.certificates ?? "0"} webhook_events=${counts?.webhookEvents ?? "0"}`
    );
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // no-op
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("staging postgres dry run failed");
  console.error(error);
  process.exit(1);
});
