import type {
  Certificate,
  CollectLiveSessionSnapshot,
  CheckoutSession,
  CheckoutPreview,
  CreateSessionInput,
  Drop,
  LibrarySnapshot,
  LiveSessionEligibility,
  MembershipEntitlement,
  MyCollectionSnapshot,
  PurchaseReceipt,
  Session,
  Studio,
  World
} from "@/lib/domain/contracts";

export interface CommerceGateway {
  listDrops(): Promise<Drop[]>;
  listWorlds(): Promise<World[]>;
  getWorldById(worldId: string): Promise<World | null>;
  listDropsByWorldId(worldId: string): Promise<Drop[]>;
  getStudioByHandle(handle: string): Promise<Studio | null>;
  listDropsByStudioHandle(handle: string): Promise<Drop[]>;

  getDropById(dropId: string): Promise<Drop | null>;
  getCheckoutPreview(accountId: string, dropId: string): Promise<CheckoutPreview | null>;
  createCheckoutSession(
    accountId: string,
    dropId: string,
    options?: {
      successUrl?: string;
      cancelUrl?: string;
    }
  ): Promise<CheckoutSession | null>;
  completePendingPayment(paymentId: string): Promise<PurchaseReceipt | null>;
  purchaseDrop(accountId: string, dropId: string): Promise<PurchaseReceipt | null>;
  getMyCollection(accountId: string): Promise<MyCollectionSnapshot | null>;
  getLibrary(accountId: string): Promise<LibrarySnapshot | null>;
  getReceipt(accountId: string, receiptId: string): Promise<PurchaseReceipt | null>;
  hasDropEntitlement(accountId: string, dropId: string): Promise<boolean>;
  listMembershipEntitlements(accountId: string): Promise<MembershipEntitlement[]>;
  listCollectLiveSessions(accountId: string): Promise<CollectLiveSessionSnapshot[]>;
  getCollectLiveSessionEligibility(
    accountId: string,
    liveSessionId: string
  ): Promise<LiveSessionEligibility | null>;

  getCertificateById(certificateId: string): Promise<Certificate | null>;
  getCertificateByReceipt(accountId: string, receiptId: string): Promise<Certificate | null>;

  getSessionByToken(sessionToken: string): Promise<Session | null>;
  createSession(input: CreateSessionInput): Promise<Session>;
  clearSession(sessionToken: string): Promise<void>;
}
