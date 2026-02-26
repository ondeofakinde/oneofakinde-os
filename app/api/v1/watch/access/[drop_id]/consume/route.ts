import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";
import {
  badRequest,
  getRequiredBodyString,
  getRequiredRouteParam,
  ok,
  safeJson,
  type RouteContext
} from "@/lib/bff/http";
import { emitOperationalEvent } from "@/lib/ops/observability";
import { NextResponse } from "next/server";

type Params = {
  drop_id: string;
};

type ConsumeWatchAccessBody = {
  token?: string;
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

  const payload = await safeJson<ConsumeWatchAccessBody>(request);
  const token = getRequiredBodyString(payload as Record<string, unknown> | null, "token");
  if (!token) {
    return badRequest("token is required");
  }

  const watchAccess = await commerceBffService.consumeWatchAccessToken({
    accountId: guard.session.accountId,
    dropId,
    token
  });

  if (!watchAccess.granted) {
    emitOperationalEvent("watch_access_consume_denied", {
      dropId,
      accountId: guard.session.accountId,
      reason: watchAccess.reason
    });
    return NextResponse.json({ watchAccess }, { status: 403 });
  }

  emitOperationalEvent("watch_access_consumed", {
    dropId,
    accountId: guard.session.accountId,
    tokenId: watchAccess.tokenId
  });

  return ok({ watchAccess });
}
