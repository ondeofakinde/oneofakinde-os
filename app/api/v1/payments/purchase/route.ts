import { commerceGateway } from "@/lib/adapters/mock-commerce";
import { badRequest, getRequiredBodyString, notFound, ok, safeJson } from "@/lib/bff/http";

type PurchaseBody = {
  accountId?: string;
  dropId?: string;
};

export async function POST(request: Request) {
  const payload = await safeJson<PurchaseBody>(request);
  const accountId = getRequiredBodyString(payload as Record<string, unknown> | null, "accountId");
  const dropId = getRequiredBodyString(payload as Record<string, unknown> | null, "dropId");

  if (!accountId) {
    return badRequest("accountId is required");
  }
  if (!dropId) {
    return badRequest("dropId is required");
  }

  const receipt = await commerceGateway.purchaseDrop(accountId, dropId);
  if (!receipt) {
    return notFound("purchase failed");
  }

  return ok({ receipt });
}
