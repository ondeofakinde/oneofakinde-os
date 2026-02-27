import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, forbidden, getRequiredBodyString, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type {
  CreateWorkshopWorldReleaseInput,
  WorldReleaseQueuePacingMode
} from "@/lib/domain/contracts";

type PostWorldReleaseQueueBody = {
  worldId?: string;
  dropId?: string;
  scheduledFor?: string;
  pacingMode?: string;
};

const WORLD_RELEASE_PACING_MODES = new Set<WorldReleaseQueuePacingMode>([
  "manual",
  "daily",
  "weekly"
]);

function parseCreateWorkshopWorldReleaseInput(
  body: Record<string, unknown> | null
):
  | {
      ok: true;
      input: CreateWorkshopWorldReleaseInput;
    }
  | {
      ok: false;
      response: Response;
    } {
  const worldId = getRequiredBodyString(body, "worldId");
  const dropId = getRequiredBodyString(body, "dropId");
  const scheduledFor = getRequiredBodyString(body, "scheduledFor");
  const rawPacingMode = getRequiredBodyString(body, "pacingMode");

  if (!worldId || !dropId || !scheduledFor || !rawPacingMode) {
    return {
      ok: false,
      response: badRequest("worldId, dropId, scheduledFor, and pacingMode are required")
    };
  }

  if (!WORLD_RELEASE_PACING_MODES.has(rawPacingMode as WorldReleaseQueuePacingMode)) {
    return {
      ok: false,
      response: badRequest("pacingMode must be one of: manual, daily, weekly")
    };
  }

  const scheduledForMs = Date.parse(scheduledFor);
  if (!Number.isFinite(scheduledForMs)) {
    return {
      ok: false,
      response: badRequest("scheduledFor must be a valid ISO datetime")
    };
  }

  return {
    ok: true,
    input: {
      worldId,
      dropId,
      scheduledFor: new Date(scheduledForMs).toISOString(),
      pacingMode: rawPacingMode as WorldReleaseQueuePacingMode
    }
  };
}

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const url = new URL(request.url);
  const worldId = url.searchParams.get("world_id");
  const queue = await commerceBffService.listWorkshopWorldReleaseQueue(
    guard.session.accountId,
    worldId
  );

  return ok({ queue });
}

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const body = (await safeJson<PostWorldReleaseQueueBody>(request)) as
    | Record<string, unknown>
    | null;
  const parsed = parseCreateWorkshopWorldReleaseInput(body);
  if (!parsed.ok) {
    return parsed.response;
  }

  const release = await commerceBffService.createWorkshopWorldRelease(
    guard.session.accountId,
    parsed.input
  );
  if (!release) {
    return badRequest("workshop world release could not be created");
  }

  return ok(
    {
      release
    },
    201
  );
}
