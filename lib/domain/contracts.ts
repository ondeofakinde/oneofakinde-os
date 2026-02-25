export type AccountRole = "collector" | "creator";

export type Session = {
  accountId: string;
  email: string;
  handle: string;
  displayName: string;
  roles: AccountRole[];
  sessionToken: string;
};

export type DropPreviewMode = "watch" | "listen" | "read" | "photos" | "live";

export type DropPreviewAssetType = "video" | "audio" | "image" | "text";

export type DropPreviewAsset = {
  type: DropPreviewAssetType;
  src?: string;
  posterSrc?: string;
  alt?: string;
  text?: string;
};

export type DropPreviewMap = Partial<Record<DropPreviewMode, DropPreviewAsset>>;

export type Drop = {
  id: string;
  title: string;
  seasonLabel: string;
  episodeLabel: string;
  studioHandle: string;
  worldId: string;
  worldLabel: string;
  synopsis: string;
  releaseDate: string;
  priceUsd: number;
  previewMedia?: DropPreviewMap;
};

export type CollectMarketLane = "all" | "sale" | "auction" | "resale";
export type CollectListingType = Exclude<CollectMarketLane, "all">;

export type CollectOfferState =
  | "listed"
  | "offer_submitted"
  | "countered"
  | "accepted"
  | "settled"
  | "expired"
  | "withdrawn";

export type CollectOfferAction =
  | "submit_offer"
  | "counter_offer"
  | "accept_offer"
  | "settle_offer"
  | "expire_offer"
  | "withdraw_offer";

export type CollectOffer = {
  id: string;
  dropId: string;
  listingType: CollectListingType;
  amountUsd: number;
  state: CollectOfferState;
  actorHandle: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  executionVisibility: "public" | "private" | null;
  executionPriceUsd: number | null;
};

export type CollectEnforcementSignalType =
  | "invalid_listing_action_blocked"
  | "invalid_amount_rejected"
  | "invalid_transition_blocked"
  | "unauthorized_transition_blocked"
  | "cross_drop_transition_blocked"
  | "invalid_settle_price_rejected"
  | "reaward_blocked";

export type CollectEnforcementSignal = {
  id: string;
  signalType: CollectEnforcementSignalType;
  dropId: string | null;
  offerId: string | null;
  accountId: string | null;
  reason: string;
  occurredAt: string;
};

export type CollectIntegrityFlagSeverity = "info" | "warning" | "critical";

export type CollectIntegrityFlag = {
  code: CollectEnforcementSignalType | "multiple_settled_offers";
  severity: CollectIntegrityFlagSeverity;
  dropId: string | null;
  count: number;
  lastOccurredAt: string;
  reason: string;
};

export type CollectIntegritySnapshot = {
  dropId: string | null;
  flags: CollectIntegrityFlag[];
  signalCounts: Record<CollectEnforcementSignalType, number>;
  recentSignals: CollectEnforcementSignal[];
};

export type CollectInventoryListing = {
  drop: Drop;
  listingType: CollectListingType;
  lane: CollectMarketLane;
  priceUsd: number;
  offerCount: number;
  highestOfferUsd: number | null;
  latestOfferState: CollectOfferState;
};

export type World = {
  id: string;
  title: string;
  synopsis: string;
  studioHandle: string;
};

export type Studio = {
  handle: string;
  title: string;
  synopsis: string;
  worldIds: string[];
};

export type CheckoutPreview = {
  drop: Drop;
  subtotalUsd: number;
  processingUsd: number;
  totalUsd: number;
  currency: "USD";
};

export type PaymentProvider = "manual" | "stripe";

export type CheckoutSession =
  | {
      status: "already_owned";
      receiptId: string;
    }
  | {
      status: "pending";
      paymentId: string;
      provider: PaymentProvider;
      checkoutSessionId: string;
      checkoutUrl: string | null;
      drop: Drop;
      amountUsd: number;
      currency: "USD";
    };

export type PurchaseStatus = "completed" | "already_owned" | "refunded";

export type PurchaseReceipt = {
  id: string;
  accountId: string;
  dropId: string;
  amountUsd: number;
  status: PurchaseStatus;
  purchasedAt: string;
};

export type Certificate = {
  id: string;
  dropId: string;
  dropTitle: string;
  ownerHandle: string;
  issuedAt: string;
  receiptId: string;
  status: "verified" | "revoked";
};

export type OwnedDrop = {
  drop: Drop;
  certificateId: string;
  acquiredAt: string;
  receiptId: string;
};

export type MyCollectionSnapshot = {
  account: Pick<Session, "accountId" | "handle" | "displayName">;
  ownedDrops: OwnedDrop[];
  totalSpentUsd: number;
};

export type LibraryDrop = {
  drop: Drop;
  savedAt: string;
};

export type LibrarySnapshot = {
  account: Pick<Session, "accountId" | "handle" | "displayName">;
  savedDrops: LibraryDrop[];
};

export type TownhallShareChannel = "sms" | "internal_dm" | "whatsapp" | "telegram";

export type TownhallCommentVisibility = "visible" | "hidden";

export type TownhallComment = {
  id: string;
  dropId: string;
  authorHandle: string;
  body: string;
  createdAt: string;
  visibility: TownhallCommentVisibility;
  reportCount: number;
  canModerate: boolean;
  canReport: boolean;
};

export type TownhallDropSocialSnapshot = {
  dropId: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  likedByViewer: boolean;
  savedByViewer: boolean;
  comments: TownhallComment[];
};

export type TownhallSocialSnapshot = {
  byDropId: Record<string, TownhallDropSocialSnapshot>;
};

export type TownhallTelemetryEventType =
  | "watch_time"
  | "completion"
  | "collect_intent"
  | "impression"
  | "showroom_impression"
  | "drop_opened"
  | "drop_dwell_time"
  | "preview_start"
  | "preview_complete"
  | "access_start"
  | "access_complete"
  | "interaction_like"
  | "interaction_comment"
  | "interaction_share"
  | "interaction_save";

export type TownhallTelemetryMetadata = {
  source?: "showroom" | "drop";
  surface?: "townhall" | "watch" | "listen" | "read" | "photos" | "live";
  mediaFilter?: "all" | "watch" | "listen" | "read" | "photos" | "live";
  ordering?: "rising" | "newest" | "most_collected";
  position?: number;
  channel?: TownhallShareChannel;
  action?: "open" | "complete" | "start" | "toggle" | "submit";
};

export type TownhallTelemetrySignals = {
  watchTimeSeconds: number;
  completions: number;
  collectIntents: number;
  impressions: number;
};

export type CreateSessionInput = {
  email: string;
  role: AccountRole;
};
