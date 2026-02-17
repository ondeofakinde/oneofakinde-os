import { commerceBffService } from "@/lib/bff/service";
import {
  badRequest,
  getRequiredBodyString,
  getRequiredRouteParam,
  getRequiredSearchParam,
  notFound,
  ok,
  safeJson,
  type RouteContext
} from "@/lib/bff/http";

type Params = {
  drop_id: string;
};

type CheckoutSessionBody = {
  accountId?: string;
  successUrl?: string;
  cancelUrl?: string;
};

export async function GET(request: Request, context: RouteContext<Params>) {
  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!dropId) {
    return badRequest("drop_id is required");
  }

  const accountId = getRequiredSearchParam(new URL(request.url), "account_id");
  if (!accountId) {
    return badRequest("account_id is required");
  }

  const checkout = await commerceBffService.getCheckoutPreview(accountId, dropId);
  if (!checkout) {
    return notFound("checkout not found");
  }

  return ok({ checkout });
}

export async function POST(request: Request, context: RouteContext<Params>) {
  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!dropId) {
    return badRequest("drop_id is required");
  }

  const payload = await safeJson<CheckoutSessionBody>(request);
  const accountId = getRequiredBodyString(payload as Record<string, unknown> | null, "accountId");

  if (!accountId) {
    return badRequest("accountId is required");
  }

  const checkoutSession = await commerceBffService.createCheckoutSession({
    accountId,
    dropId,
    successUrl:
      typeof payload?.successUrl === "string" ? payload.successUrl : undefined,
    cancelUrl:
      typeof payload?.cancelUrl === "string" ? payload.cancelUrl : undefined
  });

  if (!checkoutSession) {
    return notFound("checkout session not available");
  }

  return ok({ checkoutSession }, 201);
}
