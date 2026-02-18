import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";
import {
  badRequest,
  getRequiredRouteParam,
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

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const receipt = await commerceBffService.getReceipt(guard.session.accountId, receiptId);
  if (!receipt) {
    return notFound("receipt not found");
  }

  return ok({ receipt });
}
