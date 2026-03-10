import { requireRequestSession } from "@/lib/bff/auth";
import {
  badRequest,
  forbidden,
  getRequiredBodyString,
  getRequiredRouteParam,
  ok,
  safeJson,
  type RouteContext
} from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type {
  AuthorizedDerivativeKind,
  AuthorizedDerivativeRevenueSplit,
  CreateAuthorizedDerivativeInput
} from "@/lib/domain/contracts";

type Params = {
  drop_id: string;
};

type Body = {
  derivativeDropId?: string;
  kind?: string;
  attribution?: string;
  revenueSplits?: Array<{
    recipientHandle?: string;
    sharePercent?: number;
  }>;
};

const AUTHORIZED_DERIVATIVE_KIND_SET = new Set<AuthorizedDerivativeKind>([
  "remix",
  "translation",
  "anthology_world",
  "collaborative_season"
]);

function parseCreateDerivativeInput(
  body: Record<string, unknown> | null
):
  | { ok: true; input: CreateAuthorizedDerivativeInput }
  | { ok: false; response: Response } {
  const derivativeDropId = getRequiredBodyString(body, "derivativeDropId");
  const kind = getRequiredBodyString(body, "kind");
  const attribution = getRequiredBodyString(body, "attribution");

  if (!derivativeDropId || !kind || !attribution) {
    return {
      ok: false,
      response: badRequest("derivativeDropId, kind, and attribution are required")
    };
  }

  if (!AUTHORIZED_DERIVATIVE_KIND_SET.has(kind as AuthorizedDerivativeKind)) {
    return {
      ok: false,
      response: badRequest(
        "kind must be one of: remix, translation, anthology_world, collaborative_season"
      )
    };
  }

  if (!Array.isArray(body?.revenueSplits) || body.revenueSplits.length === 0) {
    return {
      ok: false,
      response: badRequest("revenueSplits must include at least one recipient")
    };
  }

  const revenueSplits = body.revenueSplits
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const candidate = entry as { recipientHandle?: unknown; sharePercent?: unknown };
      if (typeof candidate.recipientHandle !== "string" || !candidate.recipientHandle.trim()) {
        return null;
      }

      if (typeof candidate.sharePercent !== "number" || !Number.isFinite(candidate.sharePercent)) {
        return null;
      }

      return {
        recipientHandle: candidate.recipientHandle.trim(),
        sharePercent: Number(candidate.sharePercent.toFixed(2))
      } satisfies AuthorizedDerivativeRevenueSplit;
    })
    .filter((entry): entry is AuthorizedDerivativeRevenueSplit => entry !== null);

  if (revenueSplits.length !== body.revenueSplits.length) {
    return {
      ok: false,
      response: badRequest("revenueSplits contains invalid recipientHandle/sharePercent entries")
    };
  }

  return {
    ok: true,
    input: {
      derivativeDropId,
      kind: kind as AuthorizedDerivativeKind,
      attribution,
      revenueSplits
    }
  };
}

export async function POST(request: Request, context: RouteContext<Params>) {
  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!dropId) {
    return badRequest("drop_id is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const payload = (await safeJson<Body>(request)) as Record<string, unknown> | null;
  const parsed = parseCreateDerivativeInput(payload);
  if (!parsed.ok) {
    return parsed.response;
  }

  const derivative = await commerceBffService.createAuthorizedDerivative(
    guard.session.accountId,
    dropId,
    parsed.input
  );
  if (!derivative) {
    return badRequest("authorized derivative could not be created");
  }

  return ok({ derivative }, 201);
}
