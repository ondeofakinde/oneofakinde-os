import type {
  AccountRole,
  Certificate,
  Drop,
  PurchaseReceipt,
  Studio,
  World
} from "@/lib/domain/contracts";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Pool, type PoolClient } from "pg";
import { seedPreviewMediaForDrop } from "@/lib/townhall/seed-preview-media";

export type AccountRecord = {
  id: string;
  email: string;
  handle: string;
  displayName: string;
  roles: AccountRole[];
  createdAt: string;
};

export type SessionRecord = {
  token: string;
  accountId: string;
  createdAt: string;
  expiresAt: string;
};

export type OwnedDropRecord = {
  accountId: string;
  dropId: string;
  certificateId: string;
  receiptId: string;
  acquiredAt: string;
};

export type SavedDropRecord = {
  accountId: string;
  dropId: string;
  savedAt: string;
};

export type CertificateRecord = Certificate & {
  ownerAccountId: string;
};

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export type PaymentRecord = {
  id: string;
  provider: "manual" | "stripe";
  status: PaymentStatus;
  accountId: string;
  dropId: string;
  amountUsd: number;
  currency: "USD";
  checkoutSessionId?: string;
  checkoutUrl?: string | null;
  providerPaymentIntentId?: string;
  receiptId?: string;
  createdAt: string;
  updatedAt: string;
};

export type StripeWebhookEventRecord = {
  eventId: string;
  processedAt: string;
};

export type BffDatabase = {
  version: 1;
  catalog: {
    drops: Drop[];
    worlds: World[];
    studios: Studio[];
  };
  accounts: AccountRecord[];
  sessions: SessionRecord[];
  ownerships: OwnedDropRecord[];
  savedDrops: SavedDropRecord[];
  receipts: PurchaseReceipt[];
  certificates: CertificateRecord[];
  payments: PaymentRecord[];
  stripeWebhookEvents: StripeWebhookEventRecord[];
};

type MutationResult<T> = {
  result: T;
  persist: boolean;
};

type PersistenceBackend = "file" | "postgres";
type PostgresSeedStrategy = "demo" | "catalog" | "none";

const DATA_VERSION = 1 as const;
const DEFAULT_DB_PATH = path.join(process.cwd(), ".data", "ook-bff-db.json");
const DEFAULT_MIGRATIONS_DIR = path.join(process.cwd(), "config");
const POSTGRES_ADVISORY_LOCK_KEY = 17_021_626;

const PROCESSING_FEE_USD = 1.99;
const DAY_MS = 86_400_000;

let queue: Promise<void> = Promise.resolve();
let cachedPath = "";
let cachedDb: BffDatabase | null = null;
let postgresPool: Pool | null = null;
let migrationsBootstrappedFor = "";

function toHandle(email: string): string {
  const base = email.split("@")[0] ?? "collector";
  return base.toLowerCase().replace(/[^a-z0-9_]/g, "") || "collector";
}

function startCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => (segment[0] ?? "").toUpperCase() + segment.slice(1))
    .join(" ");
}

function resolveDbPath(): string {
  const configured = process.env.OOK_BFF_DB_PATH?.trim();
  if (configured) {
    return path.resolve(configured);
  }

  return DEFAULT_DB_PATH;
}

function resolvePostgresConnectionString(): string {
  const connectionString =
    process.env.OOK_BFF_DATABASE_URL?.trim() ?? process.env.DATABASE_URL?.trim() ?? "";

  if (!connectionString) {
    throw new Error("DATABASE_URL (or OOK_BFF_DATABASE_URL) is required for postgres persistence backend");
  }

  return connectionString;
}

function resolveMigrationsDir(): string {
  const configured = process.env.OOK_BFF_MIGRATIONS_DIR?.trim();
  if (!configured) {
    return DEFAULT_MIGRATIONS_DIR;
  }

  return path.resolve(configured);
}

function resolveRuntimeEnvironment(): string {
  const explicit = process.env.OOK_APP_ENV?.trim().toLowerCase();
  if (explicit) {
    return explicit;
  }

  const vercel = process.env.VERCEL_ENV?.trim().toLowerCase();
  if (vercel) {
    return vercel;
  }

  return "";
}

export function isProductionPersistenceCutover(): boolean {
  return resolveRuntimeEnvironment() === "production";
}

function resolvePersistenceBackend(): PersistenceBackend {
  const configured = process.env.OOK_BFF_PERSISTENCE_BACKEND?.trim().toLowerCase();
  const hasFilePath = Boolean(process.env.OOK_BFF_DB_PATH?.trim());
  const hasPostgresConnection = Boolean(
    (process.env.OOK_BFF_DATABASE_URL ?? process.env.DATABASE_URL)?.trim()
  );

  if (isProductionPersistenceCutover()) {
    if (configured === "file" || hasFilePath) {
      throw new Error(
        "production persistence cutover forbids file backend; remove OOK_BFF_DB_PATH and set postgres config"
      );
    }

    if (!hasPostgresConnection) {
      throw new Error(
        "production persistence cutover requires DATABASE_URL (or OOK_BFF_DATABASE_URL)"
      );
    }

    return "postgres";
  }

  if (configured === "file") {
    return "file";
  }

  if (configured === "postgres") {
    return "postgres";
  }

  if (hasFilePath) {
    return "file";
  }

  if (hasPostgresConnection) {
    return "postgres";
  }

  return "file";
}

export function getPersistenceBackend(): PersistenceBackend {
  return resolvePersistenceBackend();
}

function getPostgresPool(): Pool {
  if (postgresPool) {
    return postgresPool;
  }

  const sslMode = process.env.OOK_BFF_DATABASE_SSL?.trim().toLowerCase();
  postgresPool = new Pool({
    connectionString: resolvePostgresConnectionString(),
    max: Number(process.env.OOK_BFF_DATABASE_POOL_MAX ?? "10"),
    ssl: sslMode === "require" ? { rejectUnauthorized: false } : undefined
  });

  return postgresPool;
}

function resolvePostgresSeedStrategy(): PostgresSeedStrategy {
  const configured = process.env.OOK_BFF_POSTGRES_SEED_STRATEGY?.trim().toLowerCase();
  if (configured === "demo" || configured === "catalog" || configured === "none") {
    return configured;
  }

  return isProductionPersistenceCutover() ? "catalog" : "demo";
}

function createSeedDatabase(): BffDatabase {
  const now = new Date("2026-02-16T12:00:00.000Z");
  const nowIso = now.toISOString();
  const accountId = "acct_collector_demo";
  const seededReceiptId = "rcpt_seed_stardust";
  const seededCertificateId = "cert_seed_stardust";

  const worlds: World[] = [
    {
      id: "dark-matter",
      title: "dark matter",
      synopsis: "cinematic drops exploring identity and memory.",
      studioHandle: "oneofakinde"
    },
    {
      id: "through-the-lens",
      title: "through the lens",
      synopsis: "camera-led drops for real-world atmospheres.",
      studioHandle: "oneofakinde"
    }
  ];

  const studios: Studio[] = [
    {
      handle: "oneofakinde",
      title: "oneofakinde",
      synopsis: "a cultural network publishing drops across live, read, listen, and watch modes.",
      worldIds: ["dark-matter", "through-the-lens"]
    }
  ];

  const drops: Drop[] = [
    {
      id: "stardust",
      title: "stardust",
      seasonLabel: "season one",
      episodeLabel: "episode one",
      studioHandle: "oneofakinde",
      worldId: "dark-matter",
      worldLabel: "dark matter",
      synopsis: "through the dark, stardust traces identity in motion.",
      releaseDate: "2026-02-16",
      priceUsd: 1.99,
      previewMedia: seedPreviewMediaForDrop("stardust")
    },
    {
      id: "twilight-whispers",
      title: "twilight whispers",
      seasonLabel: "memories",
      episodeLabel: "lights in the night",
      studioHandle: "oneofakinde",
      worldId: "dark-matter",
      worldLabel: "dark matter",
      synopsis: "an ambient chapter where memory and water share a horizon.",
      releaseDate: "2026-02-10",
      priceUsd: 3.49,
      previewMedia: seedPreviewMediaForDrop("twilight-whispers")
    },
    {
      id: "voidrunner",
      title: "voidrunner",
      seasonLabel: "season one",
      episodeLabel: "episode three",
      studioHandle: "oneofakinde",
      worldId: "dark-matter",
      worldLabel: "dark matter",
      synopsis: "a lone signal crosses worlds and leaves a live trail.",
      releaseDate: "2026-02-12",
      priceUsd: 9.99,
      previewMedia: seedPreviewMediaForDrop("voidrunner")
    },
    {
      id: "through-the-lens",
      title: "through the lens",
      seasonLabel: "city voices",
      episodeLabel: "coffee table",
      studioHandle: "oneofakinde",
      worldId: "through-the-lens",
      worldLabel: "through the lens",
      synopsis: "a quiet table becomes a live scene with layered stories.",
      releaseDate: "2026-02-14",
      priceUsd: 12,
      previewMedia: seedPreviewMediaForDrop("through-the-lens")
    }
  ];

  const seededReceipt: PurchaseReceipt = {
    id: seededReceiptId,
    accountId,
    dropId: "stardust",
    amountUsd: 1.99,
    status: "completed",
    purchasedAt: nowIso
  };

  const seededCertificate: CertificateRecord = {
    id: seededCertificateId,
    dropId: "stardust",
    dropTitle: "stardust",
    ownerHandle: "collector_demo",
    issuedAt: nowIso,
    receiptId: seededReceiptId,
    status: "verified",
    ownerAccountId: accountId
  };

  return {
    version: DATA_VERSION,
    catalog: {
      drops,
      worlds,
      studios
    },
    accounts: [
      {
        id: accountId,
        email: "collector@oneofakinde.com",
        handle: "collector_demo",
        displayName: "collector demo",
        roles: ["collector"],
        createdAt: nowIso
      }
    ],
    sessions: [],
    ownerships: [
      {
        accountId,
        dropId: "stardust",
        certificateId: seededCertificateId,
        receiptId: seededReceiptId,
        acquiredAt: nowIso
      }
    ],
    savedDrops: [
      {
        accountId,
        dropId: "twilight-whispers",
        savedAt: new Date(now.valueOf() - DAY_MS).toISOString()
      },
      {
        accountId,
        dropId: "through-the-lens",
        savedAt: new Date(now.valueOf() - DAY_MS * 2).toISOString()
      },
      {
        accountId,
        dropId: "voidrunner",
        savedAt: new Date(now.valueOf() - DAY_MS * 3).toISOString()
      }
    ],
    receipts: [seededReceipt],
    certificates: [seededCertificate],
    payments: [],
    stripeWebhookEvents: []
  };
}

function createCatalogSeedDatabase(): BffDatabase {
  const seeded = createSeedDatabase();
  return {
    ...seeded,
    accounts: [],
    sessions: [],
    ownerships: [],
    savedDrops: [],
    receipts: [],
    certificates: [],
    payments: [],
    stripeWebhookEvents: []
  };
}

function createEmptyDatabase(): BffDatabase {
  return {
    version: DATA_VERSION,
    catalog: {
      drops: [],
      worlds: [],
      studios: []
    },
    accounts: [],
    sessions: [],
    ownerships: [],
    savedDrops: [],
    receipts: [],
    certificates: [],
    payments: [],
    stripeWebhookEvents: []
  };
}

function isValidDb(input: unknown): input is BffDatabase {
  if (!input || typeof input !== "object") {
    return false;
  }

  const candidate = input as Partial<BffDatabase>;
  return (
    candidate.version === DATA_VERSION &&
    Array.isArray(candidate.catalog?.drops) &&
    Array.isArray(candidate.catalog?.worlds) &&
    Array.isArray(candidate.catalog?.studios) &&
    Array.isArray(candidate.accounts) &&
    Array.isArray(candidate.sessions) &&
    Array.isArray(candidate.ownerships) &&
    Array.isArray(candidate.savedDrops) &&
    Array.isArray(candidate.receipts) &&
    Array.isArray(candidate.certificates) &&
    Array.isArray(candidate.payments) &&
    Array.isArray(candidate.stripeWebhookEvents)
  );
}

function isLegacyDbWithoutWebhookLog(input: unknown): input is Omit<BffDatabase, "stripeWebhookEvents"> {
  if (!input || typeof input !== "object") {
    return false;
  }

  const candidate = input as Partial<BffDatabase>;
  return (
    candidate.version === DATA_VERSION &&
    Array.isArray(candidate.catalog?.drops) &&
    Array.isArray(candidate.catalog?.worlds) &&
    Array.isArray(candidate.catalog?.studios) &&
    Array.isArray(candidate.accounts) &&
    Array.isArray(candidate.sessions) &&
    Array.isArray(candidate.ownerships) &&
    Array.isArray(candidate.savedDrops) &&
    Array.isArray(candidate.receipts) &&
    Array.isArray(candidate.certificates) &&
    Array.isArray(candidate.payments) &&
    !Array.isArray((candidate as { stripeWebhookEvents?: unknown[] }).stripeWebhookEvents)
  );
}

function normalizeDatabase(input: unknown): BffDatabase | null {
  if (isValidDb(input)) {
    return input;
  }

  if (isLegacyDbWithoutWebhookLog(input)) {
    return {
      ...input,
      stripeWebhookEvents: []
    };
  }

  return null;
}

async function readFileDatabase(dbPath: string): Promise<BffDatabase | null> {
  try {
    const raw = await fs.readFile(dbPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return normalizeDatabase(parsed);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function loadFileDb(): Promise<BffDatabase> {
  const dbPath = resolveDbPath();
  if (cachedDb && cachedPath === dbPath) {
    return cachedDb;
  }

  const loaded = await readFileDatabase(dbPath);
  if (loaded) {
    cachedPath = dbPath;
    cachedDb = loaded;
    return cachedDb;
  }

  const seeded = createSeedDatabase();
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(seeded, null, 2) + "\n", "utf8");
  cachedPath = dbPath;
  cachedDb = seeded;
  return cachedDb;
}

async function persistFileDb(db: BffDatabase): Promise<void> {
  const dbPath = resolveDbPath();
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2) + "\n", "utf8");
}

function parseDropJson(value: unknown): Drop {
  return (typeof value === "string" ? JSON.parse(value) : value) as Drop;
}

function parseWorldJson(value: unknown): World {
  return (typeof value === "string" ? JSON.parse(value) : value) as World;
}

function parseStudioJson(value: unknown): Studio {
  return (typeof value === "string" ? JSON.parse(value) : value) as Studio;
}

async function ensurePostgresMigrations(client: PoolClient): Promise<void> {
  const connectionString = resolvePostgresConnectionString();
  if (migrationsBootstrappedFor === connectionString) {
    return;
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS ook_bff_schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  const migrationsDir = resolveMigrationsDir();
  let files: string[] = [];

  try {
    files = (await fs.readdir(migrationsDir))
      .filter((entry) => entry.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") {
      throw error;
    }
  }

  for (const fileName of files) {
    const existing = await client.query<{ version: string }>(
      "SELECT version FROM ook_bff_schema_migrations WHERE version = $1",
      [fileName]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, fileName), "utf8");
    if (sql.trim()) {
      await client.query(sql);
    }

    await client.query(
      "INSERT INTO ook_bff_schema_migrations (version, applied_at) VALUES ($1, $2)",
      [fileName, new Date().toISOString()]
    );
  }

  migrationsBootstrappedFor = connectionString;
}

async function loadPostgresDb(client: PoolClient): Promise<BffDatabase | null> {
  const [
    metaResult,
    dropsResult,
    worldsResult,
    studiosResult,
    accountsResult,
    sessionsResult,
    ownershipsResult,
    savedDropsResult,
    receiptsResult,
    certificatesResult,
    paymentsResult,
    webhookEventsResult
  ] = await Promise.all([
    client.query<{ key: string; value: string }>("SELECT key, value FROM bff_meta"),
    client.query<{ data: unknown }>("SELECT data FROM bff_catalog_drops ORDER BY id ASC"),
    client.query<{ data: unknown }>("SELECT data FROM bff_catalog_worlds ORDER BY id ASC"),
    client.query<{ data: unknown }>("SELECT data FROM bff_catalog_studios ORDER BY handle ASC"),
    client.query<{
      id: string;
      email: string;
      handle: string;
      displayName: string;
      roles: string[];
      createdAt: string;
    }>(
      'SELECT id, email, handle, display_name AS "displayName", roles, created_at AS "createdAt" FROM bff_accounts ORDER BY created_at ASC'
    ),
    client.query<SessionRecord>(
      'SELECT token, account_id AS "accountId", created_at AS "createdAt", expires_at AS "expiresAt" FROM bff_sessions ORDER BY created_at ASC'
    ),
    client.query<OwnedDropRecord>(
      'SELECT account_id AS "accountId", drop_id AS "dropId", certificate_id AS "certificateId", receipt_id AS "receiptId", acquired_at AS "acquiredAt" FROM bff_ownerships ORDER BY acquired_at DESC'
    ),
    client.query<SavedDropRecord>(
      'SELECT account_id AS "accountId", drop_id AS "dropId", saved_at AS "savedAt" FROM bff_saved_drops ORDER BY saved_at DESC'
    ),
    client.query<{
      id: string;
      accountId: string;
      dropId: string;
      amountUsd: string | number;
      status: PurchaseReceipt["status"];
      purchasedAt: string;
    }>(
      'SELECT id, account_id AS "accountId", drop_id AS "dropId", amount_usd AS "amountUsd", status, purchased_at AS "purchasedAt" FROM bff_receipts ORDER BY purchased_at DESC'
    ),
    client.query<CertificateRecord>(
      'SELECT id, drop_id AS "dropId", drop_title AS "dropTitle", owner_handle AS "ownerHandle", issued_at AS "issuedAt", receipt_id AS "receiptId", status, owner_account_id AS "ownerAccountId" FROM bff_certificates ORDER BY issued_at DESC'
    ),
    client.query<{
      id: string;
      provider: PaymentRecord["provider"];
      status: PaymentRecord["status"];
      accountId: string;
      dropId: string;
      amountUsd: string | number;
      currency: PaymentRecord["currency"];
      checkoutSessionId: string | null;
      checkoutUrl: string | null;
      providerPaymentIntentId: string | null;
      receiptId: string | null;
      createdAt: string;
      updatedAt: string;
    }>(
      'SELECT id, provider, status, account_id AS "accountId", drop_id AS "dropId", amount_usd AS "amountUsd", currency, checkout_session_id AS "checkoutSessionId", checkout_url AS "checkoutUrl", provider_payment_intent_id AS "providerPaymentIntentId", receipt_id AS "receiptId", created_at AS "createdAt", updated_at AS "updatedAt" FROM bff_payments ORDER BY created_at DESC'
    ),
    client.query<StripeWebhookEventRecord>(
      'SELECT event_id AS "eventId", processed_at AS "processedAt" FROM bff_stripe_webhook_events ORDER BY processed_at DESC'
    )
  ]);

  const isEmpty =
    metaResult.rowCount === 0 &&
    dropsResult.rowCount === 0 &&
    worldsResult.rowCount === 0 &&
    studiosResult.rowCount === 0 &&
    accountsResult.rowCount === 0 &&
    sessionsResult.rowCount === 0 &&
    ownershipsResult.rowCount === 0 &&
    savedDropsResult.rowCount === 0 &&
    receiptsResult.rowCount === 0 &&
    certificatesResult.rowCount === 0 &&
    paymentsResult.rowCount === 0 &&
    webhookEventsResult.rowCount === 0;

  if (isEmpty) {
    return null;
  }

  const meta = new Map(metaResult.rows.map((row) => [row.key, row.value]));
  const persistedVersion = Number(meta.get("version") ?? DATA_VERSION);
  if (persistedVersion !== DATA_VERSION) {
    throw new Error(`unsupported persisted version in postgres: ${persistedVersion}`);
  }

  return {
    version: DATA_VERSION,
    catalog: {
      drops: dropsResult.rows.map((row) => parseDropJson(row.data)),
      worlds: worldsResult.rows.map((row) => parseWorldJson(row.data)),
      studios: studiosResult.rows.map((row) => parseStudioJson(row.data))
    },
    accounts: accountsResult.rows.map((row) => ({
      id: row.id,
      email: row.email,
      handle: row.handle,
      displayName: row.displayName,
      roles: row.roles.filter((role): role is AccountRole => role === "collector" || role === "creator"),
      createdAt: row.createdAt
    })),
    sessions: sessionsResult.rows,
    ownerships: ownershipsResult.rows,
    savedDrops: savedDropsResult.rows,
    receipts: receiptsResult.rows.map((row) => ({
      id: row.id,
      accountId: row.accountId,
      dropId: row.dropId,
      amountUsd: Number(row.amountUsd),
      status: row.status,
      purchasedAt: row.purchasedAt
    })),
    certificates: certificatesResult.rows,
    payments: paymentsResult.rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      status: row.status,
      accountId: row.accountId,
      dropId: row.dropId,
      amountUsd: Number(row.amountUsd),
      currency: row.currency,
      checkoutSessionId: row.checkoutSessionId ?? undefined,
      checkoutUrl: row.checkoutUrl,
      providerPaymentIntentId: row.providerPaymentIntentId ?? undefined,
      receiptId: row.receiptId ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    })),
    stripeWebhookEvents: webhookEventsResult.rows
  };
}

async function persistPostgresDb(client: PoolClient, db: BffDatabase): Promise<void> {
  await client.query(`
    TRUNCATE TABLE
      bff_stripe_webhook_events,
      bff_payments,
      bff_certificates,
      bff_receipts,
      bff_saved_drops,
      bff_ownerships,
      bff_sessions,
      bff_accounts,
      bff_catalog_studios,
      bff_catalog_worlds,
      bff_catalog_drops,
      bff_meta
  `);

  await client.query("INSERT INTO bff_meta (key, value) VALUES ($1, $2)", ["version", String(db.version)]);

  for (const drop of db.catalog.drops) {
    await client.query("INSERT INTO bff_catalog_drops (id, data) VALUES ($1, $2::jsonb)", [
      drop.id,
      JSON.stringify(drop)
    ]);
  }

  for (const world of db.catalog.worlds) {
    await client.query("INSERT INTO bff_catalog_worlds (id, data) VALUES ($1, $2::jsonb)", [
      world.id,
      JSON.stringify(world)
    ]);
  }

  for (const studio of db.catalog.studios) {
    await client.query("INSERT INTO bff_catalog_studios (handle, data) VALUES ($1, $2::jsonb)", [
      studio.handle,
      JSON.stringify(studio)
    ]);
  }

  for (const account of db.accounts) {
    await client.query(
      "INSERT INTO bff_accounts (id, email, handle, display_name, roles, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
      [account.id, account.email, account.handle, account.displayName, account.roles, account.createdAt]
    );
  }

  for (const session of db.sessions) {
    await client.query(
      "INSERT INTO bff_sessions (token, account_id, created_at, expires_at) VALUES ($1, $2, $3, $4)",
      [session.token, session.accountId, session.createdAt, session.expiresAt]
    );
  }

  for (const ownership of db.ownerships) {
    await client.query(
      "INSERT INTO bff_ownerships (account_id, drop_id, certificate_id, receipt_id, acquired_at) VALUES ($1, $2, $3, $4, $5)",
      [
        ownership.accountId,
        ownership.dropId,
        ownership.certificateId,
        ownership.receiptId,
        ownership.acquiredAt
      ]
    );
  }

  for (const savedDrop of db.savedDrops) {
    await client.query(
      "INSERT INTO bff_saved_drops (account_id, drop_id, saved_at) VALUES ($1, $2, $3)",
      [savedDrop.accountId, savedDrop.dropId, savedDrop.savedAt]
    );
  }

  for (const receipt of db.receipts) {
    await client.query(
      "INSERT INTO bff_receipts (id, account_id, drop_id, amount_usd, status, purchased_at) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        receipt.id,
        receipt.accountId,
        receipt.dropId,
        receipt.amountUsd,
        receipt.status,
        receipt.purchasedAt
      ]
    );
  }

  for (const certificate of db.certificates) {
    await client.query(
      "INSERT INTO bff_certificates (id, drop_id, drop_title, owner_handle, issued_at, receipt_id, status, owner_account_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [
        certificate.id,
        certificate.dropId,
        certificate.dropTitle,
        certificate.ownerHandle,
        certificate.issuedAt,
        certificate.receiptId,
        certificate.status,
        certificate.ownerAccountId
      ]
    );
  }

  for (const payment of db.payments) {
    await client.query(
      "INSERT INTO bff_payments (id, provider, status, account_id, drop_id, amount_usd, currency, checkout_session_id, checkout_url, provider_payment_intent_id, receipt_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
      [
        payment.id,
        payment.provider,
        payment.status,
        payment.accountId,
        payment.dropId,
        payment.amountUsd,
        payment.currency,
        payment.checkoutSessionId ?? null,
        payment.checkoutUrl ?? null,
        payment.providerPaymentIntentId ?? null,
        payment.receiptId ?? null,
        payment.createdAt,
        payment.updatedAt
      ]
    );
  }

  for (const event of db.stripeWebhookEvents) {
    await client.query(
      "INSERT INTO bff_stripe_webhook_events (event_id, processed_at) VALUES ($1, $2)",
      [event.eventId, event.processedAt]
    );
  }
}

async function resolveInitialPostgresDb(): Promise<BffDatabase> {
  const legacyPath = process.env.OOK_BFF_DB_PATH?.trim();
  if (legacyPath) {
    const legacyDb = await readFileDatabase(path.resolve(legacyPath));
    if (legacyDb) {
      return legacyDb;
    }
  }

  const seedStrategy = resolvePostgresSeedStrategy();
  if (seedStrategy === "none") {
    return createEmptyDatabase();
  }

  if (seedStrategy === "catalog") {
    return createCatalogSeedDatabase();
  }

  return createSeedDatabase();
}

async function withFileDatabase<T>(
  operation: (db: BffDatabase) => MutationResult<T> | Promise<MutationResult<T>>
): Promise<T> {
  const db = await loadFileDb();
  const result = await operation(db);

  if (result.persist) {
    await persistFileDb(db);
  }

  return result.result;
}

async function withPostgresDatabase<T>(
  operation: (db: BffDatabase) => MutationResult<T> | Promise<MutationResult<T>>
): Promise<T> {
  const client = await getPostgresPool().connect();

  try {
    await client.query("BEGIN");
    await ensurePostgresMigrations(client);
    await client.query("SELECT pg_advisory_xact_lock($1)", [POSTGRES_ADVISORY_LOCK_KEY]);

    let db = await loadPostgresDb(client);
    if (!db) {
      db = await resolveInitialPostgresDb();
      await persistPostgresDb(client, db);
    }

    const result = await operation(db);
    if (result.persist) {
      await persistPostgresDb(client, db);
    }

    await client.query("COMMIT");
    return result.result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function withDatabase<T>(
  operation: (db: BffDatabase) => MutationResult<T> | Promise<MutationResult<T>>
): Promise<T> {
  let release!: () => void;
  const previous = queue;
  queue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    const backend = resolvePersistenceBackend();
    if (backend === "postgres") {
      return withPostgresDatabase(operation);
    }

    return withFileDatabase(operation);
  } finally {
    release();
  }
}

export async function migratePostgresPersistence(): Promise<void> {
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    await ensurePostgresMigrations(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getDropPriceTotalUsd(drop: Drop): number {
  return Number((drop.priceUsd + PROCESSING_FEE_USD).toFixed(2));
}

export function createAccountFromEmail(email: string, role: AccountRole): AccountRecord {
  const normalizedEmail = normalizeEmail(email);
  const handle = toHandle(normalizedEmail);
  return {
    id: `acct_${randomUUID()}`,
    email: normalizedEmail,
    handle,
    displayName: startCase(handle),
    roles: [role],
    createdAt: new Date().toISOString()
  };
}
