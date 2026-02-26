import type {
  Certificate,
  CollectLiveSessionSnapshot,
  CheckoutSession,
  CheckoutPreview,
  CreateWorkshopLiveSessionInput,
  CreateSessionInput,
  Drop,
  LibrarySnapshot,
  LiveSession,
  LiveSessionEligibility,
  MembershipEntitlement,
  MyCollectionSnapshot,
  PurchaseReceipt,
  Session,
  Studio,
  World
} from "@/lib/domain/contracts";
import type { CommerceGateway } from "@/lib/domain/ports";
import { SESSION_COOKIE } from "@/lib/session";

type Nullable<T> = T | null;

type BffClientOptions = {
  baseUrl?: string;
};

function normalizeBaseUrl(input: string): string {
  return input.endsWith("/") ? input.slice(0, -1) : input;
}

function resolveBaseUrlFromEnvironment(): string {
  const explicitBaseUrl = process.env.OOK_BFF_BASE_URL?.trim();
  if (explicitBaseUrl) {
    return normalizeBaseUrl(explicitBaseUrl);
  }

  const deploymentHost = process.env.VERCEL_URL?.trim();
  if (deploymentHost) {
    const deploymentBaseUrl = deploymentHost.startsWith("http")
      ? deploymentHost
      : `https://${deploymentHost}`;
    return normalizeBaseUrl(deploymentBaseUrl);
  }

  const localPort = process.env.PORT?.trim() || "3000";
  return `http://127.0.0.1:${localPort}`;
}

async function resolveBaseUrlFromRequestContext(): Promise<string | null> {
  try {
    const nextHeaders = await import("next/headers");
    const headerStore = await nextHeaders.headers();
    const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");

    if (!host) {
      return null;
    }

    const forwardedProtocol = headerStore.get("x-forwarded-proto");
    const protocol =
      forwardedProtocol ??
      (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

    return normalizeBaseUrl(`${protocol}://${host}`);
  } catch {
    return null;
  }
}

async function resolveSessionTokenFromRequestContext(): Promise<string | null> {
  try {
    const nextHeaders = await import("next/headers");
    const cookieStore = await nextHeaders.cookies();
    return cookieStore.get(SESSION_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

async function requestJson<T>(
  options: BffClientOptions,
  pathname: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; payload: Nullable<T> }> {
  const baseUrl =
    options.baseUrl ??
    (await resolveBaseUrlFromRequestContext()) ??
    resolveBaseUrlFromEnvironment();
  const sessionToken = await resolveSessionTokenFromRequestContext();
  const headers = new Headers(init?.headers ?? {});
  headers.set("content-type", "application/json");
  if (sessionToken && !headers.has("x-ook-session-token")) {
    headers.set("x-ook-session-token", sessionToken);
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    cache: "no-store",
    headers
  });

  if (response.status === 204) {
    return {
      ok: response.ok,
      status: response.status,
      payload: null
    };
  }

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T) : null;

  return {
    ok: response.ok,
    status: response.status,
    payload
  };
}

export function createBffGateway(baseUrl?: string): CommerceGateway {
  const options: BffClientOptions = {
    baseUrl: baseUrl ? normalizeBaseUrl(baseUrl) : undefined
  };

  return {
    async listDrops(): Promise<Drop[]> {
      const response = await requestJson<{ drops: Drop[] }>(options, "/api/v1/catalog/drops");
      if (!response.ok || !response.payload) return [];
      return response.payload.drops;
    },

    async listWorlds(): Promise<World[]> {
      const response = await requestJson<{ worlds: World[] }>(options, "/api/v1/catalog/worlds");
      if (!response.ok || !response.payload) return [];
      return response.payload.worlds;
    },

    async getWorldById(worldId: string): Promise<World | null> {
      const response = await requestJson<{ world: World }>(
        options,
        `/api/v1/catalog/worlds/${encodeURIComponent(worldId)}`
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.world;
    },

    async listDropsByWorldId(worldId: string): Promise<Drop[]> {
      const response = await requestJson<{ drops: Drop[] }>(
        options,
        `/api/v1/catalog/worlds/${encodeURIComponent(worldId)}/drops`
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.drops;
    },

    async getStudioByHandle(handle: string): Promise<Studio | null> {
      const response = await requestJson<{ studio: Studio }>(
        options,
        `/api/v1/catalog/studios/${encodeURIComponent(handle)}`
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.studio;
    },

    async listDropsByStudioHandle(handle: string): Promise<Drop[]> {
      const response = await requestJson<{ drops: Drop[] }>(
        options,
        `/api/v1/catalog/studios/${encodeURIComponent(handle)}/drops`
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.drops;
    },

    async getDropById(dropId: string): Promise<Drop | null> {
      const response = await requestJson<{ drop: Drop }>(
        options,
        `/api/v1/catalog/drops/${encodeURIComponent(dropId)}`
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.drop;
    },

    async getCheckoutPreview(_accountId: string, dropId: string): Promise<CheckoutPreview | null> {
      const response = await requestJson<{ checkout: CheckoutPreview }>(
        options,
        `/api/v1/payments/checkout/${encodeURIComponent(dropId)}`
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.checkout;
    },

    async createCheckoutSession(
      _accountId: string,
      dropId: string,
      checkoutOptions?: {
        successUrl?: string;
        cancelUrl?: string;
      }
    ): Promise<CheckoutSession | null> {
      const response = await requestJson<{ checkoutSession: CheckoutSession }>(
        options,
        `/api/v1/payments/checkout/${encodeURIComponent(dropId)}`,
        {
          method: "POST",
          body: JSON.stringify({
            successUrl: checkoutOptions?.successUrl,
            cancelUrl: checkoutOptions?.cancelUrl
          })
        }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.checkoutSession;
    },

    async completePendingPayment(paymentId: string): Promise<PurchaseReceipt | null> {
      const response = await requestJson<{ receipt: PurchaseReceipt }>(options, "/api/v1/payments/purchase", {
        method: "POST",
        body: JSON.stringify({ paymentId })
      });
      if (!response.ok || !response.payload) return null;
      return response.payload.receipt;
    },

    async purchaseDrop(_accountId: string, dropId: string): Promise<PurchaseReceipt | null> {
      const checkout = await requestJson<{ checkoutSession: CheckoutSession }>(
        options,
        `/api/v1/payments/checkout/${encodeURIComponent(dropId)}`,
        {
          method: "POST",
          body: JSON.stringify({})
        }
      );

      if (!checkout.ok || !checkout.payload) return null;

      if (checkout.payload.checkoutSession.status === "already_owned") {
        const existing = await requestJson<{ receipt: PurchaseReceipt }>(
          options,
          `/api/v1/receipts/${encodeURIComponent(checkout.payload.checkoutSession.receiptId)}`
        );
        return existing.ok && existing.payload ? existing.payload.receipt : null;
      }

      const response = await requestJson<{ receipt: PurchaseReceipt }>(options, "/api/v1/payments/purchase", {
        method: "POST",
        body: JSON.stringify({ paymentId: checkout.payload.checkoutSession.paymentId })
      });
      if (!response.ok || !response.payload) return null;
      return response.payload.receipt;
    },

    async getMyCollection(_accountId: string): Promise<MyCollectionSnapshot | null> {
      void _accountId;
      const response = await requestJson<{ collection: MyCollectionSnapshot }>(options, "/api/v1/collection");
      if (!response.ok || !response.payload) return null;
      return response.payload.collection;
    },

    async getLibrary(_accountId: string): Promise<LibrarySnapshot | null> {
      void _accountId;
      const response = await requestJson<{ library: LibrarySnapshot }>(options, "/api/v1/library");
      if (!response.ok || !response.payload) return null;
      return response.payload.library;
    },

    async getReceipt(_accountId: string, receiptId: string): Promise<PurchaseReceipt | null> {
      const response = await requestJson<{ receipt: PurchaseReceipt }>(
        options,
        `/api/v1/receipts/${encodeURIComponent(receiptId)}`
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.receipt;
    },

    async hasDropEntitlement(_accountId: string, dropId: string): Promise<boolean> {
      const response = await requestJson<{ hasEntitlement: boolean }>(
        options,
        `/api/v1/entitlements/drops/${encodeURIComponent(dropId)}`
      );
      if (!response.ok || !response.payload) return false;
      return response.payload.hasEntitlement;
    },

    async listMembershipEntitlements(_accountId: string): Promise<MembershipEntitlement[]> {
      void _accountId;
      const response = await requestJson<{ entitlements: MembershipEntitlement[] }>(
        options,
        "/api/v1/memberships"
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.entitlements;
    },

    async listCollectLiveSessions(_accountId: string): Promise<CollectLiveSessionSnapshot[]> {
      void _accountId;
      const response = await requestJson<{ liveSessions: CollectLiveSessionSnapshot[] }>(
        options,
        "/api/v1/collect/live-sessions"
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.liveSessions;
    },

    async getCollectLiveSessionEligibility(
      _accountId: string,
      liveSessionId: string
    ): Promise<LiveSessionEligibility | null> {
      const response = await requestJson<{ eligibility: LiveSessionEligibility }>(
        options,
        `/api/v1/collect/live-sessions/${encodeURIComponent(liveSessionId)}/eligibility`
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.eligibility;
    },

    async listWorkshopLiveSessions(_accountId: string): Promise<LiveSession[]> {
      void _accountId;
      const response = await requestJson<{ liveSessions: LiveSession[] }>(
        options,
        "/api/v1/workshop/live-sessions"
      );
      if (!response.ok || !response.payload) return [];
      return response.payload.liveSessions;
    },

    async createWorkshopLiveSession(
      _accountId: string,
      input: CreateWorkshopLiveSessionInput
    ): Promise<LiveSession | null> {
      void _accountId;
      const response = await requestJson<{ liveSession: LiveSession }>(
        options,
        "/api/v1/workshop/live-sessions",
        {
          method: "POST",
          body: JSON.stringify(input)
        }
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.liveSession;
    },

    async getCertificateById(certificateId: string): Promise<Certificate | null> {
      const response = await requestJson<{ certificate: Certificate }>(
        options,
        `/api/v1/certificates/${encodeURIComponent(certificateId)}`
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.certificate;
    },

    async getCertificateByReceipt(_accountId: string, receiptId: string): Promise<Certificate | null> {
      const response = await requestJson<{ certificate: Certificate }>(
        options,
        `/api/v1/certificates/by-receipt/${encodeURIComponent(receiptId)}`
      );
      if (!response.ok || !response.payload) return null;
      return response.payload.certificate;
    },

    async getSessionByToken(sessionToken: string): Promise<Session | null> {
      const response = await requestJson<{ session: Session }>(options, "/api/v1/session/by-token", {
        method: "POST",
        body: JSON.stringify({ sessionToken })
      });
      if (!response.ok || !response.payload) return null;
      return response.payload.session;
    },

    async createSession(input: CreateSessionInput): Promise<Session> {
      const response = await requestJson<{ session: Session }>(options, "/api/v1/session/create", {
        method: "POST",
        body: JSON.stringify(input)
      });

      if (!response.ok || !response.payload) {
        throw new Error("failed to create session via bff gateway");
      }

      return response.payload.session;
    },

    async clearSession(_sessionToken: string): Promise<void> {
      void _sessionToken;
      await requestJson(options, "/api/v1/session/clear", {
        method: "POST"
      });
    }
  };
}
