import type { Drop } from "@/lib/domain/contracts";

export type PaymentsProviderName = "manual" | "stripe";

export type CreateCheckoutSessionInput = {
  accountId: string;
  dropId: string;
  successUrl?: string;
  cancelUrl?: string;
};

export type CheckoutSessionResult =
  | {
      status: "already_owned";
      receiptId: string;
    }
  | {
      status: "pending";
      paymentId: string;
      provider: PaymentsProviderName;
      checkoutSessionId: string;
      checkoutUrl: string | null;
      drop: Drop;
      amountUsd: number;
      currency: "USD";
    };

export type StripeWebhookApplyResult = {
  received: boolean;
  effect:
    | "ignored"
    | "payment_completed"
    | "payment_failed"
    | "payment_refunded"
    | "payment_not_found"
    | "invalid_signature";
  paymentId?: string;
};
