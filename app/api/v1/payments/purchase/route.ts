import { commerceBffService } from "@/lib/bff/service";
import { badRequest, getRequiredBodyString, notFound, ok, safeJson } from "@/lib/bff/http";

type PurchaseBody = {
  accountId?: string;
  dropId?: string;
  paymentId?: string;
};

export async function POST(request: Request) {
  const payload = await safeJson<PurchaseBody>(request);
  const paymentId = getRequiredBodyString(payload as Record<string, unknown> | null, "paymentId");

  if (paymentId) {
    const receipt = await commerceBffService.completePendingPayment(paymentId);
    if (!receipt) {
      return notFound("payment not found or not payable");
    }

    return ok({ receipt });
  }

  const accountId = getRequiredBodyString(payload as Record<string, unknown> | null, "accountId");
  const dropId = getRequiredBodyString(payload as Record<string, unknown> | null, "dropId");

  if (!accountId) {
    return badRequest("accountId is required");
  }
  if (!dropId) {
    return badRequest("dropId is required");
  }

  const receipt = await commerceBffService.purchaseDrop(accountId, dropId);
  if (!receipt) {
    return notFound("purchase failed");
  }

  return ok({ receipt });
}
