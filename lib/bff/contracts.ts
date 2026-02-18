import type { CheckoutSession } from "@/lib/domain/contracts";

export type CreateCheckoutSessionInput = {
  accountId: string;
  dropId: string;
  successUrl?: string;
  cancelUrl?: string;
};

export type CheckoutSessionResult = CheckoutSession;

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
