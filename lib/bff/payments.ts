import type { Drop } from "@/lib/domain/contracts";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

type CreateCheckoutInput = {
  paymentId: string;
  accountId: string;
  drop: Drop;
  amountUsd: number;
  successUrl: string;
  cancelUrl: string;
};

type CheckoutSession = {
  provider: "manual" | "stripe";
  sessionId: string;
  url: string | null;
};

type StripeWebhookEvent =
  | {
      kind: "checkout.completed";
      paymentId?: string;
      checkoutSessionId?: string;
      providerPaymentIntentId?: string;
    }
  | {
      kind: "checkout.failed";
      paymentId?: string;
      checkoutSessionId?: string;
    }
  | {
      kind: "payment.refunded";
      paymentId?: string;
      providerPaymentIntentId?: string;
      checkoutSessionId?: string;
    };

function withFallbackUrl(url: string, fallbackPath: string): string {
  const normalized = url.trim();
  return normalized || fallbackPath;
}

function amountToStripeCents(amountUsd: number): string {
  return String(Math.round(amountUsd * 100));
}

function parseStripeSignatureHeader(header: string): { timestamp: string; signatures: string[] } | null {
  const parts = header
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3))
    .filter(Boolean);

  if (!timestamp || signatures.length === 0) {
    return null;
  }

  return { timestamp, signatures };
}

function verifyStripeSignature(payload: string, signatureHeader: string, secret: string): boolean {
  const parsed = parseStripeSignatureHeader(signatureHeader);
  if (!parsed) {
    return false;
  }

  const signedPayload = `${parsed.timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return parsed.signatures.some((signature) => {
    try {
      return timingSafeEqual(expectedBuffer, Buffer.from(signature, "hex"));
    } catch {
      return false;
    }
  });
}

async function createStripeCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSession> {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required for stripe payments provider");
  }

  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", withFallbackUrl(input.successUrl, "http://127.0.0.1:3000/my-collection?payment=success"));
  body.set("cancel_url", withFallbackUrl(input.cancelUrl, "http://127.0.0.1:3000/pay/buy/" + input.drop.id + "?payment=cancel"));
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", "usd");
  body.set("line_items[0][price_data][unit_amount]", amountToStripeCents(input.amountUsd));
  body.set("line_items[0][price_data][product_data][name]", input.drop.title);
  body.set("line_items[0][price_data][product_data][description]", input.drop.synopsis);
  body.set("metadata[payment_id]", input.paymentId);
  body.set("metadata[account_id]", input.accountId);
  body.set("metadata[drop_id]", input.drop.id);
  body.set("payment_intent_data[metadata][payment_id]", input.paymentId);
  body.set("payment_intent_data[metadata][account_id]", input.accountId);
  body.set("payment_intent_data[metadata][drop_id]", input.drop.id);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: body.toString(),
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`stripe checkout session request failed (${response.status}): ${message}`);
  }

  const payload = (await response.json()) as {
    id?: string;
    url?: string;
  };

  if (!payload.id) {
    throw new Error("stripe checkout session response missing id");
  }

  return {
    provider: "stripe",
    sessionId: payload.id,
    url: payload.url ?? null
  };
}

export async function createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSession> {
  const provider = process.env.OOK_PAYMENTS_PROVIDER?.trim().toLowerCase();
  if (provider === "stripe") {
    return createStripeCheckoutSession(input);
  }

  return {
    provider: "manual",
    sessionId: `manual_${randomUUID()}`,
    url: withFallbackUrl(input.successUrl, `/my-collection?payment=success&drop=${encodeURIComponent(input.drop.id)}`)
  };
}

export async function parseStripeWebhook(request: Request): Promise<StripeWebhookEvent | null | "invalid_signature"> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return null;
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return "invalid_signature";
  }

  const payloadText = await request.text();
  if (!verifyStripeSignature(payloadText, signature, secret)) {
    return "invalid_signature";
  }

  const event = JSON.parse(payloadText) as {
    type?: string;
    data?: {
      object?: Record<string, unknown>;
    };
  };

  const object = event.data?.object ?? {};

  if (event.type === "checkout.session.completed") {
    return {
      kind: "checkout.completed",
      paymentId: typeof object.metadata === "object" ? (object.metadata as Record<string, unknown>).payment_id as string | undefined : undefined,
      checkoutSessionId: typeof object.id === "string" ? object.id : undefined,
      providerPaymentIntentId:
        typeof object.payment_intent === "string" ? object.payment_intent : undefined
    };
  }

  if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    return {
      kind: "checkout.failed",
      paymentId: typeof object.metadata === "object" ? (object.metadata as Record<string, unknown>).payment_id as string | undefined : undefined,
      checkoutSessionId: typeof object.id === "string" ? object.id : undefined
    };
  }

  if (event.type === "charge.refunded") {
    return {
      kind: "payment.refunded",
      paymentId: typeof object.metadata === "object" ? (object.metadata as Record<string, unknown>).payment_id as string | undefined : undefined,
      providerPaymentIntentId:
        typeof object.payment_intent === "string" ? object.payment_intent : undefined,
      checkoutSessionId:
        typeof object.metadata === "object"
          ? ((object.metadata as Record<string, unknown>).checkout_session_id as string | undefined)
          : undefined
    };
  }

  return null;
}
