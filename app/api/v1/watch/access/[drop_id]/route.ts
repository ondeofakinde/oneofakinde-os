import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";
import {
  badRequest,
  forbidden,
  getRequiredRouteParam,
  ok,
  type RouteContext
} from "@/lib/bff/http";
import { emitOperationalEvent } from "@/lib/ops/observability";

type Params = {
  drop_id: string;
};

export async function POST(request: Request, context: RouteContext<Params>) {
  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!dropId) {
    return badRequest("drop_id is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const watchAccess = await commerceBffService.createWatchAccessToken(
    guard.session.accountId,
    dropId
  );
  if (!watchAccess) {
    emitOperationalEvent("watch_access_issue_denied", {
      dropId,
      accountId: guard.session.accountId
    });
    return forbidden("watch entitlement required");
  }

  emitOperationalEvent("watch_access_issued", {
    dropId,
    accountId: guard.session.accountId,
    tokenId: watchAccess.tokenId
  });

  return ok(
    {
      watchAccess: {
        token: watchAccess.token,
        expiresAt: watchAccess.expiresAt
      }
    },
    201
  );
}
