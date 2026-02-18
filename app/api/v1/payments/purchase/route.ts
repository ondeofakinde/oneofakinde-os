import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";
import { badRequest, getRequiredBodyString, notFound, ok, safeJson } from "@/lib/bff/http";
import { emitOperationalEvent } from "@/lib/ops/observability";

type PurchaseBody = {
  paymentId?: string;
};

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const payload = await safeJson<PurchaseBody>(request);
  const paymentId = getRequiredBodyString(payload as Record<string, unknown> | null, "paymentId");

  if (!paymentId) {
    return badRequest("paymentId is required");
  }

  const receipt = await commerceBffService.completePendingPaymentForAccount(
    guard.session.accountId,
    paymentId
  );
  if (!receipt) {
    emitOperationalEvent("payment_completion_failed", {
      paymentId,
      accountId: guard.session.accountId
    });
    return notFound("payment not found or not payable");
  }

  emitOperationalEvent("payment_completed", {
    paymentId,
    accountId: guard.session.accountId,
    receiptId: receipt.id,
    status: receipt.status
  });

  return ok({ receipt });
}
