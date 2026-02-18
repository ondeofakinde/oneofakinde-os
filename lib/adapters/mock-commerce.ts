import type {
  AccountRole,
  Certificate,
  CheckoutSession,
  CheckoutPreview,
  CreateSessionInput,
  Drop,
  LibraryDrop,
  LibrarySnapshot,
  MyCollectionSnapshot,
  OwnedDrop,
  PurchaseReceipt,
  Session,
  Studio,
  World
} from "@/lib/domain/contracts";
import type { CommerceGateway } from "@/lib/domain/ports";
import { randomUUID } from "node:crypto";

type AccountRecord = {
  id: string;
  email: string;
  handle: string;
  displayName: string;
  roles: AccountRole[];
};

type CertificateRecord = Certificate & {
  ownerAccountId: string;
};

type MockStore = {
  drops: Map<string, Drop>;
  worlds: Map<string, World>;
  studios: Map<string, Studio>;
  accounts: Map<string, AccountRecord>;
  accountsByEmailRole: Map<string, string>;
  sessionToAccount: Map<string, string>;
  ownershipByAccount: Map<string, OwnedDrop[]>;
  savedDropIdsByAccount: Map<string, string[]>;
  receiptsByAccount: Map<string, PurchaseReceipt[]>;
  certificatesById: Map<string, CertificateRecord>;
  pendingPayments: Map<string, { accountId: string; dropId: string }>;
};

const PROCESSING_FEE_USD = 1.99;

function toHandle(email: string): string {
  const base = email.split("@")[0] ?? "collector";
  return base.toLowerCase().replace(/[^a-z0-9_]/g, "") || "collector";
}

function startCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

function toPublicCertificate(record: CertificateRecord): Certificate {
  return {
    id: record.id,
    dropId: record.dropId,
    dropTitle: record.dropTitle,
    ownerHandle: record.ownerHandle,
    issuedAt: record.issuedAt,
    receiptId: record.receiptId,
    status: record.status
  };
}

function createInitialStore(): MockStore {
  const worlds = new Map<string, World>([
    [
      "dark-matter",
      {
        id: "dark-matter",
        title: "dark matter",
        synopsis: "cinematic drops exploring identity and memory.",
        studioHandle: "oneofakinde"
      }
    ],
    [
      "through-the-lens",
      {
        id: "through-the-lens",
        title: "through the lens",
        synopsis: "camera-led drops for real-world atmospheres.",
        studioHandle: "oneofakinde"
      }
    ]
  ]);

  const studios = new Map<string, Studio>([
    [
      "oneofakinde",
      {
        handle: "oneofakinde",
        title: "oneofakinde",
        synopsis: "a cultural network publishing drops across live, read, listen, and watch modes.",
        worldIds: ["dark-matter", "through-the-lens"]
      }
    ]
  ]);

  const drops = new Map<string, Drop>([
    [
      "stardust",
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
      }
    ],
    [
      "twilight-whispers",
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
      }
    ],
    [
      "voidrunner",
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
      }
    ],
    [
      "through-the-lens",
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
    ]
  ]);

  const accounts = new Map<string, AccountRecord>();
  const accountsByEmailRole = new Map<string, string>();
  const sessionToAccount = new Map<string, string>();
  const ownershipByAccount = new Map<string, OwnedDrop[]>();
  const savedDropIdsByAccount = new Map<string, string[]>();
  const receiptsByAccount = new Map<string, PurchaseReceipt[]>();
  const certificatesById = new Map<string, CertificateRecord>();
  const pendingPayments = new Map<string, { accountId: string; dropId: string }>();

  const accountId = "acct_collector_demo";
  const account: AccountRecord = {
    id: accountId,
    email: "collector@oneofakinde.com",
    handle: "collector_demo",
    displayName: "collector demo",
    roles: ["collector"]
  };

  accounts.set(accountId, account);
  accountsByEmailRole.set("collector@oneofakinde.com:collector", accountId);
  savedDropIdsByAccount.set(accountId, ["twilight-whispers", "through-the-lens", "voidrunner"]);

  const seededDrop = drops.get("stardust");
  if (seededDrop) {
    const seededReceipt: PurchaseReceipt = {
      id: "rcpt_seed_stardust",
      accountId,
      dropId: seededDrop.id,
      amountUsd: seededDrop.priceUsd,
      status: "completed",
      purchasedAt: "2026-02-16T12:00:00.000Z"
    };

    const seededCertificate: CertificateRecord = {
      id: "cert_seed_stardust",
      dropId: seededDrop.id,
      dropTitle: seededDrop.title,
      ownerHandle: account.handle,
      issuedAt: seededReceipt.purchasedAt,
      receiptId: seededReceipt.id,
      status: "verified",
      ownerAccountId: account.id
    };

    receiptsByAccount.set(accountId, [seededReceipt]);
    ownershipByAccount.set(accountId, [
      {
        drop: seededDrop,
        certificateId: seededCertificate.id,
        acquiredAt: seededReceipt.purchasedAt,
        receiptId: seededReceipt.id
      }
    ]);
    certificatesById.set(seededCertificate.id, seededCertificate);
  }

  return {
    drops,
    worlds,
    studios,
    accounts,
    accountsByEmailRole,
    sessionToAccount,
    ownershipByAccount,
    savedDropIdsByAccount,
    receiptsByAccount,
    certificatesById,
    pendingPayments
  };
}

const globalScope = globalThis as typeof globalThis & {
  __ookMockStore?: MockStore;
};

const store = globalScope.__ookMockStore ?? createInitialStore();
if (!globalScope.__ookMockStore) {
  globalScope.__ookMockStore = store;
}

function toSession(account: AccountRecord, sessionToken: string): Session {
  return {
    accountId: account.id,
    email: account.email,
    handle: account.handle,
    displayName: account.displayName,
    roles: account.roles,
    sessionToken
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function accountKey(email: string, role: AccountRole): string {
  return `${normalizeEmail(email)}:${role}`;
}

function upsertAccount(input: CreateSessionInput): AccountRecord {
  const normalizedEmail = normalizeEmail(input.email);
  const key = accountKey(normalizedEmail, input.role);
  const existingId = store.accountsByEmailRole.get(key);

  if (existingId) {
    const existing = store.accounts.get(existingId);
    if (existing) {
      return existing;
    }
  }

  const handle = toHandle(normalizedEmail);
  const account: AccountRecord = {
    id: `acct_${randomUUID()}`,
    email: normalizedEmail,
    handle,
    displayName: startCase(handle),
    roles: [input.role]
  };

  store.accounts.set(account.id, account);
  store.accountsByEmailRole.set(key, account.id);

  return account;
}

function getOwnedDrops(accountId: string): OwnedDrop[] {
  return [...(store.ownershipByAccount.get(accountId) ?? [])].sort(
    (a, b) => Date.parse(b.acquiredAt) - Date.parse(a.acquiredAt)
  );
}

function getSavedDrops(accountId: string): LibraryDrop[] {
  const savedIds = store.savedDropIdsByAccount.get(accountId) ?? [];

  return savedIds
    .map((dropId, index) => {
      const drop = store.drops.get(dropId);
      if (!drop) return null;

      return {
        drop,
        savedAt: new Date(Date.now() - index * 86_400_000).toISOString()
      } satisfies LibraryDrop;
    })
    .filter((entry): entry is LibraryDrop => entry !== null);
}

function grantOwnership({
  account,
  drop,
  receipt
}: {
  account: AccountRecord;
  drop: Drop;
  receipt: PurchaseReceipt;
}): OwnedDrop {
  const certificate: CertificateRecord = {
    id: `cert_${randomUUID()}`,
    dropId: drop.id,
    dropTitle: drop.title,
    ownerHandle: account.handle,
    issuedAt: receipt.purchasedAt,
    receiptId: receipt.id,
    status: "verified",
    ownerAccountId: account.id
  };

  const ownedDrop: OwnedDrop = {
    drop,
    certificateId: certificate.id,
    acquiredAt: receipt.purchasedAt,
    receiptId: receipt.id
  };

  store.certificatesById.set(certificate.id, certificate);

  return ownedDrop;
}

export const commerceGateway: CommerceGateway = {
  async listDrops(): Promise<Drop[]> {
    return [...store.drops.values()].sort(
      (a, b) => Date.parse(b.releaseDate) - Date.parse(a.releaseDate)
    );
  },

  async listWorlds(): Promise<World[]> {
    return [...store.worlds.values()];
  },

  async getWorldById(worldId: string): Promise<World | null> {
    return store.worlds.get(worldId) ?? null;
  },

  async listDropsByWorldId(worldId: string): Promise<Drop[]> {
    return (await this.listDrops()).filter((drop) => drop.worldId === worldId);
  },

  async getStudioByHandle(handle: string): Promise<Studio | null> {
    return store.studios.get(handle) ?? null;
  },

  async listDropsByStudioHandle(handle: string): Promise<Drop[]> {
    return (await this.listDrops()).filter((drop) => drop.studioHandle === handle);
  },

  async getDropById(dropId: string): Promise<Drop | null> {
    return store.drops.get(dropId) ?? null;
  },

  async getCheckoutPreview(accountId: string, dropId: string): Promise<CheckoutPreview | null> {
    const drop = store.drops.get(dropId);
    if (!drop) return null;

    const ownedDrop = getOwnedDrops(accountId).find((entry) => entry.drop.id === dropId);
    const subtotalUsd = ownedDrop ? 0 : drop.priceUsd;
    const processingUsd = ownedDrop ? 0 : PROCESSING_FEE_USD;

    return {
      drop,
      subtotalUsd,
      processingUsd,
      totalUsd: Number((subtotalUsd + processingUsd).toFixed(2)),
      currency: "USD"
    };
  },

  async createCheckoutSession(
    accountId: string,
    dropId: string,
    options?: {
      successUrl?: string;
      cancelUrl?: string;
    }
  ): Promise<CheckoutSession | null> {
    const account = store.accounts.get(accountId);
    const drop = store.drops.get(dropId);
    if (!account || !drop) return null;

    const ownedDrop = getOwnedDrops(accountId).find((entry) => entry.drop.id === dropId);
    if (ownedDrop) {
      return {
        status: "already_owned",
        receiptId: ownedDrop.receiptId
      };
    }

    const paymentId = `pay_${randomUUID()}`;
    const checkoutSessionId = `mock_session_${randomUUID()}`;
    store.pendingPayments.set(paymentId, {
      accountId,
      dropId
    });

    return {
      status: "pending",
      paymentId,
      provider: "manual",
      checkoutSessionId,
      checkoutUrl:
        options?.successUrl ??
        `/pay/buy/${encodeURIComponent(dropId)}?payment=success&payment_id=${encodeURIComponent(paymentId)}`,
      drop,
      amountUsd: Number((drop.priceUsd + PROCESSING_FEE_USD).toFixed(2)),
      currency: "USD"
    };
  },

  async completePendingPayment(paymentId: string): Promise<PurchaseReceipt | null> {
    const pending = store.pendingPayments.get(paymentId);
    if (!pending) {
      return null;
    }

    const receipt = await this.purchaseDrop(pending.accountId, pending.dropId);
    if (!receipt || receipt.status === "already_owned") {
      store.pendingPayments.delete(paymentId);
      return receipt;
    }

    store.pendingPayments.delete(paymentId);
    return receipt;
  },

  async purchaseDrop(accountId: string, dropId: string): Promise<PurchaseReceipt | null> {
    const account = store.accounts.get(accountId);
    const drop = store.drops.get(dropId);
    if (!account || !drop) return null;

    const ownedDrop = getOwnedDrops(accountId).find((entry) => entry.drop.id === dropId);
    if (ownedDrop) {
      return {
        id: ownedDrop.receiptId,
        accountId,
        dropId,
        amountUsd: 0,
        status: "already_owned",
        purchasedAt: ownedDrop.acquiredAt
      };
    }

    const receipt: PurchaseReceipt = {
      id: `rcpt_${randomUUID()}`,
      accountId,
      dropId,
      amountUsd: Number((drop.priceUsd + PROCESSING_FEE_USD).toFixed(2)),
      status: "completed",
      purchasedAt: new Date().toISOString()
    };

    const owned = grantOwnership({ account, drop, receipt });

    store.ownershipByAccount.set(accountId, [owned, ...(store.ownershipByAccount.get(accountId) ?? [])]);
    store.receiptsByAccount.set(accountId, [receipt, ...(store.receiptsByAccount.get(accountId) ?? [])]);

    return receipt;
  },

  async getMyCollection(accountId: string): Promise<MyCollectionSnapshot | null> {
    const account = store.accounts.get(accountId);
    if (!account) return null;

    const receipts = store.receiptsByAccount.get(accountId) ?? [];
    const totalSpentUsd = receipts
      .filter((receipt) => receipt.status === "completed")
      .reduce((sum, receipt) => sum + receipt.amountUsd, 0);

    return {
      account: {
        accountId: account.id,
        handle: account.handle,
        displayName: account.displayName
      },
      ownedDrops: getOwnedDrops(accountId),
      totalSpentUsd: Number(totalSpentUsd.toFixed(2))
    };
  },

  async getLibrary(accountId: string): Promise<LibrarySnapshot | null> {
    const account = store.accounts.get(accountId);
    if (!account) return null;

    return {
      account: {
        accountId: account.id,
        handle: account.handle,
        displayName: account.displayName
      },
      savedDrops: getSavedDrops(accountId)
    };
  },

  async getReceipt(accountId: string, receiptId: string): Promise<PurchaseReceipt | null> {
    const receipts = store.receiptsByAccount.get(accountId) ?? [];
    return receipts.find((receipt) => receipt.id === receiptId) ?? null;
  },

  async hasDropEntitlement(accountId: string, dropId: string): Promise<boolean> {
    const ownedDrops = getOwnedDrops(accountId);
    return ownedDrops.some((entry) => entry.drop.id === dropId);
  },

  async getCertificateById(certificateId: string): Promise<Certificate | null> {
    const certificate = store.certificatesById.get(certificateId);
    return certificate ? toPublicCertificate(certificate) : null;
  },

  async getCertificateByReceipt(accountId: string, receiptId: string): Promise<Certificate | null> {
    const certificate = [...store.certificatesById.values()].find(
      (item) => item.ownerAccountId === accountId && item.receiptId === receiptId
    );

    return certificate ? toPublicCertificate(certificate) : null;
  },

  async getSessionByToken(sessionToken: string): Promise<Session | null> {
    const accountId = store.sessionToAccount.get(sessionToken);
    if (!accountId) return null;

    const account = store.accounts.get(accountId);
    if (!account) return null;

    return toSession(account, sessionToken);
  },

  async createSession(input: CreateSessionInput): Promise<Session> {
    const account = upsertAccount(input);
    const sessionToken = `sess_${randomUUID()}`;
    store.sessionToAccount.set(sessionToken, account.id);
    return toSession(account, sessionToken);
  },

  async clearSession(sessionToken: string): Promise<void> {
    store.sessionToAccount.delete(sessionToken);
  }
};
