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

export type TownhallComment = {
  id: string;
  dropId: string;
  authorHandle: string;
  body: string;
  createdAt: string;
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

export type TownhallTelemetryEventType = "watch_time" | "completion" | "collect_intent" | "impression";

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
