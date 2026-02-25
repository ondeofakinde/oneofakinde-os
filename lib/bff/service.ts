import type {
  Certificate,
  CollectInventoryListing,
  CollectMarketLane,
  CollectOffer,
  CollectOfferAction,
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
  TownhallComment,
  TownhallDropSocialSnapshot,
  TownhallShareChannel,
  TownhallSocialSnapshot,
  TownhallTelemetryMetadata,
  TownhallTelemetryEventType,
  TownhallTelemetrySignals,
  World
} from "@/lib/domain/contracts";
import type { CommerceGateway } from "@/lib/domain/ports";
import type { CheckoutSessionResult, CreateCheckoutSessionInput, StripeWebhookApplyResult } from "@/lib/bff/contracts";
import {
  buildCollectInventorySnapshotFromOffers,
  listCollectInventoryByLane,
  resolveCollectListingTypeByDropId
} from "@/lib/collect/market-lanes";
import { applyCollectOfferAction, canApplyCollectOfferAction } from "@/lib/collect/offer-state-machine";
import { createCheckoutSession, parseStripeWebhook, type ParsedStripeWebhookEvent } from "@/lib/bff/payments";
import {
  type CollectOfferRecord,
  createAccountFromEmail,
  getDropPriceTotalUsd,
  normalizeEmail,
  withDatabase,
  type AccountRecord,
  type BffDatabase,
  type CertificateRecord,
  type PaymentRecord,
  type TownhallCommentRecord,
  type TownhallTelemetryEventRecord
} from "@/lib/bff/persistence";
import { randomUUID } from "node:crypto";

const PROCESSING_FEE_USD = 1.99;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const STRIPE_WEBHOOK_EVENT_LOG_LIMIT = 1000;
const TOWNHALL_COMMENT_MAX_LENGTH = 600;
const TOWNHALL_COMMENTS_PREVIEW_LIMIT = 24;
const COLLECT_OFFERS_LOG_LIMIT = 50_000;

const TOWNHALL_SHARE_CHANNEL_SET = new Set<TownhallShareChannel>([
  "sms",
  "internal_dm",
  "whatsapp",
  "telegram"
]);
const TOWNHALL_TELEMETRY_EVENT_SET = new Set<TownhallTelemetryEventType>([
  "watch_time",
  "completion",
  "collect_intent",
  "impression",
  "showroom_impression",
  "drop_opened",
  "drop_dwell_time",
  "preview_start",
  "preview_complete",
  "access_start",
  "access_complete",
  "interaction_like",
  "interaction_comment",
  "interaction_share",
  "interaction_save"
]);
const TOWNHALL_TELEMETRY_EVENT_LOG_LIMIT = 100_000;
const MAX_WATCH_TIME_SECONDS_PER_EVENT = 600;

type CompletePendingPaymentOptions = {
  expectedAccountId?: string;
  allowedProviders?: PaymentRecord["provider"][];
};

type StripeWebhookMutationResult = {
  persist: boolean;
  result: StripeWebhookApplyResult;
};

type TownhallSocialMutationResult = {
  persist: boolean;
  result: TownhallDropSocialSnapshot | null;
};

type TownhallTelemetryMutationResult = {
  persist: boolean;
  result: boolean;
};

type TownhallCommentModerationResult =
  | {
      ok: true;
      social: TownhallDropSocialSnapshot;
    }
  | {
      ok: false;
      reason: "not_found" | "forbidden";
    };

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

function getDropMap(db: BffDatabase): Map<string, Drop> {
  return new Map(db.catalog.drops.map((drop) => [drop.id, drop]));
}

function getOwnedDrops(db: BffDatabase, accountId: string): OwnedDrop[] {
  const dropsById = getDropMap(db);

  return db.ownerships
    .filter((entry) => entry.accountId === accountId)
    .map((entry) => {
      const drop = dropsById.get(entry.dropId);
      if (!drop) {
        return null;
      }

      return {
        drop,
        certificateId: entry.certificateId,
        acquiredAt: entry.acquiredAt,
        receiptId: entry.receiptId
      } satisfies OwnedDrop;
    })
    .filter((entry): entry is OwnedDrop => entry !== null)
    .sort((a, b) => Date.parse(b.acquiredAt) - Date.parse(a.acquiredAt));
}

function getSavedDrops(db: BffDatabase, accountId: string): LibraryDrop[] {
  const dropsById = getDropMap(db);

  return db.savedDrops
    .filter((entry) => entry.accountId === accountId)
    .map((entry) => {
      const drop = dropsById.get(entry.dropId);
      if (!drop) {
        return null;
      }

      return {
        drop,
        savedAt: entry.savedAt
      } satisfies LibraryDrop;
    })
    .filter((entry): entry is LibraryDrop => entry !== null)
    .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
}

function findAccountById(db: BffDatabase, accountId: string): AccountRecord | null {
  return db.accounts.find((account) => account.id === accountId) ?? null;
}

function findDropById(db: BffDatabase, dropId: string): Drop | null {
  return db.catalog.drops.find((drop) => drop.id === dropId) ?? null;
}

function findOwnershipByDrop(db: BffDatabase, accountId: string, dropId: string) {
  return db.ownerships.find((entry) => entry.accountId === accountId && entry.dropId === dropId) ?? null;
}

function issueOwnershipAndReceipt(
  db: BffDatabase,
  account: AccountRecord,
  drop: Drop,
  options: {
    amountUsd: number;
    receiptId?: string;
    purchasedAt?: string;
  }
): PurchaseReceipt {
  const purchasedAt = options.purchasedAt ?? new Date().toISOString();
  const receiptId = options.receiptId ?? `rcpt_${randomUUID()}`;

  const receipt: PurchaseReceipt = {
    id: receiptId,
    accountId: account.id,
    dropId: drop.id,
    amountUsd: options.amountUsd,
    status: "completed",
    purchasedAt
  };

  const certificateId = `cert_${randomUUID()}`;
  const certificate: CertificateRecord = {
    id: certificateId,
    dropId: drop.id,
    dropTitle: drop.title,
    ownerHandle: account.handle,
    issuedAt: purchasedAt,
    receiptId,
    status: "verified",
    ownerAccountId: account.id
  };

  db.receipts.unshift(receipt);
  db.certificates.push(certificate);
  db.ownerships.unshift({
    accountId: account.id,
    dropId: drop.id,
    certificateId,
    receiptId,
    acquiredAt: purchasedAt
  });

  return receipt;
}

function markRefundByReceipt(db: BffDatabase, accountId: string, receiptId: string): boolean {
  const receipt = db.receipts.find((entry) => entry.id === receiptId && entry.accountId === accountId);
  if (!receipt || receipt.status !== "completed") {
    return false;
  }

  receipt.status = "refunded";

  const ownershipIndex = db.ownerships.findIndex(
    (entry) => entry.accountId === accountId && entry.receiptId === receiptId
  );
  if (ownershipIndex >= 0) {
    db.ownerships.splice(ownershipIndex, 1);
  }

  const certificate = db.certificates.find(
    (entry) => entry.ownerAccountId === accountId && entry.receiptId === receiptId
  );
  if (certificate) {
    certificate.status = "revoked";
  }

  return true;
}

function findPaymentForWebhook(
  db: BffDatabase,
  input: {
    paymentId?: string;
    checkoutSessionId?: string;
    providerPaymentIntentId?: string;
  }
): PaymentRecord | null {
  if (input.paymentId) {
    const byPaymentId = db.payments.find((payment) => payment.id === input.paymentId);
    if (byPaymentId) return byPaymentId;
  }

  if (input.checkoutSessionId) {
    const bySession = db.payments.find((payment) => payment.checkoutSessionId === input.checkoutSessionId);
    if (bySession) return bySession;
  }

  if (input.providerPaymentIntentId) {
    const byIntent = db.payments.find(
      (payment) => payment.providerPaymentIntentId === input.providerPaymentIntentId
    );
    if (byIntent) return byIntent;
  }

  return null;
}

function hasProcessedStripeWebhookEvent(db: BffDatabase, eventId: string): boolean {
  return db.stripeWebhookEvents.some((entry) => entry.eventId === eventId);
}

function rememberProcessedStripeWebhookEvent(db: BffDatabase, eventId: string): void {
  db.stripeWebhookEvents.unshift({
    eventId,
    processedAt: new Date().toISOString()
  });

  if (db.stripeWebhookEvents.length > STRIPE_WEBHOOK_EVENT_LOG_LIMIT) {
    db.stripeWebhookEvents.length = STRIPE_WEBHOOK_EVENT_LOG_LIMIT;
  }
}

function isTownhallShareChannel(value: string): value is TownhallShareChannel {
  return TOWNHALL_SHARE_CHANNEL_SET.has(value as TownhallShareChannel);
}

function isTownhallTelemetryEventType(value: string): value is TownhallTelemetryEventType {
  return TOWNHALL_TELEMETRY_EVENT_SET.has(value as TownhallTelemetryEventType);
}

function normalizeWatchTimeSeconds(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(MAX_WATCH_TIME_SECONDS_PER_EVENT, Math.max(0, Number(value)));
}

function normalizeCompletionPercent(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Number(value)));
}

function normalizeTownhallTelemetryMetadata(
  value: TownhallTelemetryMetadata | undefined
): TownhallTelemetryMetadata {
  if (!value) {
    return {};
  }

  const metadata: TownhallTelemetryMetadata = {};

  if (value.source === "showroom" || value.source === "drop") {
    metadata.source = value.source;
  }

  if (
    value.surface === "townhall" ||
    value.surface === "watch" ||
    value.surface === "listen" ||
    value.surface === "read" ||
    value.surface === "photos" ||
    value.surface === "live"
  ) {
    metadata.surface = value.surface;
  }

  if (
    value.mediaFilter === "all" ||
    value.mediaFilter === "watch" ||
    value.mediaFilter === "listen" ||
    value.mediaFilter === "read" ||
    value.mediaFilter === "photos" ||
    value.mediaFilter === "live"
  ) {
    metadata.mediaFilter = value.mediaFilter;
  }

  if (
    value.ordering === "rising" ||
    value.ordering === "newest" ||
    value.ordering === "most_collected"
  ) {
    metadata.ordering = value.ordering;
  }

  if (typeof value.position === "number" && Number.isFinite(value.position)) {
    metadata.position = Math.max(1, Math.floor(value.position));
  }

  if (
    value.channel === "sms" ||
    value.channel === "internal_dm" ||
    value.channel === "whatsapp" ||
    value.channel === "telegram"
  ) {
    metadata.channel = value.channel;
  }

  if (
    value.action === "open" ||
    value.action === "complete" ||
    value.action === "start" ||
    value.action === "toggle" ||
    value.action === "submit"
  ) {
    metadata.action = value.action;
  }

  return metadata;
}

function normalizeTownhallCommentBody(value: string): string {
  return value.trim().slice(0, TOWNHALL_COMMENT_MAX_LENGTH);
}

function canAccountModerateTownhallComment(
  account: AccountRecord | null,
  drop: Drop,
  comment: TownhallCommentRecord
): boolean {
  if (!account) {
    return false;
  }

  if (comment.accountId === account.id) {
    return true;
  }

  return account.roles.includes("creator") && account.handle === drop.studioHandle;
}

function canAccountReportTownhallComment(
  account: AccountRecord | null,
  comment: TownhallCommentRecord
): boolean {
  if (!account) {
    return false;
  }

  return comment.accountId !== account.id;
}

function toTownhallComment(
  record: TownhallCommentRecord,
  accountHandleById: Map<string, string>,
  viewerAccount: AccountRecord | null,
  drop: Drop
): TownhallComment {
  const canModerate = canAccountModerateTownhallComment(viewerAccount, drop, record);
  return {
    id: record.id,
    dropId: record.dropId,
    authorHandle: accountHandleById.get(record.accountId) ?? "community",
    body: record.visibility === "hidden" && !canModerate ? "comment hidden by moderation." : record.body,
    createdAt: record.createdAt,
    visibility: record.visibility,
    reportCount: record.reportCount,
    canModerate,
    canReport: canAccountReportTownhallComment(viewerAccount, record)
  };
}

function buildTownhallDropSocialSnapshot(
  db: BffDatabase,
  dropId: string,
  accountId: string | null
): TownhallDropSocialSnapshot | null {
  const drop = findDropById(db, dropId);
  if (!drop) {
    return null;
  }

  const likeCount = db.townhallLikes.filter((entry) => entry.dropId === dropId).length;
  const viewerAccount = accountId ? findAccountById(db, accountId) : null;
  const comments = db.townhallComments.filter((entry) => entry.dropId === dropId);
  const shareCount = db.townhallShares.filter((entry) => entry.dropId === dropId).length;
  const saveCount = db.savedDrops.filter((entry) => entry.dropId === dropId).length;

  const accountHandleById = new Map(db.accounts.map((account) => [account.id, account.handle]));
  const visibleCommentCount = comments.filter((entry) => entry.visibility === "visible").length;
  const publicComments = comments
    .filter(
      (entry) => entry.visibility === "visible" || canAccountModerateTownhallComment(viewerAccount, drop, entry)
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, TOWNHALL_COMMENTS_PREVIEW_LIMIT)
    .map((entry) => toTownhallComment(entry, accountHandleById, viewerAccount, drop));

  const likedByViewer = accountId
    ? db.townhallLikes.some((entry) => entry.accountId === accountId && entry.dropId === dropId)
    : false;
  const savedByViewer = accountId
    ? db.savedDrops.some((entry) => entry.accountId === accountId && entry.dropId === dropId)
    : false;

  return {
    dropId,
    likeCount,
    commentCount: visibleCommentCount,
    shareCount,
    saveCount,
    likedByViewer,
    savedByViewer,
    comments: publicComments
  };
}

function findTownhallCommentById(
  db: BffDatabase,
  dropId: string,
  commentId: string
): TownhallCommentRecord | null {
  return (
    db.townhallComments.find((entry) => entry.dropId === dropId && entry.id === commentId) ?? null
  );
}

function buildTownhallSocialSnapshot(
  db: BffDatabase,
  accountId: string | null,
  dropIds: string[]
): TownhallSocialSnapshot {
  const byDropId: Record<string, TownhallDropSocialSnapshot> = {};

  for (const dropId of dropIds) {
    const snapshot = buildTownhallDropSocialSnapshot(db, dropId, accountId);
    if (!snapshot) {
      continue;
    }

    byDropId[dropId] = snapshot;
  }

  return { byDropId };
}

function emptyTelemetrySignals(): TownhallTelemetrySignals {
  return {
    watchTimeSeconds: 0,
    completions: 0,
    collectIntents: 0,
    impressions: 0
  };
}

function buildTownhallTelemetrySignals(
  db: BffDatabase,
  dropIds: string[]
): Record<string, TownhallTelemetrySignals> {
  const uniqueDropIds = Array.from(new Set(dropIds.map((dropId) => dropId.trim()).filter(Boolean)));
  const byDropId = Object.fromEntries(
    uniqueDropIds.map((dropId) => [dropId, emptyTelemetrySignals()])
  ) as Record<string, TownhallTelemetrySignals>;
  const trackedDropIdSet = new Set(uniqueDropIds);

  for (const event of db.townhallTelemetryEvents) {
    if (!trackedDropIdSet.has(event.dropId)) {
      continue;
    }

    const current = byDropId[event.dropId] ?? emptyTelemetrySignals();
    if (event.eventType === "watch_time") {
      current.watchTimeSeconds += normalizeWatchTimeSeconds(event.watchTimeSeconds);
    } else if (event.eventType === "completion") {
      current.completions += 1;
    } else if (event.eventType === "collect_intent") {
      current.collectIntents += 1;
    } else if (event.eventType === "impression") {
      current.impressions += 1;
    }

    byDropId[event.dropId] = current;
  }

  return byDropId;
}

function accountHandleLookup(db: BffDatabase): Map<string, string> {
  return new Map(db.accounts.map((account) => [account.id, account.handle]));
}

function canViewPrivateCollectExecutionPrice(
  offer: CollectOfferRecord,
  viewerAccountId: string | null
): boolean {
  if (!viewerAccountId) {
    return false;
  }
  return viewerAccountId === offer.accountId;
}

function toCollectOffer(
  offer: CollectOfferRecord,
  accountHandleById: Map<string, string>,
  viewerAccountId: string | null
): CollectOffer {
  const isPrivate = offer.executionVisibility === "private";
  const canViewPrivate = canViewPrivateCollectExecutionPrice(offer, viewerAccountId);
  const executionPriceUsd = isPrivate && !canViewPrivate ? null : offer.executionPriceUsd;

  return {
    id: offer.id,
    dropId: offer.dropId,
    listingType: offer.listingType,
    amountUsd: offer.amountUsd,
    state: offer.state,
    actorHandle: accountHandleById.get(offer.accountId) ?? "collector",
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
    expiresAt: offer.expiresAt,
    executionVisibility: offer.executionVisibility,
    executionPriceUsd
  };
}

function trimCollectOffers(db: BffDatabase): void {
  if (db.collectOffers.length > COLLECT_OFFERS_LOG_LIMIT) {
    db.collectOffers.length = COLLECT_OFFERS_LOG_LIMIT;
  }
}

function buildCollectInventoryView(
  db: BffDatabase,
  viewerAccountId: string | null,
  lane: CollectMarketLane = "all"
): {
  lane: CollectMarketLane;
  listings: CollectInventoryListing[];
} {
  const accountHandleById = accountHandleLookup(db);
  const offers = db.collectOffers.map((offer) =>
    toCollectOffer(offer, accountHandleById, viewerAccountId)
  );
  const snapshot = buildCollectInventorySnapshotFromOffers(db.catalog.drops, offers);
  return {
    lane,
    listings: listCollectInventoryByLane(snapshot.listings, lane)
  };
}

function buildCollectDropOffersView(
  db: BffDatabase,
  dropId: string,
  viewerAccountId: string | null
): {
  listing: CollectInventoryListing;
  offers: CollectOffer[];
} | null {
  const accountHandleById = accountHandleLookup(db);
  const offers = db.collectOffers.map((offer) =>
    toCollectOffer(offer, accountHandleById, viewerAccountId)
  );
  const snapshot = buildCollectInventorySnapshotFromOffers(db.catalog.drops, offers);
  const listing = snapshot.listings.find((entry) => entry.drop.id === dropId) ?? null;
  if (!listing) {
    return null;
  }

  return {
    listing,
    offers: snapshot.offersByDropId[dropId] ?? []
  };
}

function canModerateCollectOfferTransition(
  account: AccountRecord,
  drop: Drop
): boolean {
  return account.roles.includes("creator") && account.handle === drop.studioHandle;
}

function canTransitionCollectOffer(
  db: BffDatabase,
  account: AccountRecord,
  offer: CollectOfferRecord,
  action: CollectOfferAction
): boolean {
  const drop = findDropById(db, offer.dropId);
  if (!drop) {
    return false;
  }

  if (action === "withdraw_offer") {
    return offer.accountId === account.id;
  }

  if (action === "counter_offer" || action === "accept_offer" || action === "settle_offer" || action === "expire_offer") {
    return canModerateCollectOfferTransition(account, drop);
  }

  return false;
}

const gatewayMethods: CommerceGateway = {
  async listDrops(): Promise<Drop[]> {
    return withDatabase(async (db) => ({
      persist: false,
      result: [...db.catalog.drops].sort((a, b) => Date.parse(b.releaseDate) - Date.parse(a.releaseDate))
    }));
  },

  async listWorlds(): Promise<World[]> {
    return withDatabase(async (db) => ({
      persist: false,
      result: [...db.catalog.worlds]
    }));
  },

  async getWorldById(worldId: string): Promise<World | null> {
    return withDatabase(async (db) => ({
      persist: false,
      result: db.catalog.worlds.find((world) => world.id === worldId) ?? null
    }));
  },

  async listDropsByWorldId(worldId: string): Promise<Drop[]> {
    return withDatabase(async (db) => ({
      persist: false,
      result: db.catalog.drops
        .filter((drop) => drop.worldId === worldId)
        .sort((a, b) => Date.parse(b.releaseDate) - Date.parse(a.releaseDate))
    }));
  },

  async getStudioByHandle(handle: string): Promise<Studio | null> {
    return withDatabase(async (db) => ({
      persist: false,
      result: db.catalog.studios.find((studio) => studio.handle === handle) ?? null
    }));
  },

  async listDropsByStudioHandle(handle: string): Promise<Drop[]> {
    return withDatabase(async (db) => ({
      persist: false,
      result: db.catalog.drops
        .filter((drop) => drop.studioHandle === handle)
        .sort((a, b) => Date.parse(b.releaseDate) - Date.parse(a.releaseDate))
    }));
  },

  async getDropById(dropId: string): Promise<Drop | null> {
    return withDatabase(async (db) => ({
      persist: false,
      result: findDropById(db, dropId)
    }));
  },

  async getCheckoutPreview(accountId: string, dropId: string): Promise<CheckoutPreview | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      if (!account || !drop) {
        return {
          persist: false,
          result: null
        };
      }

      const existing = findOwnershipByDrop(db, account.id, drop.id);
      const subtotalUsd = existing ? 0 : drop.priceUsd;
      const processingUsd = existing ? 0 : PROCESSING_FEE_USD;

      return {
        persist: false,
        result: {
          drop,
          subtotalUsd,
          processingUsd,
          totalUsd: Number((subtotalUsd + processingUsd).toFixed(2)),
          currency: "USD"
        }
      };
    });
  },

  async createCheckoutSession(
    accountId: string,
    dropId: string,
    options?: {
      successUrl?: string;
      cancelUrl?: string;
    }
  ): Promise<CheckoutSessionResult | null> {
    return createCheckoutSessionForPayment({
      accountId,
      dropId,
      successUrl: options?.successUrl,
      cancelUrl: options?.cancelUrl
    });
  },

  async completePendingPayment(paymentId: string): Promise<PurchaseReceipt | null> {
    return completePendingPaymentById(paymentId, {
      allowedProviders: ["manual"]
    });
  },

  async purchaseDrop(accountId: string, dropId: string): Promise<PurchaseReceipt | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      if (!account || !drop) {
        return {
          persist: false,
          result: null
        };
      }

      const existing = findOwnershipByDrop(db, account.id, drop.id);
      if (existing) {
        return {
          persist: false,
          result: {
            id: existing.receiptId,
            accountId: account.id,
            dropId: drop.id,
            amountUsd: 0,
            status: "already_owned",
            purchasedAt: existing.acquiredAt
          }
        };
      }

      const amountUsd = getDropPriceTotalUsd(drop);
      const receipt = issueOwnershipAndReceipt(db, account, drop, {
        amountUsd
      });

      db.payments.unshift({
        id: `pay_${randomUUID()}`,
        provider: "manual",
        status: "succeeded",
        accountId: account.id,
        dropId: drop.id,
        amountUsd,
        currency: "USD",
        receiptId: receipt.id,
        createdAt: receipt.purchasedAt,
        updatedAt: receipt.purchasedAt
      });

      return {
        persist: true,
        result: receipt
      };
    });
  },

  async getMyCollection(accountId: string): Promise<MyCollectionSnapshot | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account) {
        return {
          persist: false,
          result: null
        };
      }

      const totalSpentUsd = db.receipts
        .filter((receipt) => receipt.accountId === accountId && receipt.status === "completed")
        .reduce((sum, receipt) => sum + receipt.amountUsd, 0);

      return {
        persist: false,
        result: {
          account: {
            accountId: account.id,
            handle: account.handle,
            displayName: account.displayName
          },
          ownedDrops: getOwnedDrops(db, account.id),
          totalSpentUsd: Number(totalSpentUsd.toFixed(2))
        }
      };
    });
  },

  async getLibrary(accountId: string): Promise<LibrarySnapshot | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account) {
        return {
          persist: false,
          result: null
        };
      }

      return {
        persist: false,
        result: {
          account: {
            accountId: account.id,
            handle: account.handle,
            displayName: account.displayName
          },
          savedDrops: getSavedDrops(db, account.id)
        }
      };
    });
  },

  async getReceipt(accountId: string, receiptId: string): Promise<PurchaseReceipt | null> {
    return withDatabase(async (db) => ({
      persist: false,
      result: db.receipts.find((receipt) => receipt.accountId === accountId && receipt.id === receiptId) ?? null
    }));
  },

  async hasDropEntitlement(accountId: string, dropId: string): Promise<boolean> {
    return withDatabase(async (db) => ({
      persist: false,
      result: Boolean(findOwnershipByDrop(db, accountId, dropId))
    }));
  },

  async getCertificateById(certificateId: string): Promise<Certificate | null> {
    return withDatabase(async (db) => {
      const certificate = db.certificates.find((entry) => entry.id === certificateId);
      return {
        persist: false,
        result: certificate ? toPublicCertificate(certificate) : null
      };
    });
  },

  async getCertificateByReceipt(accountId: string, receiptId: string): Promise<Certificate | null> {
    return withDatabase(async (db) => {
      const certificate = db.certificates.find(
        (entry) => entry.ownerAccountId === accountId && entry.receiptId === receiptId
      );

      return {
        persist: false,
        result: certificate ? toPublicCertificate(certificate) : null
      };
    });
  },

  async getSessionByToken(sessionToken: string): Promise<Session | null> {
    return withDatabase(async (db) => {
      const now = Date.now();
      const index = db.sessions.findIndex((session) => session.token === sessionToken);
      if (index < 0) {
        return {
          persist: false,
          result: null
        };
      }

      const session = db.sessions[index];
      if (Date.parse(session.expiresAt) <= now) {
        db.sessions.splice(index, 1);
        return {
          persist: true,
          result: null
        };
      }

      const account = findAccountById(db, session.accountId);
      if (!account) {
        db.sessions.splice(index, 1);
        return {
          persist: true,
          result: null
        };
      }

      return {
        persist: false,
        result: toSession(account, session.token)
      };
    });
  },

  async createSession(input: CreateSessionInput): Promise<Session> {
    return withDatabase(async (db) => {
      const email = normalizeEmail(input.email);
      let account =
        db.accounts.find(
          (entry) => entry.email === email && entry.roles.length === 1 && entry.roles[0] === input.role
        ) ?? null;

      if (!account) {
        account = createAccountFromEmail(email, input.role);
        db.accounts.push(account);
      }

      const createdAt = new Date().toISOString();
      const sessionToken = `sess_${randomUUID()}`;
      db.sessions.push({
        token: sessionToken,
        accountId: account.id,
        createdAt,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString()
      });

      return {
        persist: true,
        result: toSession(account, sessionToken)
      };
    });
  },

  async clearSession(sessionToken: string): Promise<void> {
    await withDatabase(async (db) => {
      const originalLength = db.sessions.length;
      db.sessions = db.sessions.filter((entry) => entry.token !== sessionToken);
      return {
        persist: db.sessions.length !== originalLength,
        result: undefined
      };
    });
  }
};

async function createCheckoutSessionForPayment(
  input: CreateCheckoutSessionInput
): Promise<CheckoutSessionResult | null> {
  return withDatabase<CheckoutSessionResult | null>(async (db) => {
    const account = findAccountById(db, input.accountId);
    const drop = findDropById(db, input.dropId);
    if (!account || !drop) {
      return {
        persist: false,
        result: null
      };
    }

    const existing = findOwnershipByDrop(db, account.id, drop.id);
    if (existing) {
      return {
        persist: false,
        result: {
          status: "already_owned",
          receiptId: existing.receiptId
        }
      };
    }

    const amountUsd = getDropPriceTotalUsd(drop);
    const paymentId = `pay_${randomUUID()}`;
    const createdAt = new Date().toISOString();
    const successUrl = input.successUrl ?? "/my-collection?payment=success";
    const cancelUrl = input.cancelUrl ?? `/pay/buy/${encodeURIComponent(drop.id)}?payment=cancel`;
    const checkout = await createCheckoutSession({
      paymentId,
      accountId: account.id,
      drop,
      amountUsd,
      successUrl,
      cancelUrl
    });

    db.payments.unshift({
      id: paymentId,
      provider: checkout.provider,
      status: "pending",
      accountId: account.id,
      dropId: drop.id,
      amountUsd,
      currency: "USD",
      checkoutSessionId: checkout.sessionId,
      checkoutUrl: checkout.url,
      createdAt,
      updatedAt: createdAt
    });

    return {
      persist: true,
      result: {
        status: "pending",
        paymentId,
        provider: checkout.provider,
        checkoutSessionId: checkout.sessionId,
        checkoutUrl: checkout.url,
        drop,
        amountUsd,
        currency: "USD"
      }
    };
  });
}

async function completePendingPaymentById(
  paymentId: string,
  options?: CompletePendingPaymentOptions
): Promise<PurchaseReceipt | null> {
  return withDatabase(async (db) => {
    const payment = db.payments.find((entry) => entry.id === paymentId);
    if (!payment) {
      return {
        persist: false,
        result: null
      };
    }

    if (options?.expectedAccountId && payment.accountId !== options.expectedAccountId) {
      return {
        persist: false,
        result: null
      };
    }

    if (options?.allowedProviders && !options.allowedProviders.includes(payment.provider)) {
      return {
        persist: false,
        result: null
      };
    }

    if (payment.status === "succeeded" && payment.receiptId) {
      const receipt = db.receipts.find((entry) => entry.id === payment.receiptId) ?? null;
      return {
        persist: false,
        result: receipt
      };
    }

    if (payment.status !== "pending") {
      return {
        persist: false,
        result: null
      };
    }

    const account = findAccountById(db, payment.accountId);
    const drop = findDropById(db, payment.dropId);
    if (!account || !drop) {
      payment.status = "failed";
      payment.updatedAt = new Date().toISOString();
      return {
        persist: true,
        result: null
      };
    }

    const existing = findOwnershipByDrop(db, payment.accountId, payment.dropId);
    if (existing) {
      payment.status = "succeeded";
      payment.receiptId = existing.receiptId;
      payment.updatedAt = new Date().toISOString();
      const receipt = db.receipts.find((entry) => entry.id === existing.receiptId) ?? null;
      return {
        persist: true,
        result: receipt
      };
    }

    const receipt = issueOwnershipAndReceipt(db, account, drop, {
      amountUsd: payment.amountUsd
    });
    payment.status = "succeeded";
    payment.receiptId = receipt.id;
    payment.updatedAt = new Date().toISOString();

    return {
      persist: true,
      result: receipt
    };
  });
}

type StripePaymentLookupInput = {
  paymentId?: string;
  checkoutSessionId?: string;
  providerPaymentIntentId?: string;
};

function completePaymentByLookupInDatabase(
  db: BffDatabase,
  input: StripePaymentLookupInput
): StripeWebhookMutationResult {
  const payment = findPaymentForWebhook(db, input);
  if (!payment) {
    return {
      persist: false,
      result: {
        received: true,
        effect: "payment_not_found"
      }
    };
  }

  payment.updatedAt = new Date().toISOString();
  if (input.providerPaymentIntentId) {
    payment.providerPaymentIntentId = input.providerPaymentIntentId;
  }
  if (payment.status === "succeeded") {
    return {
      persist: true,
      result: {
        received: true,
        effect: "payment_completed",
        paymentId: payment.id
      }
    };
  }

  const account = findAccountById(db, payment.accountId);
  const drop = findDropById(db, payment.dropId);
  if (!account || !drop) {
    payment.status = "failed";
    return {
      persist: true,
      result: {
        received: true,
        effect: "payment_failed",
        paymentId: payment.id
      }
    };
  }

  const existing = findOwnershipByDrop(db, payment.accountId, payment.dropId);
  if (existing) {
    payment.status = "succeeded";
    payment.receiptId = existing.receiptId;
    return {
      persist: true,
      result: {
        received: true,
        effect: "payment_completed",
        paymentId: payment.id
      }
    };
  }

  const receipt = issueOwnershipAndReceipt(db, account, drop, {
    amountUsd: payment.amountUsd
  });
  payment.status = "succeeded";
  payment.receiptId = receipt.id;

  return {
    persist: true,
    result: {
      received: true,
      effect: "payment_completed",
      paymentId: payment.id
    }
  };
}

function failPaymentByLookupInDatabase(
  db: BffDatabase,
  input: Pick<StripePaymentLookupInput, "paymentId" | "checkoutSessionId">
): StripeWebhookMutationResult {
  const payment = findPaymentForWebhook(db, input);
  if (!payment) {
    return {
      persist: false,
      result: {
        received: true,
        effect: "payment_not_found"
      }
    };
  }

  payment.status = "failed";
  payment.updatedAt = new Date().toISOString();
  return {
    persist: true,
    result: {
      received: true,
      effect: "payment_failed",
      paymentId: payment.id
    }
  };
}

function refundPaymentByLookupInDatabase(
  db: BffDatabase,
  input: StripePaymentLookupInput
): StripeWebhookMutationResult {
  const payment = findPaymentForWebhook(db, input);
  if (!payment) {
    return {
      persist: false,
      result: {
        received: true,
        effect: "payment_not_found"
      }
    };
  }

  payment.status = "refunded";
  payment.updatedAt = new Date().toISOString();
  if (input.providerPaymentIntentId) {
    payment.providerPaymentIntentId = input.providerPaymentIntentId;
  }

  if (payment.receiptId) {
    markRefundByReceipt(db, payment.accountId, payment.receiptId);
  }

  return {
    persist: true,
    result: {
      received: true,
      effect: "payment_refunded",
      paymentId: payment.id
    }
  };
}

function applyParsedStripeWebhookInDatabase(
  db: BffDatabase,
  parsed: ParsedStripeWebhookEvent["event"]
): StripeWebhookMutationResult {
  if (parsed.kind === "checkout.completed") {
    return completePaymentByLookupInDatabase(db, {
      paymentId: parsed.paymentId,
      checkoutSessionId: parsed.checkoutSessionId,
      providerPaymentIntentId: parsed.providerPaymentIntentId
    });
  }

  if (parsed.kind === "checkout.failed") {
    return failPaymentByLookupInDatabase(db, {
      paymentId: parsed.paymentId,
      checkoutSessionId: parsed.checkoutSessionId
    });
  }

  return refundPaymentByLookupInDatabase(db, {
    paymentId: parsed.paymentId,
    checkoutSessionId: parsed.checkoutSessionId,
    providerPaymentIntentId: parsed.providerPaymentIntentId
  });
}

async function applyParsedStripeWebhook(
  parsed: ParsedStripeWebhookEvent["event"]
): Promise<StripeWebhookApplyResult> {
  return withDatabase<StripeWebhookApplyResult>(async (db) => {
    const applied = applyParsedStripeWebhookInDatabase(db, parsed);
    return {
      persist: applied.persist,
      result: applied.result
    };
  });
}

export const commerceBffService = {
  ...gatewayMethods,

  createCheckoutSession: createCheckoutSessionForPayment,

  async completePendingPayment(paymentId: string): Promise<PurchaseReceipt | null> {
    return completePendingPaymentById(paymentId, {
      allowedProviders: ["manual"]
    });
  },

  async completePendingPaymentForAccount(
    accountId: string,
    paymentId: string
  ): Promise<PurchaseReceipt | null> {
    return completePendingPaymentById(paymentId, {
      expectedAccountId: accountId,
      allowedProviders: ["manual"]
    });
  },

  async getCollectInventory(
    accountId: string | null,
    lane: CollectMarketLane = "all"
  ): Promise<{ lane: CollectMarketLane; listings: CollectInventoryListing[] }> {
    return withDatabase(async (db) => ({
      persist: false,
      result: buildCollectInventoryView(db, accountId, lane)
    }));
  },

  async getCollectDropOffers(
    dropId: string,
    accountId: string | null
  ): Promise<{ listing: CollectInventoryListing; offers: CollectOffer[] } | null> {
    return withDatabase(async (db) => ({
      persist: false,
      result: buildCollectDropOffersView(db, dropId, accountId)
    }));
  },

  async submitCollectResaleOffer(input: {
    accountId: string;
    dropId: string;
    amountUsd: number;
  }): Promise<{ listing: CollectInventoryListing; offers: CollectOffer[] } | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, input.accountId);
      const drop = findDropById(db, input.dropId);
      if (!account || !drop) {
        return {
          persist: false,
          result: null
        };
      }

      const listingType = resolveCollectListingTypeByDropId(db.catalog.drops, drop.id);
      if (listingType !== "resale") {
        return {
          persist: false,
          result: null
        };
      }

      const normalizedAmount = Number(input.amountUsd);
      if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        return {
          persist: false,
          result: null
        };
      }

      const createdAt = new Date().toISOString();
      const base: CollectOffer = {
        id: `offer_${randomUUID()}`,
        dropId: drop.id,
        listingType: "resale",
        amountUsd: Number(normalizedAmount.toFixed(2)),
        state: "listed",
        actorHandle: account.handle,
        createdAt,
        updatedAt: createdAt,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
        executionVisibility: "private",
        executionPriceUsd: null
      };
      const submitted = applyCollectOfferAction(base, "submit_offer", {
        amountUsd: base.amountUsd,
        updatedAt: createdAt
      });

      db.collectOffers.unshift({
        id: submitted.id,
        accountId: account.id,
        dropId: submitted.dropId,
        listingType: submitted.listingType,
        amountUsd: submitted.amountUsd,
        state: submitted.state,
        createdAt: submitted.createdAt,
        updatedAt: submitted.updatedAt,
        expiresAt: submitted.expiresAt,
        executionVisibility: "private",
        executionPriceUsd: null
      });
      trimCollectOffers(db);

      return {
        persist: true,
        result: buildCollectDropOffersView(db, drop.id, account.id)
      };
    });
  },

  async transitionCollectOffer(input: {
    accountId: string;
    offerId: string;
    action: CollectOfferAction;
    executionPriceUsd?: number;
  }): Promise<{ listing: CollectInventoryListing; offers: CollectOffer[] } | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, input.accountId);
      if (!account) {
        return {
          persist: false,
          result: null
        };
      }

      const offer = db.collectOffers.find((entry) => entry.id === input.offerId) ?? null;
      if (!offer) {
        return {
          persist: false,
          result: null
        };
      }

      if (!canApplyCollectOfferAction(offer.state, input.action)) {
        return {
          persist: false,
          result: null
        };
      }

      if (!canTransitionCollectOffer(db, account, offer, input.action)) {
        return {
          persist: false,
          result: null
        };
      }

      const actorHandle = account.handle;
      const transitioned = applyCollectOfferAction(
        {
          id: offer.id,
          dropId: offer.dropId,
          listingType: offer.listingType,
          amountUsd: offer.amountUsd,
          state: offer.state,
          actorHandle,
          createdAt: offer.createdAt,
          updatedAt: offer.updatedAt,
          expiresAt: offer.expiresAt,
          executionVisibility: offer.executionVisibility,
          executionPriceUsd: offer.executionPriceUsd
        },
        input.action,
        {
          updatedAt: new Date().toISOString()
        }
      );

      offer.state = transitioned.state;
      offer.updatedAt = transitioned.updatedAt;
      offer.expiresAt = transitioned.expiresAt;
      offer.amountUsd = transitioned.amountUsd;

      if (input.action === "settle_offer") {
        const normalizedExecution =
          typeof input.executionPriceUsd === "number" && Number.isFinite(input.executionPriceUsd)
            ? Number(input.executionPriceUsd.toFixed(2))
            : offer.amountUsd;
        offer.executionPriceUsd = normalizedExecution;
        offer.executionVisibility = offer.listingType === "resale" ? "private" : "public";
      }

      return {
        persist: true,
        result: buildCollectDropOffersView(db, offer.dropId, account.id)
      };
    });
  },

  async getTownhallSocialSnapshot(
    accountId: string | null,
    dropIds: string[]
  ): Promise<TownhallSocialSnapshot> {
    return withDatabase<TownhallSocialSnapshot>(async (db) => {
      const viewerAccount = accountId ? findAccountById(db, accountId) : null;
      const uniqueDropIds = Array.from(new Set(dropIds.map((dropId) => dropId.trim()).filter(Boolean)));

      return {
        persist: false,
        result: buildTownhallSocialSnapshot(db, viewerAccount?.id ?? null, uniqueDropIds)
      };
    });
  },

  async getTownhallTelemetrySignals(
    dropIds: string[]
  ): Promise<Record<string, TownhallTelemetrySignals>> {
    return withDatabase<Record<string, TownhallTelemetrySignals>>(async (db) => {
      const uniqueDropIds = Array.from(new Set(dropIds.map((dropId) => dropId.trim()).filter(Boolean)));
      return {
        persist: false,
        result: buildTownhallTelemetrySignals(db, uniqueDropIds)
      };
    });
  },

  async recordTownhallTelemetryEvent(input: {
    accountId: string | null;
    dropId: string;
    eventType: TownhallTelemetryEventType;
    watchTimeSeconds?: number;
    completionPercent?: number;
    metadata?: TownhallTelemetryMetadata;
    occurredAt?: string;
  }): Promise<boolean> {
    return withDatabase<boolean>(async (db): Promise<TownhallTelemetryMutationResult> => {
      const drop = findDropById(db, input.dropId);
      if (!drop || !isTownhallTelemetryEventType(input.eventType)) {
        return {
          persist: false,
          result: false
        };
      }

      const account = input.accountId ? findAccountById(db, input.accountId) : null;
      const normalizedWatchTime =
        input.eventType === "watch_time" || input.eventType === "drop_dwell_time"
          ? normalizeWatchTimeSeconds(input.watchTimeSeconds)
          : 0;
      const normalizedCompletion =
        input.eventType === "completion"
          ? normalizeCompletionPercent(input.completionPercent ?? 100)
          : 0;

      db.townhallTelemetryEvents.unshift({
        id: `tel_${randomUUID()}`,
        accountId: account?.id ?? null,
        dropId: drop.id,
        eventType: input.eventType,
        watchTimeSeconds: normalizedWatchTime,
        completionPercent: normalizedCompletion,
        metadata: normalizeTownhallTelemetryMetadata(input.metadata),
        occurredAt: input.occurredAt ?? new Date().toISOString()
      } satisfies TownhallTelemetryEventRecord);

      if (db.townhallTelemetryEvents.length > TOWNHALL_TELEMETRY_EVENT_LOG_LIMIT) {
        db.townhallTelemetryEvents.length = TOWNHALL_TELEMETRY_EVENT_LOG_LIMIT;
      }

      return {
        persist: true,
        result: true
      };
    });
  },

  async toggleTownhallLike(accountId: string, dropId: string): Promise<TownhallDropSocialSnapshot | null> {
    return withDatabase<TownhallDropSocialSnapshot | null>(async (db): Promise<TownhallSocialMutationResult> => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      if (!account || !drop) {
        return {
          persist: false,
          result: null
        };
      }

      const existingIndex = db.townhallLikes.findIndex(
        (entry) => entry.accountId === account.id && entry.dropId === drop.id
      );
      if (existingIndex >= 0) {
        db.townhallLikes.splice(existingIndex, 1);
      } else {
        db.townhallLikes.unshift({
          accountId: account.id,
          dropId: drop.id,
          likedAt: new Date().toISOString()
        });
      }

      return {
        persist: true,
        result: buildTownhallDropSocialSnapshot(db, drop.id, account.id)
      };
    });
  },

  async toggleTownhallSavedDrop(
    accountId: string,
    dropId: string
  ): Promise<TownhallDropSocialSnapshot | null> {
    return withDatabase<TownhallDropSocialSnapshot | null>(async (db): Promise<TownhallSocialMutationResult> => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      if (!account || !drop) {
        return {
          persist: false,
          result: null
        };
      }

      const existingIndex = db.savedDrops.findIndex(
        (entry) => entry.accountId === account.id && entry.dropId === drop.id
      );
      if (existingIndex >= 0) {
        db.savedDrops.splice(existingIndex, 1);
      } else {
        db.savedDrops.unshift({
          accountId: account.id,
          dropId: drop.id,
          savedAt: new Date().toISOString()
        });
      }

      return {
        persist: true,
        result: buildTownhallDropSocialSnapshot(db, drop.id, account.id)
      };
    });
  },

  async addTownhallComment(
    accountId: string,
    dropId: string,
    body: string
  ): Promise<TownhallDropSocialSnapshot | null> {
    return withDatabase<TownhallDropSocialSnapshot | null>(async (db): Promise<TownhallSocialMutationResult> => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      if (!account || !drop) {
        return {
          persist: false,
          result: null
        };
      }

      const normalizedBody = normalizeTownhallCommentBody(body);
      if (!normalizedBody) {
        return {
          persist: false,
          result: buildTownhallDropSocialSnapshot(db, drop.id, account.id)
        };
      }

      db.townhallComments.unshift({
        id: `cmt_${randomUUID()}`,
        accountId: account.id,
        dropId: drop.id,
        body: normalizedBody,
        createdAt: new Date().toISOString(),
        visibility: "visible",
        reportCount: 0,
        reportedAt: null,
        moderatedAt: null,
        moderatedByAccountId: null
      });

      return {
        persist: true,
        result: buildTownhallDropSocialSnapshot(db, drop.id, account.id)
      };
    });
  },

  async reportTownhallComment(
    accountId: string,
    dropId: string,
    commentId: string
  ): Promise<TownhallDropSocialSnapshot | null> {
    return withDatabase<TownhallDropSocialSnapshot | null>(async (db): Promise<TownhallSocialMutationResult> => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      const comment = findTownhallCommentById(db, dropId, commentId);
      if (!account || !drop || !comment) {
        return {
          persist: false,
          result: null
        };
      }

      if (!canAccountReportTownhallComment(account, comment)) {
        return {
          persist: false,
          result: buildTownhallDropSocialSnapshot(db, drop.id, account.id)
        };
      }

      comment.reportCount += 1;
      comment.reportedAt = new Date().toISOString();

      return {
        persist: true,
        result: buildTownhallDropSocialSnapshot(db, drop.id, account.id)
      };
    });
  },

  async hideTownhallComment(
    accountId: string,
    dropId: string,
    commentId: string
  ): Promise<TownhallCommentModerationResult> {
    return withDatabase<TownhallCommentModerationResult>(async (db) => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      const comment = findTownhallCommentById(db, dropId, commentId);
      if (!account || !drop || !comment) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "not_found"
          }
        };
      }

      if (!canAccountModerateTownhallComment(account, drop, comment)) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "forbidden"
          }
        };
      }

      if (comment.visibility !== "hidden") {
        comment.visibility = "hidden";
        comment.moderatedAt = new Date().toISOString();
        comment.moderatedByAccountId = account.id;
      }

      return {
        persist: true,
        result: {
          ok: true,
          social: buildTownhallDropSocialSnapshot(db, drop.id, account.id)!
        }
      };
    });
  },

  async restoreTownhallComment(
    accountId: string,
    dropId: string,
    commentId: string
  ): Promise<TownhallCommentModerationResult> {
    return withDatabase<TownhallCommentModerationResult>(async (db) => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      const comment = findTownhallCommentById(db, dropId, commentId);
      if (!account || !drop || !comment) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "not_found"
          }
        };
      }

      if (!canAccountModerateTownhallComment(account, drop, comment)) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "forbidden"
          }
        };
      }

      if (comment.visibility !== "visible") {
        comment.visibility = "visible";
        comment.moderatedAt = new Date().toISOString();
        comment.moderatedByAccountId = account.id;
      }

      return {
        persist: true,
        result: {
          ok: true,
          social: buildTownhallDropSocialSnapshot(db, drop.id, account.id)!
        }
      };
    });
  },

  async recordTownhallShare(
    accountId: string,
    dropId: string,
    channel: TownhallShareChannel
  ): Promise<TownhallDropSocialSnapshot | null> {
    return withDatabase<TownhallDropSocialSnapshot | null>(async (db): Promise<TownhallSocialMutationResult> => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      if (!account || !drop || !isTownhallShareChannel(channel)) {
        return {
          persist: false,
          result: null
        };
      }

      db.townhallShares.unshift({
        id: `shr_${randomUUID()}`,
        accountId: account.id,
        dropId: drop.id,
        channel,
        sharedAt: new Date().toISOString()
      });

      return {
        persist: true,
        result: buildTownhallDropSocialSnapshot(db, drop.id, account.id)
      };
    });
  },

  async applyStripeWebhook(request: Request): Promise<StripeWebhookApplyResult> {
    const parsed = await parseStripeWebhook(request);
    if (parsed === "invalid_signature") {
      return {
        received: false,
        effect: "invalid_signature"
      };
    }
    if (!parsed) {
      return {
        received: true,
        effect: "ignored"
      };
    }

    const eventId = parsed.eventId;
    if (eventId) {
      return withDatabase<StripeWebhookApplyResult>(async (db) => {
        if (hasProcessedStripeWebhookEvent(db, eventId)) {
          return {
            persist: false,
            result: {
              received: true,
              effect: "ignored"
            }
          };
        }

        const applied = applyParsedStripeWebhookInDatabase(db, parsed.event);
        rememberProcessedStripeWebhookEvent(db, eventId);

        return {
          persist: true,
          result: applied.result
        };
      });
    }

    return applyParsedStripeWebhook(parsed.event);
  }
};
