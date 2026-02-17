import { commerceGateway } from "@/lib/adapters/mock-commerce";
import {
  badRequest,
  getRequiredRouteParam,
  getRequiredSearchParam,
  notFound,
  ok,
  type RouteContext
} from "@/lib/bff/http";

type Params = {
  receipt_id: string;
};

export async function GET(request: Request, context: RouteContext<Params>) {
  const receiptId = await getRequiredRouteParam(context, "receipt_id");
  if (!receiptId) {
    return badRequest("receipt_id is required");
  }

  const accountId = getRequiredSearchParam(new URL(request.url), "account_id");
  if (!accountId) {
    return badRequest("account_id is required");
  }

  const certificate = await commerceGateway.getCertificateByReceipt(accountId, receiptId);
  if (!certificate) {
    return notFound("certificate not found");
  }

  return ok({ certificate });
}
