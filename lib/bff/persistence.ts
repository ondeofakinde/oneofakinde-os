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
};

type MutationResult<T> = {
  result: T;
  persist: boolean;
};

const DATA_VERSION = 1 as const;
const DEFAULT_DB_PATH = path.join(process.cwd(), ".data", "ook-bff-db.json");

const PROCESSING_FEE_USD = 1.99;
const DAY_MS = 86_400_000;

let queue: Promise<void> = Promise.resolve();
let cachedPath = "";
let cachedDb: BffDatabase | null = null;

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
      priceUsd: 1.99
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
      priceUsd: 3.49
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
      priceUsd: 9.99
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
      priceUsd: 12
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
    payments: []
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
    Array.isArray(candidate.payments)
  );
}

async function loadDb(): Promise<BffDatabase> {
  const dbPath = resolveDbPath();
  if (cachedDb && cachedPath === dbPath) {
    return cachedDb;
  }

  try {
    const raw = await fs.readFile(dbPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidDb(parsed)) {
      throw new Error("invalid database shape");
    }

    cachedPath = dbPath;
    cachedDb = parsed;
    return cachedDb;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") {
      throw error;
    }

    const seeded = createSeedDatabase();
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    await fs.writeFile(dbPath, JSON.stringify(seeded, null, 2) + "\n", "utf8");
    cachedPath = dbPath;
    cachedDb = seeded;
    return cachedDb;
  }
}

async function persistDb(db: BffDatabase): Promise<void> {
  const dbPath = resolveDbPath();
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2) + "\n", "utf8");
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
    const db = await loadDb();
    const result = await operation(db);

    if (result.persist) {
      await persistDb(db);
    }

    return result.result;
  } finally {
    release();
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
