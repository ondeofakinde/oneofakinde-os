import { badRequest, ok, unauthorized } from "@/lib/bff/http";
import { emitOperationalEvent } from "@/lib/ops/observability";
import { commerceBffService } from "@/lib/bff/service";

export async function POST(request: Request) {
  const result = await commerceBffService.applyStripeWebhook(request);

  if (result.effect === "invalid_signature") {
    emitOperationalEvent("stripe_webhook_invalid_signature");
    return unauthorized("invalid stripe signature");
  }

  if (!result.received) {
    emitOperationalEvent("stripe_webhook_rejected", {
      effect: result.effect
    });
    return badRequest("webhook payload rejected");
  }

  emitOperationalEvent("stripe_webhook_applied", {
    effect: result.effect,
    paymentId: result.paymentId
  });

  return ok(result);
}
