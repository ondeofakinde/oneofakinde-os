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
import type { CreateDropVersionInput, DropVersionLabel } from "@/lib/domain/contracts";

type Params = {
  drop_id: string;
};

type Body = {
  label?: string;
  notes?: string;
  releasedAt?: string;
};

const DROP_VERSION_LABEL_SET = new Set<DropVersionLabel>([
  "v1",
  "v2",
  "v3",
  "director_cut",
  "remaster"
]);

function parseCreateDropVersionInput(
  body: Record<string, unknown> | null
):
  | { ok: true; input: CreateDropVersionInput }
  | {
      ok: false;
      response: Response;
    } {
  const label = getRequiredBodyString(body, "label");
  if (!label) {
    return {
      ok: false,
      response: badRequest("label is required")
    };
  }

  if (!DROP_VERSION_LABEL_SET.has(label as DropVersionLabel)) {
    return {
      ok: false,
      response: badRequest("label must be one of: v1, v2, v3, director_cut, remaster")
    };
  }

  const notes = typeof body?.notes === "string" ? body.notes : undefined;
  const releasedAt = typeof body?.releasedAt === "string" ? body.releasedAt : undefined;

  return {
    ok: true,
    input: {
      label: label as DropVersionLabel,
      notes,
      releasedAt
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
  const parsed = parseCreateDropVersionInput(payload);
  if (!parsed.ok) {
    return parsed.response;
  }

  const version = await commerceBffService.createDropVersion(
    guard.session.accountId,
    dropId,
    parsed.input
  );
  if (!version) {
    return badRequest("drop version could not be created");
  }

  return ok({ version }, 201);
}
