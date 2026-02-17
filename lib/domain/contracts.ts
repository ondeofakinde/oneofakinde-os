export type AccountRole = "collector" | "creator";

export type Session = {
  accountId: string;
  email: string;
  handle: string;
  displayName: string;
  roles: AccountRole[];
  sessionToken: string;
};

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

export type PurchaseStatus = "completed" | "already_owned";

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

export type CreateSessionInput = {
  email: string;
  role: AccountRole;
};
