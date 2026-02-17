import type {
  Certificate,
  CheckoutPreview,
  CreateSessionInput,
  Drop,
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
  purchaseDrop(accountId: string, dropId: string): Promise<PurchaseReceipt | null>;
  getMyCollection(accountId: string): Promise<MyCollectionSnapshot | null>;
  getReceipt(accountId: string, receiptId: string): Promise<PurchaseReceipt | null>;
  hasDropEntitlement(accountId: string, dropId: string): Promise<boolean>;

  getCertificateById(certificateId: string): Promise<Certificate | null>;
  getCertificateByReceipt(accountId: string, receiptId: string): Promise<Certificate | null>;

  getSessionByToken(sessionToken: string): Promise<Session | null>;
  createSession(input: CreateSessionInput): Promise<Session>;
  clearSession(sessionToken: string): Promise<void>;
}
