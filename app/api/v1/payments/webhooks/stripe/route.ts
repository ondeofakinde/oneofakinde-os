import { badRequest, ok, unauthorized } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function POST(request: Request) {
  const result = await commerceBffService.applyStripeWebhook(request);

  if (result.effect === "invalid_signature") {
    return unauthorized("invalid stripe signature");
  }

  if (!result.received) {
    return badRequest("webhook payload rejected");
  }

  return ok(result);
}
