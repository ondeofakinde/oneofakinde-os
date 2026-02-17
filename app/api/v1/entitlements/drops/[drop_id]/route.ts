import { commerceGateway } from "@/lib/adapters/mock-commerce";
import {
  badRequest,
  getRequiredRouteParam,
  getRequiredSearchParam,
  ok,
  type RouteContext
} from "@/lib/bff/http";

type Params = {
  drop_id: string;
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

  const hasEntitlement = await commerceGateway.hasDropEntitlement(accountId, dropId);
  return ok({ hasEntitlement });
}
